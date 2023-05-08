# gofer ENGINE

![gofer Engine Logo](https://raw.githubusercontent.com/amaster507/gofer/main/images/gofer-logo.png)

Welcome to gofer Engine, the newest and easier HL7 interface Engine!

Contents:

- [Setup, Installation and Usage](#setup-installation-and-usage)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Running the Server in Development](#running-the-server-in-development)
  - [Version Control with Git](#version-control-with-git)
  - [Preparing for Production](#preparing-for-production)
  - [Deploying to Production](#deploying-to-production)
- [Developing Interface Channels](#developing-interface-channels)
  - [gofer Engine Configuration](#gofer-engine-configuration)
  - [Filter Flows](#filter-flows)
  - [Transform Flows](#transform-flows)
  - [Transform or Filter Flows](#transform--or-filter-flows)
  - [Context Object](#context-object)
  - [Queing](#queuing)
  - [Store Configs](#store-configs)
  - [Message Class (Msg)](#message-class-msg)
    - [Decoding HL7 to JSON](#decoding)
    - [Encoding JSON to HL7](#encoding)
    - [Extrapolating Paths from HL7](#extrapolating)
    - [Transforming Messages](#transforming)
    - [Msg Sub Classes](#sub-classes)
- [Administration](#administration)

# Setup, Installation, and Usage

I find it helpful to newer developers to have a step-by-step guide to get them started. If you are experienced with Node projects, you can skip to the [Installation](#installation) section.

## Prerequisites

It is recommended to use the latest version of Node.js. You can download it [here](https://nodejs.org/en/download/).

The following packages are helpful to have installed:

- [typescript](https://www.npmjs.com/package/typescript) - A superset of JavaScript that compiles to plain JavaScript. `npm install -D typescript`
- [nodemon](https://www.npmjs.com/package/nodemon) - A utility that will monitor for any changes in your source and automatically restart your server. `npm install -D nodemon`
- [ts-node](https://www.npmjs.com/package/ts-node) - A utility that will allow you to run TypeScript files directly without having to compile them first. `npm install -D ts-node`

If you are using TypeScript, then you should create a `tsconfig.json` file in your project's root directory. You can use the following as a starting point:

```json
{
  "compilerOptions": {
    "target": "ES2015",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "out",
    "sourceMap": true,
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

## Installation

1. Open a terminal in your project folder.
2. Run `npm install gofer-engine` to install gofer Engine dependency.

## Usage

1. Create a new directory called `src` in your project's root directory.
2. Create a new file called `server.ts` in your project's `src` folder.
3. Add the following code to the file:

```typescript
import gofer from 'gofer-engine'
import { ChannelConfig } from 'gofer-engine'

gofer
  .listen('tcp', 'localhost', 5500)
  .name('My First Channel')
  .ack()
  .store({ file: {} })
  .run()
```

_**NOTE**: Documentation coming soon for OOM style config building._

Alternatively, you could pass a pre-built configuration file:

```typescript
import gofer from 'gofer-engine'
import { ChannelConfig } from 'gofer-engine'

const channel: ChannelConfig = {
  name: 'My First Channel',
  source: {
    kind: 'tcp',
    tcp: {
      host: 'localhost',
      port: 5500,
    },
  },
  ingestion: [
    { kind: 'ack', ack: {} },
    { kind: 'store', file: {} },
  ],
  routes: [],
}

gofer.configs([channel])
```

The above adds a single channel that listens on localhost port 5500 for HL7 messages. It will acknowledge the messages and write them to a file in the default 'local' directory. See the [Developing Interface Channels](#Developing-Interface-Channels) section for more information on building and configuring channels.

## Running the Server in Development

1. Add a script to your `package.json` file:

```json
"scripts": {
  "dev": "nodemon src/server.ts"
}
```

2. Run `npm run dev` to start the server.

## Version Control with Git

One of the beauties of using gofer Engine is that you can version control your channels. This allows you to easily branch and merge changes to your channels to ease with development and testing of new interfaces and changes to existing interfaces.

If you are in an on-premise ONLY environment, then might I recommend [Bonobo Git Server](https://bonobogitserver.com/) as an alternative to [Github](https://github.com).

## Preparing for Production

Add a `build` and `start` script to your `package.json` file:

```json
"scripts": {
  "build": "npx tsc",
  "start": "node out/server.js"
}
```

## Deploying to Production

1. Run `git clone <your-gofer-enginer-repo>` to clone your repository to your production server.

2. Run `npm run build && npm start` to start the server.

If going to production in a Windows Environment, you could use this setup guide to run the server as a Windows Service: https://www.helpmegeek.com/run-nodejs-application-as-windows-service/

If going to production in a Linux Environment, you could use this setup guide to run the server: https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-18-04

You could alternatively use docker with a docker-compose file to clone your repository, install dependencies, build the project, and start the server in a container. This configuration is out of the current scope, but if anyone needs help or wants to contribute, please reach out.

# Developing Interface Channels

I have strived to make developing channels as easy as possible. The goal is to make it so that you can create a channel in a few minutes and have it running immediately in test environment and then deploy it to a production environment with minimal effort.

## gofer Engine Configuration

As you saw above, the gofer Engine exportable function takes an array of channel configurations. Let's take a look at a simplified view of the `ChannelConfig` interface:

```typescript
interface ChannelConfig {
  // an optional unique id for this channel.
  // If not provided will use UUID to generate.
  // If not statically defined it may not be the same between deployments/reboots
  id?: string | number
  // a name, preferrably unique, to identify this channel in the logs
  name: string
  // Optional tags to help organize/identify channels
  tags?: Tag[]
  // The source of the messages to process.
  // Currently the only supported source is TCP Listener for HL7 messages.
  source: Connection<'I'>
  // A list of flows to process messages as they are received.
  // The order of the flows is important.
  // Flows will be executed in the order they are defined in this list.
  // If the server should respond to the source, then there should be an ack flow somewhere in this list.
  ingestion: IngestionFlow[]
  // A list of routes composed of flows to process and send messages to other destinations.
  // Each route is a list of flows to process messages as they are received.
  // The order of routes is not important, however the order of the flows in each route is important.
  // If there are asynchronous flows in a route, then other routes can continue to execute while waiting.
  routes?: RouteFlow[][]
  // Optional. If true, will console log additional contextual information
  verbose?: boolean
}
```

### Forcing a config style with Generics

The `ChannelConfig` interface can be loosely typed allowing very simple configuration of channels. For example an `IngestionFlow` can be a function directly:

```typescript
const flow: IngestionFlow = (msg) => msg.get('MSH.9.1') === 'ADT'
```

Or it can be an object with a `kind` property:

```typescript
const flow: IngestionFlow = {
  kind: 'filter',
  filter: (msg) => msg.get('MSH.9.1') === 'ADT',
}
```

The `IngestionFlow` accept generics to force a style. The first generic controlls the Filter flows, and the second generic controlls the Transform flows. The generic is either `'O'` for objects, `'F'` for functions, or `'B'` to allow either (default).

```typescript
const flows: IngestionFlow<'O', 'O'>[] = []
```

To force the use of objects for all filters and transformers in a channel config, you can pass the generics to the `ChannelConfig` interface:

```typescript
const channel: ChannelConfig<'O', 'O'>[] = []
```

More information on the [`ingestionFlow`](#Channel-ingestion) below.

### Channel id

The `id` is optional, If you don't provide an `id`, then the channel will be assigned a UUID which may not be the same between deployments/reboots. The `id` helps to identify ambiguously named channels in the logs.

If you want to force `id`s to be required, then you can pass a third generic to the `ChannelConfig` interface. `'S'` will strictly force the `id` to be required. `'L'` (default) will loosely allow `id` to be undefined.

```typescript
const channel: ChannelConfig<'O', 'O', 'S'>[] = []
```

### Channel name

The `name` is required and should be unique, but not required. The `name` is used to allow human readable channel names in the logs.

### Channel tags

The `tags` are optional and are used to help organize and identify channels. They are not used by the engine, but are there to help you identify related channels and dependencies. The interface `Tag` is currently defined as:

```typescript
interface Tag {
  name: string
  // a hexidecimal color string or valid CSS color name
  color?: string
}
```

Note: These tags are not currently used by the engine or the admin API. Eventually I would like to add a UI to help visualize the channels and their dependencies which would use these tags.

### Channel source

The `source` is required and is the source of the messages to process. Currently the only supported source is TCP Listener for HL7 messages. The interface `Connection<'I'>` is computed to:

```typescript
interface Connection {
  kind: 'tcp'
  tcp: {
    host: string
    port: number
    // Start of Message character. Defaults to '\x0b'
    SoM?: string
    // End of Message character. Defaults to '\x1c'
    EoM?: string
    // End of Transmission character. Defaults to '\r'
    CR?: string
  }
  queue?: QueueConfig
}
```

Future plans include support for HL7 over HTTP, HL7 reading from files in a directory, and HL7 reading from a database. Eventually, I would like to support other message formats such as FHIR, CDA, CSV, PSV, etc.,

More information on the [`QueueConfig`](#queuing) below.

### Channel ingestion

The `ingestion` is required and is a list of flows to process messages as they are received. The order of the flows is important. The first flow will be executed first, the second flow will be executed second, etc. If the server should respond to the source, then there should be an ack flow somewhere in this list. The interface `IngestionFlow` is computed to:

```typescript
type IngestionFlow =
  | {
      ack: {
        // Optional. Value to use in ACK MSH.3 field. Defaults to 'gofer Engine'
        application?: string
        // Optional. Value to use in ACK MSH.4 field. Defaults to ''
        organization?: string
        // Optional. Value to use in MSA-1 field. Default to 'AA'
        responseCode?: 'AA' | 'AE' | 'AR'
        // Optional. A function that accepts the ack MSG class, msg MSG class, and conext state object
        // and returns the ACK MSG class back. This allows for custom transformation of the ACK message.
        msg?: (ack: Msg, msg: Msg, context: IAckContext) => Msg // See (## Message Class) below
      }
    }
  | FilterFlow // see (## Filter Flows) below
  | TransformFlow // see (## Transform Flows) below
  | StoreConfig // see (## Store Configs) below
```

### Channel routes

The `routes` are optional and are a list of routes composed of flows to process and send messages to other destinations. Each route is a list of flows to process messages as they are received. The order of routes is not important, however the order of the flows in each route is important. If there are asynchronous flows in a route, then other routes can continue to execute while waiting.

The `ChannelConfig` interface was simplified above to show the basic structure. The `routes` property can be lossely defined as multideimensional array of `RouteFlow` or `RouteFlowNamed` interfaces. Or it can be strictly defined as an array of `Route` interfaces typed as:

```typescript
interface Route {
  kind: 'route'
  id?: string | number
  name?: string
  tags?: Tag[]
  queue?: QueueConfig
  flows: RouteFlow[]
}
```

With strict Channel Config (`ChannelConfig<'O', 'O', 'S'>`) then the `routes` property must be defined as a `Route` interface and the `id` becomes required.

Similarly the `Route['flow']` type is simplified above to show the basic structure. The `flows` property can be lossely defined as an array of `RouteFlow` or `RouteFlowNamed` interfaces. Or it can be strictly defined to only include `RouteFlowNamed` interfaces typed as:

```typescript
interface RouteFlowNamed {
  kind: 'flow'
  id?: string | number
  name?: string
  tags?: Tag[]
  queue?: QueueConfig
  flow: RouteFlow
}
```

If you are going to add a queue to a route, then you must use the `Route` interface and not the simplified `RouteFlow[]` array. If you are going to add a queue to a flow, then you must use the `RouteFlowNamed` interface and not the simplified `RouteFlow` interface.

More information on the [`QueueConfig`](#queuing) below.

The interface `RouteFlow` is computed to:

```typescript
type RouteFlow =
  | FilterFlow // see (## Filter Flows) below
  | TransformFlow // see (## Transform Flows) below
  | StoreConfig // see (## Store Configs) below
  | {
      kind: 'tcp'
      tcp: {
        host: string
        port: number
        // Start of Message character. Defaults to '\x0b'
        SoM?: string
        // End of Message character. Defaults to '\x1c'
        EoM?: string
        // End of Transmission character. Defaults to '\r'
        CR?: string
        // response timeout in milliseconds. NOTE: not yet implemented
        responseTimeout?: number | false
      }
    }
```

Currently only TCP remote destinations are supported.

## Filter Flows

Filter Flows are used to filter messages. They are used to determine if a message should be processed further or if it should be dropped. The interface `FilterFlow` can be defined as:

```typescript
type FilterFunc = (msg: Msg, context: IMessageContext) => boolean
type FilterFlow = FilterFunc | { kind: 'filter'; filter: FilterFunc }
```

_Refer to the **[Message Class (`Msg`)](#message-class-msg)** below for more information on the `Msg` class and extrapulating data from the message to use in comparisons._

_Refer to the **[Context Object](#context-object)** below for more information on the `context` object._

If the filter function returns `true`, then the message will be processed further. If the filter functions returns `false`, then the message will be dropped. An easy cathy phrase to remember is "If it's true, then let it through. If it's false, then let it halt."

Here is a simple example of a filter that will only allow ADT event messages to be processed further:

```typescript
const filter = (msg: Msg) => msg.get('MSH-9.1') === 'ADT'

const channelConfig: ChannelConfig = {
  name: 'ADT Channel',
  source: {
    tcp: {
      host: 'localhost',
      port: 8080,
    },
  },
  ingestion: [{ filter }],
}
```

This could be refactored a little further to allow for more flexibility:

```typescript
const onlyAllowEvents = (event: string[]) => (msg: Msg) =>
  event.includes(msg.get('MSH-9.1') as string)

const channelConfig: ChannelConfig = {
  name: 'ADT/ORM/ORU Channel',
  source: {
    tcp: {
      host: 'localhost',
      port: 8080,
    },
  },
  ingestion: [onlyAllowEvents(['ADT', 'ORM', 'ORU'])],
}
```

For advanced type control, you can pass through a generic to the ChannelConfig (the _first_ generic option) to either:

- `'F'` = Only allow raw filter functions. E.G. `ingection: [() => true]`
- `'O'` = Only allow filter functions in objects. E.G. `ingestion: [{ filter: () => true }]`
- `'B'` = Allow both raw filter function or wrapped in objects. E.G. `ingestion: [() => true, { filter: () => true }]`

The default is `'B'`. E.G. `const conf: ChannelConfig<'B'> = ...`

## Transform Flows

Transform Flows are used to transform messages. The interface `TransformFlow` can be defined as:

```typescript
type TransformFunc = (msg: Msg, context: IMessageContext) => Msg
type TransformFlow =
  | TransformFunc
  | { kind: 'transform'; transform: TransformFunc }
```

_Refer to the **[Message Class (`Msg`)](#message-class-msg)** below for more information on the `Msg` class and transforming the data in the message._

_Refer to the **[Context Object](#context-object)** below for more information on the `context` object._

The trasnformer functions of the class retun back the class instance, so you can chain them together. Here is an example of a transformer that takes the field `PV1-3` and adds a prefix to it:

```typescript
const channelConfig: ChannelConfig = {
  name: 'My Channel',
  source: {
    tcp: {
      host: 'localhost',
      port: 8080,
    },
  },
  ingestion: [
    {
      transform: (msg) =>
        msg.map('PV1-3[1].1', (location) => 'HOSP.' + location),
    },
  ],
}
```

This could be refactored a little further to allow for more flexibility:

```typescript
const addPrefix = (path: string, prefix: string) => (msg: Msg) =>
  msg.map(path, (location) => prefix + location)

const channelConfig: ChannelConfig = {
  name: 'My Channel',
  source: {
    tcp: {
      host: 'localhost',
      port: 8080,
    },
  },
  ingestion: [addPrefix('PV1-3[1].1', 'HOSP')],
}
```

For advanced type control, you can pass through a generic to the ChannelConfig (the _second_ generic option) to either:

- `'F'` = Only allow raw transform functions. E.G. `ingection: [(msg) => msg]`
- `'O'` = Only allow transform functions in objects. E.G. `ingestion: [{ transform: (msg) => msg }]`
- `'B'` = Allow both raw transform function or wrapped in objects. E.G. `ingestion: [(msg) => msg, { transform: (msg) => msg }]`

The default is `'B'`. E.G. `const conf: ChannelConfig<'B', 'B'> = ...`

## Transform or Filter Flows

For flexibility, you can pass through a `TransformOrFilterFlow` to the ingestion array or route flows. This allows you to specify a filter and/or a transformer. The interface `TransformOrFilterFlow` is defined as:

```typescript
type TransformFilterFunction = (
  msg: Msg,
  context: IMessageContext
) => false | Msg
type TransformOrFilterFlow =
  | TransformFilterFunction
  | { kind: 'transformFilter'; transformFilter: TransformFilterFunction }
```

This allows you to write a transformer that can exit early if a condition is not met and return `false` to prevent further processing of the following flows.

## Context Object

The acknowledgement, filter, and transformer functions all have access to a `context` object. This object is used to variable getters and setters that can be used to pass data between flow. Also in this context, you will find a logger function, and the absolute unique message id. The `context` object can be defined as:

```typescript
export interface IMessageContext {
  messageId: string
  logger: (log: string, logLevel?: 'debug' | 'info' | 'warn' | 'error') => void
  setGlobalVar: <V>(varName: string, varValue: V) => void
  getGlobalVar: <V>(varName: string) => V | undefined
  setChannelVar: <V>(varName: string, varValue: V) => void
  getChannelVar: <V>(varName: string) => V | undefined
  setRouteVar?: <V>(varName: string, varValue: V) => void
  getRouteVar?: <V>(varName: string) => V | undefined
  setMsgVar: <V>(varName: string, varValue: V) => void
  getMsgVar: <V>(varName: string) => V | undefined
}
export interface IAckContext extends IMessageContext {
  filtered: boolean
}
```

I assume most of these are self explanatory, but let's go over a few details just in case.

The variable getters and setters can be passed a generic type to strongly type the variable. It is recommended to use this to prevent any type errors. There are 4 different types of variables that can be set and retrieved. The `Global` variables are set and retrieved from the global context. The `Channel` variables are set and retrieved from the channel context. The `Route` variables are set and retrieved from the route context. The `Route` getters and setters may be undefined if not within the context of a route. The `Msg` variables are set and retrieved from the message context. After the processing of the message, the `Msg` variables are cleared to free up memory.

The `set` functions will create the variable if it does not exist, and the `get` functions will return `undefined` if the variable does not exist.

The `filtered` property of the `AckContext` is a boolean that is set to `true` if the message was filtered. This can be used to determine if the message was filtered or not in the ingestion flow before the acknowledgement config. _Note, this is ignored if a queue is used in the TCP Source._

## Queuing

Queuing is useful for when you need to allow retries or throttle the number of messages being processed at a time. The Queue can be configured in three different places in a channel config.

1. In the TCP Source. This will queue all messages coming in from the TCP source. This will allow for a quick ack to the sender that the message was queued without having to wait for the ingestion flow to process the messages up to an ack flow. Ack flows in the ingestion array will not be sent back to the original sender when using a queue.
2. In the Route. This will queue the message before it is sent to the flows of the route. This could be useful if you want to throttle the number of messages being sent to a specific route or if a transformer, filter, store, or destination flow is problematic to allow for retries of the entire route again.
3. In TCP RouteFlows. Typing currently allows queues to be added to any RouteFlow, but only TCP RouteFlows will actually queue the messages. This is useful if you want to throttle the number of messages being sent to a specific destination, or to retry the TCP connection again in case of a downtime or other transport failure.

_NOTE_: TCP destinations that return a NACK do not currently retry the message. This could be added in the future if there is a need for it. Most of the systems I have worked with, the NACK is a permanent failure and the message should be discarded.

The interface `QueueConfig` is defined as:

```typescript
interface QueueConfig {
  kind: 'queue'
  filo: boolean // default to false
  retries?: number // defaults to Infinity
  id?: (msg: Msg) => string // default to crypto.randomUUID()
  concurrent?: number // defaults to 1
  maxTimeout?: number // defaults to 10x1000 = 10 seconds
  afterProcessDelay?: number // default to 1000 = 1 second
  rotate?: boolean // defaults to false
  verbose?: boolean // defaults to false
  store: 'file' | 'memory'
  strinfigy?: (msg: Msg) => string // defaults to (msg) => msg.toString()
  parse?: (msg: string) => Msg // defaults to (msg) => new Msg(msg)
}
```

The `filo` option when set to true, reverses the queue order to First-In-Last-Out instead of the default First-In-First-Out.

The `retries` option is the number of times to retry the message before discarding it. The default is `Infinity` which will retry the message forever.

The `id` option is a function that takes the message and returns a unique string. This is used to identify the message in the queue. The default is `crypto.randomUUID()` which is a cryptographically secure random number generator. Alternatively, you could use the message id from the MSH segment with `(msg) => msg.get('MSH-10.1')`. This is useful to prevent duplicate messages in the queue simultaneously. But if a duplicate id used, but the previous message has already been processed, the new message will be processed as well.

The `concurrent` option is the number of messages to process at a time. The default is `1` which will process one message at a time. This is useful if you want to throttle the number of messages being processed at a time. If you want a faster throughput, you can increase this number, but you will most likely experience message reordering. To ensure message order, you can only use a `concurrent` value of `1`.

The `maxTimeout` option is the maximum amount of time to wait for a message to be processed before retrying. This is implemented currently by the queueing class, but **not yet implemented** in the actual flows.

The `afterProcessDelay` option was initially defined as ~the amount of time to wait after a message has been processed before processing the next message~. But that is **not** how it is currently actually implemented. This option currently sets how long between each poll of the queue worker. For example, if this was set as 1 minute and the last message started a minute ago, but just finished processing after 90 seconds, then poll at the 1 minute mark would have returned due to "still processing", but it would poll again at the 2-minute mark. So this is not technically the amount of time to wait _after_ a message has been processed, but rather the amount of time to wait _between_ each poll of the queue worker.

The `rotate` option does not preserve the order of the messages. When a message failes and is requeued it will be placed at the end of the queue. This is useful if don't care about the order of the messages and also don't want a single failed message to block the entire queue.

The `verbose` option is useful for debugging. It will log the queue events to the console.

The `store` option is the type of store to use for the queue. Currently, only `file` and `memory` are supported. The `file` store will persist the queue to disk in the OS temp directory. The `memory` store will keep the queue in memory. If you are using the `file` store, you can stop the server and restart it and the queue will be restored. If you are using the `memory` store, you will lose the queue if you stop/restart the server/channel/process.

The `stringify` and `parse` options are used to convert the message to a string and back to a message. The default is to use the `toString()` and `new Msg()` methods. If you want the queue to store the JSON representation of the HL7 message, you can use:

```typscript
stringify: (msg) => JSON.stringify(msg.raw()),
parse: (msg) => new Msg(JSON.parse(msg))
```

## Store Configs

Store Configs are used to persist messages to supported stores. The interface `StoreConfig` is defined as:

```typescript
type StoreConfig =
  | {
      file: {
        path?: string[] // defaults to ['local']
        format?: 'string' | 'json' // defaults to 'string'
        overwrite?: boolean // default to true
        append?: boolean // defaults to false
        autoCreateDir?: boolean // defaults to true
        warnOnError?: boolean // defaults to false
        extension?: string // defaults to '.hl7'
        filename?: string | string[] // defaults to '$MSH-10.1'
        verbose?: boolean // defaults to false
      }
    }
  | {
      surreal: {
        uri?: string // defaults to http://127.0.0.1:8000/rpc
        user?: string // defaults to env.SURREALDB_USER or 'root'
        pass?: string // defaults to env.SURREALDB_PASS or 'root'
        warnOnError?: boolean // defaults to false
        verbose?: boolean // defaults to false
        namespace?: string // defaults to 'test'
        database?: strings // defaults to 'test'
        table?: string // defaults to 'test'
        id?: string // defaults to '$MSH-10.1'
      }
    }
```

The `file.path`, `file.filename`, `surreal.namespace`, `surreal.database`, `surreal.table`, and `surreal.id` settings can use values from the message using the HL7 path (See Extrapolating Data from Messages below).

The `file.path` and `file.filename` settings can be an array of strings that get concatenated together. Paths are concatenated using the directory traverse character (`/`). Filenames are concatenating with no separating character. If you need a separating character, then you can add it as an element in the array.

In the future, more stores will be added. We are open to pull requests for new stores at: [gofer-stores](https://github.com/amaster507/gofer-stores)

## Message Class (`Msg`)

The Message (`Msg`) class is used to decode, encode, extrapulate from, and transform HL7 messages. It accepts any v2.x HL7 message and will parse it into a JSON object. It also accepts a JSON object and will encode it into a v2.x HL7 message. It also has a few helper functions to make it easier to work with HL7 messages.

### Decoding

HL7 messages can be decoded by simply passing the raw string message to the `Msg` constructor:

```typescript
const msg = new Msg(HL7_string)
```

To see the decoded message, you can use the `raw()` method:

```typescript
const raw = new Msg(HL7_string).raw()
console.log(JSON.stringify(raw, undefined, 2))
```

If you have a JSON object that you want to replace the decoded JSON object, you can use the `setMsg` method:

```typescript
const foo = new Msg(HL7_string)
const bar = new Msg('MSH|^~\\&|...')
bar.setMsg(foo.raw())

console.log(bar.raw())
```

### Encoding

To encode a message back to an HL7 string, you can use the 'toString' method on the `Msg` class:

```typescript
const msg = new Msg(HL7_string)
console.log(msg.toString())
```

### Extrapolating

HL7 uses paths to reference data inside of the HL7 message structure. The path is a string that is a combination of the segment name, segment iteration index, field index, field iteration index, component index, and subcomponent index. Iteration indexes are surrounded by brackets (`[...]`). The other path parts are separated by either a period (`.`) or dash (`-`). The path is 1-indexed, meaning the first segment iteration is `1`, the first field is `1`, the first field iteration is `1`, the first component is `1`, and the first subcomponent is `1`. The segment name is 3 upper case characters. A path can be specific down to the subcomponent level with optional iteration indexes, or can be as general as just the segment name. The following are all valid paths (may not be valid HL7 schemed messages):

`MSH`, `MSH-3`, `MSH.7`, `MSH.9.1`, `MSH.9-2`, `MSH.10`, `STF-2.1`, `STF-2[2].1`, `STF-3.1`, `STF-11[2]`, `LAN[1]`, `LAN[2].3`, `LAN[3].6[1].1`

Iteration indexes can be defined as `[1]` even for non-iterative paths. Simplified 1 based paths are also supported even if the value is not deeply nested. For example `ZZZ[1]-1[1].1` might reference the same value (`foo`) as the following: `ZZZ[1]-1[1]`, `ZZZ[1]-1`, `ZZZ-1`, `ZZZ-1[1]`, and `ZZZ-1.1` in the the following HL7 messages:

```hl7
MSH|^~\&|...
ZZZ|foo|bar
```

The `Msg` class exposes the `get` method that accepts a single path input.

```typescript
const msg = new Msg('MSH|^~\\&|...')
const value = msg.get('MSH-2')
```

If the path is only a segment name, then the Segment (`Seg`) class will be returned. See (## Segment Class) below. If you want to be sure to get back a singular string value, then you should use the most specific path possible. For example, if you want to get the first component of the first field of the first segment iteration of the `MSH` segment, then you should use the path `MSH[1].1.1`. If you use the path `MSH.1.1`, then you will get back an array of strings, one for each segment iteration.

### Transforming

You can use the following methods to transform the message. Each method returns the self class instance, so you can chain the methods together as needed.

- `addSegment(segment: string)` - Adds a HL7 encoded segment string to the end of the message
- `transform(limit: { restrict: IMsgFieldList, remove: IMsgFieldList })` - Transforms the message by restricting to only certain elements and/or removing certain elements.
- `copy(fromPath: string, toPath: string)` - Copies the value from one path to another
- `move(fromPath: string, toPath: string)` - Moves the value from one path to another
- `delete(path: string)` - Removes the value at the given path
- `set(path: string, value: string)` - Sets the value at the given path
- `setJSON(path: string, value: MsgValue)` - Sets the value at the given path with a JSON object in case of sub items.
- `map(path: string, dictionary: string | Record<string, string> | string[] | <T>(val: T, index: number) => T, { iteration: boolean })` - Sets the value at the given path with a mapped value. If the map is a string, then the value will be replaced with the map. If the map is a key-value object, then the value will be replaced with the value of the key-value object where the existing value matches the key. If the map is an array, then the value will be replaced with the value of the array at the index of the value converted to an integer (1-based indexing). If the map is a function, then the value will be replaced with the return value of the function. The function will be passed the value and the index of the value (1-based indexing). If the iteration option is set to true, then the function will be called for each iteration of the path. If the iteration option is set to false, then the function will only be called once for the path. Defaults to false.
- `setIteration<Y>(path: string, map: Y[] | ((val: Y, i: number) => Y), { allowLoop: boolean })` = Sets the iteration of the path to the given map. If the map is an array, then the iteration will be set to the iterated index of the array (1-based). If the map is a function, then the iteration will be set to the return value of the function. The function will be passed the value and the index of the iteration (1-based indexing). If the allowLoop option is set to true and the array length is less than the iterations of the path, then the array will be looped over to fill the iterations. If the allowLoop option is set to false and the array length is less than the iterations of the path, then the remaining iterations will be set to empty. Defaults to false.

### Sub Classes

- Seg (`Msg.getSegment(name: string)`)
- Field (`Seg.getField(index: number)`)
- Component (`Field.getComponent(index: number)`)
- SubComponent (`Component.getSubComponent(index: number)`)

Each of the above subclasses expose the following methods:

- `raw()` -
- `toString()` -

# Administration

This server includes a GraphQL Administrative API since verson 0.0.7. This server is by default available on port 8080, but can be customized using the `.env` parameter `API_PORT`.

This Management API is currently in development but the following schema is currently supported:

```graphql
type Query {
  getConfig: GoferConfig
}
type GoferConfig {
  channels: [Channel!]
}
type Channel {
  id: ID!
  name: String
  active: Boolean
  ingestionFlows: [FlowStat!]
  routes: [RouteStat!]
}
type FlowStat {
  id: ID!
  name: String
  active: Boolean
  config: String
}
type RouteStat {
  id: ID!
  name: String
  active: Boolean
  flows: [FlowStat!]
}
```

This allows you currently to query the configuration of the server with the following graphql query:

```graphql
query QueryConfig {
  getConfig {
    channels {
      id
      name
      active
      ingestionFlows {
        id
        name
        active
        config
      }
      routes {
        id
        name
        active
        flows {
          id
          name
          active
          config
        }
      }
    }
  }
}
```

If you are unfamiliar with being the client of a GraphQL API, I recommend checking out [How To GraphQL - Introduction](https://www.howtographql.com/basics/0-introduction/)

# [Roadmap](https://github.com/users/amaster507/projects/1)
