import Msg from "ts-hl7";
import { isMsgVFunc } from "./isMsgVFunc";
import { ChannelConfig, Connection, IMessageContext, OIngest, varTypes } from "./types";
import { ConfigComplete } from "./configComplete";
import { ConfigRoute } from "./configRoute";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";
import { genId } from "./genId";
import gofer from ".";

export class ConfigIngestFlows implements OIngest {
  private config: ChannelConfig<'B', 'B', 'S'>
  constructor(source: Connection<'I'>) {
    const id = genId()
    this.config = {
      id,
      source: source,
      ingestion: [],
      name: uniqueNamesGenerator({
        dictionaries: [
          adjectives,
          colors,
          animals
        ],
        separator: '-',
        seed: id,
      })
    }
  }
  public name: OIngest['name'] = (name) => {
    this.config.name = name
    return this
  }
  public id: OIngest['id'] = (id) => {
    this.config.id = id
    return this
  }
  public filter: OIngest['filter'] = (filter) => {
    this.config.ingestion.push({
      id: genId(),
      kind: 'flow',
      flow: filter,
    })
    return this
  }
  public transform: OIngest['transform'] = (transform) => {
    this.config.ingestion.push({
      id: genId(),
      kind: 'flow',
      flow: transform,
    })
    return this
  }
  public store: OIngest['store'] = (store) => {
    this.config.ingestion.push({
      id: genId(),
      kind: 'flow',
      flow: {

        kind: 'store',
        ...store
      }
    })
    return this
  }
  public setVar: OIngest['setVar'] = (scope, varName, varValue) => {
    this.config.ingestion.push({
      id: genId(),
      kind: 'flow',
      flow: {
        kind: 'filter',
        filter: (msg, context) => {
          const val = isMsgVFunc(varValue) ? varValue(msg, context) : varValue
          switch (scope) {
            case 'Msg':
              context.setMsgVar(context.messageId, varName, val)
              break
            case 'Channel':
              context.setChannelVar(context.channelId, varName, val)
              break
            case 'Global':
              context.setGlobalVar(varName, val)
              break
            default:
              throw new Error(`Invalid scope: ${scope}`)
          }
          return true
        }
      }
    })
    return this
  }
  public setMsgVar: OIngest['setMsgVar'] = (varName, varValue) => {
    this.config.ingestion.push({
      id: genId(),
      kind: 'flow',
      flow: {
        kind: 'filter',
        filter: (msg, context) => {
          const val = isMsgVFunc(varValue) ? varValue(msg, context) : varValue
          context.setMsgVar(context.messageId, varName, val)
          return true
        }
      }
    })
    return this
  }
  public setChannelVar: OIngest['setChannelVar'] = (varName, varValue) => {
    this.config.ingestion.push({
      id: genId(),
      kind: 'flow',
      flow: {
        kind: 'filter',
        filter: (msg, context) => {
          const val = isMsgVFunc(varValue) ? varValue(msg, context) : varValue
          context.setChannelVar(context.channelId, varName, val)
          return true
        }
      }
    })
    return this
  }
  public setGlobalVar: OIngest['setGlobalVar'] = (varName, varValue) => {
    this.config.ingestion.push({
      id: genId(),
      kind: 'flow',
      flow: {
        kind: 'filter',
        filter: (msg, context) => {
          const val = isMsgVFunc(varValue) ? varValue(msg, context) : varValue
          context.setGlobalVar(varName, val)
          return true
        }
      }
    })
    return this
  }
  public getVar = <V>(
    scope: Exclude<varTypes, 'Route'>,
    varName: string,
    getVal: (v: V | undefined, msg: Msg, context: IMessageContext) => void
  ) => {
    this.config.ingestion.push({
      id: genId(),
      kind: 'flow',
      flow: {
        kind: 'filter',
        filter: (msg, context) => {
          let val: V | undefined = undefined as V
          switch (scope) {
            case 'Msg':
              val = context.getMsgVar<V>(context.messageId, varName)
              break
            case 'Channel':
              val = context.getChannelVar<V>(context.channelId, varName)
              break
            case 'Global':
              val = context.getGlobalVar<V>(varName)
              break
            default:
              throw new Error(`Invalid scope: ${scope}`)
          }
          getVal(val, msg, context)
          return true
        }
      }
    })
    return this
  }
  public getMsgVar = <V>(
    varName: string,
    getVal: (v: V | undefined, msg: Msg, context: IMessageContext) => void
  ) => {
    this.config.ingestion.push({
      id: genId(),
      kind: 'flow',
      flow: {
        kind: 'filter',
        filter: (msg, context) => {
          const val = context.getMsgVar<V>(context.messageId, varName)
          getVal(val, msg, context)
          return true
        }
      }
    })
    return this
  }
  public getChannelVar = <V>(
    varName: string,
    getVal: (v: V | undefined, msg: Msg, context: IMessageContext) => void
  ) => {
    this.config.ingestion.push({
      id: genId(),
      kind: 'flow',
      flow: {
        kind: 'filter',
        filter: (msg, context) => {
          const val = context.getChannelVar<V>(context.channelId, varName)
          getVal(val, msg, context)
          return true
        }
      }
    })
    return this
  }
  public getGlobalVar = <V>(
    varName: string,
    getVal: (v: V | undefined, msg: Msg, context: IMessageContext) => void
  ) => {
    this.config.ingestion.push({
      id: genId(),
      kind: 'flow',
      flow: {
        kind: 'filter',
        filter: (msg, context) => {
          const val = context.getGlobalVar<V>(varName)
          getVal(val, msg, context)
          return true
        }
      }
    })
    return this
  }
  public ack: OIngest['ack'] = (ack) => {
    this.config.ingestion.push({
      id: genId(),
      kind: 'flow',
      flow: {
        kind: 'ack',
        ack: ack || {},
      }
    })
    return this
  }
  public route: OIngest['route'] = (route) => {
    this.config.routes = [route(new ConfigRoute()).export()]
    return new ConfigComplete(this.config)
  }
  public routes: OIngest['routes'] = (routes) => {
    this.config.routes = routes(() => new ConfigRoute()).map((route) => route.export())
    return new ConfigComplete(this.config)
  }
  public export: OIngest['export'] = () => this.config
  public run = () => {
    gofer.run(this.config)
  }
  public msg = (cb: (msg: Msg, context: IMessageContext) => void) => {
    this.config.ingestion.push({
      id: genId(),
      kind: 'flow',
      flow: {
        kind: 'filter',
        filter: (msg, context) => {
          cb(msg, context)
          return true
        }
      }
    })
  }
}
