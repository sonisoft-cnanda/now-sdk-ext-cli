# Access controls and role elevation

Changing an access control (`sys_security_acl`) or its roles needs the elevated **security_admin** role, the one
the **Elevate Role** item in the user menu turns on. `nex acl` elevates on its own and writes every change into an
update set you name, verified by reading back the record and its capture.

```bash
nex elevation --auth dev                              # what this user may elevate to
nex acl list --table incident --auth dev              # incident, incident.* and incident.<field>
nex acl show <sys_id> --auth dev
nex acl create --scope x_acme_app --update-set <set> --operation read \
  --table x_acme_app_request --field cost --role x_acme_app.manager --auth dev
nex acl update <sys_id> --scope x_acme_app --update-set <set> --condition active=true --auth dev
nex acl add-role <sys_id> admin --scope x_acme_app --update-set <set> --auth dev
nex acl remove-role <sys_id> itil --scope x_acme_app --update-set <set> --auth dev
nex acl delete <sys_id> --confirm <sys_id> --scope x_acme_app --update-set <set> --auth dev
```

## Elevation lasts for one run

Elevation belongs to the server session that asked for it and ends with it. Every nex run logs in afresh, so each run
starts unelevated, and nothing is saved between runs. Two ways to elevate:

- The `nex acl` commands that change an ACL elevate to `security_admin` on their own.
- Any other command takes `--elevate <role>` (repeatable), e.g. a background script that changes ACLs:
  `nex exec global fix-acls.js --elevate security_admin`.

`nex elevation --elevate security_admin` proves elevation works for a user and instance. When it fails, the error has
a code and a suggestion, and with `--json` an `error.elevation` object (`code`, `roles`, `available`, `status`):

| Code | What to do |
| --- | --- |
| `not_elevatable` | The user may not elevate to that role. In the base system only `admin` has `security_admin`. The suggestion and `error.elevation.available` list what the user may elevate to. |
| `api_unavailable` | The instance does not offer the API: check that `glide.rest.apis.disabled` does not list "UI Impersonate API". |
| `not_applied` | The instance accepted the request, but the session does not have the role. Compare by elevating in the UI. |
| `invalid_role` | Not a role name. |
| `request_failed` | Anything else reaching the API (connectivity, an unexpected status). Retry; `nex elevation` reads the state. |

Elevating changes no data, so `--read-only`, `--deny-write` and `NEX_POLICY_DENY` do not refuse it. They still refuse
what the elevated session tries to change: `nex acl create --read-only` elevates, then the ACL write is refused.

## Where writes go

Every write takes the ACL's application, `--scope <name>` (or `global`) or `--scope-id`, and usually `--update-set`,
an In progress set of that application. The set does not have to be your current one, and your update-set pointers are
left as they are. A Store application also needs `--acknowledge-upgrade-skip` and `--update-set`, as with
`nex metadata`.

**An ACL on another application's table or field is outside the documented limits, and nex does not check it.**
ServiceNow's documentation ("Creation restrictions across application scopes") allows only role-based field ACLs on a
table of another scope: no table-level ACL, no `.*`, no condition or script. What was seen on Australia, from a scoped
application on Global tables: a table ACL on `cmn_location` saved; a field ACL on `sys_user.mobile_phone` was refused
("outside field"). `nex acl create` inserts an ACL before adding its roles, so the platform judged it without roles;
whether a role-based one would save was not tested. Whatever saves today may be refused or behave differently on a later
release, so put an ACL in its table's application unless you accept that risk.

`nex metadata insert|update|delete` refuses the ACL tables, even with `--elevate`. Use `nex acl`, which applies the
platform's rules below.

## What nex acl does for you

These are the platform's rules, seen on Australia:

- **The platform puts `snc_internal` on an ACL that has no role**, at insert and again when the last role is removed.
  An ACL's roles are alternatives, so `snc_internal` beside other roles lets every internal user pass.
  - With `--role`, `nex acl create` inserts the ACL inactive, adds the roles, and removes the platform's
    `snc_internal`. It then checks the roles are exactly those asked for, and only then activates the ACL.
  - The output names the role it removed.
- **Without a role, condition or script**, an ACL passes every internal user, and the output warns.
- **`remove-role` of an ACL's last role** leaves `snc_internal` in its place. The output warns: add the role it should
  have first.
- **Deleting an ACL deletes its role rows**, each captured as a DELETE.
- **An active record ACL can only be deleted once inactive**, so `nex acl delete` deactivates it first. If anything fails
  after that, it reactivates the ACL.
- **The platform writes the description itself** on first save. The output shows what was saved.

If a create or delete fails part way, the error (`partially_applied`) names the ACL and its state as read back. Run
`nex acl show <sys_id>` before retrying.

`--json` returns the ACL as read back (`acl`, and `previous` for a change), every verified write with its capture,
`removedAutomaticRoles` and `warnings`. Failures carry the same shape as `nex metadata` under `error.acl`, except an
elevation failure at login, which comes under `error.elevation` as above.
