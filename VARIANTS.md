# Variants — self-grade (judge criteria, /10 each)

App: Neon Shore Cover Maker. One app, three presets differing on the judged
dimensions (panel style, grade, export size). All three were rendered and
exported headlessly in Chromium with zero JS errors; covers inspected visually.

## V-A — Sunset Hero (layout hero+3, grade sunset, 1920×1080)
- Art 8 — strong hero panel + bold gradient title; small side panels crop tight.
- Any photo 9 — 4 panels filled from 4 different photos, per-panel crop/position.
- Fast & easy 9 — 3 steps, one-click PNG export, all 3 common sizes.
- Polish 8 — clear editor, live preview, neat lettering + badge ribbon.
- **Total 34/40**

## V-B — Neon Grid (layout nine-panel grid, grade neon, 1080×1080) — WINNER
- Art 9 — the nine-panel grid is the most poster-like; varied photos, clean title block.
- Any photo 10 — 9 panels filled from 4 photos, click-to-assign + drag + sliders.
- Fast & easy 9 — 3 steps, one-click PNG export, all 3 common sizes.
- Polish 9 — clear editor, live preview, halftone dots, grain + vignette.
- **Total 37/40**

## V-C — Vice Full (layout full-bleed, grade vice, 1080×1350)
- Art 7 — dramatic sunset sun, but the main figure sits half behind the title band.
- Any photo 7 — only 3 panels (1 full-bleed + 2 insets).
- Fast & easy 9 — 3 steps, one-click PNG export, all 3 common sizes.
- Polish 8 — clean title block, but the ghosted figure reads as a flaw.
- **Total 31/40**

## Decision
V-B wins by score (37 vs 34 vs 31) and is the shipped default preset
(`?preset=neon`, also the boot default). Screenshots: 1-cover.jpg = V-B cover,
2-cover-wide.jpg = V-A cover, 3-editor.jpg = editor with V-B loaded,
4-cover-tall.jpg = V-C cover.

## Local gate check
- `MAKEFUN_OUTPUT_DIR=/tmp/gta6out node main.ts` → dossier 778,472 bytes,
  4 images, text 25,031 bytes (cap 163,840). app/ 8 files, index.html < 1 MiB.
- Screenshots: 4 JPEGs, each ≤ 256 KiB, long side ≤ 1280, short side ≥ 480.
- No external font files, no Rockstar logo/artwork/fonts; system fonts only.
- No network requests: all assets are files under app/ (samples are JPG assets).
