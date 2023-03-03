import { Queue } from '../types'
import BetterQueue from 'better-queue'
import Msg from 'ts-hl7'

const queues: Record<string, BetterQueue> = {}

export const addToQueue = <T = Msg>(
  id: string,
  config: Queue<T>,
  task: (data: T) => Promise<boolean>
) => {
  if (queues.hasOwnProperty(id)) return (queues[id] as BetterQueue<T>).push
  const queue = new BetterQueue<T>((data, cb) => {
    return task(data).then((success) => {
      cb(null, success)
    }).catch((e) => cb(e))
  }, {
    retryDelay: config.interval ?? 10 * 1000,
    filo: config.filo ?? false,
    maxRetries: config.retries ?? Infinity,
    id: config.id,
    filter: config.filterQueue,
    precondition: config.precondition,
    preconditionRetryTimeout: config.preconditionRetryTimeout,
    concurrent: config.concurrent ?? 1,
    maxTimeout: config.maxTimeout ?? 10 * 1000,
    afterProcessDelay: config.afterProcessDelay ?? 1,
  })
  const events = config.onEvents ?? []
  events.forEach(([event, listener]) => {
    queue.on(event, listener)
  })
  queues[id] = queue
  return queue.push
}