import { randomUUID } from 'node:crypto'
import { promisify } from '../helpers'
import { OnlyOptional } from '../types'
import { QueueMemoryStore } from './memoryStore'
import { QueueFileStore } from './fileStore'

type ProcessFunction<T> = (task: T) => boolean | Promise<boolean>

export type QueueEvents =
  | 'onQueue'
  | 'onStart'
  | 'onSuccess'
  | 'onRetry'
  | 'onFail'
  | 'onDrain'

export interface QueueOptions<T> {
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
  // a function to extract the id from a task
  id?: (task: T) => string | undefined
  // determine where to store the queue
  // TODO: support other stores
  store?: 'memory' | 'file'
  // stringify function if needed for store used
  stringify?: (task: T) => string
  // parse function if needed for store used
  parse?: (task: string) => T
}

export interface ITask<T> {
  id?: string
  task: T
}

export interface IQueueStore<T> {
  check: () => Promise<boolean>
  next: () => Promise<string | undefined>
  get: (id?: string) => Promise<ITask<T>>
  remove: ({ id }: { id: string }) => Promise<boolean>
  push: (props: Required<ITask<T>>) => Promise<[status: boolean, id: string]>
  rotate: () => Promise<boolean>
  size: () => Promise<number>
  clear: () => Promise<boolean>
}

class Queue<T> {
  public queueId: string
  private interval: NodeJS.Timer | undefined
  private lastId: string | undefined
  private retryCount = 0
  private options: Required<QueueOptions<T>>
  private process: ProcessFunction<T>
  private Store: IQueueStore<T>
  private queuedIds = new Set<string>()
  private defaultOptions: Required<OnlyOptional<QueueOptions<T>>> = {
    maxRetries: Infinity,
    rotate: false,
    maxTimeout: 10 * 1000,
    sleep: 1000,
    allowUndefined: false,
    verbose: false,
    onEvents: [],
    id: () => {
      const id = randomUUID()
      this.log(`No id function provided, generating random id: ${id}`)
      return id
    },
    store: 'memory',
    stringify: (task) => JSON.stringify(task),
    parse: (task) => JSON.parse(task),
  }
  private log = (msg: unknown) =>
    this.options.verbose ? console.log(msg) : null
  constructor(
    id: string,
    process: ProcessFunction<T>,
    options: QueueOptions<T>
  ) {
    this.queueId = id
    this.options = {
      ...this.defaultOptions,
      ...options,
    }
    this.log(`defaultOptions: ${JSON.stringify(this.defaultOptions)}`)
    this.log(`constructor options: ${JSON.stringify(options)}`)
    this.log(`Queue constructed with options: ${JSON.stringify(this.options)}`)
    this.process = process
    // TODO: support other stores
    if (this.options.store === 'file') {
      this.Store = new QueueFileStore<T>({
        id,
        log: this.log,
        stringify: this.options.stringify,
        parse: this.options.parse,
      })
    } else if (this.options.store === 'memory') {
      this.Store = new QueueMemoryStore<T>({ log: this.log })
    } else {
      this.Store = new QueueMemoryStore<T>({ log: this.log })
    }
    this.main()
  }
  private next = async (): Promise<string> =>
    promisify(this.Store.next()).then((id) => {
      this.log(`Queue next: ${JSON.stringify({ id })}`)
      if (id === undefined) {
        this.doEvent('onDrain', '', 'Queue drained')
        throw new Error('No tasks in queue')
      }
      return id
    })
  public push = ({ id, task }: ITask<T>) => {
    if (!id) {
      try {
        id = this.options.id(task)
      } catch (e: unknown) {
        this.log(
          `Queue options.id function threw an error: ${JSON.stringify(e)}`
        )
      }
    }
    if (!id) {
      this.log(
        `Queue options.id function did not return an id, generated: ${id}`
      )
      id = randomUUID()
    }
    return this.Store.push({ id, task }).then((res) => {
      this.start()
      return res
    })
  }
  public size = () => this.Store.size()
  private main: () => Promise<void> = async () => {
    this.interval = setInterval(async () => {
      const size = await this.size()
      if (size === 0) {
        this.quit()
        return null
      }
      this.next()
        .then((id) => {
          if (id === this.lastId) {
            this.retryCount++
            this.doEvent('onRetry', id, `Retry count: ${this.retryCount}`)
          } else {
            this.retryCount = 0
          }
          this.lastId = id
          this.Store.get(id).then(({ task }) => {
            this.log(`Starting task ${id}...`)
            this.doEvent('onStart', id)
            this.do(task).then((comp) => {
              this.log(
                `Task ${id} completed with status: ${JSON.stringify({ comp })}`
              )
              if (comp) {
                this.doEvent('onSuccess', id)
                this.log(`Removing task ${id}...`)
                return this.Store.remove({ id })
              }
              this.log(`Task ${id} failed!`)
              this.doEvent('onFail', id, 'Task failed')
              if (this.options.rotate) {
                this.log(`Rotating the queue...`)
                return this.Store.rotate()
              }
              return true
            })
          })
        })
        .catch((err: unknown) => {
          this.log(`Error caught: ${err}`)
          this.doEvent('onFail', '', JSON.stringify(err))
        })
    }, this.options.sleep)
  }
  public start = (): void => {
    if (this.interval) {
      this.log('Queue already started! Ignoring start request.')
      return
    }
    this.main()
  }
  private doEvent = (event: QueueEvents, id: string, error?: string) => {
    this.log(`Calling event handlers for event: "${event}" with id: "${id}"`)
    return this.options.onEvents
      .filter(([on]) => on === event)
      .map(([, listener]) => {
        listener(id, error)
      })
  }
  public quit = (): void => {
    if (this.queuedIds.size !== 0) {
      this.log(
        `Closing queue with ${this.queuedIds.size} tasks left! These tasks will be lost if the process is stopped or killed.`
      )
    }
    this.log(`Closing queue...`)
    if (this.interval) {
      clearInterval(this.interval)
    }
    this.log(`Queue closed!`)
    this.interval = undefined
  }
  private do = (task: T) => {
    this.log(`Processing task: ${JSON.stringify(task)}`)
    return promisify(this.process(task))
  }
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
  options: QueueOptions<T> = {}
) => {
  let q: Queue<T> | undefined = undefined
  if (queues[queueId]) {
    q = queues[queueId] as Queue<T>
  } else {
    if (options.verbose)
      console.log(`Queue ${queueId} does not exist, creating new queue.`)
    q = new Queue<T>(queueId, process, options)
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
