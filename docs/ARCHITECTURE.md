# Farm360 architecture

Routes use TanStack Start. Protected content lives under the managed authenticated layout. Client-importable server functions live in `src/lib`; provider helpers have `.server.ts` boundaries.

Lovable Cloud stores user profiles, private farms and fields, farm entries, inventory items and stock movements. User reads/writes are both explicitly owner-scoped and governed by RLS. Transactions affecting stock take a row lock inside a validation trigger. Database triggers append important farm actions to an immutable audit table.

Platform roles are separate from farm ownership and existing role requests. Confirmed designated email addresses are granted the protected super-administrator role by an Auth lifecycle trigger. The platform dashboard reads an authorized aggregate function and platform audit events only.

The public demo has isolated records and session-only preview additions. It never writes into private farm financial records.

AI advice checks the signed-in farm owner before sending a compact problem description, district and farm type to Lovable AI. Credentials and instructions stay server-side; upstream generation streams and automatic SDK retries are disabled.