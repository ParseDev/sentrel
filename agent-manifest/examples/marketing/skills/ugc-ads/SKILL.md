---
name: ugc-ads
description: Use when making UGC-style ads (authentic creator-talking-to-camera content for TikTok/Reels/Shorts). ALWAYS run the creative brief (ask the user the questions below) before generating. Covers every approach — one-step Veo 3, custom consistent face, stock avatar, faceless — plus script craft and the mandatory self-review loop.
---

# UGC ads

UGC ads look like a real person filmed it on their phone, not a polished
commercial. They out-convert cinematic B-roll on TikTok/Reels/Shorts.

**Rule 0 — interview first, generate second.** Do NOT jump straight to making
a clip. UGC has real forks (which approach, which look, which tone), and
guessing wastes renders and the user's patience. Run the creative brief
below, confirm it back in one line, THEN generate. Offer smart defaults so
the user can just say "go with your defaults."

## Step 1 — Creative brief (ASK the user before generating)

Ask these as a short, friendly checklist (group them, don't interrogate).
Suggest a default for each so they can approve fast:

1. **Approach** — which engine? (explain the trade-off in one line each)
   - **One-step (Veo 3)** — describe a person + their lines, get a talking
     clip with native voice in one shot. Fast, great realism, but a *new*
     person each clip (no consistent recurring face). *Default for most UGC.*
   - **Consistent custom face** — generate a specific person (e.g. a doctor)
     and reuse that exact face across clips, lip-synced. Use when they want a
     recurring "spokesperson."
   - **Stock avatar** — a pre-made generic creator reads the script. Fastest,
     least control.
   - **Faceless** — b-roll + voiceover + big captions. No on-camera person.
2. **Creator(s)** — who's on camera? age / gender / vibe / setting (e.g.
   "late-30s female physician, tired-but-warm, real exam room"). How many
   different creators?
3. **Tone** — urgent / warm / funny / authoritative / "just venting to a friend"?
4. **Angle & CTA** — the one problem → product moment → call to action
   (default angle for ScribeMD: doctors drowning in after-hours charting →
   ScribeMD writes the note → "try it free").
5. **Count & format** — how many variants? Aspect (default 9:16). Length
   (default ~8–20s). Captions/music on the faceless ones?
6. **Anything off-limits** — claims to avoid, must-say lines, brand handles.

Confirm the brief in one line ("3 clips, Veo 3, late-30s female + 40s male
docs, warm tone, after-hours-charting angle, 9:16 — going now") and proceed.

## Step 2 — Generate (pick the approach from the brief)

### A) One-step talking UGC — Veo 3 (default)
One `video.generate` call. No image, no avatar. The **prompt is a full
scene + the exact spoken line** — Veo 3 makes the person, the voice, and the
lip-sync together.
```
video.generate({ model: "fal-ai/veo3", aspect_ratio: "9:16",
  prompt: "Vertical phone selfie video. A tired late-30s female doctor in a
   white coat in a real exam room, talking straight to camera like she's
   venting to a friend, says: 'Okay real talk — if you're still charting at
   11pm, you need ScribeMD. It writes your notes for you. I got my evenings
   back. Link's right here.' Natural handheld phone look, candid." })
```
Use `fal-ai/veo3/fast` for cheaper/quicker drafts. Vary the person + line per clip.

### B) Consistent custom face (recurring spokesperson)
Two steps — make the face once, reuse it, lip-sync each script.
1. `image.generate({ model: "fal-ai/flux-pro/v1.1-ultra", aspect_ratio:
   "9:16", prompt: "<TIGHT head-and-shoulders selfie, face fills frame, no
   hands/arms in shot, photoreal skin, real setting blurred behind>" })`
   — tight framing is essential (loose shots make the lip-sync mangle arms).
2. `video.generate({ image: <face>, avatar: "custom", prompt: "<verbatim
   script>" })` — engine voices + lip-syncs that exact face (OmniHuman).

### C) Stock avatar
`video.generate({ avatar: "emily_primary", prompt: "<verbatim script>" })`.

### D) Faceless
1. 2–4 short scene clips (`video.generate`, no avatar — Kling/Veo for b-roll).
2. Voiceover (voice tool). 3. Burned-in captions + music + stitch (editing
   step — captions are non-negotiable; most watch muted).

## Step 3 — Self-review (MANDATORY — never send a clip you haven't watched)

You can see your work: the **Read tool supports vision** (Read any image),
and you have `ffmpeg` to grab video frames.
- **Images:** Read the file → photoreal not cartoon? tight, no stray hands?
  9:16? right person/setting? Regenerate if not.
- **Videos:** grab 2 frames and Read them, check dims/duration:
  ```
  ffmpeg -y -i <vid> -vf "select=eq(n\,12)" -vframes 1 /tmp/f1.png
  ffmpeg -y -i <vid> -vf "select=eq(n\,80)" -vframes 1 /tmp/f2.png
  ffprobe -v error -show_entries stream=width,height -show_entries format=duration <vid>
  ```
  Face still realistic in motion? Hands/body intact? 9:16? Lips match the
  words? Regenerate (or switch approach) if it fails. Don't make the user QA.

Tell the user, briefly, that you reviewed each one.

## Script craft (80% of performance)

1. **Hook in the first 1–2 seconds** — sharp problem or pattern-interrupt.
2. **First person, spoken, casual** — contractions, short lines, one idea each.
   Read it aloud; if it sounds written, rewrite.
3. **One problem → one product moment → one CTA.** Show the before/after
   feeling, don't list features.
4. **Native, not salesy** — a peer recommendation.
5. **Clear low-friction CTA** ("link in bio", "try it free").

## Rules
- **Always run the brief first** (Step 1). Never skip straight to generating.
- A talking-UGC ad is a person speaking to camera — never a bare captioned scene.
- Default 9:16. Make variants — different creators, hooks, voices.
- Self-review every asset before sending.
- Publishing goes through approval (social-publishing skill) — draft, submit,
  don't auto-post. Tell the user which approach + creator made each clip.
