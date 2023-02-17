import { Seg } from 'ts-hl7/dist/types/class/Segment'
import { ChannelConfig } from '../types'

const SampleB: ChannelConfig = {
  verbose: true,
  name: 'SampleB',
  source: {
    tcp: {
      host: '0.0.0.0',
      port: 9001,
    },
  },
  ingestion: [
    {
      ack: {
        application: 'SampleB',
        organization: '$MSH-5',
      },
    },
    {
      file: {}, // persists the original message
    },
  ],
  routes: [
    [
      (msg) => msg.get('MSH-9.2') === 'B01', // a filter is a function that accepts the Msg class and returns a boolean.
      (msg) => msg.move('LAN-2', 'LAN-6'), // a transformer is a function that accepts the Msg class and returns the Msg class.
      { file: {} }, // a store is a object that conforms to IDBStoreOptions. NOTE: only one store is supported in each object.
      { surreal: {} }, // But we can still persists to multiple stores.
      (msg) => (msg.get('LAN') as Seg[])?.length > 1, // you can add a filter later on in the flow too.
      { file: { filename: '$EVN-2' } }, // And we can even persist it again with different settings
      {
        // send the message to a tcp server
        tcp: {
          host: '0.0.0.0',
          port: 9002,
          queue: true,
        },
      },
      {
        // persist the ack received back
        file: {
          filename: ['$MS-10.1', '_ACK'],
        },
      },
    ],
  ],
}

export default SampleB
