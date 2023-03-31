import Msg from 'ts-hl7'
import { publishers } from './eventHandlers'
import { genId } from './genId'
import { QueueOptions } from './queue'
import {
  ChannelConfig,
  Ingestion,
  IngestionFlow,
  MaybePromise,
  Queue,
  Route,
  RouteFlow,
  RouteFlowNamed,
} from './types'

// this function modifies the original channel object to prevent generating new ids on every call
export const ingestionObjectify = (channel: ChannelConfig) => {
  channel.ingestion = channel.ingestion.map((flow) => {
    if (typeof flow === 'object' && flow.kind === 'flow') {
      if (flow?.id === undefined) {
        const ingestionId = genId()
        if (channel.verbose)
          publishers.onLog(
            `Channel ${channel.name} (${channel.id}) had an ingestion flow without an id. Generated id: ${ingestionId}`
          )
        flow.id = ingestionId
      }
      return flow
    }
    const ingestionId = genId()
    if (channel.verbose)
      publishers.onLog(
        `Channel ${channel.name} (${channel.id}) had an ingestion flow without an id. Generated id: ${ingestionId}`
      )
    return {
      id: ingestionId,
      flow: flow as IngestionFlow,
    } as Ingestion
  })
  return channel
}

// this function does not modify the original channel object and returns only the ingestion flows
export const ingestionSimplify = <
  Filt extends 'O' | 'F' | 'B' = 'B',
  Tran extends 'O' | 'F' | 'B' = 'B'
>(
  channel: ChannelConfig<Filt, Tran, 'S' | 'L'>
): IngestionFlow[] => {
  return channel.ingestion.map((flow) => {
    if (typeof flow === 'object' && flow.hasOwnProperty('flow')) {
      return (flow as Ingestion).flow as IngestionFlow
    }
    return flow as IngestionFlow
  })
}

export const routeFlowObjectify = (
  flows: (RouteFlow<'B', 'B'> | RouteFlowNamed<'B', 'B'>)[],
  verbose = false
): RouteFlowNamed<'B', 'B'>[] => {
  return flows.map((flow) => {
    if (typeof flow === 'object' && flow.kind === 'flow') {
      flow = flow as RouteFlowNamed<'B', 'B'>
      if (flow?.id === undefined) {
        const flowId = genId()
        if (verbose)
          publishers.onLog(
            `Named Route (${flow.name}) was missing the id. Generated id: ${flowId}`
          )
        flow.id = flowId
      }
      return flow
    }
    const flowId = genId()
    if (verbose)
      publishers.onLog(`Route was missing the id. Generated id: ${flowId}`)
    return {
      kind: 'flow',
      id: flowId,
      flow: flow as RouteFlow<'B', 'B'>,
    }
  })
}

// this function modifies the original channel object to prevent generating new ids on every call
export const routesObjectify = (
  channel: ChannelConfig
): ChannelConfig<'B', 'B', 'S'> => {
  channel.routes = channel.routes?.map((route) => {
    if (
      typeof route === 'object' &&
      !Array.isArray(route) &&
      route.kind === 'route'
    ) {
      if (route?.id === undefined) {
        const routeId = genId()
        if (channel.verbose)
          publishers.onLog(
            `Channel ${channel.name} (${channel.id}) had an route without an id. Generated id: ${routeId}`
          )
        route.id = routeId
      }
      route.flows = routeFlowObjectify(route.flows, channel.verbose)
      return route
    }
    const routeId = genId()
    if (channel.verbose)
      publishers.onLog(
        `Channel ${channel.name} (${channel.id}) had an route without an id. Generated id: ${routeId}`
      )
    return {
      kind: 'route',
      id: routeId,
      flows: routeFlowObjectify(
        route as (RouteFlow | RouteFlowNamed)[],
        channel.verbose
      ),
    }
  })
  return channel as unknown as ChannelConfig<'B', 'B', 'S'>
}

// this function does not modify the original channel object and returns only the routes
export const routesSimplify = (channel: ChannelConfig): RouteFlow[][] => {
  return (
    channel.routes?.map((route) => {
      if (typeof route === 'object' && route.hasOwnProperty('flows')) {
        route = (route as Route).flows
      }
      return (route as (RouteFlow | RouteFlowNamed)[]).map((flow) => {
        if (typeof flow === 'object' && flow.hasOwnProperty('flow')) {
          return (flow as RouteFlowNamed).flow
        }
        return flow as RouteFlow
      })
    }) ?? []
  )
}

export const coerceStrictTypedChannels = (
  config: ChannelConfig<'B', 'B', 'L'>[]
): ChannelConfig<'B', 'B', 'S'>[] => {
  return config.map((channel) => {
    if (!channel.id) {
      channel.id = genId()
      // FIXME: Cannot use handelse event because they are not created yet for this channel. Need to make global event handlers.
      if (channel.verbose)
        publishers.onLog(
          `Channel "${channel.name}" config did not define an \`id\`. Assigned: "${channel.id}"`
        )
    }
    // TODO: implement db source
    if (channel.source.hasOwnProperty('db')) {
      publishers.onError(
        new Error(
          `Channel "${channel.name}"(${channel.id}) tried to use a \`db\` in the source. DB sources are not yet supported`
        )
      )
    }
    // TODO: implement file reader source
    if (channel.source.hasOwnProperty('file')) {
      publishers.onError(
        new Error(
          `Channel "${channel.name}"(${channel.id}) tried to use a \`file\` in the source. File reader sources are not yet supported`
        )
      )
    }
    ingestionObjectify(channel)
    routesObjectify(channel)
    const stronglyTypedChannel = channel as ChannelConfig<'B', 'B', 'S'>
    return stronglyTypedChannel
  })
}

export const promisify = <D>(data: MaybePromise<D>) =>
  new Promise<D>((res) => res(data))

export const allPass = (res: Record<string, boolean>) =>
  Object.values(res).every((v) => v)
export const atLeastOne = (res: Record<string, boolean>) =>
  Object.values(res).length > 0
export const atLeastOnePass = (res: Record<string, boolean>) =>
  Object.values(res).some((v) => v)

const removeUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const newObj = { ...obj }
  Object.keys(newObj).forEach(
    (k) => newObj[k] === undefined && delete newObj[k]
  )
  return newObj
}

export const mapOptions = (opt: Queue): QueueOptions<Msg> => {
  return removeUndefined({
    maxRetries: opt.retries,
    rotate: opt.rotate,
    maxTimeout: opt.maxTimeout,
    sleep: opt.interval,
    verbose: opt.verbose,
    id: opt.id,
    // filter: opt.filterQueue,
    // precondition: opt.precondition,
    // preconditionInterval: opt.preconditionRetryTimeout,
    onEvents: opt.onEvents,
    stringify: opt.stringify,
    parse: opt.parse,
    store: opt.store,
    // concurrency: opt.concurrent,
    // afterProcess: opt.afterProcessDelay,
  })
}
