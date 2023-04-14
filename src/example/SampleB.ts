import { Seg } from 'ts-hl7/dist/types/class/Segment'
import { ChannelConfig } from '../types'

const SampleB: ChannelConfig = {
  id: 'sample-b',
  logLevel: 'info',
  name: 'Sample B',
  source: {
    kind: 'tcp',
    tcp: {
      host: '0.0.0.0',
      port: 9001,
    },
  },
  ingestion: [
    {
      kind: 'flow',
      id: 'ack',
      name: 'Send Acknowledgement',
      flow: {
        kind: 'ack',
        ack: {
          application: 'SampleB',
          organization: '$MSH-5',
        },
      },
    },
    {
      kind: 'flow',
      id: 'file',
      name: 'Persist to File',
      flow: {
        kind: 'store',
        file: {}, // persists the original message
      },
    },
    (msg) => msg,
    () => true,
    {
      kind: 'filter',
      filter: () => true,
    },
    {
      kind: 'transform',
      transform: (msg) => msg,
    },
    {
      kind: 'ack',
      ack: {},
    },
  ],
  routes: [
    {
      kind: 'route',
      id: 'route1',
      name: 'First Route',
      queue: {
        kind: 'queue',
        verbose: true,
        store: 'memory',
      },
      flows: [
        {
          kind: 'flow',
          id: 'b01Filter',
          name: 'Only Accept B01 Events',
          flow: {
            kind: 'filter',
            filter: (msg) => msg.get('MSH-9.2') === 'B01', // a filter is a function that accepts the Msg class and returns a boolean.
          },
        },
        (msg) => msg.move('LAN-2', 'LAN-6'), // a transformer is a function that accepts the Msg class and returns the Msg class.
        { kind: 'store', file: {} }, // a store is a object that conforms to IDBStoreOptions. NOTE: only one store is supported in each object.
        { kind: 'store', surreal: {} }, // But we can still persists to multiple stores.
        (msg) => (msg.get('LAN') as Seg[])?.length > 1, // you can add a filter later on in the flow too.
        { kind: 'store', file: { filename: '$EVN-2' } }, // And we can even persist it again with different settings
        {
          kind: 'flow',
          flow: {
            // send the message to a tcp server
            kind: 'tcp',
            tcp: {
              host: '0.0.0.0',
              port: 9003,
            },
          },
          queue: {
            kind: 'queue',
            store: 'memory',
          },
        },
        {
          // persist the ack received back
          kind: 'store',
          file: {
            filename: ['$MS-10.1', '_ACK'],
          },
        },
      ],
    },
  ],
}

export default SampleB
