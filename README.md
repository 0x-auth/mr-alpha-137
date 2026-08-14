# Mr. Alpha 137.036

Pre-Alpha (shoot prep timeline/checklist) + Post-Alpha (pose-guided lighting CV)
merged into one project.

## Structure

- `pre-alpha/` — the shoot-day timeline + kit checklist (HTML artifact)
- `post-alpha/` — pose detection + light-vector suggestion pipeline (Python)
- `models/` — downloaded mediapipe `.task` model files (gitignored, fetch via script)
- `tests/fixtures/` — test images for pipeline validation
- `docs/NOTES.md` — running dev log

## Setup

```bash
bash setup.sh
pip install -r requirements.txt --break-system-packages
bash scripts/fetch_model.sh
```

## Post-Alpha pipeline status

Torso-normal + light-vector math validated on both frontal and deep-profile
poses using a gravity-anchored "up" axis. See `docs/NOTES.md` for the full
trail of what broke and what fixed it.

Next: validate the 40° light-offset constant against real photography rules
(currently just a hardcoded rule-of-thumb, untested).
