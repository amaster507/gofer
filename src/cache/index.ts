import path from 'path'
import fs from 'fs'

interface CacheOptions {
  base?: string
  name?: string
  duration?: number
  memory?: boolean
  persist?: boolean
}

const exists = (dir: string): boolean => {
  try {
    fs.accessSync(dir)
  } catch (err) {
    return false
  }

  return true
}

const cache = <T = unknown>(options: CacheOptions = {}) => {
  const base = path.normalize(
    options.base || path.dirname(require?.main?.filename ?? '') + '/cache'
  )
  const cacheDir = path.normalize(base + '/' + (options.name || 'cache'))
  console.log({ cacheDir })
  const cacheInfinitely = !(typeof options.duration === 'number')
  const cacheDuration = options.duration ?? 0

  if (!exists(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })

  const buildFilePath = (name: string) => {
    return path.normalize(cacheDir + '/' + name + '.json')
  }

  const buildCacheEntry = <D extends T = T>(data: D) => {
    return {
      cacheUntil: !cacheInfinitely
        ? new Date().getTime() + cacheDuration
        : undefined,
      data: data,
    }
  }

  const put = <D extends T = T>(name: string, data: D) => {
    return new Promise<D>((res, rej) => {
      fs.writeFile(
        buildFilePath(name),
        JSON.stringify(buildCacheEntry(data)),
        (err) => {
          if (err != null) {
            return rej(err)
          }
          return res(data)
        }
      )
    })
  }

  const putSync = <D extends T = T>(name: string, data: D) => {
    fs.writeFileSync(buildFilePath(name), JSON.stringify(buildCacheEntry(data)))
    return data
  }

  const get = <D extends T = T>(name: string): Promise<D | undefined> => {
    return new Promise((res, rej) => {
      fs.readFile(buildFilePath(name), 'utf8', (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') return res(undefined)
          return rej(err)
        }
        try {
          const parsed = JSON.parse(data)

          if (parsed.cacheUntil && new Date().getTime() > parsed.cacheUntil) {
            deleteEntry(name)
            return res(undefined)
          }

          return res(parsed.data)
        } catch (e) {
          rej(e)
        }
      })
    })
  }

  const getSync = <D extends T = T>(name: string): D | undefined => {
    let data: ReturnType<typeof JSON.parse> = undefined
    const cacheFilePath = buildFilePath(name)
    try {
      data = JSON.parse(fs.readFileSync(cacheFilePath, { encoding: 'utf8' }))
    } catch (_e: unknown) {
      return undefined
    }

    if (data.cacheUntil && new Date().getTime() > data.cacheUntil) {
      deleteEntrySync(name)
      return undefined
    }
    return data.data
  }

  const deleteEntry = (name: string) => {
    return new Promise<void>((res, rej) => {
      fs.unlink(buildFilePath(name), (err) => {
        if (err) return rej(err)
        return res()
      })
    })
  }

  const deleteEntrySync = (name: string) => {
    fs.unlinkSync(buildFilePath(name))
  }

  return {
    put: put,
    get: get,
    delete: deleteEntry,
    putSync: putSync,
    getSync: getSync,
    deleteSync: deleteEntrySync,
  }
}

export default cache
