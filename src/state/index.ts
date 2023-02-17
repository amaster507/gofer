export interface IState {
  [key: string]: {
    active?: boolean
    ingestFlows?: {
      [key: string]: {
        active?: boolean
      }
    }
    routes?: {
      [key: string]: {
        active?: boolean
        flows?: {
          [key: string]: {
            active?: boolean
          }
        }
      }
    }
  }
}

class State {
  private state: IState
  constructor(state: IState) {
    this.state = state
  }
  public get() {
    return this.state
  }
  public setChannel = (channelId: string, active: boolean) => {
    if (this.state?.[channelId] === undefined) {
      console.warn(`Channel "${channelId}" not found in state`)
      return this
    }
    this.state[channelId].active = active
    return this
  }
  private setState = (state: boolean) => {
    Object.keys(this.state).forEach((channelId) => {
      this.state[channelId].active = state
    })
    return this
  }
  public enableAll = () => this.setState(true)
  public disableAll = () => this.setState(false)
  public setFlow = (
    channelId: string,
    type: 'ingest' | 'route',
    flowIndex: number,
    routeIndex?: number
  ) => {
    if (this.state?.[channelId] === undefined) {
      console.warn(`Channel "${channelId}" not found in state`)
      return this
    }
    if (type === 'ingest') {
      if (!Array.isArray(this.state[channelId].ingestFlows)) {
        console.warn(`Channel "${channelId}" has no ingest flows`)
        return this
      }
      if ((this.state[channelId]?.ingestFlows ?? []).length < flowIndex + 1) {
        console.warn(
          `Channel "${channelId}" has no ingest flow at index ${flowIndex}`
        )
        return this
      }
      // ;(this.state[channelId].ingestFlows ?? [])[flowIndex] = true
      return this
    }
    if (type === 'route') {
      if (routeIndex === undefined) {
        console.warn(
          `Channel "${channelId}" tried to set a route flow without a route index`
        )
        return this
      }
      if (!Array.isArray(this.state[channelId].routes)) {
        console.warn(`Channel "${channelId}" has no routes`)
        return this
      }
      if ((this.state[channelId]?.routes ?? []).length < routeIndex + 1) {
        console.warn(
          `Channel "${channelId}" has no route at index ${routeIndex}`
        )
        return this
      }
      // if (
      //   (this.state[channelId]?.routes ?? [])[routeIndex].length <
      //   flowIndex + 1
      // ) {
      //   console.warn(
      //     `Channel "${channelId}" has no route flow at index ${routeIndex}[${flowIndex}]`
      //   )
      //   return this
      // }
      // ;(this.state[channelId].routes ?? [])[routeIndex][flowIndex] = true
      return this
    }
    return this
  }
  public addChannel = (
    channelId: string,
    ingestFlows: true[],
    routes: true[][],
    verbose = false
  ) => {
    if (this.state?.[channelId] !== undefined) {
      if (verbose)
        console.warn(
          `Channel "${channelId}" already exists in state. Not overwriting.`
        )
      return this
    }
    this.state[channelId] = {
      active: true,
      // ingestFlows,
      // routes,
    }
    return this
  }
  public removeChannel = (channelId: string) => {
    delete this.state[channelId]
    return this
  }
}

export default State
