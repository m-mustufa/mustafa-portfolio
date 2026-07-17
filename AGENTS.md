# AGENTS.md — Project & Blog Automation Notes

Read this before making changes. Written so any AI coding agent (Claude, Codex, etc.) picking this repo up cold has full context, not just the previous agent.

## What this project is

Static HTML portfolio site for Muhammad Mustafa (Full-Stack SaaS Engineer). No framework, no server, no database.

- `index.html`, `portfolio.html`, `thanks.html` — the 3 live pages
- `assets/` — images, CSS, JS
- Hosted on **Netlify**, deployed automatically on push to `main`
- Git remote is **Bitbucket** (`origin`), not GitHub

## Build step (the one exception to "no framework")

Tailwind CSS is **precompiled**, not loaded from a CDN (it was originally, but that's a 124 KiB render-blocking script — see git log for the perf pass that removed it).

```bash
npm install        # first time only
npm run build:css  # rebuild assets/css/tailwind.css after ANY class change in the HTML
```

**If you add or change a Tailwind class anywhere and forget to rebuild, the new class will have no styling on the live site.** This has bitten past sessions — always rebuild before considering an HTML edit done.

## Git / deploy notes

- Bitbucket **deprecated app passwords** (returns HTTP 410). Auth now uses an Atlassian API token stored via the `manager` credential helper (Windows Credential Manager). If push suddenly fails with a 410, the stored token needs replacing — ask the user for a fresh one from Bitbucket → Personal settings → API tokens.
- Never commit secrets (API keys, tokens) to any file in this repo. `.gitignore` already excludes `node_modules/`.
- The user has repeatedly asked for pushes to be a separate, explicit step ("push it") — don't push automatically after every change.

## Blog system (in progress)

**Goal:** an automated pipeline that drafts SEO blog posts on a schedule, generates a relevant image, and notifies the user with a preview link for approval before it goes live. This is being built incrementally — check the state below before assuming any piece exists.

### Decided
- Blog lives at `/blog/` as more static HTML pages (no CMS, no database, consistent with the rest of the site) — this preserves everything already optimized (page speed, zero backend attack surface, Netlify static hosting).
- Posts should NOT auto-publish straight to `main`. Intended workflow: draft → pushed to a separate branch → Netlify branch-deploy preview URL → user reviews via notification link → approved → merged to `main`. **The branch/preview/notification automation itself is not built yet** — only the static templating pieces are. Right now, review happens by opening the generated HTML file directly (works via `file://` for individual post pages by design — see note below) or running a local server.
- Images: try OpenAI's Images API (`gpt-image-1`) if `OPENAI_API_KEY` is set in the environment; otherwise fall back to a zero-cost generated SVG banner in the site's own visual language (no external API, no signup). User does not want to pay for OpenAI yet — the fallback is the default working path today. See `scripts/generate-image.js`.
- Reuse the site's existing design language for post pages (same header/nav/footer, same Tailwind classes, same primary color `#106473`).
- **Content rules, finalized by the user (do not deviate without asking):**
  1. Plain, simple English — explain jargon, don't assume it
  2. **800–1500 words** (not characters — this was explicitly corrected after the user initially said "1000 characters," confirmed twice)
  3. Real on-page SEO structure: primary keyword in title/H1/first ~100 words/meta description/at least one H2; proper H2→H3 hierarchy; short paragraphs
  4. Human-toned, not AI-generated: first person ("I"), specific concrete details from real projects, stated opinions/trade-offs, zero AI-filler phrases ("in today's fast-paced world," "moreover," "in conclusion"), no keyword stuffing
  5. Full helpful-content structure: intro stating what the post covers, 2–4 substantive H2 sections, a code snippet where genuinely relevant (technical audience), closing takeaway, internal link to the relevant portfolio project when it fits naturally
  - Every post ends with a CTA linking to `/#contact` (default, not explicitly confirmed but matches site convention — flag if user objects)
  - Never fabricate stats/quotes/incidents; describing real general technical experience is fine, inventing specific unverifiable claims is not
- **Topic sourcing**: user explicitly rejected both free trend-scraping (fragile, no official free API) and generic AI topic-chasing. Current approach: do a real web search (`WebSearch` tool) on the chosen technical topic to ground the post in current, accurate information — not just written from training-data memory — with topics chosen from the user's real project stack (CultureAI, BWL League, Apex Logistics, AutoLeap, StartStorez tech). User floated paying for Ahrefs API access for real keyword-volume validation later — not set up, would need user to confirm their plan includes API credits (it's a separate paid add-on from a normal seat) before building against it.

### Built and verified (first real post published as of 2026-07-16)
- `blog/_template.html` — reusable post template. **Uses relative asset/image paths on purpose** (`../assets/...`, `images/{{SLUG}}.jpg`), not root-relative — this lets the user open a draft post directly via `file://` (double-click) and see it fully styled, which is how they've been reviewing drafts. Do not "fix" this back to root-relative; it was deliberately changed after the user hit a broken-styling issue from double-clicking a file.
- `blog/index.html` — the listing page. **Must stay root-relative** (`/assets/...`, `/blog/images/...`) — unlike individual posts, this page previously broke via a static-server clean-URL redirect quirk (`/blog/index.html` → `/blog`) that mangles relative path resolution. Don't unify these two pages onto the same path style; they need different ones for different reasons.
- `blog/posts.json` — **single source of truth** for all published posts (slug, title, metaDescription, heroImageAlt, publishDate, publishDateIso, readingTime), newest first.
- `scripts/generate-image.js` — image generation, OpenAI-or-fallback as above.
- `scripts/new-post.js` — the full publish pipeline: renders the post page from the template, generates the image, prepends to `posts.json`, then **regenerates** (not string-patches) `blog/index.html`, the homepage "From the Blog" section, and `sitemap.xml` entirely from the manifest. Regenerating from the manifest instead of incrementally patching HTML means it's idempotent and can't drift out of sync.
- Homepage integration: `index.html` has a "From the Blog" section (id `blog-preview`, marker comments `HOME_BLOG_START`/`HOME_BLOG_END`) between the projects section and "Why Work With Me?", showing the latest 3 posts. Both `index.html` and `portfolio.html` nav bars now have a "Blog" link to `/blog/index.html`.
- **Tested end-to-end multiple times**, not just written and assumed working. Bugs found and fixed along the way:
  1. Image paths were root-relative on the listing page's generated cards but that broke via the clean-URL redirect quirk above — fixed by keeping `blog/index.html` root-relative and generating correct paths in `new-post.js`.
  2. `pt-32` top padding didn't clear the header at full (unscrolled) height — the date/reading-time line was hidden behind it. Bumped to `pt-40` in both `_template.html` and `blog/index.html`.
  3. Individual post template originally used root-relative paths too, which broke when the user reviewed by double-clicking the file (`file://` has no site root to resolve `/assets/` against). Switched post pages specifically to relative paths (see above) — this is intentional, not an oversight.
- Requires `@tailwindcss/typography` plugin (installed, added to `tailwind.config.js` content/plugins) for the `prose` classes that style long-form post HTML content.
- First real post is live in the repo (not yet pushed as of this writing): `blog/stripe-per-seat-billing-multi-tenant-saas.html`, grounded in the user's real CultureAI billing work, researched via `WebSearch` against current Stripe docs rather than written from memory.

### Notification + branch-preview flow (built, not yet fully wired end-to-end)
- **Formspree**: user created a dedicated form called "blog-automation", endpoint `https://formspree.io/f/mykrklbg` — separate from the site's real contact form (`xjkrnwyl`) so blog notifications never mix with actual customer leads.
- **Gotcha already hit once — Formshield spam filter silently ate a real notification.** The first test message (plain, no link) delivered fine; the second (contains a URL + "Reply to X" instruction) got auto-classified as spam and never emailed, with zero error on the sending side — `notify.js` logged success because the HTTP request itself succeeded; Formspree just filtered it after accepting it. **User was told to turn off "Formshield" in Formspree → blog-automation → Settings → Spam Protection** (this form only ever receives submissions from our own script, never the public, so filtering has no upside). Confirm this is actually off before assuming notifications are reliable — if a "sent successfully" log doesn't produce a real email again, check the Spam tab in Formspree first, don't assume the script is broken. Also softened the message wording in `publish-draft.js` (removed the imperative "Reply to Claude with..." phrasing) as a second layer of defense.
- `scripts/notify.js` — POSTs subject+message to the Formspree endpoint above. Endpoint is hardcoded in the file (not a secret — Formspree endpoint IDs aren't sensitive, they rely on origin/spam checks not secrecy).
- `scripts/publish-draft.js` — orchestrator: creates a `blog-draft-{slug}` branch, commits the draft files, pushes to origin, computes the Netlify branch-deploy preview URL (`https://blog-draft-{slug}--mustcode.netlify.app/blog/{slug}.html`), calls `notify.js`, switches back to `main`. **Built but not yet run for real** (creating a real branch push is a remote-visible action — hold off running this until the user explicitly says go, same as the main-branch push convention).
- **Netlify branch deploys**: must be enabled for `publish-draft.js`'s preview URLs to actually resolve. User needs to go to Netlify dashboard → site → Site configuration → Build & deploy → Continuous deployment → Deploy contexts → Branch deploys → set to "All". Not confirmed done yet as of this writing. (Alternative: user could give a Netlify access token and I can do this via their API instead of asking them to click through the dashboard — not done, they haven't offered one.)

### Still to build
- The actual scheduled agent/cron trigger that calls `scripts/new-post.js` + `scripts/publish-draft.js` automatically (mechanism: the `/schedule` skill) — not set up yet
- **Posting cadence**: user requested **daily**. Flagged a real concern before building against it: daily (~30 posts/month) will likely exhaust genuinely distinct, non-repetitive real topics from the user's actual project stack faster than the topic pool can sustain without drifting into thin/generic content — which directly conflicts with rule 4 (human-toned, not AI-filler) and is the exact pattern Google's helpful-content system suppresses. Also means a review email lands in the user's inbox every single day. Raised this once; final cadence decision is the user's call, don't re-litigate further, just don't be surprised if quality/topic-repetition becomes a real problem at daily cadence and it needs revisiting.
- Ahrefs API integration for topic validation, if the user confirms their plan has API access

## Possible future: JS framework migration + admin panel (discussion only — nothing started)

User asked about converting the static site to a JS framework with an admin panel for adding projects/content without editing code, with two hard constraints: **no SEO/speed regression, no paid services**.

Key point already established with the user: a framework migration does not *improve* SEO/speed over the current static HTML — this site is already near the ceiling (a few dozen KB of CSS, no framework overhead). The migration is justified purely by content-management convenience, and can only ever *match* current performance (via static export), never beat it. Framed this way to the user already — don't re-litigate, just don't regress it either if this gets built.

Recommended direction (not yet agreed/started):
- **Next.js in static export mode** (matches user's existing stack knowledge, pre-renders to plain HTML at build time, free on Netlify)
- **Admin panel**: two options discussed, neither decided —
  1. **Decap CMS** (free, git-backed, form UI at `/admin` that commits to the repo and triggers a rebuild) — best "add project in seconds" UX, but built primarily around GitHub/GitLab; Bitbucket backend support is less mature, so this likely implies moving the git remote off Bitbucket to GitHub (also free)
  2. **Custom-built admin** (auth-gated form → writes a `projects.json` → git commit), same pattern as the blog pipeline above — more work upfront, zero third-party dependency
- User has not chosen between these, and has not committed to moving off Bitbucket. Do not start implementation — this needs to be scoped as a real file-by-file plan first, given it's larger than everything else built in this project combined.

## SEO/perf conventions established this project (apply to any new pages, including blog posts)

- Every page needs: unique `<title>` (~60 char budget), meta description (~150–160 chars), canonical link, OG + Twitter tags, single `<h1>`, one `<main>` landmark, `robots.txt`/`sitemap.xml` entries.
- Every `<img>` needs real `width`/`height` attributes (not just CSS sizing) and descriptive, non-generic `alt` text — this project had 10 images sharing one useless alt text and it was flagged by Lighthouse.
- Every `target="_blank"` link needs `rel="noopener noreferrer"`.
- Images: convert to JPEG for photos/screenshots (not PNG — this project had multiple 1.5MB+ PNGs that dropped to ~150KB as JPEG with no visible quality loss), keep PNG only for real transparency.
- Don't fabricate or pad real testimonial/review content — trim for length if needed, never invent quotes.
