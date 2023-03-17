import { randomUUID } from 'crypto'
import { OnlyOptional } from '../types'

type ProcessFunction<T> = (task: T) => boolean | Promise<boolean>

interface QueueOptions {
  // the number of times to retry a failed task
  maxRetries?: number
  // whether to rotate a failed task to the end of the queue or keep it at the front
  rotate?: boolean
  // the maximum amount of time to wait before failing a task for no completion
  maxTimeout?: number
  // The amount of time to wait before checking the queue again after draining
  sleep?: number
}

interface ITask<T> {
  id?: string
  task: T
}

class Queue<T> {
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
  }
  private main: () => Promise<void> = async () => {
    // TODO...
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
      if (this.size) {
        res(this.queuedOrd[0])
      }
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
  private do = (task: T) => this.process(task)
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

export const QueueInstance = <T>(
  queueId: string,
  process: ProcessFunction<T>,
  options: QueueOptions
) => {
  let q: Queue<T> | undefined = undefined
  if (queues[queueId]) {
    q = queues[queueId] as Queue<T>
  }
  q = new Queue<T>(process, options)
  queues[queueId] = q as Queue<unknown>
  return q
}

export default Queue
