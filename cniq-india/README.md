# CNIQ India · cinematic landing page

A standalone, scroll-driven landing page for CNIQ India, built with GSAP ScrollTrigger and Lenis smooth scrolling. No build step and no image files: every vehicle, map and scene is inline SVG.

## Run it

```bash
cd cniq-india
python3 -m http.server 8080
# open http://localhost:8080
```

Any static host works (Netlify, Vercel, S3, GitHub Pages, cPanel). Upload the folder as-is.

## What scrolls

| Chapter | Timeline label | What happens |
| --- | --- | --- |
| 01 The Lift | `lift` | A reach stacker lowers the CNIQ INDIA 40 ft container onto a truck chassis. The twist-locks engage and the spreader lifts away. |
| 02 The Run | `run` | The truck leaves CFS Yard 3. The road rises and the six service cards slide past underneath. NH 66 milestones and street lights pass behind. |
| 03 The Corridor | `aerial` | The camera rises to a satellite view. The truck follows the highway through a junction to Port Gate 2. A live telemetry panel tracks it. |
| Approach, How a load moves, Sea & Air, Contact | — | A word-by-word manifesto, the six-step operating model, a pinned ship and freighter crossing, and a quote form. |

The KM/H readout and the telemetry panel are driven by the scroll itself, and the panel is labelled **Simulated feed**. It shows illustration data, not live vehicle data.

## Files

```
index.html            markup and the inline SVG scenes
assets/css/main.css   tokens, layout, responsive rules, fallbacks
assets/js/main.js     scroll film, generated map and sea scene, HUD, quote form
assets/favicon.svg
```

## Editing

- **Contact details** are in `index.html` under `<section class="contact">`: the email, the phone and both `data-copy` attributes. The quote form's "Open in email" link reads the address from `#contactEmail`. Once `cniq.in` mail is live, swap `navigation@compassnai.com` there.
- **Brand colours and type** are the tokens at the top of `assets/css/main.css`. `--gold` is the exact inverse of `--cobalt`. The header and HUD use `mix-blend-mode: difference`, so the logo dot reads cobalt on white sections and gold on dark ones.
- **Services copy** is in the `.svc` articles. Pixel icons come from the `ICONS` map in `main.js` (12 × 12 grids, `#` is a lit dot).
- **Timing** of the film is one GSAP timeline in `main.js` (`filmTl`). Each tween animates a plain number on the `F` object, and `renderFilm()` draws those numbers every frame. To slow a chapter down, stretch its tween durations. To make the whole film longer, raise the multiplier in the ScrollTrigger `end`.

## Accessibility and fallbacks

- `prefers-reduced-motion`: no preloader animation, no smooth scrolling and no ambient motion (beacon, traffic, waves). The scroll story still follows the scrollbar directly.
- If GSAP cannot load, the page switches to a static layout: hero, the loaded truck, all six services, then the rest of the page.
- Headings are real text and every scene has an SVG `<title>`. The menu works from the keyboard, Escape closes it, and focus states are visible.

## Details worth knowing

- The container number **CNIU 820149 0** carries a valid ISO 6346 check digit (0). **45G1** is the size-type code for a 40 ft high cube.
- Map coordinates interpolate between Thiruvananthapuram (08.5241° N, 076.9366° E) and the Vizhinjam port area (08.38° N, 076.99° E).
- Libraries load from jsDelivr with pinned versions: `gsap@3.13.0` (core and ScrollTrigger) and `lenis@1.1.13`. Fonts are Archivo (variable width) and Martian Mono from Google Fonts.
