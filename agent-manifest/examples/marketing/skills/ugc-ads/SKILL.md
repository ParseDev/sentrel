---
name: ugc-ads
description: Use when making UGC-style ads (the authentic, creator-talking-to-camera format that wins on TikTok/Reels) — both avatar talking-creator videos and faceless clip+voiceover+caption ads. Covers the two pipelines, the script craft, and how to drive the avatar tool.
---

# UGC ads

UGC (user-generated-content style) ads look like a real person filmed it on
their phone — not a polished commercial. They massively out-convert
cinematic B-roll on TikTok and Reels. Two formats; both run on fal.

## Format 1 — Avatar talking-creator (the default UGC ad)

A real-looking person speaks your script to camera, lip-synced. This is
the highest-converting UGC format and the simplest to make: one tool call.

- Call the **video tool** with `avatar: "<avatar_id>"` and `prompt: "<the
  exact script the creator speaks>"`. Setting `avatar` routes to the UGC
  avatar model (not scene generation). A known avatar id is
  `emily_primary`; try others for different looks/voices.
- `prompt` is the **verbatim script**, written like a real person talking
  — not a scene description. No camera directions, no "[pause]", just the
  words they say.
- 9:16. The clip length follows the script (keep it 15–30s of speech).

```
video.generate({ avatar: "emily_primary",
  prompt: "Okay if you're a doctor and you're STILL charting at 11pm... I
           need you to stop scrolling. ScribeMD listens to your visit and
           writes the note for you. I got two hours of my night back. Link's
           right here." })
```

## Format 2 — Faceless UGC (no on-camera person)

Punchy b-roll + a voiceover + big on-screen captions. Use when you can't
show a face (or want variety):
1. **Clips** — generate 2–4 short Kling scene clips (video tool, no avatar).
2. **Voiceover** — TTS the script (the voice tool).
3. **Captions + music + stitch** — assemble with the editing step
   (burned-in captions are non-negotiable for UGC — most people watch
   muted).

## Script craft (this is 80% of UGC performance)

1. **Hook in the first 1–2 seconds or you've lost them.** Open with a
   pattern-interrupt or a sharp problem: "POV: it's 11pm and you're still
   charting." "Doctors are quitting over paperwork — here's the fix."
2. **First person, spoken, casual.** Contractions, short sentences, one
   idea per line. Read it out loud — if it sounds written, rewrite it.
3. **One problem → one product moment → one CTA.** Don't list features.
   Show the before/after feeling ("I got my evenings back").
4. **Native, not salesy.** It should feel like a recommendation from a
   peer, not an ad. No corporate voice.
5. **End with a clear, low-friction CTA** ("link in bio", "try it free").

## Rules

- Avatar UGC = one `video.generate({avatar, prompt})` call. Don't generate
  a still first — there's no still in this format.
- Always 9:16 for TikTok/Reels.
- Make **variants** — different hooks, different avatars — UGC is a numbers
  game; the winner isn't obvious up front.
- Publishing still goes through approval (social-publishing skill) — draft
  the clip + caption, submit, don't auto-post.
- Tell the user which avatar/model produced each clip.
