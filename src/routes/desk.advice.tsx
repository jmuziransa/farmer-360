import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { MessageCircleQuestion, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useDeskSession } from "@/components/desk-shell";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
} from "@/components/ui";
import {
  ADVICE_CATEGORY_LABELS,
  adviceAvailability,
  askAgronomist,
  myAdvice,
  type AdviceAnswer,
  type AdviceCategory,
  type AdviceResult,
} from "@/lib/advice.functions";
import { timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/desk/advice")({ component: AdvicePage });

function AdvicePage() {
  const { profile } = useDeskSession();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [category, setCategory] = useState<AdviceCategory>("crops");
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<AdviceAnswer[] | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    void myAdvice().then(setHistory).catch(() => undefined);
  }

  useEffect(() => {
    void adviceAvailability().then((a) => setConfigured(a.configured)).catch(() => setConfigured(false));
    load();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const result: AdviceResult = await askAgronomist({ data: { category, question } });
      if (result.ok) {
        setHistory((current) => [result.advice, ...(current ?? [])].slice(0, 10));
        setQuestion("");
        toast.success("Advice saved below.");
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the question.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="The farm"
        title="Ask the AI agronomist"
        description="Describe what you see in the field or the shed and get practical advice for Ugandan growing conditions. Answers are saved so you can compare them with what actually happens."
        actions={
          configured ? (
            <Badge tone="olive" dot>
              Online
            </Badge>
          ) : configured === false ? (
            <Badge tone="amber">No provider key</Badge>
          ) : null
        }
      />

      {configured === false ? (
        <Card className="border-amber/30 bg-amber-soft">
          <CardContent className="p-5">
            <h2 className="font-display text-[17px] text-amber">AI advice is not configured here</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-amber/90">
              This deployment has no AI provider key. The operator sets <code className="rounded bg-white/60 px-1">XAI_API_KEY</code>{" "}
              (xAI/Grok) or <code className="rounded bg-white/60 px-1">OPENAI_API_KEY</code> in the server environment, and
              this page starts answering. Nothing is faked in the meantime.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Your question</CardTitle>
            <p className="mt-1 text-[12.5px] text-muted">
              The more detail — variety, stage, what changed — the better the advice.
            </p>
          </div>
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-primary/15 bg-primary-xsoft text-primary">
            <Sparkles className="size-4" strokeWidth={1.7} />
          </span>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-3" onSubmit={submit}>
            <Field label="Topic" htmlFor="adv-topic">
              <Select id="adv-topic" value={category} onChange={(e) => setCategory(e.target.value as AdviceCategory)}>
                {Object.entries(ADVICE_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="What is happening?" htmlFor="adv-q">
                <Textarea
                  id="adv-q"
                  rows={4}
                  maxLength={2000}
                  required
                  minLength={10}
                  placeholder="Example: my maize leaves have yellow stripes from the midrib out, started two weeks after top-dressing, Kwashi stage."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </Field>
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" size="lg" disabled={busy || configured === false}>
                <Send className="size-4" /> {busy ? "Asking…" : "Ask for advice"}
              </Button>
              <p className="mt-2 text-[11.5px] text-muted-soft">
                Advice is practical guidance, not a prescription. Confirm spray rates with your agro-dealer.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="flex items-center gap-2 font-display text-[19px] text-ink">
          <MessageCircleQuestion className="size-5 text-primary" /> Your past questions
        </h2>
        <div className="mt-3 space-y-3">
          {!history ? (
            <Card>
              <CardContent className="space-y-2 py-5">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </CardContent>
            </Card>
          ) : history.length === 0 ? (
            <Card>
              <EmptyState
                icon={MessageCircleQuestion}
                title="No questions yet"
                body="Ask the first one above — every answer stays on this page for comparison."
              />
            </Card>
          ) : (
            history.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Badge tone="blue">{ADVICE_CATEGORY_LABELS[item.category] ?? item.category}</Badge>
                    <span className="font-mono text-[10px] tracking-[0.08em] text-muted-soft uppercase">
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2.5 text-[13.5px] font-semibold text-ink">{item.question}</p>
                  <p className="mt-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{item.answer}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
