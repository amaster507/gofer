import fs from 'fs'
import os from 'os'
import path from 'path'
import { IQueueStore, ITask } from './'

export interface IQueueFileStoreOptions<T> {
  id: string
  log: (msg: unknown) => void
  stringify?: (event: T) => string
  parse?: (event: string) => T
}

export class QueueFileStore<T> implements IQueueStore<T> {
  private path: string
  private stringify: (event: T) => string = JSON.stringify
  private parse: (event: string) => T = JSON.parse
  private queuedOrd: string[] = []
  private log: (msg: unknown) => void
  constructor({ id, log, stringify, parse }: IQueueFileStoreOptions<T>) {
    this.log = log
    this.path = path.join(os.tmpdir(), `queue-${id}`)
    this.stringify = stringify || this.stringify
    this.parse = parse || this.parse
    fs.mkdirSync(`${this.path}/events`, { recursive: true })
    if (!fs.existsSync(`${this.path}/index`))
      fs.writeFileSync(`${this.path}/index`, '[]', 'utf-8')
    const queuedOrd = JSON.parse(fs.readFileSync(`${this.path}/index`, 'utf-8'))
    if (
      !Array.isArray(queuedOrd) ||
      !queuedOrd.every((v) => typeof v === 'string')
    ) {
      throw new Error(`Invalid queue index at ${this.path}/index`)
    }
    this.queuedOrd = queuedOrd as string[]
  }
  private addTask: (
    props: Pick<Required<ITask<T>>, 'id' | 'task'>
  ) => Promise<[status: boolean, id: string]> = ({ id, task }) => {
    this.log(`Adding task: ${JSON.stringify(task)}`)
    return new Promise(async (res, rej) => {
      fs.writeFile(
        `${this.path}/events/${id}`,
        this.stringify(task),
        { encoding: 'utf-8' },
        async (err) => {
          if (err) {
            rej(err)
          }
          this.queuedOrd.push(id)
          const checks = await this.check()
          res([checks, id])
        }
      )
    })
  }
  public size = () => {
    return new Promise<number>((res, rej) => {
      fs.readdir(`${this.path}/events/`, (err, files) => {
        if (err) return rej(err)
        this.log(`Queue size: ${files.length}`)
        res(files.length)
      })
    })
  }
  public check = async () => {
    return new Promise<boolean>((res, rej) => {
      this.log(`Checking queue validity...`)
      fs.readdir(`${this.path}/events/`, (err, files) => {
        if (err) return rej(err)
        if (this.queuedOrd.length !== files.length) {
          this.log(
            `Queue index is mismatched length with queue directory: ${this.queuedOrd.length} !== ${files.length}`
          )
          return res(false)
        }
        if (
          JSON.stringify(this.queuedOrd.sort()) !== JSON.stringify(files.sort())
        ) {
          this.log(
            `Queue events are mismatched with index: ${JSON.stringify({
              queuedOrder: this.queuedOrd,
              files,
            })}`
          )
          return res(false)
        }
      })
    })
  }
  public clear = () => {
    this.log(`Clearing queue...`)
    return new Promise<boolean>((res, rej) => {
      fs.rm(`${this.path}`, { recursive: true, force: true }, async (err) => {
        if (err) return rej(err)
        fs.mkdir(`${this.path}/events`, { recursive: true }, (err) => {
          if (err) return rej(err)
          this.queuedOrd = []
          res(true)
        })
      })
    })
  }
  private writeIndex = () => {
    return new Promise((res, rej) => {
      fs.writeFile(
        `${this.path}/index`,
        JSON.stringify(this.queuedOrd),
        'utf-8',
        (err) => {
          if (err) return rej(err)
          res(true)
        }
      )
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
      this.writeIndex().then(() => res(true))
    })
  }
  public remove = ({
    id,
  }: Pick<Required<ITask<T>>, 'id'>): Promise<boolean> => {
    return new Promise((res, rej) => {
      fs.rm(`${this.path}/events/${id}`, (err) => {
        if (err) return rej(err)
        this.queuedOrd = this.queuedOrd.filter((i) => i !== id)
        this.log(`Removed task "${id}".`)
        this.writeIndex().then(() => res(true))
      })
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
      fs.readFile(`${this.path}/events/${id}`, 'utf-8', (err, data) => {
        if (err) rej(err)
        if (!data) rej('No data found')
        const task = this.parse(data)
        if (task === undefined) {
          return rej('Task not found')
        }
        res({ id, task })
      })
    })
  }
}
