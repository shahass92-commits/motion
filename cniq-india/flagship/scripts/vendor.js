// Copies the pinned GSAP and Lenis builds into assets/vendor so the page runs from any static host
// without a CDN. Run through `npm run build` after changing the versions in package.json.
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'assets', 'vendor');
const files = [
  'gsap/dist/gsap.min.js',
  'gsap/dist/ScrollTrigger.min.js',
  'gsap/dist/SplitText.min.js',
  'gsap/dist/ScrambleTextPlugin.min.js',
  'lenis/dist/lenis.min.js',
];

fs.mkdirSync(out, { recursive: true });
for (const f of files) {
  fs.copyFileSync(require.resolve(f), path.join(out, path.basename(f)));
  console.log('vendor', path.basename(f));
}
