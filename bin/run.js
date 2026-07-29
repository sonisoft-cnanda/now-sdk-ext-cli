#!/usr/bin/env node

// FIRST, deliberately: redirect SDK credential storage off the OS keyring
// before anything can read credentials. See bin/credstore-boot.js.
import './credstore-boot.js'

import {execute} from '@oclif/core'

await execute({dir: import.meta.url})
