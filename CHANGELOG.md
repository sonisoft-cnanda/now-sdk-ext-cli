# Changelog

All notable changes to `@sonisoft/now-sdk-ext-cli` (the `nex` CLI).

> **About this file.** This repository was populated by migrating the working tree
> of its predecessor repository at v2.3.2. The predecessor's commit history is not
> carried over. This changelog preserves the release history for posterity —
> reconstructed from that repository's release tags and conventional commits.
>
> All versions listed below are published and installable from npm:
> `npm install -g @sonisoft/now-sdk-ext-cli@<version>`

## [2.3.2] - 2026-03-13

Sanitization release. Replaced customer-specific application scope names in
command help examples with neutral placeholders (`x_acme_*`).

- This version was published to npm but never committed to the predecessor
  repository. It is the baseline this repository starts from.

## [2.3.1] - 2026-03-13

- docs: add AI agent guidance files for CLI-driven automation (#40)
- chore(deps): upgrade `@sonisoft/now-sdk-ext-core` to ^3.9.0

## [2.3.0] - 2026-03-10

- feat: add `flow details` and `flow logs` commands (core 3.8.0) (#39)

## [2.2.0] - 2026-03-10

- feat: add `flow copy` command for copying flows into a target scope (#36)

> Tagged in the predecessor repository but not published to npm.

## [2.1.0] - 2026-03-10

- feat: add `flow test` command for testing unpublished flows (#34)

## [2.0.1] - 2026-03-10

- fix: split CI/release/publish workflows to match the MCP pattern (#32)
- ci: separate auto-versioning from npm publishing (#30)
- ci: bump Node 20 → 22 for semantic-release (#29)

## [2.0.0] - 2026-03-09

Major release. Upgraded to ServiceNow SDK 4.3.0 and migrated CI from GitLab to
GitHub Actions.

**Breaking changes**

- feat!: upgrade to ServiceNow SDK 4.3.0 and `@sonisoft/now-sdk-ext-core` 3.x.
  SDK 4.3.0 changed how credential aliases are stored, replacing the previous
  `keytar`-based credential store. **Aliases created with SDK 4.2.x cannot be
  read by 4.3.x and must be re-created.**
- feat!: migrate CI/CD from GitLab to GitHub Actions

**Features** — the NEX-48 feature-parity program

- feat: add `query` commands for table, app, columns, and syslog (Phase 1.1)
- feat: add `aggregate` commands for count, query, and group (Phase 1.2) (#14)
- feat: add `health check` command (Phase 1.3) (#15)
- feat: add `bulk update` and `bulk delete` commands with dry-run safety (Phase 1.4) (#17)
- feat: add `flow` commands and fix test infrastructure for core 3.4.0 (Phase 1.5) (#20)
- feat: add `xml` record export and import commands (#24, #28)

**Fixes**

- fix: pin add-to-project action to v1.0.2
- fix: grant write permissions to Claude workflows for PR comments
- fix: update Claude workflows with contents:write and simplified review
- fix: add allowed `gh` tools for Claude code review workflow
- fix: pass PR number explicitly to Claude Code review workflow

**Docs**

- docs: update README with new commands and regenerate oclif docs (#16)
- docs: update README with flow, bulk operations, and core 3.4.0 (#19)

## [1.1.0-alpha.0] … [1.1.0-alpha.4] - 2025-10-13

Prerelease line. Added Node-based log tailing, REPL improvements, and expanded
documentation; refactored the unit test suite and added a CI job to run it.

> npm published `1.1.0-alpha.0` through `1.1.0-alpha.3`;
> the predecessor repository additionally tagged `v1.1` and `v1.1.0-alpha.4`.

## [1.0.0-alpha.0] - 2024-10-03

Initial public release, published to npm for Converge 2024.

<!-- Release links -->
[2.3.2]: https://www.npmjs.com/package/@sonisoft/now-sdk-ext-cli/v/2.3.2
[2.3.1]: https://www.npmjs.com/package/@sonisoft/now-sdk-ext-cli/v/2.3.1
[2.3.0]: https://www.npmjs.com/package/@sonisoft/now-sdk-ext-cli/v/2.3.0
[2.2.0]: https://www.npmjs.com/package/@sonisoft/now-sdk-ext-cli/v/2.2.0
[2.1.0]: https://www.npmjs.com/package/@sonisoft/now-sdk-ext-cli/v/2.1.0
[2.0.1]: https://www.npmjs.com/package/@sonisoft/now-sdk-ext-cli/v/2.0.1
[2.0.0]: https://www.npmjs.com/package/@sonisoft/now-sdk-ext-cli/v/2.0.0
[1.0.0-alpha.0]: https://www.npmjs.com/package/@sonisoft/now-sdk-ext-cli/v/1.0.0-alpha.0
