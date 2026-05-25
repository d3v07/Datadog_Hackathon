import { useState } from "react";
import { Mail, Shield, Megaphone } from "lucide-react";
import { PageShell } from "../components/PageShell.js";

interface ContactForm {
  name: string;
  email: string;
  message: string;
}

const INITIAL: ContactForm = { name: "", email: "", message: "" };

const CHANNELS = [
  {
    Icon: Mail,
    label: "General",
    email: "hello@unsyphn.com",
    blurb: "Product questions, partnerships, anything else.",
  },
  {
    Icon: Shield,
    label: "Security",
    email: "security@unsyphn.com",
    blurb: "Responsible disclosure, audit requests, DPAs.",
  },
  {
    Icon: Megaphone,
    label: "Press",
    email: "press@unsyphn.com",
    blurb: "Media inquiries, analyst briefings, speaking.",
  },
] as const;

function buildMailto(form: ContactForm): string {
  const params = new URLSearchParams({
    subject: `Inbound from ${form.name || "website"}`,
    body: `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`,
  });
  return `mailto:hello@unsyphn.com?${params.toString()}`;
}

export function Contact(): JSX.Element {
  const [form, setForm] = useState<ContactForm>(INITIAL);

  function update<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.href = buildMailto(form);
  }

  return (
    <PageShell active="contact">
      <header className="public-hero fade-up">
        <h1>Talk to us</h1>
        <p className="lead">
          Pick the channel that fits — we route security and press separately so
          your message lands with the right human.
        </p>
      </header>

      <section className="public-section" aria-label="Contact channels">
        <div className="public-grid stagger-children">
          {CHANNELS.map(({ Icon, label, email, blurb }) => (
            <article key={label} className="public-card glass-strong lift-on-hover">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Icon size={18} aria-hidden="true" color="#5E6AD2" />
                <h3 style={{ margin: 0 }}>{label}</h3>
              </div>
              <p>{blurb}</p>
              <a href={`mailto:${email}`}>{email} →</a>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section fade-up" aria-label="Office">
        <h2>Where we work</h2>
        <p>New Jersey · NYC · Remote-first across North America and Europe.</p>
      </section>

      <section className="public-section glass-strong fade-up" aria-label="Send a message" style={{ padding: 24, borderRadius: 14 }}>
        <h2>Or just send a note</h2>
        <form className="public-form" onSubmit={handleSubmit}>
          <label htmlFor="contact-name">
            Name
            <input
              id="contact-name"
              type="text"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="focus-glow"
              aria-label="Your name"
            />
          </label>

          <label htmlFor="contact-email">
            Email
            <input
              id="contact-email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="focus-glow"
              aria-label="Your email"
            />
          </label>

          <label htmlFor="contact-message">
            Message
            <textarea
              id="contact-message"
              required
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              placeholder="What&rsquo;s on your mind?"
              className="focus-glow"
              aria-label="Your message"
            />
          </label>

          <button type="submit" className="public-btn button-pop">
            Send →
          </button>
        </form>
      </section>
    </PageShell>
  );
}
