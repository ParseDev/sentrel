---
name: ugc-ads
description: Use when making UGC-style ads (the authentic, creator-talking-to-camera format that wins on TikTok/Reels). Covers the talking-creator formats — stock creators AND custom on-brand creators you generate (e.g. a doctor in a clinic) — the faceless format, and the script craft that drives all of them.
---

# UGC ads

UGC (user-generated-content style) ads look like a real person filmed it on
their phone — not a polished commercial. They massively out-convert
cinematic B-roll on TikTok and Reels. **A UGC ad is a person talking to
camera, lip-synced — it is NOT a scene clip with captions.** If you ever
make a 5-second scene with a caption over it, that's the wrong format; stop
and use one of the talking-creator recipes below.

You build UGC by **composing primitives**: generate a person → voice a
script → lip-sync. The video tool does the voicing + lip-sync for you in
one call, so you mostly think about *who's talking* and *what they say*.

## Recipe A — Custom on-brand creator (use this for a doctor / nurse / any specific look)

Make a *specific* person — one you generate, in the right setting — speak
your script. This is how you get a **doctor in a clinic**, not a generic
creator on a couch.

1. **Generate the person** with the image tool — a realistic, phone-selfie
   portrait of the creator you want, framed vertically (9:16), looking at
   the camera. For ScribeMD: a tired-but-warm physician in scrubs or a
   white coat, in a real clinic/exam-room, natural lighting, shot like a
   front-facing phone camera (slightly close, slightly imperfect).
   **Use a photoreal model: pass `model: "fal-ai/flux-pro/v1.1-ultra"` and
   `aspect_ratio: "9:16"`.** The cheap default model makes plasticky,
   off-looking people — ultra makes believable ones, and a believable
   source face is what makes the talking video land.
2. **Make them talk** — call the **video tool** with that image **and**
   `avatar` set, and `prompt` = the verbatim script. The engine voices the
   script (TTS) and lip-syncs it to that exact face for you — you do NOT
   pass audio; just the image + the script.

```
const doctor = image.generate({
  model: "fal-ai/flux-pro/v1.1-ultra", aspect_ratio: "9:16", prompt:
  "front-facing phone selfie of a 40-year-old female physician in a white
   coat and stethoscope standing in a real exam room, soft daylight, warm
   tired smile, candid imperfect smartphone photo, photorealistic, natural
   skin texture" })

video.generate({
  image: doctor.path,        // the doctor you just generated
  avatar: "custom",          // <- presence of image + avatar = lip-sync THIS face
  voice: "warm-female",      // optional; vary per creator
  prompt: "Okay, real talk — if you're a doctor still charting at 11pm, I
           need you to hear this. ScribeMD listens to your visit and writes
           the note for you. I got two hours of my night back. Try it." })
```

Vary the creator (age, gender, specialty, setting) and the script across
several clips — different doctors, different hooks.

## Recipe B — Stock creator (fastest, generic look)

When the *specific* identity doesn't matter, use a pre-made creator. One
call, no image:

```
video.generate({ avatar: "emily_primary",
  prompt: "If you're a clinician drowning in notes, this changed my life..." })
```

Stock creators are a fixed library of generic people — none are doctors and
you can't pick the setting. For anything on-brand (a doctor, a clinic), use
Recipe A.

## Recipe C — Faceless UGC (no on-camera person)

Punchy b-roll + a voiceover + big on-screen captions. Use for variety or
when you don't want a face:
1. **Clips** — generate 2–4 short scene clips (video tool, no avatar).
2. **Voiceover** — TTS the script (the voice tool).
3. **Captions + music + stitch** — assemble with the editing step
   (burned-in captions are non-negotiable — most people watch muted).

This is the ONLY UGC format that uses scene clips, and even here the scenes
are b-roll *under* a voiceover — never a lone captioned scene posing as a UGC ad.

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

- **A UGC ad is a talking person, lip-synced.** Recipe A or B. Never ship a
  bare scene clip + caption as a "UGC ad" — that's the wrong format and it's
  why earlier attempts looked cheap and were only 5 seconds.
- For a **doctor or any specific on-brand creator → always Recipe A**
  (generate the person, then `video.generate({ image, avatar, prompt })`).
- Always 9:16 for TikTok/Reels.
- Keep the script to ~15–30s of speech; the clip length follows the script.
- Make **variants** — different creators, hooks, voices. UGC is a numbers
  game; the winner isn't obvious up front.
- Publishing still goes through approval (social-publishing skill) — draft
  the clip + caption, submit, don't auto-post.
- Tell the user which recipe + creator produced each clip.
