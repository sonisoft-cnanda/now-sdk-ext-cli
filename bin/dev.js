#!/usr/bin/env -S node --loader ts-node/esm --disable-warning=ExperimentalWarning

// FIRST, deliberately: redirect SDK credential storage off the OS keyring
// before anything can read credentials. See bin/credstore-boot.js.
// eslint-disable-next-line n/shebang
import './credstore-boot.js'

import {execute} from '@oclif/core'

await execute({development: true, dir: import.meta.url})
