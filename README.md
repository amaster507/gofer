# gofer Engine

![gofer Engine Logo](https://github.com/amaster507/gofer/images/gofer-logo.png)

Welcome to gofer Engine, the newest and easier HL7 interface Engine!

gofer Engine has been designed to be forked from this repo into your own private repo and then deployed into docker environments or any Node.JS server.

In this repo, we include two sample channels, "SampleA" and "SampleB". These are here for testing and your learning experience. Feel free to rip these out and add in your own channels.

The channels are typesafe with typescript. This helps make building them easier and less prone to mistakes.

# Roadmap

- [ ] Actually implement routes:
  - [ ] Route messages to a TCP endpoint
  - [ ] Route messages to a File (NOTE: use a store)
  - [ ] Route messages to a SFTP server
  - [ ] Route messages to a database (NOTE: use a store)
  - [ ] Route messages to a HTTP(S) endpoint (settings for method, content type, etc.)
  - [ ] Route messages to a MQTT endpoint
  - [ ] Route messages to a Websocket endpoint (pub?)
  - [ ] Route messages to a Email alert
  - [ ] Route messages to a SMS alert
  - [ ] Route messages to a Discord alert
- [ ] Add support for message filtering in Routes (_config type already supported_)
- [ ] Add support for audit/event logging (_push events/logs out to 3rd party service like datadog?_)
- [ ] Add support for jobs (e.g. schedule a job to run at a specific time, run a job on startup, run a job on a chron, or run a job every X minutes/hours/days/weeks/months/years)
- [ ] Triger jobs to run `now` with a CLI to the actively running server
- [ ] Add database readers
- [ ] Add file readers
- [ ] Add SFTP readers
- [ ] Support FHIR
