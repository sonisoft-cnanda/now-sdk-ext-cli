#!/usr/bin/env node

// FIRST, deliberately: refuse to run if a secret was passed in argv, before
// anything can read, store, or log it. See bin/argv-guard.js.
import './argv-guard.js'

// THEN: redirect SDK credential storage off the OS keyring before anything can
// read credentials. See bin/credstore-boot.js.
import './credstore-boot.js'

import {execute} from '@oclif/core'

await execute({dir: import.meta.url})
