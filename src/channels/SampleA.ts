import Msg from 'ts-hl7'
import { ChannelConfig } from '../types'

const SampleA: ChannelConfig = {
  verbose: true,
  name: 'Sample A',
  source: {
    tcp: {
      host: '0.0.0.0',
      port: 9002,
    },
    queue: {
      verbose: false,
      onEvents: [
        [
          'onQueue',
          (id, err) => console.log(`Queued ${id}: ${JSON.stringify({ err })}`),
        ],
        [
          'onStart',
          (id, err) => console.log(`Started ${id}: ${JSON.stringify({ err })}`),
        ],
        [
          'onSuccess',
          (id, err) =>
            console.log(`Finished ${id}: ${JSON.stringify({ err })}`),
        ],
        [
          'onRetry',
          (id, err) => console.log(`Retry ${id}: ${JSON.stringify({ err })}`),
        ],
        [
          'onDrain',
          (id, err) => console.log(`Drain ${id}: ${JSON.stringify({ err })}`),
        ],
        [
          'onFail',
          (id, err) => console.log(`Failed ${id}: ${JSON.stringify({ err })}`),
        ],
      ],
      store: 'file',
      id: (msg) => msg.get('MSH-10.1') as string | undefined,
      stringify: (msg) => msg.toString(),
      parse: (msg) => new Msg(msg),
    },
  },
  ingestion: [
    {
      ack: {
        organization: 'My Organization',
      },
    },
    // {
    //   surreal: {
    //     table: '$MSH-9.1',
    //     namespace: 'MyNamespace',
    //     database: '$MSH-3',
    //     uri: 'http://10.3.54.148:8000/rpc',
    //     id: '$MSH-10',
    //   },
    // },
  ],
  routes: [[{ file: {} }]],
}

export default SampleA
