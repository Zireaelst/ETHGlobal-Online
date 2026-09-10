# Evidence separation

- `live/` is reserved for sanitized raw artifacts from checked external runs. A live artifact must identify its command, time, source, network, and release commit without secrets or authorization headers.
- `simulation/` contains educational fixtures only. Simulation artifacts never qualify sponsor requirements and never include explorer links or transaction claims.

Never store private keys, API tokens, mnemonics, paid credentials, or payment authorization headers here. A Blocky402 `/supported` response demonstrates facilitator capability only; it is not evidence of a paid request or settlement.
