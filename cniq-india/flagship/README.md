# Compass Nexus iQ · flagship page

The flagship page for Compass Nexus iQ brings mobility and logistics together on one page. It is built with Tailwind CSS, GSAP ScrollTrigger, SplitText, ScrambleText and Lenis. It sits next to the CNIQ India yard-to-port film (`../index.html`) and links to it.

Every section animates on scroll. Headlines rise line by line out of masks, numbers count up, the statement lights up word by word, cards lift in with a pointer-tracked glass sheen, the mobility opener and the ride journey pin while they play, and the six logistics services run past sideways.

## Run it

```bash
cd cniq-india
python3 -m http.server 8080
# open http://localhost:8080/flagship/
```

The page needs no build to run. The compiled CSS (`assets/css/flagship.css`) and the pinned GSAP and Lenis builds (`assets/vendor/`) are committed, so you can upload the `cniq-india` folder to any static host as it is. Keep `flagship/` inside `cniq-india/`: the page uses `../assets/favicon.svg` and links to `../index.html`.

## Rebuild the CSS

```bash
cd cniq-india/flagship
npm install
npm run build    # Tailwind → assets/css/flagship.css, then copies GSAP + Lenis into assets/vendor
npm run watch    # rebuild the CSS on every change
```

Theme tokens (cobalt, gold, navy, the Archivo and Martian Mono type) are in `tailwind.config.js`. The glass material, chips, buttons, phone frame and fallbacks are in `src/input.css`.

## Sections

| Section | What scrolls |
| --- | --- |
| Hero | A night city in the style of Thiruvananthapuram, with the Ghats on the horizon, lit towers with aviation lights and a flyover carrying long-exposure light trails. The headline rises word by word after the loader. A glass trip monitor ticks, labelled **Simulated feed**. On scroll the scene zooms and drops while the copy lifts away. |
| Marquee | The services in outline type. Scroll speed and direction drive the marquee and skew it. |
| The single record | The statement lights up word by word as you read it. Four glass cards count up: 12 trip states, 11 checks before billing, 8 access roles, 100% of invoice lines traced. |
| 01 Mobility | An IT campus at sunrise with glass towers catching the light. The section pins while a pearl-white Compass Nexus iQ shuttle drives in with turning wheels, parks under four glass chips, then drives out. |
| Ride journey | Pinned over six steps (Booked, Assigned, En route, Picked up, Dropped, Rated). A phone shows each screen of the employee app, the steps light up, and the control-room map draws the route while the cab moves to the Gate 2 pickup and then to the drop. Kilometres count up as it drives. On phones the map is hidden and a caption under the phone follows the step. |
| Mobility bento | The vehicle quality profile with a ticked checklist, a driver record that masks and unmasks personal fields as the viewing role changes, an SOS card, the driver app, a drawn service-quality sparkline and the transport desk's actions. |
| 02 Logistics | The six CNIQ India services, word for word, on a pinned horizontal rail: highway linehaul at golden hour, project cargo at dusk, interstate traffic at night, the container yard at sunrise, gantry cranes and a freighter at Vizhinjam at blue hour, and the telemetry map. Each scene drifts inside its card as the rail moves. |
| How a load moves | The six steps, with a progress line that fills and lights each step as you scroll. |
| 03 Platform | Glass cards over a drifting aurora: the invoice-to-trip chain, the 12 trip states lit in order, Compass Nexus iQ AI exception flags typed in, the audit trail, the billing package and the eight roles. |
| 04 Contact | A form with two modes, employee transport or logistics. It copies the request or opens it in an email to `navigation@compassnai.com`. |

## Imagery

All the scenes are painted in code (`assets/js/scenes.js`). Nothing is downloaded. Each scene is drawn at the device pixel ratio, up to 2× or about 8.3 megapixels, so it stays sharp on retina and 4K screens. Animated parts (light trails, beacons, water, birds and the aircraft) are drawn only while that scene is on screen.

To use a real photograph, put an `<img>` inside any `[data-scene]` element. The canvas is then left alone and the photo fills the frame:

```html
<div class="art" data-scene="port">
  <canvas aria-hidden="true"></canvas>
  <img src="assets/img/yard.jpg" alt="Container yard at sunrise" loading="lazy">
</div>
```

Use your own fleet and site photography, at least 2400 px wide. Do not use stock photos of other companies' vehicles as if they were yours.

## Honesty labels

The page shows example data in a few places, and every one is labelled on screen. Keep the labels if you change the content:

- **Simulated feed**: the hero trip monitor and the telemetry readouts are illustration data, not live vehicles.
- **Sample profile / Sample record / Sample change / Illustration**: the vehicle profile, driver record, chain, audit entry, map and sparkline.
- The vehicle number and driver details are masked or fictional. Vehicle quality shows no score, because the brief says a score appears only after an inspection is recorded against criteria the administrator sets.
- No customer names or logos are shown.

## Accessibility and fallbacks

- `prefers-reduced-motion`: no loader, no smooth scrolling, no pins, no grain or ambient motion. Counters show their final values, the ride steps are listed in full, and the logistics rail stacks vertically.
- Without GSAP (for example, a blocked script) the page switches to the same static layout.
- Without JavaScript the loader never shows and all content is in the HTML.
- Every scene canvas is `aria-hidden`. The shuttle and the route map have text alternatives.

## Licences

GSAP 3.13 (including SplitText and ScrambleText) is free under the GSAP standard licence (https://gsap.com/standard-license). Lenis is MIT. Both are vendored unmodified from npm by `scripts/vendor.js`.
