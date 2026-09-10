# Bounded EIP-1186 witness measurement

This read-only spike requests one account proof and one to three explicit storage slots at a numeric block, fetches that same block header, and reports proof byte sizes. It does not accept the witness as correct: no independently trusted state root or Hedera verifier participates.

Set `SOURCE_RPC_URL`, then run:

```text
pnpm probe -- --address <approved-20-byte-pool> --block <hex-block-number> --slot <documented-slot>
```

The pool must have an owner-approved, independently recorded code hash and storage layout before a live measurement is used. Missing inputs return `BLOCKED`; the probe never derives an address or slot from Graph data.
