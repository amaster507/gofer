import { Seg } from 'ts-hl7/dist/types/class/Segment'
import { ServerConfig } from '../types'

const SampleB: ServerConfig = {
  name: 'SampleB',
  organization: '$MSH-5',
  host: '192.168.15.201',
  port: 9001,
  store: {
    file: {}, // persists the original message
  },
  // TODO: Support flows on origin too, in cases where every destination needs to same flow, then the store above can just be an origin flow.
  route: [
    {
      host: '192.168.15.201', // FIXME: instead of host/port need to accept a destination config for different destination types, or just convert destinations to flows themselves?
      port: 9002,
      queue: true,
      flows: [
        (msg) => msg.get('MSH-9.2') === 'B01', // a filter is a function that accepts the Msg class and returns a boolean.
        (msg) => msg.move('LAN-2', 'LAN-6'), // a transformer is a function that accepts the Msg class and returns the Msg class.
        { file: {} }, // a store is a object that conforms to IDBStoreOptions. NOTE: only one store is supported in each object.
        { surreal: {} }, // But we can still persists to multiple stores.
        (msg) => (msg.get('LAN') as Seg[])?.length > 1, // you can add a filter later on in the flow too.
        { file: { filename: '$EVN-2' } }, // And we can even persist it again with different settings
      ], // All of these flows happen and then the final version of the Message is sent to the route.
    },
  ],
}

export default SampleB
