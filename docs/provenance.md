# Provenance

## Repository origin

This is a fresh repository for ETHOnline 2026. The initial commit contains documentation only. No prior project implementation is represented as new hackathon work.

## Design reference

The landing-page direction derives from a MotionSites prompt supplied by the project owner on 2026-09-10. It described a Vesper.ai single-viewport layout with a black video background, Inter and Instrument Serif typography, liquid-metal controls, responsive navigation and CSS entrance animation.

BlockTerms retains that visual language while replacing the brand, information architecture, copy, navigation and product behavior. The adapted prompt is stored at `docs/prompts/motionsites-blockterms.md`.

The supplied prompt includes this remote video URL:

`https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4`

If used, it must remain recorded here. The final release must confirm permitted use or replace it with an owned asset. No other CloudFront asset URL is authorized by the prompt.

## Agent runtime dependencies

- `@x402/core`, `@x402/fetch`, and `@x402/hedera` version 2.25.0, from the official x402 Foundation TypeScript packages under the Apache-2.0 license. They implement x402 parsing, paid fetch retry, and the exact Hedera client scheme used in `packages/integrations/src/payment.ts`.
- `@modelcontextprotocol/server` and `@modelcontextprotocol/client` version 2.0.0, from the official Model Context Protocol TypeScript SDK under the MIT license. They implement the MCP stdio server and its end-to-end client test.
- `zod` 4.6.1, `commander` 15.0.0, and `tsup` 8.5.1 provide runtime schemas, CLI parsing, and package bundling.

Project-specific code wraps these libraries with bounded request schemas, policy selection, secret-safe errors, durable state and simulation labeling. No SDK example was copied into the product source.

## Future additions

Every starter, copied contract, SDK example, font file, icon, media asset and generated scaffold must be recorded with source URL, license if known, imported commit/version, files affected and the project-specific modifications.
