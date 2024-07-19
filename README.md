# SuperBasic IM: a web-proxy for WhatsApp Web that works on dumbphones

## Problem
Feature phones typically don't support WhatsApp natively,
but they have a basic web browser.

## Solution
SuperBasic IM acts as a proxy
between the fully featured WhatsApp Web and dumbphone web browsers.

## Instructions
### Build
```
npm install
npm run build
```
### Lint
```
npm run lint
```
### Run
```
cd dist
node index.js init
node index.js
```

## Current features
### Supported
* Sending and receiving text messages
* Sending and receiving files
* Downloading VCard of any WhatsApp contact
* Emoji conversions (from emoji to their textual representation for display in dumbphone web browsers)

### Unsupported
* Audio and video calls
* Instant notifications
* Locations
* Group chat management
* Polls

## Contributing
The contribution policy we follow is the [Collective Code Construction Contract (C4)](https://rfc.zeromq.org/spec/42/).
For basic details, please see [the contribution instructions](./CONTRIBUTING.md).

### Current problems
As mentioned in [the contribution instructions](./CONTRIBUTING.md), please open a GitHub issue first (if it doesn't exist)
to describe the problem and reference this issue in your PR.

* Problem: sent or received media files may not be playable on the end device
    * Solution: introduce media re-processing on the server for common dumbphone player formats
* Problem: contacts may wait for a reply for too long
    * Solution: add an opt-in auto-reply to remind contacts to call or SMS if they don't receive a reply to their urgent message
* Problem: textual emoji input is cumbersome
    * Solution: add conversions from common ASCII emojis
* Problem: textual display of emojis is not nice
    * Solution: add an opt-in conversion to `<img>` tags linking freely-licensed emoji image sets