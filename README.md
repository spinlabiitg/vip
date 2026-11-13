# Vision and Image Processing

Interactive course notes on images and vision (IIT Guwahati): intuition first, then maths, figures and live
in-browser demos. The site is plain static HTML served from `docs/`; no build step runs on the server.
It follows the same layout and tools as the Speech and Audio Processing site (`../sap`).

## Layout

```
site.json          the manifest: modules, pages, status, updates, credits (edit this to add or reorder pages)
tools/build.py     generates docs/index.html and injects the shared navigation bar and footer into every page
tools/check.py     pre-publish check: broken local links
docs/              the published site
  index.html       generated home page (do not edit by hand)
  assets/site.css  shared navigation, footer and home-page styles (namespaced .ai-*)
  assets/katex/    KaTeX 0.16.11 (MIT), served locally so equations render offline too
  fourier_2d/      Module 1: the 2-D Fourier transform (index.html, lib.js = FFT and drawing, demos.js, img/)
  gaze/            Module 2: gaze, reading and visual attention (index.html, img/)
```

## Modules

| # | Module | Page(s) |
|---|---|---|
| 1 | Images as sums of gratings: the 2-D Fourier transform | `fourier_2d/index.html` |
| 2 | Where the eyes go: gaze, reading and visual attention | `gaze/index.html` |

## Working on the site

```bash
# preview locally
python -m http.server 8941 --directory docs
# after editing site.json or any page
python tools/build.py
python tools/check.py
```

* **Add a page:** put the HTML file (and its asset folder) under `docs/`, add an entry to `site.json` with a status
  (`live`, `update` or `planned`), then run `tools/build.py`. A new module becomes a new row on the home page: give it a number `n`,
  a `title`, a one-line `short` description (shown on the home page) and a longer `summary`, and add a line to `updates`.
  `"home": false` on a page keeps it live and in the page menu but leaves it off the home page.
* Pages load KaTeX from `docs/assets/katex/` with a relative path (for a page one folder deep: `../assets/katex/`).
* `tools/build.py` puts the navigation bar and footer between `<!--ai:...-->` markers, so re-running it replaces them rather than adding copies.

## Data

* **Campus photographs** (IIT Guwahati) in `docs/fourier_2d/img/`: grayscale 256 × 256 crops. `img/images.js` embeds the same
  images as data URIs so the canvas demos also work when a page is opened straight from disk.
* **Gaze images** in `docs/gaze/img/`, all public domain: Repin's *Unexpected Visitors*, a reading scanpath
  (Humanistlaboratoriet, Lund University) and the Yarbus (1967) redrawing, the last two from Wikimedia Commons.

## Licence

Code: MIT ([LICENSE](LICENSE)). Content: CC BY-NC 4.0 ([LICENSE-content.md](LICENSE-content.md)).
