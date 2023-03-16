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
      onEvents: [
        ['task_queued', (id, ...rest) => console.log(`Queued ${id}: ${rest}`)],
        [
          'task_accepted',
          (id, ...rest) => console.log(`Accepted ${id}: ${rest}`),
        ],
        [
          'task_started',
          (id, ...rest) => console.log(`Started ${id}: ${rest}`),
        ],
        [
          'task_finish',
          (id, ...rest) => console.log(`Finished ${id}: ${rest}`),
        ],
        ['task_failed', (id, ...rest) => console.log(`Failed ${id}: ${rest}`)],
        [
          'task_progress',
          (id, ...rest) => console.log(`Progress ${id}: ${rest}`),
        ],
        [
          'batch_finish',
          (id, ...rest) => console.log(`Batch Finished ${id}: ${rest}`),
        ],
        [
          'batch_failed',
          (id, ...rest) => console.log(`Batch Failed ${id}: ${rest}`),
        ],
        [
          'batch_progress',
          (id, ...rest) => console.log(`Batch Progress ${id}: ${rest}`),
        ],
      ],
    },
  },
  ingestion: [
    {
      ack: {
        organization: 'My Organization',
      },
    },
    {
      surreal: {
        table: '$MSH-9.1',
        namespace: 'MyNamespace',
        database: '$MSH-3',
        uri: 'http://10.3.54.148:8000/rpc',
        id: '$MSH-10',
      },
    },
  ],
  routes: [[{ file: {} }]],
}

export default SampleA
