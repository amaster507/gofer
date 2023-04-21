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
      kind: 'store',
      surreal: {
        verbose: true,
      },
    },
    {
      kind: 'store',
      file: {},
    },
  ],
}

export default ChannelD
