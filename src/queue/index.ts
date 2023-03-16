import BetterQueue, { QueueEvent } from 'better-queue'
import { randomUUID } from 'crypto'
import { Queue as QueueConfig } from '../types'

const queues: Record<string, Queue<unknown>> = {}

export type QueueData<T> = { id?: string; data: T }
interface QueueOptions<T>
  extends Partial<
    Omit<BetterQueue.QueueOptions<QueueData<T>, unknown>, 'id' | 'process'>
  > {
  process: (data: QueueData<T>) => Promise<boolean>
  id?: (data: T) => string | undefined
  onEvents?: [
    event: QueueEvent,
    listener: (id: string, error: string) => void
  ][]
}

export const mapOptions = <T>(
  config: QueueConfig<T>
): Omit<QueueOptions<T>, 'process'> => {
  return {
    retryDelay: config.interval ?? 10 * 1000,
    filo: config.filo ?? false,
    maxRetries: config.retries ?? Infinity,
    id: config.id,
    filter: config.filterQueue,
    precondition: config.precondition,
    preconditionRetryTimeout: config.preconditionRetryTimeout ?? 10 * 1000,
    concurrent: config.concurrent,
    maxTimeout: config.maxTimeout ?? 10 * 1000,
    afterProcessDelay: config.afterProcessDelay,
    onEvents: config.onEvents,
  }
}

export class Queue<T> {
  private q: BetterQueue<QueueData<T>>
  private idGetter?: (data: T) => string | undefined
  constructor({ process, id, onEvents, ...options }: QueueOptions<T>) {
    this.q = new BetterQueue<QueueData<T>>(({ data }) => process(data), {
      id: 'id',
      ...options,
    })
    onEvents?.forEach(([event, listener]) => {
      this.q.on(event, listener)
    })
    this.idGetter = id
  }

  public push: typeof this.q.push = (task, cb) => {
    if (!task.id) {
      if (this.idGetter) {
        task.id = this.idGetter(task.data) ?? randomUUID()
      } else {
        task.id = randomUUID()
      }
    }
    return this.q.push(task, cb)
  }
}

export const queue = <T>(
  queueID: string,
  queueFunction: (data: T) => Promise<boolean>,
  messageID: string | undefined,
  message: T,
  options: Omit<QueueOptions<T>, 'process'> = {}
) => {
  let q: Queue<T> | undefined = undefined
  if (queues.hasOwnProperty(queueID)) {
    q = queues[queueID]
  } else {
    q = new Queue({
      ...options,
      process: ({ data }) => queueFunction(data),
    })
  }
  /**
   * FIXME: Using this memory hash storage of the Queue means that if the queueFunction changes,
   * but the Queue class has already been hashed in memory, that it will use the existing queue
   * function and not a new one. Also is true if the options change, such as an onEvent listener
   * that is added for the first call will be the same for all subsequent calls, and not the new
   * one that was passed in.
   */
  q.push({ id: messageID, data: message })
}
