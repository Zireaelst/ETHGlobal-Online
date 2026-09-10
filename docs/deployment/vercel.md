# Vercel deployment approach

The Vercel project will target `apps/web` as its root directory. Marketing routes, product documentation and the demo console share one Next.js deployment and one design system.

## Environments

- Local: development and explicit simulation states.
- Preview: every reviewed branch/PR receives an isolated URL and non-production configuration.
- Production: the release commit used in submission materials.

No application has been deployed yet. Future production and preview URLs belong in a versioned deployment manifest only after they exist.

## Configuration

Public site name, navigation, social metadata, sponsor links, explorer bases, feature flags and service status URLs live in typed site configuration. Secrets remain server-side Vercel environment variables. Client-visible variables may contain public network IDs and contract addresses only.

Build-time validation must fail for missing required production configuration. Optional integrations such as Bazantic remain disabled unless their complete configuration and qualification gate exist.

## Runtime boundary

The Vercel frontend may render public data and call controlled server routes. Test-wallet private keys, provider signing keys and observer keys do not live in Vercel client bundles. Long-running observers and contract event processors may require separately hosted services; the frontend consumes their typed public status/API rather than pretending a serverless request is a durable worker.

## Release checks

- production build, lint and typecheck succeed;
- all routes and metadata resolve on the preview URL;
- desktop landing remains a single viewport; mobile and subpages scroll normally;
- video fallback and reduced-motion behavior work;
- no secret appears in built assets or browser network payloads;
- live/simulation badge is correct for the deployed environment;
- real explorer links resolve and match the release manifest;
- refresh/deep links work for every route;
- the production alias points to the reviewed release commit.

