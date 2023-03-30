import net from 'net'
import Msg from 'ts-hl7'
import { TcpConfig } from './types'

type TcpClientFunc<T, R> = (
  opt: TcpConfig<'O'>,
  msg: T,
  stringify?: (msg: T) => string,
  parse?: (data: string) => R
) => Promise<Msg>

const sendMessage = async (
  host: string,
  port: number,
  SoM: string,
  EoM: string,
  CR: string,
  responseTimeout: number | false | undefined,
  data: string
): Promise<string> => {
  if (responseTimeout !== undefined) {
    console.warn('TODO: TCP responseTimeout is not yet implemented')
    console.log({ responseTimeout })
  }
  return new Promise((res, rej) => {
    let responseBuffer = ''
    const client = new net.Socket()
    client.connect({ port, host }, () => {
      console.log(`TCP connection established to ${host}:${port}`)
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
      console.log(`Requested an end to the TCP connection`)
    })
    client.on('error', (err) => {
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
  parse = (data: string) => new Msg(data)
) => {
  const ack = await sendMessage(
    host,
    port,
    SoM,
    EoM,
    CR,
    responseTimeout,
    stringify(msg)
  )
  return parse(ack)
}
