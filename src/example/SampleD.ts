import { ChannelConfig } from '../index'

const ChannelD: ChannelConfig = {
  logLevel: 'debug',
  name: 'Channel D',
  source: {
    kind: 'tcp',
    tcp: {
      host: '0.0.0.0',
      port: 5555,
    },
  },
  ingestion: [
    {
      kind: 'ack',
      ack: { organization: 'MyProject' },
    },
    {
      kind: 'flow',
      id: 'IngestionStore',
      flow: {
        kind: 'store',
        surreal: {
          id: 'UUID',
          uri: 'http://10.3.54.148:8000/rpc',
          verbose: true,
          warnOnError: true,
          namespace: 'MyProject',
          database: '$MSH.9.1',
          table: '$MSH.9.2',
        },
      },
    },
  ],
}

export default ChannelD
