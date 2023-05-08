import { setLoggingConfig } from '../src/eventHandlers'
setLoggingConfig({ console: false })

import gofer, { stopAPI } from '../src/'
import { SampleE } from '../src/example/SampleE'


test('Basic OOP Config', () => {
  const config = gofer
    .listen('tcp', 'localhost', 5501)
    .transform((msg) => msg.set('MSH-4.1', 'Gofer'))
    .ack()
    .store({ file: {} })
    .route((route) => 
      route
        .filter((m) => m.get('MSH-9.2') === 'ADT')
        .send('tcp', 'localhost', 5502)
        .store({ file: { path: ['local', 'acks'] } })
    ).export()

  expect(config).toStrictEqual(SampleE)
})

afterAll(() => {
  stopAPI()
})
