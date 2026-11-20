import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { MessageCircleQuestion, Send, Sparkles } from "lucide-react";
import { Card, Field, inputClass, Page, Primary, TopBar } from "@/components/chrome";
import {
  ADVICE_CATEGORY_LABELS,
  adviceAvailability,
  askAgronomist,
  myAdvice,
  type AdviceAnswer,
  type AdviceCategory,
  type AdviceResult,
} from "@/lib/advice.functions";
import { useDesk } from "@/lib/use-desk";

export const Route = createFileRoute("/desk/advice")({ component: AdvicePage });

function AdvicePage() {
  const { profile } = useDesk();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [category, setCategory] = useState<AdviceCategory>("crops");
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<AdviceAnswer[]>([]);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    void myAdvice().then(setHistory).catch(() => undefined);
  }

  useEffect(() => {
    if (!profile) return;
    void adviceAvailability().then((a) => setConfigured(a.configured)).catch(() => setConfigured(false));
    load();
  }, [profile]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback("");
    try {
      const result: AdviceResult = await askAgronomist({ data: { category, question } });
      if (result.ok) {
        setHistory((current) => [result.advice, ...current].slice(0, 10));
        setQuestion("");
      } else {
        setFeedback(result.message);
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not send the question.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar profile={profile ?? undefined} />
      <Page>
        <h1 className="flex items-center gap-2 font-display text-4xl text-moss-deep">
          <Sparkles className="size-7 text-moss" /> Ask the AI agronomist
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Describe what you see in the field or the shed and get practical advice for Ugandan growing
          conditions. Answers are saved below so you can compare with what actually happens.
        </p>

        {configured === false ? (
          <Card className="mt-6 border-clay/40">
            <h2 className="font-display text-xl">AI advice is not configured here</h2>
            <p className="mt-2 text-sm text-muted">
              This deployment has no AI provider key. The operator sets <code>XAI_API_KEY</code> (xAI/Grok) or{" "}
              <code>OPENAI_API_KEY</code> in the server environment, and this page starts answering. Nothing is
              faked in the meantime.
            </p>
          </Card>
        ) : null}

        {profile ? (
          <Card className="mt-6">
            <form className="grid gap-4 md:grid-cols-3" onSubmit={submit}>
              <Field label="Topic">
                <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as AdviceCategory)}>
                  {Object.entries(ADVICE_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="What is happening?">
                  <textarea
                    className={inputClass}
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
              <div className="md:col-span-3">
                <Primary type="submit" disabled={busy || configured === false}>
                  <Send className="mr-2 inline size-4" /> {busy ? "Asking…" : "Ask for advice"}
                </Primary>
                {feedback ? <p className="mt-3 text-sm font-semibold text-clay">{feedback}</p> : null}
              </div>
            </form>
          </Card>
        ) : null}

        <h2 className="mt-10 flex items-center gap-2 font-display text-2xl">
          <MessageCircleQuestion className="size-5 text-moss" /> Your past questions
        </h2>
        <ul className="mt-3 space-y-3">
          {history.map((item) => (
            <li key={item.id}>
              <Card>
                <p className="text-xs font-semibold uppercase text-moss">{ADVICE_CATEGORY_LABELS[item.category] ?? item.category}</p>
                <p className="mt-1 font-semibold">{item.question}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{item.answer}</p>
              </Card>
            </li>
          ))}
          {profile && !history.length ? <li className="text-sm text-muted">No questions yet. Ask the first one above.</li> : null}
        </ul>
      </Page>
    </>
  );
}
