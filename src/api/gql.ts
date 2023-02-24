import { graphql, buildSchema } from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import State from '../state'

const schema = buildSchema(`
  type Query {
    stats: Stats
  }
  type Stats {
    channels: [Channel]
  }
  type Channel {
    id: ID!
    name: String
    active: Boolean
    ingestionFlows: [FlowStat!]
    routes: [RouteStat!]
  }
  type FlowStat {
    id: ID!
    name: String
    active: Boolean
  }
  type RouteStat {
    id: ID!
    name: String
    active: Boolean
    flows: [FlowStat!]
  }
`)

const rootValue = (state: State) => {
  return {
    stats: () => {
      const st = Object.entries(state.get())
      return {
        channels: st.map(([id, ch]) => {
          return {
            id,
            name: ch.name,
            active: ch.active,
            ingestionFlows: Object.entries(ch?.ingestFlows ?? []).map(
              ([id, stat]) => {
                return { id, ...stat }
              }
            ),
            routes: Object.entries(ch?.routes ?? []).map(([id, flows]) => {
              return {
                id,
                name: flows.name,
                active: flows.active,
                flows: Object.entries(flows).map(([id, stat]) => {
                  return { id, ...stat }
                }),
              }
            }),
          }
        }),
      }
    },
  }
}

interface IReq {
  query: string
  variables?: Maybe<{ readonly [variable: string]: unknown }>
  operationName?: string
}

class gql {
  private readonly query: IReq['query']
  public readonly variables?: IReq['variables']
  public readonly operationName?: IReq['operationName']
  private readonly state: State
  constructor(req: IReq, state: State) {
    this.query = req.query
    this.state = state
    this.operationName = req.operationName
    this.variables = req.variables
  }
  public res = async () => {
    console.log(this.state.get()['sample-b'].routes)
    return graphql({
      schema,
      source: this.query,
      rootValue: rootValue(this.state),
      variableValues: this.variables,
      contextValue: {},
      operationName: this.operationName,
      fieldResolver: undefined,
      typeResolver: undefined,
    })
  }
}

export default gql
