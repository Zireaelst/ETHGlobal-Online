# Standardized Graph comparison probe

This read-only probe sends one pinned-block GraphQL document to two separately configured live endpoints. It accepts only the shared protocol/version fields and raw integer pool balances; it does not calculate APY, USD TVL, price, or financial safety.

Copy `.env.example` values into your shell, choose a common indexed block, then run `pnpm probe`. Both endpoint URLs, distinct labels, and `GRAPH_BLOCK_NUMBER` are required. `GRAPH_AUTHORIZATION` is optional and is never printed. Missing inputs produce a `BLOCKED` result; fixtures are not substituted.
