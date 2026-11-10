// Compiles every contract in ./contracts with solc-js and writes ./contracts/build/<Name>.json
// ({ abi, bytecode }). Usage: node scripts/build_contracts.mjs
// Set EVM_VERSION (e.g. paris) only when testing on an older local EVM; Elysium accepts the default.
import { createRequire } from 'module';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const require = createRequire(import.meta.url);
const solc = require('solc');

const root = resolve('contracts');
const sources = {};
for (const f of readdirSync(root)) {
  if (f.endsWith('.sol')) sources[`contracts/${f}`] = { content: readFileSync(join(root, f), 'utf8') };
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    ...(process.env.EVM_VERSION ? { evmVersion: process.env.EVM_VERSION } : {}),
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};

function findImports(path) {
  const candidates = [resolve(path), resolve('node_modules', path)];
  for (const c of candidates) if (existsSync(c)) return { contents: readFileSync(c, 'utf8') };
  return { error: `File not found: ${path}` };
}

const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = (out.errors || []).filter((e) => e.severity === 'error');
for (const e of out.errors || []) console.log(e.formattedMessage);
if (errors.length) process.exit(1);

mkdirSync(join(root, 'build'), { recursive: true });
for (const [file, contracts] of Object.entries(out.contracts)) {
  if (!file.startsWith('contracts/')) continue; // skip imported libraries
  for (const [name, c] of Object.entries(contracts)) {
    writeFileSync(join(root, 'build', `${name}.json`), JSON.stringify({ abi: c.abi, bytecode: '0x' + c.evm.bytecode.object }, null, 2));
    console.log(`built ${name} (${c.evm.bytecode.object.length / 2} bytes)`);
  }
}
