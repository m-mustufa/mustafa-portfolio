"use client";

import { FormEvent, useMemo, useState } from "react";

type Draft = {
  title: string;
  slug: string;
  audience: string;
  description: string;
};

const initialDraft: Draft = {
  title: "",
  slug: "",
  audience: "",
  description: "",
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function ServiceDraftBuilder() {
  const [draft, setDraft] = useState(initialDraft);
  const [builtDraft, setBuiltDraft] = useState<Draft | null>(null);
  const suggestedSlug = useMemo(
    () => draft.slug || slugify(draft.title),
    [draft.slug, draft.title],
  );

  const update = (field: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const buildDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBuiltDraft({ ...draft, slug: suggestedSlug });
  };

  return (
    <div className="admin-builder-grid">
      <form className="admin-form" onSubmit={buildDraft}>
        <label>
          Service title
          <input
            required
            value={draft.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="e.g. AI workflow development"
          />
        </label>
        <label>
          URL slug
          <input
            value={draft.slug}
            onChange={(event) => update("slug", slugify(event.target.value))}
            placeholder={suggestedSlug || "generated-from-title"}
          />
        </label>
        <label>
          Best-fit customer
          <input
            required
            value={draft.audience}
            onChange={(event) => update("audience", event.target.value)}
            placeholder="Who should find this page?"
          />
        </label>
        <label>
          Service summary
          <textarea
            required
            value={draft.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Describe the outcome in plain language."
            rows={6}
          />
        </label>
        <button className="button" type="submit">Build service draft</button>
      </form>

      <aside className="draft-preview" aria-live="polite">
        <p className="eyebrow">Generated preview</p>
        {builtDraft ? (
          <>
            <h2>{builtDraft.title}</h2>
            <p>{builtDraft.description}</p>
            <dl>
              <div><dt>URL</dt><dd>/services/{builtDraft.slug}/</dd></div>
              <div><dt>Audience</dt><dd>{builtDraft.audience}</dd></div>
              <div><dt>Status</dt><dd>Draft only</dd></div>
            </dl>
            <p className="notice">
              Publishing is not connected yet. The next milestone adds authentication,
              storage and the build/deploy adapter.
            </p>
          </>
        ) : (
          <p>Complete the form to create a structured service-page draft.</p>
        )}
      </aside>
    </div>
  );
}
