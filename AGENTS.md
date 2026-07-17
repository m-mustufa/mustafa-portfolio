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
- Posts should NOT auto-publish straight to `main`. Workflow, **built and proven end-to-end**: draft → pushed to a `blog-draft-{slug}` branch → Netlify branch-deploy preview URL (auto, via a `blog-draft-*` wildcard pattern in Netlify's branch-deploy settings) → email notification via Formspree → user reviews the live preview URL → user says "publish it" → branch merged into `main` → pushed → live on production. This full loop has actually run successfully once (see "first real post," below), not just been built and assumed to work.
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
- Blog pages (listing + post template + the one live post) were missing a mobile hamburger menu entirely — nav was `hidden md:flex` with no toggle button, so mobile users had zero navigation. Fixed by copying the exact hamburger/`#mainNav` pattern from `index.html` into `blog/index.html`, `blog/_template.html`, and the live post page. Any future post generated via `new-post.js` inherits this correctly from the template — no action needed for new posts, this note is only relevant if the template ever gets rewritten.
- `assets/js/style.js` used to assume `#typewriter` and the global `Swiper` always exist, which crashed (thrown error, silently killing the rest of the `window.onload` handler including the header-scroll effect) on any page without them — i.e. every blog page. Now guarded: `if (el) type();` and `if (typeof Swiper !== "undefined" && document.querySelector(".testimonials-swiper"))`. This file is shared site-wide — if you add a new page that includes it, don't assume it's safe by default, but it now is for the current set of pages.

### First real post — published, live, full loop verified (2026-07-16/17)
`blog/stripe-per-seat-billing-multi-tenant-saas.html` — "Stripe Per-Seat Billing: What Actually Breaks," grounded in the user's real CultureAI billing work, researched via `WebSearch` against current Stripe docs rather than written from memory (923 words). Hero image: user supplied a real custom diagram (not the SVG fallback), which was resized/compressed (1.4MB PNG → 141KB JPEG, 1200x675) and dropped in at `blog/images/stripe-per-seat-billing-multi-tenant-saas.jpg`, replacing the placeholder banner on the draft branch before merge.

This went through the full intended pipeline for real, not just a dry run: `new-post.js` → `publish-draft.js` (branch created, pushed, Formspree notification sent) → user reviewed the live Netlify preview URL → user supplied the real image (swapped in on the draft branch, re-pushed) → user said "publish it" → branch merged into `main` → pushed → confirmed live on `mustcode.netlify.app` with a headless-browser check (200 status, zero console errors, homepage blog section present). Treat this as the reference example for how the pipeline is supposed to work.

### Notification + branch-preview flow — built and confirmed working
- **Formspree**: dedicated form "blog-automation", endpoint `https://formspree.io/f/mykrklbg` — separate from the site's real contact form (`xjkrnwyl`).
- **Gotcha already hit once — Formshield spam filter silently ate a real notification**, and this was diagnosed and fixed, not just noticed. The first plain test message delivered fine; a second message containing a URL + imperative phrasing ("Reply to X with...") got auto-classified as spam with zero error on the sending side (`notify.js` logs success once the HTTP request succeeds — Formspree accepts, then filters, so a "sent" log does not guarantee delivery). **Fix applied and confirmed by the user: Formshield toggled OFF in Formspree → blog-automation → Settings → Spam Protection.** Message wording in `publish-draft.js` was also softened as a second layer of defense. If notifications ever seem to silently stop arriving again, check the Formspree Spam tab before assuming the script broke.
- `scripts/notify.js` — POSTs subject+message to the Formspree endpoint above (hardcoded, not a secret).
- `scripts/publish-draft.js` — orchestrator: creates a `blog-draft-{slug}` branch, commits the draft files, pushes, computes the Netlify preview URL, calls `notify.js`, switches back to `main`. **Run successfully for real** (see above), not just built.
- **Netlify branch deploys**: confirmed configured by the user — NOT set to "All" (that was flagged as a real risk: it would auto-deploy every branch in the repo, including old unrelated feature branches like `dev`/`cv-pdf-update`, to a public-but-unlisted URL). Set instead to **"Let me add individual branches"** with the pattern **`blog-draft-*`** — Netlify's dashboard does support wildcard patterns in that field, confirmed working. Only branches matching that pattern get a preview URL; everything else stays undeployed. Don't change this to "All" without discussing it again.
- **Keep draft branch names short.** A later Angular post used its very long SEO slug as the `blog-draft-*` branch name. The resulting Netlify branch-deploy hostname exceeded DNS label limits and could not resolve, even though the branch push itself succeeded. Use a concise branch slug for previews (and preferably concise public post slugs too); do not assume an arbitrary SEO slug is safe to embed in a Netlify subdomain.

### Additional published posts (2026-07-17)
- `blog/supabase-rls-multi-role-apps.html` — “Supabase RLS for Multi-Role Apps: What I Learned,” grounded in BWL League and current official Supabase documentation. Published through the preview/approval flow with a user-supplied RLS diagram compressed to a 1200×675 JPEG.
- `blog/extjs-angularjs-to-modern-angular-migration-version-upgrade-v8-to-v19-enterprise-dashboard-modernization.html` — “Angular Migration: ExtJS and AngularJS to Angular 19,” grounded in the user's Angular v8–v19 and SaaS modernization experience and current official Angular documentation. The preview hostname failed because the branch name was too long (see warning above), but the user explicitly approved publication; it was merged into `main`, pushed, and the production URL was verified with HTTP 200.

### Still to build
- The actual scheduled agent/cron trigger that calls `new-post.js` + `publish-draft.js` automatically (mechanism: the `/schedule` skill) — not set up yet. The manual pipeline is proven; this is "just" wiring a cron to invoke it.
- **Posting cadence, finalized 2026-07-17**: publish **2–3 strong posts per week**, not 1–2 posts daily. Suggested rhythm: one detailed technical guide early in the week, one project lesson/case study midweek, and an optional focused troubleshooting post on the weekend. Every post must target a distinct long-tail keyword, use real project experience, and link naturally to related posts/projects. Do not trade quality for volume or revert to daily publishing without asking.
- **Topic-picking logic for automatic runs**: right now topic selection happened manually (I picked "Stripe per-seat billing" myself, grounded in the user's project list). For a real cron loop, need either a maintained backlog of remaining real topics (recommended — see project list in "Topic sourcing" above) or some logic to pick the next one and avoid repeats. Not built yet.
- Ahrefs API integration for topic validation, if the user confirms their plan has API access — not pursued further after the initial conversation, no action taken.

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

## Google Search Console / indexing state (confirmed 2026-07-17)

- Search Console property is the exact URL-prefix property `https://mustcode.netlify.app/`.
- `/sitemap.xml` is submitted successfully. After resubmitting the same `sitemap.xml` path from the top-level **Add a new sitemap** form, Google reread it on July 17 and the discovered-page count increased from 2 to 5. The sitemap detail page only offered **Remove sitemap**; resubmission was done from the main Sitemaps screen. Do not remove the successful sitemap.
- The URL Inspection **Request indexing** action has a daily quota. The user hit “Quota Exceeded”; this is a Google limit, not a site error. Do not keep retrying. Wait for the quota reset and request indexing only for the newest/highest-priority URL if needed.
- A successful sitemap queues URLs for discovery/crawling but does not guarantee immediate indexing or ranking. Allow several days (roughly a week before treating it as a problem), and use the Page Indexing report rather than repeatedly resubmitting.
- Ranking strategy agreed with the user: prioritize original, experience-backed posts; descriptive contextual internal links; clear author credibility/bylines; narrow long-tail keywords; and legitimate backlinks/sharing. Never buy links, spam submissions, or mass-produce thin posts.
