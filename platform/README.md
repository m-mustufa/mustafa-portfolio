# Mustafa Service Platform

Parallel Next.js build for crawlable service pages and a future one-click service-page admin.

The current static website remains the production source until this application reaches URL, content, SEO, accessibility and performance parity.

## Local development

```bash
npm install
npm run dev
```

## First milestone

- One statically rendered flagship service at `/services/[slug]/`
- Fiverr-inspired gallery, package selector, proof, comparison and FAQ sections
- Basic, Standard and Premium package presentation without invented pricing
- Per-page metadata, canonical URLs, structured data, sitemap and robots output
- Admin workflow foundation at `/admin/services/`

Publishing from the admin is intentionally not connected yet. The next milestone will add authenticated persistence and a build/deploy adapter after the storage and authentication approach is selected.
