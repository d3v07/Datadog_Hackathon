import { useState } from "react";
import type { RequestComment } from "./types.js";

interface Props {
  comments: RequestComment[];
  busy?: boolean;
  onSubmit: (text: string) => Promise<void> | void;
}

function relativeTime(iso: string, now = Date.now()): string {
  const diff = now - Date.parse(iso);
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  const days = Math.round(diff / 86_400_000);
  return days === 1 ? "1d ago" : `${days}d ago`;
}

function Avatar({ letter }: { letter: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "var(--accent-soft)",
        color: "var(--accent)",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {letter}
    </span>
  );
}

export function CommentThread({ comments, busy, onSubmit }: Props): JSX.Element {
  const [draft, setDraft] = useState("");
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? comments : comments.slice(-3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || busy) return;
    try {
      await onSubmit(trimmed);
      setDraft("");
    } catch {
      // Parent surfaces an error toast; keep the draft so the user can retry.
    }
  };

  return (
    <div role="region" aria-label="Comments" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {comments.length > 3 && !showAll && (
        <button
          type="button"
          className="btn btn-ghost button-pop"
          onClick={() => setShowAll(true)}
          style={{ alignSelf: "flex-start", height: 28, fontSize: "var(--text-xs)" }}
        >
          Show all {comments.length} comments
        </button>
      )}
      {visible.length === 0 ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          No comments yet.
        </p>
      ) : (
        <ul className="stagger-children" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {visible.map((c) => (
            <li key={c.id} className="fade-up" style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-start" }}>
              <Avatar letter={c.authorLetter} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 2 }}>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-strong)" }}>
                    {c.authorName}
                  </span>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    {relativeTime(c.at)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text)", lineHeight: 1.5 }}>
                  {c.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <label htmlFor="cmt-input" className="visually-hidden" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          Add a comment
        </label>
        <textarea
          id="cmt-input"
          className="input focus-glow"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          style={{ height: "auto", resize: "vertical", minHeight: 60 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            className="btn btn-secondary button-pop"
            disabled={busy || draft.trim().length === 0}
            style={{ height: 32, fontSize: "var(--text-xs)" }}
          >
            {busy ? "Posting..." : "Post comment"}
          </button>
        </div>
      </form>
    </div>
  );
}
