import { ChannelConfig } from '../types'

const SampleA: ChannelConfig = {
  verbose: true,
  name: 'Sample A',
  source: {
    tcp: {
      host: '0.0.0.0',
      port: 9002,
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
