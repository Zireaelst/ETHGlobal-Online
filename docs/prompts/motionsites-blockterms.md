# MotionSites visual prompt adapted for BlockTerms

Use this prompt for the first frontend generation pass. Treat it as a visual implementation brief. Do not replace product rules in `AGENTS.md` or the approved design specification.

---

Create a polished BlockTerms web experience using Next.js App Router, TypeScript and accessible semantic components. The deployable app lives in `apps/web` and will be hosted on Vercel. Reuse components and tokens through `packages/ui`. Do not produce one giant HTML file.

The visual direction is a cinematic, premium, operational-infrastructure landing page: pure black background, white and muted-gray type, a full-bleed background video, restrained grain, liquid-metal navigation pills, glass secondary controls and staged CSS entrance motion. It should feel precise, calm and trustworthy rather than like a crypto casino.

Force black immediately as the first global CSS rule so the page cannot flash white:

```css
html, body { background: #000000 !important; color: #ffffff; }
```

Use Inter for all UI and Instrument Serif italic only for the emphasized hero phrase. Prefer self-hosted WOFF2 files when present and implement a deliberate fallback when they are absent. Support reduced motion and keep every element visible if animation JavaScript fails.

Build these real routes:

- `/` landing
- `/how-it-works`
- `/proofs`
- `/providers`
- `/demo`
- `/docs`

The desktop landing at widths above 900px is one viewport with no page scroll. Mobile is allowed to scroll. The landing contains only:

1. Header with configurable logo/wordmark, `How It Works`, `Proofs`, `Providers`, `Docs`, and a solid `Launch Demo` CTA.
2. Bottom-centered hero.
3. Three compact capability statements at the bottom.

Hero content:

- Badge: `Verifiable Agent Data Infrastructure`
- Headline: `Pay AI agents for data they can verify.`
- Apply Instrument Serif italic only to `data they can verify`.
- Lede: `Purchase live blockchain data through x402. Verify its onchain claims. Recover value from provider collateral when delivery breaks its terms.`
- Solid action: `Launch Demo` → `/demo`
- Glass action: `Inspect the Proof` → `/proofs`

Bottom statements must not invent usage metrics:

- `Live standardized data`
- `Machine-paid through x402`
- `Warranty backed by collateral`

Use the exact supplied remote background video only as an initial reference asset:

`https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4`

Do not invent another CloudFront URL. The video is muted, autoplay, loop, plays inline and decorative. Give it a black fallback and enough dark scrim for readable copy. Do not add WebGL, Three.js, Lottie, a carousel, pricing table, newsletter, stock illustration, token logos or fake dashboards.

Use the original reference's layout character:

- three-column desktop header;
- central pill navigation with subtle animated shine;
- white metallic primary buttons and frosted dark secondary buttons;
- headline around 48px at 1440px, scaling to 64px at 1600px, 76px at 1920px and 88px at 2560px;
- 36px mobile headline, 34px at the narrowest width;
- hero aligned toward the bottom rather than vertically centered;
- compact stats/capability row with three inline SVG icons;
- staggered CSS keyframe entrance with a two-frame JavaScript visibility fallback;
- full-screen blurred mobile menu under 901px, with Escape/nav-click/resize close behavior and correct `aria-expanded` state.

The wider routes reuse the same tokens, header, buttons, grain and background language but may scroll. They must be product-specific:

- How It Works: request → signed quote → reserved collateral → x402 payment → bounded delivery proof → accept/warranty, including pending and timeout paths.
- Proofs: human-readable manifest, selected fields, block/state-root scope, expandable raw witness and a visible `What this does not prove` panel.
- Providers: collateral, quote terms, reservation TTL, liabilities, final delivery and withdrawal restrictions.
- Demo: a real application shell for request scope, budget, quote comparison, payment state, proof state and evidence export. Until live integration exists, show a persistent `Simulation` badge and disable explorer/transaction claims.
- Docs: quickstart, protocol schemas, buyer SDK, provider setup, networks, evidence and trust model.

All visible brand/copy/navigation/public URLs come from typed site configuration so `BlockTerms` can be renamed. Use status text and icons in addition to color. Never display fake addresses, transaction hashes, provider counts, customer counts, query counts, savings or success rates.

Before finishing, verify keyboard navigation, visible focus, mobile menu trapping/return focus, reduced motion, 200% zoom, 360px width, short desktop height, video fallback, deep links and production build. Report any supplied visual detail that conflicts with accessibility or the approved product design before changing the product meaning.

---

