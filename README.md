# gofer ENGINE

![gofer Engine Logo](https://raw.githubusercontent.com/amaster507/gofer/main/images/gofer-logo.png)

Welcome to gofer Engine, the newest and easier HL7 interface Engine!

Contents:

- [Setup, Installation and Usage](#setup-installation-and-usage)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
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

## Setup

If you already have a project, you can skip these steps.

1. Create a new folder for your project.
2. Open a terminal in that folder.
3. Run `npm init` and follow the prompts.
4. Run `npm install -D typescript` to install typescript development dependency.
5. Run `npx tsc --init` to create a typescript configuration file.
6. Run `npm install -D eslint` to install eslint development dependency.
7. Run `npx eslint --init` and follow prompts to create an eslint configuration file.

- How would you like to use ESLint? "To check syntax, find problems, and enforce code style"
- What type of modules does your project use? "JavaScript modules (import/export)"
- Which framework does your project use? "None of these"
- Does your project use TypeScript? "Yes"
- Where does your code run? "Node"
- How would you like to define a style for your project? "Use a popular style guide"
- Which style guide do you want to follow? "Standard: ..."
- What format do you want your config file to be in? "JavaScript"
- Would you like to install them now with npm? "Yes"
- Which package manager do you want to use? "npm"

8. Run `npm install -D prettier eslint-config-prettier eslint-plugin-prettier` to install prettier development dependencies.
9. Run `npm install -D husky lint-staged` to install husky and lint-staged development dependencies.
10. Run `npm install -D nodemon ts-node` to install nodemon development dependency.
11. Run `git init && echo "node_modules" >> .gitignore && echo "out" >> .gitignore && echo "local" >> .gitignore` to initialize git and add `node_modules`, `out`, and `local` directories to the `.gitignore` file.
12. In your `tsconfig.json` file add the following `outDir` to the Compiler Options:

```json
{
  "compilerOptions": {
    /* ... */
    "outDir": "./out"
  }
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
import { ChannelConfig } from 'gofer-engine/dist/types/types'

const channel: ChannelConfig = {
  name: 'My First Channel',
  source: {
    tcp: {
      host: 'localhost',
      port: 5500,
    },
  },
  ingestion: [{ ack: {} }, { file: {} }],
  routes: [],
  verbose: true,
}

gofer([channel])
```

The above adds a single channel that listens on localhost port 5500 for HL7 messages. It will acknowledge the messages and write them to a file in the default 'local' directory. See the [Developing Interface Channels](#Developing-Interface-Channels) section for more information on building and configuring channels.

## Running the Server in Development

1. Add a script to your `package.json` file:

```json
"scripts": {
  "dev": "nodemon --exec ts-node src/server.ts"
}
```

2. Run `npm run dev` to start the server.

## Version Control with Git

One of the beaties of using gofer Engine is that you can version control your channels. This allows you to easily branch and merge changes to your channels to ease with development and testing of new interfaces and changes to existing interfaces.

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

As you saw above, the gofer Engine exportable function takes an array of channel configurations. Let's take a look at the channel configuration object:

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
  // The first flow will be executed first, the second flow will be executed second, etc.
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

The `id` is optional, If you don't provide an `id`, then the channel will be assigned a UUID which may not be the same between deployments/reboots. The `id` helps to identify ambiguously named channels in the logs.

The `name` is required and should be unique, but not required. The `name` is used to allow human readable channel names in the logs.

The `tags` are optional and are used to help organize and identify channels. They are not used by the engine, but are there to help you identify related channels and dependencies. The interface `Tag` is currently defined as:

```typescript
interface Tag {
  name: string
  // a hexidecimal color string or valid CSS color name
  color?: string
}
```

The `source` is required and is the source of the messages to process. Currently the only supported source is TCP Listener for HL7 messages. The interface `Connection<'I'>` is computed to:

```typescript
interface Connection {
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
}
```

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
        // Optional. A function that accepts the ack MSG class, msg MSG class, and previous filtered state
        // and returns the ACK MSG class back. This allows for custom transformation of the ACK message.
        msg?: (ack: Msg, msg: Msg, filtered: boolean) => Msg // See (## Message Class) below
      }
    }
  | FilterFlow // see (## Filter Flows) below
  | TransformFlow // see (## Transform Flows) below
  | StoreConfig // see (## Store Configs) below
```

The `routes` are optional and are a list of routes composed of flows to process and send messages to other destinations. Each route is a list of flows to process messages as they are received. The order of routes is not important, however the order of the flows in each route is important. If there are asynchronous flows in a route, then other routes can continue to execute while waiting. The interface `RouteFlow` is computed to:

```typescript
type RouteFlow =
  | FilterFlow // see (## Filter Flows) below
  | TransformFlow // see (## Transform Flows) below
  | StoreConfig // see (## Store Configs) below
  | {
      tcp: {
        host: string
        port: number
        // Start of Message character. Defaults to '\x0b'
        SoM?: string
        // End of Message character. Defaults to '\x1c'
        EoM?: string
        // End of Transmission character. Defaults to '\r'
        CR?: string
        // queue settings. NOTE: not yet implemented
        queue?:
          | boolean
          | number
          | {
              interval?: number
              limit?: number
              rotate?: boolean
              storage?: StoreConfig
            }
        // response timeout in milliseconds. NOTE: not yet implemented
        responseTimeout?: number | false
      }
    }
```

Currently only TCP remote destinations are supported. The `queue` and `responseTimeout` settings are not yet used in implementation. The current implementation will not queue messages, and will keep the connection open waiting for a response (FIXME: really? - this should be tested to see what really happens if the remote server doesn't respond)

## Filter Flows

Filter Flows are used to filter messages. They are used to determine if a message should be processed further or if it should be dropped. The interface `FilterFlow` can be defined as:

```typescript
type FilterFunc = (msg: Msg) => boolean
type FilterFlow = FilterFunc | { filter: FilterFunc }
```

Refer to the [Message Class (`Msg`)](#message-class-msg) below for more information on the `Msg` class and extrapulating data from the message to use in comparisons.

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
type TransformFunc = (msg: Msg) => Msg
type TransformFlow = TransformFunc | { transform: TransformFunc }
```

Refer to the [Message Class (`Msg`)](#message-class-msg) below for more information on the `Msg` class and transforming the data in the message. The trasnformer functions of the class retun back the class instance, so you can chain them together. Here is an example of a transformer that takes the field `PV1-3` and adds a prefix to it:

```typescript
const channelConfig: ChannelConfig = {
  name: 'My Channel',
  source: {
    tcp: {
      host: 'localhost',
      port: 8080,
    },
  },
  ingestion: [{ transform: (msg) => msg.map('PV1-3[1].1', (location) => 'HOSP.' + location) }],
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
