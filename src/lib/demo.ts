/**
 * Demo identities for the Farmer 360 desk.
 *
 * Kept free of server imports so the landing and auth pages can render the
 * quick-fill accounts without pulling the database/auth server into the client.
 * The administrator keeps the original project's school address.
 */
export const DEMO_ACCOUNTS = [
  {
    label: "Farmer",
    name: "Amina Nakato",
    email: "farmer.demo@akatale.ug",
    password: "Harvest#2026",
    note: "Listings, orders and SACCO",
  },
  {
    label: "Buyer",
    name: "Peter Okello",
    email: "buyer.demo@akatale.ug",
    password: "Market#2026",
    note: "Browse produce and order",
  },
  {
    label: "SACCO officer",
    name: "Grace Namuli",
    email: "officer.demo@akatale.ug",
    password: "Sacco#2026",
    note: "Ledger and loan book",
  },
  {
    label: "Administrator",
    name: "J. Muziransa",
    email: "jmuziransa@gmail.com",
    password: "Akatale#2026",
    note: "Approvals and members",
  },
] as const;

export type DemoAccount = (typeof DEMO_ACCOUNTS)[number];
