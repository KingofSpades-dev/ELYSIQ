// Deploys a compiled contract from ./contracts/build to Elysium (or any RPC).
//   node scripts/build_contracts.mjs
//   node scripts/deploy_contract.mjs ElysiqFeeRouter  <elysiqToken> <treasury> <keeper>
//   node scripts/deploy_contract.mjs ElysiqStachePass <owner> <minter> <baseURI>
// Env: DEPLOYER_PRIVATE_KEY, ELYSIUM_RPC_URL. Use a fresh deployer key and hand ownership to a multisig afterwards.
import 'dotenv/config';
import { readFileSync } from 'fs';
import { createPublicClient, createWalletClient, defineChain, getAddress, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const [name, ...rawArgs] = process.argv.slice(2);
if (!name) { console.error('Usage: deploy_contract.mjs <ContractName> <constructor args...>'); process.exit(1); }

const key = process.env.DEPLOYER_PRIVATE_KEY;
const rpc = process.env.ELYSIUM_RPC_URL;
if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) { console.error('Set DEPLOYER_PRIVATE_KEY (0x + 64 hex).'); process.exit(1); }
if (!rpc) { console.error('Set ELYSIUM_RPC_URL.'); process.exit(1); }

const { abi, bytecode } = JSON.parse(readFileSync(`contracts/build/${name}.json`, 'utf8'));
const ctor = abi.find((x) => x.type === 'constructor');
if (!ctor || ctor.inputs.length !== rawArgs.length) {
  console.error(`${name} constructor expects: ${(ctor?.inputs ?? []).map((i) => `${i.type} ${i.name}`).join(', ')}`);
  process.exit(1);
}
const args = ctor.inputs.map((input, i) => (input.type === 'address' ? getAddress(rawArgs[i]) : rawArgs[i]));

const chain = defineChain({ id: Number(process.env.ELYSIUM_CHAIN_ID || 99901), name: 'Elysium', nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
const account = privateKeyToAccount(key);
const pub = createPublicClient({ chain, transport: http(rpc) });
const wallet = createWalletClient({ chain, account, transport: http(rpc) });

const onChainId = await pub.getChainId();
if (onChainId !== chain.id) { console.error(`RPC reports chain ${onChainId}, expected ${chain.id}. Aborting.`); process.exit(1); }

console.log(`Deploying ${name} from ${account.address} on chain ${onChainId} with args`, args);
const hash = await wallet.deployContract({ abi, bytecode, args });
const receipt = await pub.waitForTransactionReceipt({ hash, pollingInterval: 500 });
if (receipt.status !== 'success') { console.error('Deployment reverted:', hash); process.exit(1); }

console.log(`\n${name} deployed`);
console.log(`  address: ${receipt.contractAddress}`);
console.log(`  block:   ${receipt.blockNumber}`);
console.log(`  tx:      ${hash}`);
