import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
import * as path from "path";

// Load local environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ERC-8004 Agent Registry ABI (standard interface)
const REGISTRY_ABI = parseAbi([
  "function registerAgent(string name, string description, string endpoint, string[] capabilities) returns (bytes32)",
  "function updateAgent(bytes32 agentId, string endpoint) returns (bool)",
  "function getAgent(bytes32 agentId) view returns (string name, string description, string endpoint, address owner, uint256 registeredAt)",
  "event AgentRegistered(bytes32 indexed agentId, address indexed owner, string name)",
]);

const REGISTRY_ADDRESS = (process.env.ERC8004_REGISTRY_ADDRESS || "0x91Fdfc534A7d3C98a39e8F567634f186D58971f1") as `0x${string}`;
const PRIVATE_KEY = process.env.ERC8004_PRIVATE_KEY;
const RPC_URL = process.env.ETHEREUM_RPC_URL;
const NETWORK = process.env.ERC8004_NETWORK || "mainnet";

async function registerELYSIQ() {
  console.log("═══════════════════════════════════════════════════");
  console.log("          ELYSIQ — ERC-8004 AGENT REGISTRATION      ");
  console.log("═══════════════════════════════════════════════════\n");

  const isMockMode = 
    !PRIVATE_KEY || 
    PRIVATE_KEY === "your_wallet_private_key_here" || 
    !RPC_URL || 
    RPC_URL.includes("YOUR_INFURA_KEY") ||
    RPC_URL.includes("YOUR_KEY") ||
    !PRIVATE_KEY.startsWith("0x") ||
    PRIVATE_KEY.length !== 66;

  if (isMockMode) {
    console.log("⚠️  [SIMULATION MODE]: Missing private key or RPC URL in .env.local.");
    console.log("Simulating ERC-8004 agent registration...\n");
    
    // Simulate a 3-second block time
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const mockAgentId = "0x8a9c3d4e7b8f9a0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c";
    console.log("✅ Simulation Successful!");
    console.log("ELYSIQ Mock Agent ID:", mockAgentId);
    console.log("Simulated TX Hash: 0x9f5d3e2b4c1a0e8d7f6c5b4a3c2b1a0e9f8d7c6b5a4c3b2a1e0f9d8c7b6a5a4c");
    console.log("\nCopy the Agent ID above and save it to your .env.local as:");
    console.log(`ERC8004_AGENT_ID=${mockAgentId}\n`);
    return;
  }

  // Active production / testnet mode
  try {
    const targetChain = NETWORK === "mainnet" ? mainnet : sepolia;
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain: targetChain,
      transport: http(RPC_URL),
    });

    const publicClient = createPublicClient({
      chain: targetChain,
      transport: http(RPC_URL),
    });

    console.log(`Targeting Network: ${targetChain.name}`);
    console.log(`Registry Address: ${REGISTRY_ADDRESS}`);
    console.log(`Owner Address: ${account.address}`);
    console.log("Submitting transaction on-chain...");

    const hash = await walletClient.writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "registerAgent",
      args: [
        "ELYSIQ",
        "Nietzschean blockchain security agent. Wallet forensics, bundler detection, contract auditing, copy trade verdict. Powered by Claude Fable 5.",
        "https://elysiq.xyz/api/v1/scan",
        [
          "wallet-security-scan",
          "bundler-detection",
          "contract-audit",
          "copy-trade-verdict",
          "wallet-recovery",
          "trust-score",
        ],
      ],
    });

    console.log("Transaction hash submitted:", hash);
    console.log("Waiting for confirmation...");

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    // Extract agentId from event logs
    const log = receipt.logs[0];
    const agentId = log?.topics[1] || "0x" + "0".repeat(64);
    
    console.log("✅ ELYSIQ Agent ID:", agentId);
    console.log("\nSave this Agent ID to your .env.local as:");
    console.log(`ERC8004_AGENT_ID=${agentId}\n`);
  } catch (error: any) {
    console.error("❌ Registration transaction failed:");
    console.error(error?.message || error);
  }
}

registerELYSIQ().catch(console.error);
