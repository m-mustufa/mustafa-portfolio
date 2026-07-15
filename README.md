# Mustafa Portfolio

Static site — `index.html`, `portfolio.html`, `thanks.html`. Plain HTML + vanilla JS, deployed as-is to Netlify with no build step, **except for Tailwind CSS**, which is precompiled to a static file for performance (see below).

## Tailwind CSS build

Tailwind used to load from `cdn.tailwindcss.com` (the Play CDN), which is not meant for production — it ships the full runtime (~124 KiB) and generates styles in the browser on every page load, blocking render. It's now compiled ahead of time into `assets/css/tailwind.css`, a static file scoped to only the classes actually used across the site (~30 KiB).

**This means: after editing any Tailwind class in the HTML, you must rebuild the CSS before deploying, or the new classes won't have styles.**

```bash
npm install        # first time only
npm run build:css  # rebuild assets/css/tailwind.css after any class changes
```

While actively editing, `npm run watch:css` will rebuild automatically on save.

Tailwind's theme customization (the `primary` color, etc.) lives in `tailwind.config.js`, not inline in the HTML anymore.

## Deploying

Commit the rebuilt `assets/css/tailwind.css` along with your HTML changes, then push — Netlify deploys the repo as static files, no build command configured on their end.
