

interface SiweResponse {
  success: boolean;
  wallet: string;
  tier: number;
  message: string;
}

const TEST_WALLETS = {
  tier0: '0x00000000000000000000000000000000000a0000',
  tier1: '0x00000000000000000000000000000000000e1151',
  tier2: '0x000000000000000000000000000000000000a2d4',
  tier3: '0x000000000000000000000000000000000000b00b',
};

async function runSIWETest() {
  const baseUrl = 'http://localhost:3000';
  console.log('[Test] Commencing SIWE authentication and gating verification...\n');

  for (const [tierName, wallet] of Object.entries(TEST_WALLETS)) {
    console.log(`[Test] Authenticating ${tierName.toUpperCase()} wallet: ${wallet}`);

    try {
      const loginPayload = {
        address: wallet,
        message: `Sign in to ELYSIQ to verify your token holdings.
Wallet: ${wallet}
Timestamp: ${Date.now()}`,
        signature: 'sim_sig_' + Math.random().toString(36).substring(2, 15),
      };

      const res = await fetch(`${baseUrl}/api/auth/siwe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload),
      });

      const cookies = res.headers.get('set-cookie');
      const data = (await res.json()) as SiweResponse;

      if (res.ok && data.success) {
        console.log(`   -> Verified: Wallet has Tier ${data.tier} Access.`);
        console.log(`   -> Session Cookie generated: ${cookies?.slice(0, 45)}...`);
      } else {
        console.error(`   -> FAIL: Login failed.`);
      }
      console.log('--------------------------------------------------');
    } catch (err: any) {
      console.error(`   -> Error: Make sure Next.js server is running!`, err.message);
      process.exit(1);
    }
  }
}

runSIWETest();
