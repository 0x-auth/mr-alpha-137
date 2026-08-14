# Mr. Alpha 137.036 — dev notes

Running log of what's been tried, what broke, what fixed it.
Append, don't rewrite — the failed attempts are as useful as the fix.

## Status

- [x] Pre-Alpha: shoot-prep timeline + checklist (static HTML artifact)
- [x] Post-Alpha v1: pose landmark detection working (mediapipe tasks API)
- [x] Post-Alpha v2: 2D twist estimation — WRONG for non-frontal poses (pixel-ratio hack)
- [x] Post-Alpha v3: 3D twist via cross product — normal tilted wrong on crunched/profile poses
- [x] Post-Alpha v4: Gram-Schmidt vs shoulder line — didn't fix it (contamination wasn't in that axis)
- [x] Post-Alpha v5: gravity-up anchored torso normal — FIXED. Validated on profile (86°) and frontal (8.8°) test poses.
- [ ] Next: stress-test the hardcoded 40° light-offset rule
- [ ] Known gap: hip landmark confidence when occluded/cropped (seen in frontal test — hips were guessed, not observed)
- [ ] Not started: live camera integration, auto-capture, real app shell

## Key learnings

- mediapipe 0.10.30+ dropped `mp.solutions` — use `mediapipe.tasks` API instead,
  requires downloading a `.task` model file explicitly.
- 2D pixel-width ratios for twist estimation break under perspective/crunch — need
  true 3D landmark z-depth.
- Deriving "up" from mid_shoulder→mid_hip breaks when the spine bends (crunch, twist) —
  contamination isn't always along the shoulder-line axis, so simple Gram-Schmidt
  against shoulder line doesn't fix it.
- Anchoring "up" to a fixed world-space gravity vector, then projecting into the
  torso plane, is robust across both frontal and deep-profile poses.
