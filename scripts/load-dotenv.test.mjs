import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDotenv } from "./load-dotenv.mjs";

test("parses plain KEY=VALUE lines and skips blanks/comments", () => {
  const parsed = parseDotenv(`
# a comment
DATABASE_URL=postgresql://farmer:secret@127.0.0.1:5432/farmer360

SYNC_TARGET_URL=postgresql://postgres:p@db.host.supabase.co:5432/postgres
`);
  assert.deepEqual(parsed, {
    DATABASE_URL: "postgresql://farmer:secret@127.0.0.1:5432/farmer360",
    SYNC_TARGET_URL: "postgresql://postgres:p@db.host.supabase.co:5432/postgres",
  });
});

test("strips one wrapping pair of quotes but keeps inner # as data", () => {
  const parsed = parseDotenv(`
A="quoted value"
B='single quoted'
C=unquoted#not-a-comment
D="#still-data"
`);
  assert.deepEqual(parsed, {
    A: "quoted value",
    B: "single quoted",
    C: "unquoted#not-a-comment",
    D: "#still-data",
  });
});

test("skips malformed lines without throwing", () => {
  const parsed = parseDotenv(`
no-equals-sign-here
= starts with equals
BAD-KEY=1
1ALSO_BAD=2
GOOD_KEY=ok
`);
  assert.deepEqual(parsed, { GOOD_KEY: "ok" });
});

test("empty and whitespace-only values are preserved (empty string is a value)", () => {
  const parsed = parseDotenv("EMPTY=\nSPACED=   \n");
  assert.deepEqual(parsed, { EMPTY: "", SPACED: "" });
});

test("CRLF line endings are handled", () => {
  const parsed = parseDotenv("A=1\r\nB=2\r\n");
  assert.deepEqual(parsed, { A: "1", B: "2" });
});
