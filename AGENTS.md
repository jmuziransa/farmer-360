<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Farm360 architecture
- Keep public demonstration records in a separate read-only table; fictional data must never be mixed with private financial records.
- Keep session-only demonstration additions in a root provider so navigation preserves previews without implying permanent saves.
- Use authenticated tenant-scoped records for private farm and SACCO functionality; do not unlock private CRUD before account setup.
- Read public demonstration data through a publishable-key server function to keep server runtime configuration out of browser code.
- Use TanStack Start and Lovable Cloud in place of the brief's unsupported Next.js, Prisma and Docker deployment; keep migrations as plain SQL through the managed migration tool.
- Store platform permissions in a separate protected role table; assign designated administrator roles only from trusted email-confirmation lifecycle events, never browser metadata or login form selections.
- Grant platform administrators aggregates and platform audit data only; private farm data remains owner-scoped without an implemented break-glass workflow.
- Use authenticated server functions and farm-owner RLS together for private entries; stock movements and important-action audit entries are append-only, with database row locking preventing negative stock.
- Keep Lovable AI providers, safety prompts and compact owner-checked farm context server-side; use the SDK Responses helper with streamed upstream generation and disabled automatic retries.
- Share crop/animal catalogs and record selection fields between demonstration and private entry forms so names and count units stay consistent without changing storage boundaries.
