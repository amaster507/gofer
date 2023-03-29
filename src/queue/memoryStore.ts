import { promisify } from '../helpers'
import { IQueueStore, ITask } from './'

export class QueueMemoryStore<T> implements IQueueStore<T> {
  private store: Record<string, T> = {}
  private queuedIds = new Set<string>()
  private queuedOrd: string[] = []
  private log: (msg: unknown) => void
  constructor({ log }: { log: (msg: unknown) => void }) {
    this.log = log
  }
  private addTask: (
    props: Pick<Required<ITask<T>>, 'id' | 'task'>
  ) => Promise<[status: boolean, id: string]> = ({ id, task }) => {
    this.log(`Adding task: ${JSON.stringify(task)}`)
    return new Promise(async (res) => {
      this.store[id] = task
      this.queuedIds.add(id)
      this.queuedOrd.push(id)
      const checks = await this.check()
      res([checks, id])
    })
  }
  public size = () => {
    this.log(`Queue size: ${this.queuedIds.size}`)
    return promisify(this.queuedIds.size)
  }
  public check = async () => {
    this.log(
      `Checking queue validity...${JSON.stringify({
        size: this.size(),
        store: Object.keys(this.store).length,
        queuedOrd: this.queuedOrd.length,
      })}`
    )
    const size = await this.size()
    return promisify(
      size === this.queuedOrd.length && size === Object.keys(this.store).length
    )
  }
  public clear = () => {
    this.log(`Clearing queue...`)
    return new Promise<boolean>((res) => {
      this.store = {}
      this.queuedIds.clear()
      this.queuedOrd = []
      this.log(`Queue cleared!`)
      res(this.check())
    })
  }
  public rotate = (): Promise<boolean> => {
    return new Promise((res, rej) => {
      // move the first item in the this.queuedOrd to the end
      const id = this.queuedOrd.shift()
      if (!id) {
        return rej('No tasks in queue')
      }
      this.queuedOrd.push(id)
      res(this.check())
    })
  }
  public remove = ({
    id,
  }: Pick<Required<ITask<T>>, 'id'>): Promise<boolean> => {
    return new Promise((res) => {
      delete this.store[id]
      this.queuedIds.delete(id)
      this.queuedOrd = this.queuedOrd.filter((i) => i !== id)
      this.log(`Removed task "${id}".`)
      res(this.check())
    })
  }
  public push: IQueueStore<T>['push'] = ({ id, task }) => {
    this.log(`Pushing task: ${JSON.stringify({ id, task })}`)
    return this.addTask({ id, task })
  }
  public next = (): Promise<string> => {
    return new Promise((res, rej) => {
      if (!this.check()) {
        rej('Queue is unbalanced!')
      }
      if (this.queuedOrd.length > 0) {
        res(this.queuedOrd[0])
      }
      return rej('No tasks in queue')
    })
  }
  public get: IQueueStore<T>['get'] = (id?: string): Promise<ITask<T>> => {
    return new Promise<ITask<T>>(async (res, rej) => {
      if (!id) {
        id = await this.next()
      }
      if (!id) {
        return rej('No tasks in queue')
      }
      const task = this.store[id]
      if (task === undefined) {
        return rej('Task not found')
      }
      res({ id, task })
    })
  }
}
