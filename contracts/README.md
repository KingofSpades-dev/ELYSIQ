# ElysiqFeeRouter

Collects scan / certification fees and burns $ELYSIQ.

- `payFee(amount, ref)`: pay in $ELYSIQ. `burnBps` (default 20%) goes to `0x...dEaD`, the rest to `treasury`.
- `payFeeStable(stable, amount, ref)`: pay in an allowlisted stablecoin; it stays in the router until a buyback.
- `buybackAndBurn(...)`: keeper swaps stablecoin into $ELYSIQ through an allowlisted aggregator target and burns the proceeds. Reverts below `minElysiqOut`.
- Owner functions: `setBurnBps` (max 50%), `setTreasury`, `setKeeper`, `setAcceptedStable`, `setSwapTarget`, `sweepStable`, `transferOwnership`.

Payments are plain ERC-20 `transferFrom` calls into the router, so the backend verifies a deep-scan receipt from the token's `Transfer(wallet -> router)` event (`src/lib/token/receipt.ts`). Set `ELYSIQ_FEE_ROUTER_ADDRESS` to the deployed address.

## Build and deploy

```bash
solc --bin --abi --optimize -o build contracts/ElysiqFeeRouter.sol
```

Elysium is an Arbitrum Orbit (Nitro) chain. PUSH0, TSTORE/TLOAD and MCOPY were checked against the live RPC (`eth_call`), so the default solc EVM target works; `--evm-version paris` is only needed for older local test EVMs. Verify the source on the explorer's "Verify contract" page after deploying.

Constructor args: `(elysiqToken, treasury, keeper)`. After deployment: `setAcceptedStable(USDC, true)` and `setSwapTarget(aggregatorRouter, true)`, then fill the `ELYSIQ_FEE_ROUTER_ADDRESS`, `ELYSIQ_ROUTER_DEPLOY_BLOCK`, `USDC_ADDRESS` env vars. Use a multisig as owner.

The contract is **not audited**. It was exercised against an in-process EVM (payments, 20% burn split, stablecoin intake, keeper-only buyback, allowlist, slippage guard, admin limits) but get an independent review before holding real funds.

# ElysiqStachePass

ERC-721 (Enumerable) certificate for projects that pass an ELYSIQ scan.

- One pass per certified token address. `mint(to, certifiedToken, tier, score)` and `updatePass(...)` are `minter`-only; the owner can rotate the minter and the base URI.
- Tier 1/2/3 = Bronze/Gold/Legendary. `tierOfHolder(wallet)` returns the best tier a wallet holds (used by the GameFi guard check).
- `tokenURI(id)` = `baseURI` + the certified token's lowercase address; the API serves the JSON at `/api/stache/metadata/[address]`.
- Transferable on purpose (games read "who holds a pass").

## Launch checklist

```bash
node scripts/build_contracts.mjs
# fee router
node scripts/deploy_contract.mjs ElysiqFeeRouter  <ELYSIQ token> <treasury> <keeper>
# stache pass (owner should be a Safe multisig; minter is the backend hot key)
node scripts/deploy_contract.mjs ElysiqStachePass <owner> <minter address> https://<your-domain>/api/stache/metadata/
```

Needs `DEPLOYER_PRIVATE_KEY` and `ELYSIUM_RPC_URL`. Then set `STACHE_COLLECTION_ADDRESS` (the pass address) and `STACHE_MINTER_PRIVATE_KEY` (the key whose address you passed as minter) on the server only. Keep the minter key funded with a little HYPE; it can only mint passes, so its blast radius is small.

## Claim flow

1. The registrant pays the registry fee through the fee router. `/api/stache/apply` verifies the `FeePaid` event on-chain and records the payer as `registrant`.
2. After a certified scan, the registrant signs a fresh message in their wallet. `/api/stache/certify` checks the signature, that the signer is the registrant, and reads tier and score from the server's own scan (nothing the browser sends decides them), then mints.
3. Scanning again later and claiming again raises the tier on the same pass instead of minting a duplicate.
