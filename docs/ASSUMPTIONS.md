# Farm360 implementation assumptions

- Preserve the supported TanStack Start framework and Lovable Cloud PostgreSQL/Auth instead of Next.js, Prisma, Docker, or persistent Node daemons.
- Administrator first access uses email/password signup and email confirmation. No administrator account or password is fabricated. Designated accounts become super administrators through a trusted confirmation trigger.
- SACCO roles never imply platform administrator permissions. Platform administrators do not receive access to private farm rows.
- Existing public demonstration data remains read-only and separate from permanent private entries.
- Private records currently support owner-only farms; team invitations and organization permissions require their own completed implementation before granting access.
- Current permanent records cover basic crops, livestock, poultry, eggs, milk, tasks, disease observations, soil observations, harvest/storage, income/expenses and budgets. Specialized histories, advanced calculators, uploads and full report definitions are not yet implemented.
- Inventory stock is calculated from append-only movements, with online database validation against negative balances. No automatic financial entry follows a stock movement or activity.
- Live AI advice uses the default Lovable AI model. AI usage may consume workspace credits; demo assistant replies remain explicitly separate.
- No real financial transfers, loan approvals, third-party messaging or marketplace trades are represented as implemented.

## Verification boundary

No Cloud Auth users existed at verification time. Authenticated UI flows, email delivery and successful password recovery require an account created and verified by its owner. Public recovery screens, expired-link handling, signed-out AI protection, unit tests, database schema presence and a real upstream crop-advice call were checked.