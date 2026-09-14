# Verified Data Marketplace Design

## Product decision

BlockTerms becomes a curated procurement network for verifiable agent data. Human operators and autonomous agents can publish, discover, compare, purchase, and monitor machine-readable data products. A catalog entry is useful only when it leads into the existing BlockTerms order lifecycle: explicit scope, signed commercial terms, reserved collateral, Hedera x402 payment, bounded verification, and a distinct warranty outcome.

The marketplace does not claim that arbitrary data is true. Every product declares a verification profile. The first profile remains the narrow BlockTerms guarantee: standardized Graph data plus selected EIP-1186 account or storage fields at one pinned block. Products without an executable verification profile can exist only as drafts and cannot be purchased.

## Primary use case

A DeFi treasury or risk agent needs a same-block liquidity snapshot across compatible protocol deployments before taking an action. It searches the marketplace using a maximum budget, freshness limit, required schema, network, proof profile, and minimum collateral coverage. BlockTerms returns eligible offers with deterministic ranking inputs. The agent buys one through Hedera x402. If the provider-bound final delivery is invalid or late, the original purchase remains final and a separate warranty transfer is authorized from reserved provider collateral. The agent can then retry another eligible provider without confusing payment identifiers.

Human analysts use the same market through the web interface. Agents use the SDK, HTTP API, CLI, and MCP server. All surfaces call the same marketplace and order services.

## Three connected product layers

### Verified Data Marketplace

Providers publish `DataProduct` records. Publication requires a valid manifest, a supported proof profile, a passing sandbox challenge, and sufficient declared collateral. Curator approval represents an operational allowlist decision, not a statement that all future data will be correct.

Lifecycle:

`draft → pending-review → active → suspended | deprecated`

Only active products may be quoted or purchased. A suspended product remains visible in historical orders but disappears from eligible discovery.

### Composable Data Bundles

A bundle is a data product whose manifest contains two to five active component product IDs and a deterministic composition method. Versioned lineage is public. The first release supports a `same-block-union` method: components must share the standardized schema family, requested block, compatible networks, and non-overlapping output aliases. A bundle cannot hide an inactive or unverified component.

The first release records component pricing and lineage but does not claim atomic multi-provider settlement or automatic revenue splitting. A bundle quote exposes the total and each component. Purchase orchestration can execute component orders separately with explicit receipts.

### Credentialed Private Data Market

Providers may attach `CredentialAttestation` records that state what was verified, by which scheme, when it expires, and where a public verifier or proof reference can be checked. Supported kinds start with `zk-tls`, `wallet-control`, `organization`, and `custom`.

A credential is a provider eligibility signal. It does not prove dataset correctness, freshness, completeness, or ownership. No private credential payload is stored. Integration-specific verifiers can be added later behind a `CredentialVerifier` port; the core accepts only curator-reviewed attestations and never treats a badge as delivery evidence.

## Data Product Passport

Each product contains:

- Stable product and provider IDs, slug, name, summary, tags, and version.
- Provider type: human, agent, or organization.
- Standard schema family and version.
- Supported protocol deployments and CAIP-2 networks.
- Product kind: snapshot, stream, report, or bundle.
- Freshness and delivery SLA in seconds.
- Atomic-unit price, payment network, asset, and x402 resource URL.
- Verification profile and bounded proof limits.
- Warranty amount and collateral coverage in basis points.
- Sample response content digest and optional content-addressed URI.
- Credential attestations and bundle lineage.
- Publication signatures and optional HCS audit anchor.
- Lifecycle state and curator review metadata.

The manifest is strictly validated and size-bounded. URLs, tags, aliases, and free text are untrusted input. Secrets and authorization material are forbidden.

## Marketplace service

The catalog uses a repository abstraction like the existing order runtime. The production-local adapter is an atomic JSON file so a clean clone requires no database. Types and service methods do not depend on storage, allowing a hosted database adapter later.

Methods:

```ts
submitProduct(input: SubmitProductRequest): Promise<DataProduct>
reviewProduct(productId: string, input: ReviewProductRequest): Promise<DataProduct>
getProduct(productIdOrSlug: string): Promise<DataProduct>
listProducts(filter?: ProductFilter): Promise<DataProduct[]>
createBundle(input: CreateBundleRequest): Promise<DataProduct>
listProviders(filter?: ProviderFilter): Promise<ProviderProfile[]>
getProvider(providerId: string): Promise<ProviderProfile>
recordOutcome(input: RecordProductOutcomeRequest): Promise<ProviderProfile>
```

Publication transitions use optimistic revision checks. Review approval verifies sandbox status, supported proof profile, collateral coverage of at least 10000 basis points, and a unique active slug. Curator identity is included in the audit record. The local runtime can use a configured curator token at the transport boundary; the domain service accepts an authenticated curator ID, not raw credentials.

## Discovery and ranking

Discovery is deterministic. Filters include query text, provider type, schema, network, product kind, maximum price, maximum freshness, minimum collateral coverage, credential kind, and bundle support. Sorting supports relevance, price, freshness, collateral, and verified performance.

The service returns ranking facts rather than a hidden composite score. An LLM may turn a user request into proposed filters, but Zod validation and policy code enforce the final bounds. The buyer remains responsible for selecting a product or allowing a deterministic policy to select it.

## Reputation

Provider reputation is derived only from finalized BlockTerms outcomes:

- completed paid orders;
- valid deliveries;
- invalid deliveries;
- late deliveries;
- warranty transfers confirmed;
- total paid atomic units;
- median and p95 delivery latency when samples exist.

The profile exposes counts and rates, not a subjective star score. A record operation requires a unique order ID and is idempotent. Simulation outcomes are counted separately and never presented as live performance.

## Agent-native interfaces

The TypeScript SDK exposes all marketplace methods in local and HTTP transports. REST endpoints live under `/v1/marketplace`. CLI commands use stable JSON stdout:

```text
blockterms market list
blockterms market get <id-or-slug>
blockterms market submit --file <manifest.json>
blockterms market review <product-id> --decision approve|reject
blockterms market bundle --file <bundle.json>
blockterms providers list
blockterms providers get <provider-id>
```

MCP tools mirror the same methods with concise schemas: `search_data_products`, `get_data_product`, `submit_data_product`, `review_data_product`, `create_data_bundle`, `list_data_providers`, and `get_data_provider`.

## Web experience

- `/marketplace`: search, filters, product cards, visible simulation/live evidence status.
- `/marketplace/[slug]`: passport, price, proof boundary, SLA, warranty, credentials, lineage, and purchase action.
- `/sell`: provider studio with manifest fields and publication gate explanation.
- `/providers/[id]`: objective order outcomes, collateral, credentials, and active products.
- `/orders`: links the existing buyer console to marketplace-originated purchases.

The initial Vercel build may render curated seed products while hosted persistence is unconfigured, but the UI must label them as examples and never fabricate live order history. The runtime-backed version consumes the marketplace HTTP API.

## Sponsor technology roles

Hedera remains the payment and agent economy layer. Blocky402 handles live x402 settlement. The Hedera Agent Kit may expose buyer/seller tools and policy hooks. HCS can anchor manifest version and finalized outcome digests to an ordered public log once credentials exist. An HCS anchor is audit evidence, not the source of marketplace authorization.

The Graph remains the live standardized data layer. Standardized Subgraphs provide comparable protocol data. Subgraph MCP can help agents discover deployments and schemas. Agent0/ERC-8004 Subgraphs may enrich agent-provider discovery where identities exist. Subgraph composition is used only when its chain, immutability, and source limits fit the product; it is not forced for a sponsor checkbox.

Bazantic remains the conditional third sponsor. A Recipe must use a live Graph discovery/query service and the paid BlockTerms marketplace service in one useful external-agent flow. Marketplace support strengthens that flow but does not replace its account, gateway, two-service, and video qualification requirements.

Privy, zkPass/zkTLS, IPFS, ENS, or other protocols may be added when they solve a verified product need. Using a technology does not automatically add a sponsor submission. Privy is a possible human onboarding and wallet-control adapter. zkPass/zkTLS is a possible credential verifier. IPFS is a possible content-addressed manifest/sample store. None may bypass Hedera settlement, Graph live data, proof boundaries, or curator gates.

## Security and trust boundaries

- Curators can approve listings but cannot manufacture valid delivery proofs.
- Providers can change draft listings; active terms are immutable by version and changes create a new version.
- Buyer policy and order terms pin the selected product version.
- Provider credentials are claims with expiry and verifier metadata, not correctness guarantees.
- Reputation accepts only unique finalized order outcomes and separates simulation from live.
- Marketplace discovery never causes payment. Purchase remains an explicit order transition.
- HCS/IPFS references are digests and availability aids; they do not make unverified content correct.
- Private API keys and access tokens never enter product manifests, catalog storage, HCS messages, public evidence, or web responses.

## Delivery sequence

Implement schemas and lifecycle first, then persistence and service behavior, agent interfaces, web experience, bundles and credentials, reputation, and optional network adapters. Preserve all existing order tests and claims. Each milestone receives a focused commit.

