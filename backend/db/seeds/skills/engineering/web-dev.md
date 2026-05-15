---
slug: web-dev
name: Web Development
description: Build production-ready websites and apps — Next.js by default, lucide-react icons, real images, git history, ready to deploy.
category: engineering
icon: code-2
requires_connections: []
---

# Web Development

When the user asks you to build a website, landing page, or web app, build it like a senior front-end engineer would — not a 1996 single-file `<html>` with inline CSS.

## Default stack (use unless the user explicitly says otherwise)

- **Next.js 15+ with the App Router** — `app/layout.tsx`, `app/page.tsx`. Server Components by default; `"use client"` only where you need interactivity.
- **Tailwind CSS** — already wired in `create-next-app`. Use design tokens (`bg-zinc-950`, `text-zinc-100`), don't hand-roll colour values.
- **TypeScript** — every component is `.tsx`. No `any`.
- **lucide-react for icons** — `import { Menu, ArrowRight, Heart, Stethoscope, Calendar } from "lucide-react"`. NEVER copy-paste raw SVG paths or use emoji as icons. NEVER write your own `<svg>`.
- **next/image for images** — `import Image from "next/image"`. Real images, real `width`/`height`, `priority` on hero. No raw `<img>`. No placeholder colour rectangles.
- **next/font for typography** — `import { Inter } from "next/font/google"`. Don't link Google Fonts via `<link>` in `<head>`.

Static single-file HTML is a fallback, not the default. If the user wants something live in 30 seconds with no framework, ask once: "static HTML or full Next.js app?" — default to Next.js if no answer.

## Project bootstrapping

```bash
cd workspace
npx create-next-app@latest <project-slug> --ts --tailwind --app --src-dir --turbopack --use-pnpm --no-import-alias
cd <project-slug>
pnpm add lucide-react
```

`<project-slug>` matches what you'll deploy as on Vercel: lowercase, hyphens, ≤52 chars.

## Real images (not coloured rectangles)

Use Unsplash Source URLs for stock imagery — no API key needed, deterministic, free:

```tsx
<Image
  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&q=80&auto=format&fit=crop"
  alt="Doctor consulting with a patient"
  width={1600}
  height={900}
  priority
/>
```

Add to `next.config.ts`:
```ts
images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }] }
```

For brand-specific shots (logo, founder photo, product screenshot), ASK the user to provide URLs or files in `workspace/`. Don't fabricate.

## Icon usage

```tsx
import { Stethoscope, ShieldCheck, Clock, Sparkles } from "lucide-react";

<div className="flex items-center gap-3">
  <Stethoscope className="size-5 text-emerald-500" />
  <span>Board-certified physicians</span>
</div>
```

Browse at https://lucide.dev/icons — pick names that exactly match the concept. Use `size-N` Tailwind classes, not the deprecated `w-N h-N` pair.

## Git workflow (always)

```bash
cd workspace/<project-slug>
git init
git add . && git commit -m "Initial scaffold from create-next-app"

# After meaningful edits — commit per logical change, not one giant commit:
git add app/page.tsx components/hero.tsx
git commit -m "Add hero with stethoscope CTA"

git add app/about/page.tsx
git commit -m "About page with founder bio"
```

- Commit early, commit often. Each commit one logical change.
- Imperative present-tense subject ("Add hero", "Fix mobile nav") under 70 chars.
- The user can `git log` to audit your work and `git revert` if something breaks.
- Don't commit `node_modules` (the default `.gitignore` from create-next-app handles it).

## File structure (Next.js App Router)

```
src/
  app/
    layout.tsx        ← root layout, font loading, <body>
    page.tsx          ← home
    about/page.tsx    ← /about
    contact/page.tsx  ← /contact
    globals.css       ← Tailwind + CSS vars
  components/
    hero.tsx
    nav.tsx
    footer.tsx
    feature-grid.tsx
public/
  favicon.ico
  og-image.png        ← 1200x630 social card
```

Component files are kebab-case. Default export named per the file (`hero.tsx` → `export default function Hero`).

## Quality bar (every site you ship)

- **Mobile-first** — design for 375px width, scale up. Test with `pnpm dev` + browser devtools narrow.
- **Dark/light theme** — at minimum default-dark (`<html className="dark">`); ideally support both via `next-themes`.
- **Accessibility** — semantic HTML (`<header>`, `<nav>`, `<main>`, `<button>`), keyboard focus rings, alt text on every image.
- **Performance** — `<Image priority>` on hero only; everything else lazy. No giant client bundles for static content.
- **SEO** — every page exports `metadata` (title, description, openGraph). Build `app/sitemap.ts` for non-trivial sites.

## When the user asks for "a quick landing page"

Default flow:
1. `npx create-next-app` (~30 seconds)
2. Build the page (hero + 2-3 feature sections + CTA + footer)
3. Add real images via Unsplash, real icons via lucide-react
4. `git init && git commit` per logical chunk
5. Deploy via the `vercel-deploy` skill if installed: `framework: "nextjs"` in projectSettings
6. Hand back the URL

Total: ~5-10 minutes for a real-looking site, not 90 seconds for a coloured-rectangle stub.

## Don't

- Don't write a 700-line single `index.html` with inline styles when Next.js + Tailwind exists.
- Don't use emoji as icons.
- Don't use placeholder colour blocks where images should be.
- Don't `git add -A` blindly — pick the files you actually changed.
- Don't skip the commit history. Every meaningful edit gets its own commit.
- Don't push to a real remote without the user asking. `git remote add` only when they say "push to my GitHub."
