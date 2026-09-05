# Table behavior

Inspect automation associated with a table, then retrieve known artifacts in batches.

```bash
nex behavior --table incident --auth dev --json
nex behavior --table change_request --category business_rules --details scripts --auth dev --json
nex behavior --table change_request --category flows --details definitions --details dependencies --dependency-depth 1 --auth dev --json
nex behavior details --reference flows:sys_hub_flow:0123456789abcdef0123456789abcdef --details definitions --auth dev --json
```

Repeat `--category`, `--details`, `--sys-id`, or `--reference` to batch requests. Defaults: active configuration, applicable ancestors, all eight categories, 50 items/category, 64 KiB response budget. `--no-include-inherited` restricts table associations; `--include-inactive` adds inactive/draft candidates.

For continuation, pass `--category <category> --cursor <nextCursor>` with the original table and filters. Use `--max-bytes` (up to 1 MiB) or narrower detail batches when a result reports omitted payloads. Scripts are never cut mid-body.

JSON mode prints exactly one document. Conditions, runtime/design-time provenance, policy field actions, partial status and retrieval references are preserved. Configuration is not a prediction of execution; missing plugins, permissions, fields and dynamic dependencies are explicit warnings. A designer scan can return no matches but still require continuation.

Core documentation: [TableBehaviorDiscovery](https://github.com/sonisoft-cnanda/now-sdk-ext-core/blob/main/docs/TableBehaviorDiscovery.md).
