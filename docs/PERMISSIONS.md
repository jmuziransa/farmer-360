# Current permissions

| Identity | Public demo | Own farms and records | Stock ledger | Platform aggregates and audit | Other users' private records |
| --- | --- | --- | --- | --- | --- |
| Guest | Read | No | No | No | No |
| Signed-in farmer | Read | Read/create/edit/archive | Read/append | No | No |
| SACCO requested role | Read | Own only | Own only | No | No |
| Verified super administrator | Read | Own only | Own only | Read | No |

Platform permissions are evaluated on the server by `can_platform`. Browser role selections and user-editable metadata never confer privileged access. Farm records have no hard-delete UI. Stock and audit records cannot be edited or deleted.

SACCO membership, staff approvals, break-glass private access and team roles are not yet exposed as working permissions.