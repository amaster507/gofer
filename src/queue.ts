import { IQueueOptions } from 'gofer-queue/dist/queue'
import { queue as goferQueue } from 'gofer-queue'
import Msg from 'ts-hl7'

export const queue = <T = Msg>(
  id: string,
  process: (msg: T, timedOut: () => boolean) => Promise<boolean>,
  msg: T,
  options?: IQueueOptions<T>
) => {
  const q = goferQueue(id, process, options)
  q.push(msg)
}
