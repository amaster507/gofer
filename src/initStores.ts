import stores, { Store, StoreConfig } from 'gofer-stores'
import Msg from 'ts-hl7'
import { hash } from './hash'
import { ChannelConfig } from './types'

const hashedStores: Record<string, Store> = {}

export const initStores = <
  Filt extends 'O' | 'F' | 'B' = 'B',
  Tran extends 'O' | 'F' | 'B' = 'B'
>(
  config: ChannelConfig<Filt, Tran, 'S'>[]
) => {
  const routeStores: StoreConfig[] = []
  config.forEach((channel) => {
    // TODO: also implement source db initialization
    routeStores.push(
      ...(channel.ingestion
        .map((flow) => {
          return flow.flow
        })
        .filter((flow) => {
          if (typeof flow === 'object') {
            return Object.keys(stores).some((store) =>
              Object.keys(flow).includes(store)
            )
          }
          return false
        }) as StoreConfig[])
    )
    channel.routes
      ?.map((route) => route.flows)
      .forEach((flows) => {
        routeStores.push(
          ...(flows
            .map((flow) => flow.flow)
            .filter((flow) => {
              if (typeof flow === 'object') {
                return Object.keys(stores).some((store) =>
                  Object.keys(flow).includes(store)
                )
              }
              return false
            }) as StoreConfig[])
        )
      })
    return routeStores
  })

  routeStores.forEach((storeConfig) => {
    const STORE = Object.keys(storeConfig)[0] as keyof typeof storeConfig
    if (STORE !== undefined) {
      hashedStores[hash(storeConfig)] = new stores[STORE](
        storeConfig[STORE]
      ) as Store
    }
  })
  return config
}

export const getStore = (config: StoreConfig): Store | undefined =>
  hashedStores?.[hash(config)]

export const store = (config: StoreConfig, msg: Msg) =>
  getStore(config)?.store(msg)
