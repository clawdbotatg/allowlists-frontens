# The Allowlist — frontend for WhitelistCurator

A forkable [Scaffold-ETH 2](https://scaffoldeth.io) frontend for the
**WhitelistCurator** contract on Ethereum mainnet — a permissionless onchain
allowlist of proven wallets. You send ETH, the same transaction sends it
straight back; what persists is the record. Usable as a whitelist for mints
and early access, an airdrop distribution list, or reputation input.

**Contract:** [`0xcB0b0531e86A9aC36Fa865cA8e3dbccF047FDA91`](https://etherscan.io/address/0xcB0b0531e86A9aC36Fa865cA8e3dbccF047FDA91#code) (verified, immutable, no owner powers beyond sweeping force-fed ETH)

## The game

1. **Escalation** — your recorded contribution is your high-water single send.
   Every deposit must beat it by at least `minEscalation` (0.1 ETH); only the
   delta is credited. First deposit ≥ 0.05 ETH.
2. **Settlement** — for 24h after launch anything goes (with a 2x→1x decaying
   early-bird multiplier). After that, every clock hour must pull in 5 ETH of
   deposits or the contract settles: permanently closed, list frozen forever.
3. **Points** — square-root curve: 1 ETH of weight = 1,000 points; 1000x the
   capital buys ~31x the points. Credit caps at 1000 ETH.

⚠️ **Plain EOAs only.** Safe, ERC-4337 and EIP-7702 delegated accounts revert
with `OnlyEOA`. Don't use a 2300-gas `transfer`/`send` — it will fail.

## What the frontend shows

- Live survival clock: current hour, countdown, ETH still needed this hour
- Your standing: points, weight, high-water mark, required next deposit
- Deposit widget with an exact points preview (mirrors the contract's curve)
- Leaderboard rebuilt live from `Deposited` events
- Any-wallet lookup for allowlist consumers

## Run it

```bash
yarn install
yarn start        # http://localhost:3000
```

The contract is wired up as an external contract in
`packages/nextjs/contracts/externalContracts.ts`; the app targets mainnet in
`packages/nextjs/scaffold.config.ts`. No local chain or deploy step needed.

For production, set your own `NEXT_PUBLIC_ALCHEMY_API_KEY` and
`NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` (see `scaffold.config.ts`), then
`yarn vercel` or `yarn ipfs`.

## Fork it

This repo is meant to be forked — point `externalContracts.ts` at your own
deployment of WhitelistCurator (or any contract) and reskin `app/page.tsx`.
Built with 🏗 Scaffold-ETH 2 + [ethskills.com](https://ethskills.com).
