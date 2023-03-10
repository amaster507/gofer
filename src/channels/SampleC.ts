import Msg from 'ts-hl7'
import { ChannelConfig } from '../types'

// This channel and transformer are based upon the example posted here: https://outcomehealthcare.com/sample-mirth-connect-project-hl7-2-x-transformation-2-3-to-2-4/

const transformer = (msg: Msg) => {
  msg
    // revise to version 2.4
    .set('MSH.12.1', '2.4')
    // sender id
    .set('MSH.3.1', 'GOFER-ENGINE')
    // update datetime
    .set(
      'MSH.7.1',
      new Date().toISOString().split('.')[0].replace(/[^\d]/gi, '')
    )
  // Add two digits of seconds if they aren't there
  if ((msg.get('EVN.2.1') as string).length <= 12) {
    msg.set('EVN.2.1', (msg.get('EVN.2.1') as string).padEnd(14, '0'))
  }
  return (
    msg
      // Check whether or not the gender meets the requirements of the destination system. Set to 'O' if not.
      .map<string>('PID.8.1', <T extends string>(gender: T) =>
        ['F', 'M', 'U', 'A', 'N'].includes(gender.toUpperCase())
          ? (gender.toUpperCase() as T)
          : ('O' as T)
      )
      // Set admit reason to upper case
      .map<string>(
        'PV2.3.2',
        <T extends string>(admitReason: T) => admitReason.toUpperCase() as T
      )
  )
}

const SampleC: ChannelConfig = {
  id: 'sample-c',
  verbose: true,
  name: 'Sample C',
  source: {
    // listens for messages locally on port 9003
    tcp: {
      host: '0.0.0.0',
      port: 9003,
    },
  },
  ingestion: [
    { file: {} }, // persists the original message
    { ack: {} }, // sends an ack back
    transformer, // applies the transformer function
    { file: { path: ['local', 'transformed'] } }, // persists the transformed message
  ],
  routes: [],
}

export default SampleC
