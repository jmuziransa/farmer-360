import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

// AI agronomist advice. An OpenAI-compatible chat completion happens entirely
// inside this server function, so the provider key never reaches the client.
// Without a configured key the module reports "not configured" instead of
// pretending to answer.

export const ADVICE_CATEGORIES = [
  "crops", "livestock", "poultry", "soil", "pests", "market", "finance",
] as const;

export type AdviceCategory = (typeof ADVICE_CATEGORIES)[number];

export const ADVICE_CATEGORY_LABELS: Record<AdviceCategory, string> = {
  crops: "Crops",
  livestock: "Livestock",
  poultry: "Poultry",
  soil: "Soil & fertiliser",
  pests: "Pests & disease",
  market: "Market & prices",
  finance: "Farm money",
};

type ProviderConfig = { baseUrl: string; apiKey: string; model: string };

/**
 * The first configured provider wins. XAI_API_KEY (xAI's OpenAI-compatible
 * endpoint) is the primary; any OpenAI-compatible service works through
 * OPENAI_API_KEY + OPENAI_BASE_URL. AI_MODEL overrides the default model.
 */
function providerConfig(): ProviderConfig | null {
  const model = (process.env.AI_MODEL ?? "").trim();
  const xaiKey = (process.env.XAI_API_KEY ?? "").trim();
  if (xaiKey) {
    return { baseUrl: "https://api.x.ai/v1", apiKey: xaiKey, model: model || "grok-4.3" };
  }
  const openaiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  if (openaiKey) {
    const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").trim().replace(/\/+$/, "");
    return { baseUrl, apiKey: openaiKey, model: model || "gpt-4o-mini" };
  }
  return null;
}

export function adviceConfigured(): boolean {
  return providerConfig() !== null;
}

// Per-user rate limiting, in memory per server instance: enough to stop a
// looped button, not a distributed quota. 8 questions per 5 minutes.
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 5 * 60_000;
const adviceHits = new Map<string, number[]>();

function allowRequest(userId: string, now = Date.now()): boolean {
  const recent = (adviceHits.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    adviceHits.set(userId, recent);
    return false;
  }
  recent.push(now);
  adviceHits.set(userId, recent);
  return true;
}

export type AdviceAnswer = {
  id: number;
  category: AdviceCategory;
  question: string;
  answer: string;
  model: string;
  createdAt: string;
};

export type AdviceResult =
  | { ok: true; advice: AdviceAnswer }
  | { ok: false; reason: "not_configured" | "rate_limited" | "provider_error"; message: string };

const SYSTEM_PROMPT = [
  "You are an experienced Ugandan agricultural extension officer helping smallholder farmers.",
  "Give practical, specific advice for Ugandan conditions: bimodal rains (March-May and September-November),",
  "local crop and livestock practices, and prices in UGX.",
  "Keep answers under 350 words. Structure: what is likely happening, what to do now, how to prevent it next season,",
  "and when to involve a real extension officer or vet.",
  "Use short paragraphs and '-' bullets only. Never invent prices or chemical names; if unsure, say how to check locally.",
  "The farmer may be a beginner: explain terms on first use.",
].join(" ");

// The completion response is untrusted third-party JSON: read only the fields
// the contract documents, and fail loudly when the shape is wrong.
type ChatCompletion = { choices?: Array<{ message?: { content?: unknown } }> };

async function callProvider(cfg: ProviderConfig, question: string): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.4,
      max_tokens: 900,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Provider responded ${res.status}.`);
  const json = (await res.json()) as ChatCompletion;
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("The provider returned an empty answer.");
  }
  return content.trim();
}

type AdviceRow = {
  id: number;
  category: AdviceCategory;
  question: string;
  answer: string;
  model: string;
  created_at: string;
};

function mapAdvice(row: AdviceRow): AdviceAnswer {
  return {
    id: row.id,
    category: row.category,
    question: row.question,
    answer: row.answer,
    model: row.model,
    createdAt: String(row.created_at),
  };
}

export const askAgronomist = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { category: AdviceCategory; question: string }) => {
    const category = input.category;
    if (!ADVICE_CATEGORIES.includes(category)) throw new Error("Choose a topic.");
    const question = input.question?.trim();
    if (!question || question.length < 10) throw new Error("Describe the problem in at least 10 characters.");
    if (question.length > 2000) throw new Error("Keep the question under 2000 characters.");
    return { category, question };
  })
  .handler(async ({ context, data }): Promise<AdviceResult> => {
    const cfg = providerConfig();
    if (!cfg) {
      return {
        ok: false,
        reason: "not_configured",
        message: "AI advice is not configured on this deployment. The operator needs to set XAI_API_KEY (or OPENAI_API_KEY) in the server environment.",
      };
    }
    if (!allowRequest(context.userId)) {
      return {
        ok: false,
        reason: "rate_limited",
        message: "You have asked several questions in a row. Wait a few minutes, then try again.",
      };
    }
    let answer: string;
    try {
      answer = await callProvider(cfg, `[${ADVICE_CATEGORY_LABELS[data.category]}] ${data.question}`);
    } catch (err) {
      return {
        ok: false,
        reason: "provider_error",
        message: err instanceof Error ? err.message : "The advice service could not be reached.",
      };
    }
    const sql = await getSql();
    const saved = await sql<AdviceRow>`
      insert into ai_advice (user_id, category, question, answer, model)
      values (${context.userId}, ${data.category}, ${data.question}, ${answer}, ${cfg.model})
      returning id, category, question, answer, model, created_at::text as created_at
    `;
    if (!saved[0]) throw new Error("Could not store the answer.");
    return { ok: true, advice: mapAdvice(saved[0]) };
  });

export const myAdvice = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AdviceAnswer[]> => {
    const sql = await getSql();
    const rows = await sql<AdviceRow>`
      select id, category, question, answer, model, created_at::text as created_at
      from ai_advice where user_id = ${context.userId}
      order by created_at desc limit 10
    `;
    return rows.map(mapAdvice);
  });

/** Public, key-free status so the advice page can render its state before login. */
export const adviceAvailability = createServerFn({ method: "GET" }).handler(async () => ({
  configured: adviceConfigured(),
  categories: ADVICE_CATEGORIES,
}));
