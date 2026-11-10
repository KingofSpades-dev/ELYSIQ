import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { mainnet, sepolia } from "viem/chains";

const REGISTRY_ABI = parseAbi([
  "function getAgent(bytes32 agentId) view returns (string name, string description, string endpoint, address owner, uint256 registeredAt)",
]);

const MOCK_AGENT_DATA = {
  agent_id: "0x8a9c3d4e7b8f9a0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c",
  name: "ELYSIQ",
  description: "Nietzschean blockchain security agent. Wallet forensics, bundler detection, contract auditing, copy trade verdict. Powered by Claude Fable 5.",
  endpoint: "https://elysiq.xyz/api/v1/scan",
  owner: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  registered_at: new Date().toISOString(),
  standard: "ERC-8004",
  network: "ethereum-mainnet (Simulated)",
  capabilities: [
    "wallet-security-scan",
    "bundler-detection",
    "contract-audit",
    "copy-trade-verdict",
    "wallet-recovery",
    "trust-score",
  ],
  access: {
    read_scan: "free",
    deep_scan: "Holder tier >= 2 or pay-with-$ELYSIQ",
  },
};

export async function GET() {
  const agentId = process.env.ERC8004_AGENT_ID;
  const registryAddress = process.env.ERC8004_REGISTRY_ADDRESS;
  const rpcUrl = process.env.ETHEREUM_RPC_URL;
  const network = process.env.ERC8004_NETWORK || "mainnet";

  const isMockMode =
    !agentId ||
    agentId === "your_agent_id_here" ||
    !registryAddress ||
    registryAddress === "your_erc8004_registry_address_here" ||
    !rpcUrl ||
    rpcUrl.includes("YOUR_INFURA_KEY");

  if (isMockMode) {
    return NextResponse.json({
      ...MOCK_AGENT_DATA,
      mode: "mock/simulated",
    });
  }

  try {
    const targetChain = network === "mainnet" ? mainnet : sepolia;
    const publicClient = createPublicClient({
      chain: targetChain,
      transport: http(rpcUrl),
    });

    const agentData = await publicClient.readContract({
      address: registryAddress as `0x${string}`,
      abi: REGISTRY_ABI,
      functionName: "getAgent",
      args: [agentId as `0x${string}`],
    });

    return NextResponse.json({
      agent_id: agentId,
      name: agentData[0],
      description: agentData[1],
      endpoint: agentData[2],
      owner: agentData[3],
      registered_at: new Date(Number(agentData[4]) * 1000).toISOString(),
      standard: "ERC-8004",
      network: `ethereum-${network}`,
      mode: "live/on-chain",
      capabilities: [
        "wallet-security-scan",
        "bundler-detection",
        "contract-audit",
        "copy-trade-verdict",
        "wallet-recovery",
        "trust-score",
          ],
      access: {
        read_scan: "free",
        deep_scan: "Holder tier >= 2 or pay-with-$ELYSIQ",
      },
    });
  } catch (error: any) {
    console.error("ERC-8004 live query failed, falling back to simulated data:", error);
    return NextResponse.json({
      ...MOCK_AGENT_DATA,
      mode: "mock/fallback-due-to-rpc-error",
      error_detail: String(error?.message || error),
    });
  }
}
