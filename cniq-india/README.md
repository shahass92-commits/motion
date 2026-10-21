# CNIQ India · cinematic landing page

A standalone, scroll-driven landing page for CNIQ India, built with GSAP ScrollTrigger and Lenis smooth scrolling. No build step and no image files: every vehicle, skyline, map and scene is inline SVG, and the textures are generated in the browser.

## Run it

```bash
cd cniq-india
python3 -m http.server 8080
# open http://localhost:8080
```

Any static host works (Netlify, Vercel, S3, GitHub Pages, cPanel). Upload the folder as-is.

## What scrolls

The page follows one working day, from the morning yard through to night and the next sunrise.

| Chapter | Timeline label | What happens |
| --- | --- | --- |
| 01 The Lift · 06:40 | `lift` | Morning haze, sun rays and dust in the air. A reach stacker seen side-on telescopes its boom and sets a box on top of a door-end stack. The road train pulls into Bay 14, a second stacker (seen from the front) lowers the 40 ft CNIQ INDIA box onto the front trailer, the camera jolts as the twist-locks engage, and the spreader lifts away. On phones the camera opens on the side-on stacker and pans to the truck. |
| 02 The Run · 11:20 → golden hour | `run` | The road train pulls out under twin-stack exhaust. The road rises and the six service cards slide past underneath. A port and palm skyline drifts behind in two parallax layers, the light turns gold, and the headlights and street lamps come on. |
| 03 The Corridor · 18:05 | `aerial` | Clouds part over a satellite view. The articulated road train follows the highway through a junction to Port Gate 2 while evening falls: street lights, floodlights, headlight beams and traffic. A telemetry panel tracks it. |
| Approach | — | A word-by-word manifesto over a long-exposure night highway. |
| How a load moves | — | Desktop: a pinned horizontal journey where a container truck drives through the six steps. Phones: a vertical list. |
| Sea & Air | — | Sunrise at sea with sun glitter, gulls, lit clouds, a container ship and a freighter. |
| Contact | — | A night harbour skyline with floodlights and blinking crane lights, behind the quote form. |

Each chapter opens on a letterboxed title card. The KM/H readout, wheel motion blur and telemetry panel are driven by the scroll itself. The panel is labelled **Simulated feed**: it shows illustration data, not live vehicle data.

## The truck

The road train is drawn in the proportions of a Scania S-series 6×4 tractor: tall flat-fronted cab, dropped driver's window, twin vertical stacks and a roof light bar. It pulls a 40 ft skeletal trailer, a converter dolly and a 20 ft trailer, about 26 m in total. No manufacturer logos are reproduced. Add badging only if CNIQ actually runs that make and you have the right to use the mark.

## The yard machines

- **Side-on reach stacker**: light-blue body with counterweight, engine housing, cab with operator, large off-the-road tyres, and a black telescopic boom with a hazard-striped spreader. Script poses it by the boom tip (`REACH_TIP` in `main.js`): the boom angle, the telescope extension and the lift cylinder all follow from that point, so a pose change is one coordinate.
- **Front-on reach stacker**: the boom, lift cylinders and spreader that lower the 40 ft box onto the trailer.
- **Container door ends** (`#crateEnd` in `index.html`): corrugated leaves, four locking bars with cam keepers and handles, hinges, corner castings, a data plate and rust streaks. Each stack box sets its colour with `style="color:…"`.

The machines carry CNIQ marks only. No manufacturer branding or container owner codes from the reference images are reproduced.

## Files

```
index.html            markup and the inline SVG scenes
assets/css/main.css   tokens, layout, responsive rules, fallbacks
assets/js/main.js     scroll film, time of day, generated skylines, map, sea, night and harbour scenes, HUD, quote form
assets/favicon.svg
```

## Editing

- **Contact details** are in `index.html` under `<section class="contact">`: the email, the phone and both `data-copy` attributes. The quote form's "Open in email" link reads the address from `#contactEmail`. Once `cniq.in` mail is live, swap `navigation@compassnai.com` there.
- **Brand colours and type** are the tokens at the top of `assets/css/main.css`. `--gold` is the exact inverse of `--cobalt`. The header, HUD and title cards use `mix-blend-mode: difference`, so they read on any background.
- **Light by time of day** is the `DAY` table in `main.js`, and `F.night` sets the corridor's evening. Sky colours are fixed gradients cross-faded by opacity, so scrolling never repaints them.
- **Services copy** is in the `.svc` articles. Pixel icons come from the `ICONS` map in `main.js` (12 × 12 grids, `#` is a lit dot).
- **Timing** of the film is one GSAP timeline in `main.js` (`filmTl`). Each tween animates a plain number on the `F` object, and `renderFilm()` draws those numbers every frame. To slow a chapter down, stretch its tween durations. To make the whole film longer, raise the multiplier in the ScrollTrigger `end`.

## Accessibility and fallbacks

- `prefers-reduced-motion`: no preloader animation, no smooth scrolling, no grain and no ambient motion (beacon, dust, traffic, waves, birds, light trails). The scroll story still follows the scrollbar directly.
- If GSAP cannot load, the page switches to a static layout: hero, the loaded road train, all six services, then the rest of the page.
- Headings are real text and every scene has an SVG `<title>`. The menu works from the keyboard, Escape closes it, and focus states are visible.

## Details worth knowing

- The container numbers carry valid ISO 6346 check digits: **CNIU 820149 0** (45G1, 40 ft high cube) and **CNIU 820150 4** (22G1, 20 ft).
- Map coordinates interpolate between Thiruvananthapuram (08.5241° N, 076.9366° E) and the Vizhinjam port area (08.38° N, 076.99° E).
- Libraries load from jsDelivr with pinned versions: `gsap@3.13.0` (core and ScrollTrigger) and `lenis@1.1.13`. Fonts are Archivo (variable width) and Martian Mono from Google Fonts.
