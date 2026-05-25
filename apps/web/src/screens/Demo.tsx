import { useState } from "react";
import { PageShell } from "../components/PageShell.js";

interface DemoForm {
  name: string;
  email: string;
  company: string;
  size: string;
  useCase: string;
}

const INITIAL: DemoForm = {
  name: "",
  email: "",
  company: "",
  size: "50–250",
  useCase: "",
};

const TEAM_SIZES = ["1–50", "50–250", "250–1000", "1000+"] as const;

function buildMailto(form: DemoForm): string {
  const body =
    `Name: ${form.name}\n` +
    `Email: ${form.email}\n` +
    `Company: ${form.company}\n` +
    `Team size: ${form.size}\n\n` +
    `Use case:\n${form.useCase}\n`;
  const params = new URLSearchParams({
    subject: "Walkthrough request",
    body,
  });
  return `mailto:hello@unsyphn.com?${params.toString()}`;
}

export function Demo(): JSX.Element {
  const [form, setForm] = useState<DemoForm>(INITIAL);

  function update<K extends keyof DemoForm>(key: K, value: DemoForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.href = buildMailto(form);
  }

  return (
    <PageShell active="demo">
      <header className="public-hero fade-up">
        <h1>See Unsyphn in 20 minutes</h1>
        <p className="lead">
          We&rsquo;ll connect a sample workspace, watch one vendor change land, and
          answer your stack-specific questions.
        </p>
      </header>

      <section className="public-section glass-strong lift-on-hover fade-up" aria-label="Walkthrough request" style={{ padding: 24, borderRadius: 14 }}>
        <form className="public-form" onSubmit={handleSubmit} noValidate={false}>
          <label htmlFor="demo-name">
            Name
            <input
              id="demo-name"
              type="text"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="focus-glow"
              aria-label="Your name"
            />
          </label>

          <label htmlFor="demo-email">
            Work email
            <input
              id="demo-email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="focus-glow"
              aria-label="Your work email"
            />
          </label>

          <label htmlFor="demo-company">
            Company
            <input
              id="demo-company"
              type="text"
              required
              autoComplete="organization"
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              className="focus-glow"
              aria-label="Company name"
            />
          </label>

          <label htmlFor="demo-size">
            Team size
            <select
              id="demo-size"
              required
              value={form.size}
              onChange={(e) => update("size", e.target.value)}
              className="focus-glow"
              aria-label="Team size"
            >
              {TEAM_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label htmlFor="demo-usecase">
            Use case
            <textarea
              id="demo-usecase"
              required
              value={form.useCase}
              onChange={(e) => update("useCase", e.target.value)}
              placeholder="What are you trying to fix? Renewal chaos, shadow IT, GRC sprawl, vendor risk…"
              className="focus-glow"
              aria-label="What you want to solve"
            />
          </label>

          <button type="submit" className="public-btn button-pop">
            Request walkthrough →
          </button>
        </form>
      </section>

      <section className="public-section fade-up" aria-label="What to expect">
        <h2>What you&rsquo;ll see</h2>
        <p>
          A 20-minute live session: connect Google or M365 in 90 seconds, watch
          the discovery agent surface 250+ vendors, and trigger a material-change
          alert end-to-end into Slack or Jira. No slideware.
        </p>
      </section>
    </PageShell>
  );
}
