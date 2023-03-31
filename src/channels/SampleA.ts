import Msg from 'ts-hl7'
import { ChannelConfig } from '../types'

const SampleA: ChannelConfig = {
  verbose: true,
  name: 'Sample A',
  source: {
    kind: 'tcp',
    tcp: {
      host: '0.0.0.0',
      port: 9002,
    },
    queue: {
      kind: 'queue',
      verbose: false,
      onEvents: [
        [
          'onQueue',
          (id, _, err) =>
            console.log(`Queued ${id}: ${JSON.stringify({ err })}`),
        ],
        [
          'onStart',
          (id, _, err) =>
            console.log(`Started ${id}: ${JSON.stringify({ err })}`),
        ],
        [
          'onSuccess',
          (id, _, err) =>
            console.log(`Finished ${id}: ${JSON.stringify({ err })}`),
        ],
        [
          'onRetry',
          (id, _, err) =>
            console.log(`Retry ${id}: ${JSON.stringify({ err })}`),
        ],
        [
          'onDrain',
          (id, _, err) =>
            console.log(`Drain ${id}: ${JSON.stringify({ err })}`),
        ],
        [
          'onFail',
          (id, _, err) =>
            console.log(`Failed ${id}: ${JSON.stringify({ err })}`),
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
      kind: 'ack',
      ack: {
        organization: 'My Organization',
      },
    },
  ],
  routes: [[{ kind: 'store', file: {} }]],
}

export default SampleA
