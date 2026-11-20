# Farm360 — Detailed Pre-Build Plan

## 1. Goal and delivery approach
Build **Farm360: Integrated Smart Farming & Farmer SACCO Platform** for Ugandan farmers, groups, and SACCOs. It will combine production records, stock, finances, practical advice, and member finance without mixing private farm information with SACCO records.

The reviewed home page is still the starter placeholder. This plan describes proposed work, not features already built. No application changes, account setup, or paid integrations happen during planning.

Deliver in the phases below, completing working record-saving journeys before adding the next layer. Approval agrees the overall direction; it does not publish the app or authorize financial transactions.

## 2. Experience and navigation
- Mobile-first, readable green-led design with neutral surfaces, clear icons and labels, large touch targets, and light/dark themes.
- Public home, features, plans, FAQ, contact, market information, weather information, and isolated demo. Use relevant farm imagery and clearly fictional testimonials. Do not invent subscription prices.
- Signed-in desktop sidebar; mobile bottom navigation for Home, Farm, Records, SACCO, and More. Group specialist modules under More to avoid overcrowding.
- Persistent farm selector for users with multiple farms; SACCO selector for members of multiple organizations.
- Global search only searches records the user can access. Include notifications, profile menu, loading/error/empty states, and confirmation for destructive actions.
- UGX throughout; dates displayed DD/MM/YYYY; schedules use Africa/Kampala time. Label quantities with acres, kg, litres, birds, trays, or pieces as applicable.
- Shared list tools: search, relevant filters, sorting, pagination, and CSV export. Financial postings are reversed, not deleted.
- Language preference is stored; begin with simple English. Translation and voice guidance are not assumed complete. Optimize images and page loading; full offline editing is outside the first release.

## 3. Accounts and permissions
| User | Allowed access |
|---|---|
| Guest | Public information and fictional demo only |
| Farmer | Own farms and explicitly shared farm records |
| SACCO member | Farmer tools plus own approved membership, savings, applications, repayments |
| SACCO treasurer/admin | Authorized organization's member administration, postings, loan review, reports |
| System administrator | Platform administration and explicitly authorized support actions, audited |

- Email/password registration, confirmation, sign-in, forgot/reset password, password change, and logout.
- Registration captures name, phone, email, district, farm type, and requested role. **Choosing an administrator role never grants it.** Privileged access requires an authorized approval or invitation.
- First sign-in: complete profile → create farm → select production types → set location → choose notification preferences.
- Profiles are proposed because the brief requests names, photos, district, and preferences. Before writing authentication, explicitly confirm whether profile information is required.
- SACCO membership does not automatically reveal private farm records. Farm-performance information for credit assessment is shared only with clear consent and restricted scope.

## 4. Features and complete workflows
### Farmer home and farm profile
Personalized production, stock, financial and task summaries; recent activity; selected market prices; weather status; quick record actions. Explain health indicators and show insufficient-data states instead of invented scores. Farm details cover owner, district, village, coordinates, acres, soil, water source, photo and plots. Archive historical farms/plots; block destructive deletion when records depend on them. Coordinate summary first; interactive mapping is a later integration.

### Crops
Manage seasons/plantings per plot, variety, dates, quantity planted, input plans and status. Detail pages combine activity diary, photos, irrigation/fertilizer/spraying tasks, disease reports, harvests, costs and sales. Monthly planting/harvest calendars link to records. Track partial harvests and sold quantities separately. Yield estimates use transparent assumptions and historical yields where available, never guaranteed AI predictions.

### Livestock
Individual tags, species, breed, sex, birth/acquisition, cost, weight, health and photo; feeding, weights, vaccination, deworming, treatment, breeding, births, milk and mortality. Record morning/evening litres, sale/disposal events, costs and growth trends. Keep historical records after sale or death. Provide a vetted-contact directory without fabricated phone numbers.

### Poultry
Broiler/layer batches with starting birds, chick costs, supplier and target sale date; daily feed, water, medication and deaths; weekly weights; eggs collected, broken/damaged, sold and remaining. Bird balances account for additions, deaths, sales and transfers. Vaccination reminders and batch profitability derive from saved records, not separately entered dashboard totals.

### Inventory and farm finance
Items, suppliers, units, storage locations, receipts/issues/adjustments, expiry lots and minimum levels. Stock issues can link to a crop, animal or batch. Validate availability and unit compatibility; prevent accidental negative stock. Low-stock and expiry alerts link to the affected items.

Sales capture products, quantities, prices and payments; expenses capture category, supplier, receipt and linked enterprise. Show cash flow separately from enterprise profit. Avoid counting a sale again as manually entered income, or expensing both stock purchase and stock consumption in the same profit calculation. Loan principal is financing, not operating income/expense; interest is separate. Include P&L, monthly comparisons, category charts and break-even estimates where inputs exist.

### Weather, markets, disease and reminders
- Weather: location/district, current conditions, seven-day forecast, rainfall history and actionable alerts. Show source, last update and sample/stale status.
- Markets: products, units, daily price observations, source, comparison, 7/30/90-day trends, buyer/market directories and watchlists. Farmer-submitted prices require moderation. Suggest best observed price with distance where coordinates exist; do not claim transport-adjusted profitability without transport costs.
- Disease center: crop/animal/batch reports, symptoms, severity, affected area, photos, treatment history, curated library and district outbreak notices. Image assessment is advisory, not a confirmed diagnosis. No fabricated confidence percentage or unreviewed treatment dosage.
- Tasks/reminders: due date/time, repeat rule, linked record, urgency, read/snoozed/completed state and preferences. In-app delivery first; background scheduling must work while users are away. SMS/push/email delivery is only enabled after provider setup and consent.

### Reports, settings and administration
Date/enterprise filters, charts, totals, CSV and printable/PDF-friendly farm, production, mortality, inventory, finance and SACCO reports. Save report definitions; derive totals from source records. Settings include profile, preferences, password, own-data export and account-deletion request. Administration covers users, role approvals, public content, prices, alerts, SACCOs and audit history. Account deletion respects agreed financial-record retention rather than erasing posted transactions.

### Farmer SACCO
1. Member requests membership; authorized staff approve; membership number and accounts are created.
2. Record savings, contributions, withdrawals and share capital with receipts and references; display balances from posted entries.
3. Configure loan products: permitted amounts, duration, rate and rate period, interest method, fees, repayment frequency, grace period, penalties, guarantor/collateral requirements and eligibility.
4. Apply → pending → under review → approved/rejected → disbursed → active → completed/defaulted. Approval alone never moves cash. Preserve decisions, reasons, actor and timestamps.
5. Disbursement creates a repayment schedule; record partial/late repayments with principal/interest allocation, receipts and remaining balance. Overdue is based on unpaid due installments; default requires an explicit configured policy.
6. SACCO home shows member counts, savings, disbursements, repayments, outstanding/overdue balances, cash and trends. Member rankings are staff-only.
7. A transparent, versioned advisory credit assessment uses savings consistency, repayment history and consented farm information. Explain missing data; never automatically approve loans. No invented interest rates, penalties, score thresholds or maximum-loan formula: configure and approve these before live use.

### Farm360 Assistant
Conversation history, suggested questions and optional photo attachments. Use only the user's authorized farm context; SACCO context is limited to the user's own information. Financial answers cite saved totals/date ranges; safety-sensitive advice recommends an extension officer or vet. Begin with explicitly labeled demonstration replies; live AI is connected separately. AI cannot post money, change roles or approve loans.

## 5. Technical details — database design
Use Lovable Cloud for persistent database records, accounts and private uploads. Keep application logic in the existing TanStack application. Proposed table groups:

| Area | Tables and important fields |
|---|---|
| Identity/access | `profiles` (auth user FK, name, phone, district, avatar, preferences); separate `user_roles`; `farm_members` (farm, user, access); consent records |
| Farms | `farms` (owner, location, GPS, acres, soil, water, archived); `fields` (farm, name, acres, irrigation); farm workers |
| Crops | `crop_plantings` (field, crop/variety, season, dates, status, expected yield); `crop_activities`; `harvests` (date, quantity, unit, grade) |
| Livestock | `animals`; typed weight, feed, breeding/birth, milk and mortality records; `vaccinations`; `treatments` |
| Poultry | `poultry_batches`; `poultry_daily_records`; weight records; bird movements; `egg_production`; egg movements |
| Health | `diseases`/guides; `disease_reports`; report attachments; extension/veterinary directory |
| Stock | `inventory_items`; `inventory_lots`; append-only `inventory_transactions`; `suppliers` |
| Farm finance | `sales` + sale lines; `expenses` + lines; `payments`; other income; transaction references and allocations to enterprises |
| Weather/markets | `weather_observations`, forecasts, alerts; `markets`; products/units; `market_prices`; `buyers`; watchlists |
| Tasks/reports | `tasks`, reminder rules, `notifications`, delivery attempts; report definitions; notification preferences |
| SACCO membership | `saccos`; `sacco_members`; separate scoped staff assignments; consented member documents |
| SACCO accounting | accounts; journal entries + balanced journal lines; savings/contribution/share transactions referencing journal entries; receipt references |
| Lending | `loan_products`; `loan_applications`; guarantors/documents; approval history; `loans`; `loan_installments`; `repayments` + allocations; versioned credit assessments |
| Platform | `ai_chats`, messages, attachments; `audit_logs`; contact requests; deletion requests; settings |

**Relationships and integrity**
- One user can access multiple farms and join multiple SACCOs. Farm records carry `farm_id`; SACCO records carry `sacco_id`. Check that referenced records belong to the same tenant.
- One field has many planting seasons; one planting has many activities/harvests. Animals and poultry belong to a farm; records reference valid parents.
- One SACCO has many memberships/products; an application references an approved membership; a loan references its approved application and snapshotted terms.
- Use UUID keys, foreign keys, timestamps, actor IDs, status checks and indexes for tenant/date/status searches. Units and quantities use precise decimals; money uses exact UGX amounts, never floating-point arithmetic.
- Require unique membership numbers per SACCO, animal tags per farm, external payment references and idempotency keys. Uniqueness for daily records includes the production session where relevant.
- Post stock movements and related usage atomically. Post monetary events, balanced journal lines and repayment allocations atomically; reject duplicate submissions and unauthorized state changes. Corrections reference reversal entries.
- Store timestamps in UTC, farming dates as dates, and display local time. Keep financial terms/history when products change. Derive balances and reports; do not maintain independent editable copies.

## 6. Security, data and integrations
- Database access policies isolate farms, members and SACCOs; enforce permissions again for protected actions. Role values never live in editable profile fields. Give each table explicit grants and policies.
- Private photos, receipts, national-ID documents and loan attachments use scoped storage and expiring access links. Collect sensitive identity details only when necessary; restrict member-document access to authorized staff.
- Audit role changes, approvals, disbursements, postings, reversals and support actions. Do not log credentials or full identity documents.
- Seed realistic Ugandan demonstration records through migrations in a clearly separated demo dataset. Include crops, animals, poultry, stock movements, linked transactions and loan schedules that reconcile. Never present sample prices/weather as live.
- Initially: manual/admin market entries, labeled sample weather, in-app notifications, recorded payments and demo AI. Later: weather provider, mobile money, SMS, maps and live AI. Payment recording is **not** money transfer; real transfers require a provider, signed callbacks and reconciliation.
- Automated schedules require a configured authenticated scheduler with persisted delivery state and retry/deduplication; do not rely on browser timers. Review backup/restore and retention arrangements before real financial use.

## 7. Build phases and completion checks
1. **Foundation:** public pages, Cloud setup, accounts/profile confirmation, safe roles, onboarding, farm/plot CRUD, isolated demo.
2. **Core farming:** dashboard, crops, livestock, poultry and record-based production charts.
3. **Stock and finance:** linked inventory usage, sales, expenses, receipts, cash flow and reconciled reports.
4. **Intelligence:** curated disease center, manual markets, labeled weather, tasks, scheduled in-app reminders and reports.
5. **SACCO:** memberships, accounting, configured loan rules, approvals, disbursements, repayments, receipts and advisory assessments.
6. **Completion:** assistant, admin/settings, exports, accessibility and real integration setup where authorized.

Each phase must pass validation, permission tests and an authenticated end-to-end journey with saved data read back. Test cross-farm/SACCO denial, privileged-role self-assignment, duplicate postings, stock availability, loan arithmetic, partial/late payments and corrections. Verify Android-sized screens, tablet/desktop, keyboard access and slow/error states. All visible links resolve to working pages or clearly marked future modules; never label a demonstration feature as operational.

**Before live SACCO use:** approve loan/accounting/credit rules, withdrawal approvals, staff permissions, privacy/retention policy and reconciliation process. Plan prices, external service costs, translations, offline syncing and regulated lending compliance are not invented or silently included.