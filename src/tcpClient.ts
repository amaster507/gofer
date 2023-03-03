import net from 'net'
import Msg from 'ts-hl7'
import { TcpConfig } from './types'

type TcpClientFunc = (opt: TcpConfig<'O'>, msg: Msg) => Promise<Msg>

export const tcpClient: TcpClientFunc = (
  {
    host,
    port,
    SoM = String.fromCharCode(0x0b),
    EoM = String.fromCharCode(0x1c),
    CR = String.fromCharCode(0x0d),
    responseTimeout,
  },
  msg
) => {
  if (responseTimeout !== undefined) {
    console.warn('TODO: TCP responseTimeout is not yet implemented')
    console.log({ responseTimeout })
  }
  return new Promise((res, rej) => {
    let responseBuffer = ''
    const client = new net.Socket()
    client.connect({ port, host }, () => {
      console.log(`TCP connection established to ${host}:${port}`)
      client.write(SoM + msg.toString() + EoM + CR)
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
        res(new Msg(responseBuffer.substring(1, responseBuffer.length - 2)))
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
