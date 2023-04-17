import net from 'net'
import handelse from 'handelse'
import Msg from 'ts-hl7'
import { onLog } from './eventHandlers'
import { IMessageContext, TcpConfig } from './types'
import { functionalVal } from './helpers'

type TcpClientFunc<T, R> = (
  opt: TcpConfig<'O'>,
  msg: T,
  stringify: ((msg: T) => string) | undefined,
  parse: ((data: string) => R) | undefined,
  channelId: string | number | undefined,
  routeId: string | number | undefined,
  flowId: string | number | undefined,
  context: IMessageContext
) => Promise<Msg>

const sendMessage = async (
  host: string,
  port: number,
  SoM: string,
  EoM: string,
  CR: string,
  responseTimeout: number | false | undefined,
  data: string,
  channel?: string | number,
  route?: string | number,
  flow?: string | number
): Promise<string> => {
  if (responseTimeout !== undefined) {
    handelse.go(`gofer:${channel}.onLog`, {
      log: `TODO: TCP responseTimeout is not yet implemented`,
      channel,
      route,
      flow,
    })
    onLog.go('TODO: TCP responseTimeout is not yet implemented')
    onLog.go({ responseTimeout })
  }
  return new Promise((res, rej) => {
    let responseBuffer = ''
    const client = new net.Socket()
    client.connect({ port, host }, () => {
      handelse.go(`gofer:${channel}.onLog`, {
        log: `TCP connection established to ${host}:${port}`,
        msg: data,
        channel,
        route,
        flow,
      })
      client.write(SoM + data + EoM + CR)
    })
    client.on('data', (chunk) => {
      responseBuffer += chunk.toString()
      if (
        responseBuffer.substring(
          responseBuffer.length - 2,
          responseBuffer.length
        ) ===
        EoM + CR
      ) {
        res(responseBuffer.substring(1, responseBuffer.length - 2))
        client.end()
      }
    })
    client.on('end', function () {
      handelse.go(`gofer:${channel}.onLog`, {
        log: `Requested an end to the TCP connection`,
        msg: data,
        channel,
        route,
        flow,
      })
    })
    client.on('error', (err) => {
      handelse.go(`gofer:${channel}.onError`, {
        error: err,
        msg: data,
        channel,
        route,
        flow,
      })
      rej(err)
    })
  })
}

export const tcpClient: TcpClientFunc<Msg, Msg> = async (
  {
    host,
    port,
    SoM = String.fromCharCode(0x0b),
    EoM = String.fromCharCode(0x1c),
    CR = String.fromCharCode(0x0d),
    responseTimeout,
  },
  msg,
  stringify = (msg: Msg) => msg.toString(),
  parse = (data: string) => new Msg(data),
  channelId,
  routeId,
  flowId,
  context
) => {
  const ack = await sendMessage(
    typeof host === 'function' ? host(msg, context) : host,
    functionalVal(port, msg, context),
    functionalVal(SoM, msg, context),
    functionalVal(EoM, msg, context),
    functionalVal(CR, msg, context),
    responseTimeout,
    stringify(msg),
    channelId,
    routeId,
    flowId
  )
  return parse(ack)
}
