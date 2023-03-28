import { randomUUID } from 'crypto'
import { promisify } from '../helpers'
import { OnlyOptional } from '../types'
import { Queue as TQueue } from '../types'

type ProcessFunction<T> = (task: T) => boolean | Promise<boolean>

export type QueueEvents =
  | 'onQueue'
  | 'onSuccess'
  | 'onRetry'
  | 'onFailed'
  | 'onDrain'

interface QueueOptions {
  // the number of times to retry a failed task
  maxRetries?: number
  // whether to rotate a failed task to the end of the queue or keep it at the front
  rotate?: boolean
  // the maximum amount of time to wait before failing a task for no completion
  maxTimeout?: number
  // The amount of time to wait before checking the queue again after draining
  sleep?: number
  // Listeners to be called when a task is queued, succeeds, fails, or is retried
  onEvents?: [
    event: QueueEvents,
    listener: (id: string, error?: string) => void
  ][]
  // Allow `undefined` messages to be pushed to the queue
  allowUndefined?: boolean
  // log verbose messages
  verbose?: boolean
}

export const mapOptions = (opt: TQueue): QueueOptions => {
  return {
    maxRetries: opt.retries,
    rotate: opt.rotate,
    maxTimeout: opt.maxTimeout,
    sleep: opt.interval,
    verbose: opt.verbose,
    // id: opt.id,
    // filter: opt.filterQueue,
    // precondition: opt.precondition,
    // preconditionInterval: opt.preconditionRetryTimeout,
    onEvents: opt.onEvents,
    // concurrency: opt.concurrent,
    // afterProcess: opt.afterProcessDelay,
  }
}

interface ITask<T> {
  id?: string
  task: T
}

class Queue<T> {
  private timeout: NodeJS.Timeout | undefined
  private lastId: string | undefined
  private retryCount = 0
  private options: Required<QueueOptions>
  private process: ProcessFunction<T>
  private store: Record<string, T> = {}
  private queuedIds = new Set<string>()
  private queuedOrd: string[] = []
  private defaultOptions: Required<OnlyOptional<QueueOptions>> = {
    maxRetries: Infinity,
    rotate: false,
    maxTimeout: 10 * 1000,
    sleep: 1000,
    allowUndefined: false,
    verbose: false,
    onEvents: [],
  }
  private main: () => Promise<void> = async () => {
    this.timeout = setTimeout(() => {
      this.getNextId()
        .then((id) => {
          if (id === this.lastId) {
            this.retryCount++
            this.doEvent('onRetry', id, `Retry count: ${this.retryCount}`)
          } else {
            this.retryCount = 0
          }
          this.lastId = id
          this.getTask({ id }).then(({ task }) => {
            this.do(task).then((comp) => {
              if (comp) {
                this.doEvent('onSuccess', id)
                return this.removeTask({ id })
              }
              if (this.options.rotate) {
                return this.rotate()
              }
              return true
            })
          })
        })
        .catch((err: unknown) => {
          this.doEvent('onFailed', '', JSON.stringify(err))
          console.error(err)
        })
    }, this.options.sleep)
  }
  public start = (): void => {
    if (this.timeout) {
      console.warn('Queue already started! Ignoring start request.')
      return
    }
    this.main()
  }
  private doEvent = (event: QueueEvents, id: string, error?: string) => {
    return this.options.onEvents
      .filter(([on]) => on === event)
      .map(([, listener]) => {
        listener(id, error)
      })
  }
  public quit = (): void => {
    if (this.queuedIds.size !== 0) {
      console.warn(
        `Closing queue with ${this.queuedIds.size} tasks left! These tasks will be lost if the process is stopped or killed.`
      )
    }
    if (this.timeout) {
      clearTimeout(this.timeout)
    }
    this.timeout = undefined
  }
  constructor(process: ProcessFunction<T>, options: QueueOptions) {
    this.options = {
      ...this.defaultOptions,
      ...options,
    }
    this.process = process
    this.main()
  }
  private getNextId = (): Promise<string> =>
    new Promise((res, rej) => {
      if (!this.check()) {
        this.doEvent('onFailed', '', 'Queue is unbalanced!')
        rej('Queue is unbalanced!')
      }
      if (this.size) {
        res(this.queuedOrd[0])
      }
      this.doEvent('onQueue', '', 'Queue is empty.')
      return rej('No tasks in queue')
    })
  public getTask = ({ id }: Pick<ITask<T>, 'id'>): Promise<ITask<T>> =>
    new Promise<ITask<T>>(async (res, rej) => {
      if (!id) {
        id = await this.getNextId()
      }
      const task = this.store[id]
      if (task === undefined) {
        return rej('Task not found')
      }
      res({ id, task })
    })
  public removeTask = ({
    id,
  }: Pick<Required<ITask<T>>, 'id'>): Promise<boolean> =>
    new Promise((res) => {
      // TODO: emit task removed event
      // const task = this.store[name]
      // this.emit('taskRemoved', id, task)
      delete this.store[id]
      this.queuedIds.delete(id)
      this.queuedOrd = this.queuedOrd.filter((i) => i !== id)
      res(true)
    })
  private addTask = ({
    id,
    task,
  }: Pick<Required<ITask<T>>, 'id' | 'task'>): Promise<
    [status: boolean, id: string]
  > =>
    new Promise((res) => {
      this.store[id] = task
      this.queuedIds.add(id)
      this.queuedOrd.push(id)
      this.doEvent('onQueue', id)
      res([true, id])
    })
  public rotate = (): Promise<boolean> =>
    new Promise((res, rej) => {
      // move the first item in the this.queuedOrd to the end
      const id = this.queuedOrd.shift()
      if (!id) {
        return rej('No tasks in queue')
      }
      this.queuedOrd.push(id)
      res(true)
    })
  public push = ({
    id,
    task,
  }: ITask<T>): Promise<[status: boolean, id: string]> =>
    new Promise((res) => {
      if (!id) {
        id = randomUUID()
      }
      res(this.addTask({ id, task }))
    })
  private do = (task: T) => promisify(this.process(task))
  private check = () =>
    this.size === this.store.length && this.size === this.queuedOrd.length
  public clear = () =>
    new Promise((res) => {
      this.store = {}
      this.queuedIds.clear()
      this.queuedOrd = []
      res(true)
    })
  public size = this.queuedIds.size
}

const queues: Record<string, Queue<unknown>> = {}

export const getQueue = <T>(queueId: string): Queue<T> | undefined => {
  return queues[queueId] as Queue<T> | undefined
}

export const queue = <T>(
  queueId: string,
  process: ProcessFunction<T>,
  messageId?: string,
  message?: T,
  options: QueueOptions = {}
) => {
  let q: Queue<T> | undefined = undefined
  if (queues[queueId]) {
    q = queues[queueId] as Queue<T>
  } else {
    if (options.verbose)
      console.log(`Queue ${queueId} does not exist, creating new queue.`)
    q = new Queue<T>(process, options)
    queues[queueId] = q as Queue<unknown>
  }
  if (message || options.allowUndefined) {
    q.push({
      id: messageId,
      task: message as T,
    })
  } else if (options.verbose) {
    console.warn(
      `Undefined message provided for queue ${queueId}! Ignoring message.`
    )
  }
}

export default Queue
