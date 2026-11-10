'use client';

import { useState, useEffect, useRef } from 'react';
import { connectEvmWallet, getEvmProvider, signMessage } from '@/lib/chain/wallet-client';
import { payFee, feeLabel, type PayMethod } from '@/lib/chain/payments';

function PixelStache({ color, pixelSize = 4, className }: { color: string; pixelSize?: number; className?: string }) {
  const leftHalf = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];

  const grid = leftHalf.map(row => [...row, ...[...row].reverse()]);
  const rows = grid.length;
  const cols = grid[0].length;
  const w = cols * pixelSize;
  const h = rows * pixelSize;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      style={{ display: 'inline-block' }}
    >
      {grid.map((row, r) =>
        row.map((val, c) => {
          if (val === 0) return null;
          return (
            <rect
              key={`${r}-${c}`}
              x={c * pixelSize}
              y={r * pixelSize}
              width={pixelSize}
              height={pixelSize}
              fill={color}
            />
          );
        })
      )}
    </svg>
  );
}

interface StacheDetails {
  certified: boolean;
  tier: 'NONE' | 'BRONZE' | 'GOLD' | 'LEGENDARY';
  color: string | null;
  eligible_for_mint: boolean;
}

interface ScanResult {
  mint: string;
  name: string;
  symbol: string;
  reasoning?: string;
  trust_score: number;
  risk_level: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'RUG_RISK';
  verdict: string;
  mint_authority: 'revoked' | 'active' | 'unknown';
  freeze_authority: 'revoked' | 'active' | 'unknown';
  lp_locked: boolean | null;
  top_holder_concentration: string;
  bundler_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  findings: string[];
  green_flags: string[];
  market_cap: number;
  stache: StacheDetails;
  scanned_at?: string;
  powered_by?: string;
}

const SAMPLE_CAS = {
  safe: '0x00000000000000000000000000000000000e1151',
  mid: '0x000000000000000000000000000000000000a2d4',
  rug: '0x000000000000000000000000000000000000b00b'
};

const RISK_COLORS = {
  SAFE: '#4A7C59',
  LOW: '#4A7C59',
  MEDIUM: '#C9A84C',
  HIGH: '#8B3A2A',
  RUG_RISK: '#8B3A2A'
};

const RISK_BG = {
  SAFE: 'rgba(74,124,89,.12)',
  LOW: 'rgba(74,124,89,.12)',
  MEDIUM: 'rgba(201,168,76,.15)',
  HIGH: 'rgba(139,58,42,.12)',
  RUG_RISK: 'rgba(139,58,42,.12)'
};

const TIER_STACHE = {
  BRONZE: '🟫',
  GOLD: '🟨',
  LEGENDARY: '🔶',
  NONE: ''
};

function fmtMcap(n: number) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n;
}

const STEPS = [
  'Reading contract bytecode on Elysium...',
  'Checking ownership, proxy and source...',
  'Fetching holders and DEX liquidity...',
  'Claude synthesizing verdict...'
];

export default function TokenScanner({ onScanSuccess }: { onScanSuccess?: () => void }) {
  const [caInput, setCaInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const paidTxRef = useRef<{ address: string; tx: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>('USDC');
  const [showDisconnectMenu, setShowDisconnectMenu] = useState(false);
  const [showWalletErrorModal, setShowWalletErrorModal] = useState(false);

  useEffect(() => {
    // Reuse an already-authorised wallet without prompting
    const provider = getEvmProvider();
    provider?.request({ method: 'eth_accounts' })
      .then((accts: string[]) => { if (accts?.[0]) setConnectedWallet(accts[0]); })
      .catch(() => { });
  }, []);

  useEffect(() => {
    // Sync wallet address to Elysiq Chat Widget
    if (typeof window !== 'undefined') {
      const syncWallet = () => {
        if ((window as any).Elysiq && (window as any).Elysiq.setWallet) {
          (window as any).Elysiq.setWallet(connectedWallet || null);
        }
      };
      syncWallet();
      setTimeout(syncWallet, 1000); // Try again in case script is loading
    }
  }, [connectedWallet]);

  const disconnectWallet = async () => {
    // Injected wallets cannot be disconnected programmatically; just forget the account here.
    setConnectedWallet(null);
    setShowDisconnectMenu(false);
  };

  const connectWallet = async () => {
    if (typeof window === 'undefined') return;
    setShowDisconnectMenu(false);
    if (!getEvmProvider()) {
      setShowWalletErrorModal(true);
      return;
    }
    try {
      const { address } = await connectEvmWallet();
      setConnectedWallet(address);
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      alert("Connection failed: " + err.message);
    }
  };

  const processFeePayment = async (refText: string): Promise<string> => {
    const provider = getEvmProvider();
    if (!provider) {
      setShowWalletErrorModal(true);
      throw new Error("No EVM wallet found.");
    }
    if (!connectedWallet) {
      throw new Error("Please connect your wallet first.");
    }
    return payFee(provider, connectedWallet, paymentMethod, refText);
  };

  const handlePayAndScan = async () => {
    const targetAddress = caInput.trim();
    if (!targetAddress) return;

    if (!connectedWallet) {
      if (!getEvmProvider()) {
        setShowWalletErrorModal(true);
      } else {
        alert("Please connect your wallet first.");
      }
      return;
    }

    setPaying(true);
    try {
      setStatus('scanning');
      setCurrentStep(`Waiting for ${feeLabel(paymentMethod)} payment...`);

      const signature = await processFeePayment(targetAddress);
      console.log("Payment successful, tx:", signature);
      paidTxRef.current = { address: targetAddress.toLowerCase(), tx: signature };
      await runScan();
      
      // Catatan: Proses burn (pembakaran) tidak lagi dipicu dari sini.
      // Pembakaran akan dijalankan secara berkala oleh Cron Job.
    } catch (err: any) {
      console.error("Payment failed:", err);
      alert("Payment failed: " + (err.message || err.toString()));
      setStatus('idle');
    } finally {
      setPaying(false);
    }
  };
  const [currentStep, setCurrentStep] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Count up and bar progress states
  const [animatedScore, setAnimatedScore] = useState(0);
  const [fillPercent, setFillPercent] = useState(0);

  // Claim Pass states
  const [wallet, setWallet] = useState('');
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'idle' | 'claiming' | 'claimed' | 'error'>('idle');
  const [claimError, setClaimError] = useState('');

  // Registry verification & popup states
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<'prompt' | 'form'>('prompt');
  const [regProjectName, setRegProjectName] = useState('');
  const [regTwitter, setRegTwitter] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMascot, setRegMascot] = useState<File | null>(null);
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Step indicator simulation loop
  useEffect(() => {
    if (status !== 'scanning') return;
    let stepIndex = 0;
    setCurrentStep(STEPS[0]);

    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < STEPS.length) {
        setCurrentStep(STEPS[stepIndex]);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [status]);

  // Score count up animation
  useEffect(() => {
    if (status !== 'done' || !scanResult) return;

    setAnimatedScore(0);
    setFillPercent(0);

    const target = scanResult.trust_score;
    let current = 0;

    const countInterval = setInterval(() => {
      current += Math.ceil((target - current) / 6);
      if (current >= target) {
        current = target;
        clearInterval(countInterval);
      }
      setAnimatedScore(current);
    }, 40);

    const barTimeout = setTimeout(() => {
      setFillPercent(target);
    }, 100);

    return () => {
      clearInterval(countInterval);
      clearTimeout(barTimeout);
    };
  }, [status, scanResult]);

  const displayRisk = scanResult ? (
    scanResult.trust_score >= 80 ? 'SAFE' :
    scanResult.trust_score >= 50 ? 'MEDIUM' :
    scanResult.trust_score >= 25 ? 'HIGH' : 'RUG_RISK'
  ) : 'SAFE';

  const runScan = async (addressToScan?: string) => {
    const targetAddress = (addressToScan || caInput).trim();
    if (!targetAddress) return;

    setStatus('scanning');
    setErrorMsg('');
    setScanResult(null);
    setShowClaimForm(false);
    setClaimStatus('idle');
    setClaimError('');
    setCurrentStep('Checking Elysiq Registry...');

    try {
      const checkRes = await fetch(`/api/stache/check?mint=${targetAddress}`);
      if (!checkRes.ok) {
        throw new Error('Failed to verify registry status.');
      }
      const checkData = await checkRes.json();

      if (checkData.exists) {
        // Already registered, execute forensic scan directly
        await executeForensicScan(targetAddress);
      } else {
        // Not registered, reset state and open popup modal
        setStatus('idle');
        setRegProjectName('');
        setRegTwitter('');
        setRegEmail('');
        setRegMascot(null);

        // Attempt to pre-populate project name using DexScreener
        try {
          const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${targetAddress}`);
          if (dexRes.ok) {
            const dexJson = await dexRes.json();
            const name = dexJson.pairs?.[0]?.baseToken?.name || '';
            if (name) {
              setRegProjectName(name);
            }
          }
        } catch (e) {
          console.warn('DexScreener pre-fetch failed:', e);
        }

        setShowModal(true);
        setModalStep('prompt');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during registry verification.');
      setStatus('error');
    }
  };

  const executeForensicScan = async (targetAddress: string) => {
    setStatus('scanning');
    try {
      const res = await fetch('/api/token/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mint: targetAddress,
          payment_tx: paidTxRef.current?.address === targetAddress.toLowerCase() ? paidTxRef.current.tx : undefined,
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze token. Check the contract address.');
      }

      const data: ScanResult = await res.json();
      paidTxRef.current = null; // receipt consumed
      setScanResult(data);
      setStatus('done');
      if (onScanSuccess) {
        onScanSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected scan error occurred.');
      setStatus('error');
    }
  };

  const handleRegistrationAndScan = async () => {
    const targetAddress = caInput.trim();
    if (!targetAddress || !regProjectName.trim()) return;

    // Check if wallet is connected. If not, prompt to connect
    let activeWallet = connectedWallet;
    if (!activeWallet) {
      if (!getEvmProvider()) {
        setShowWalletErrorModal(true);
        return;
      }
      try {
        activeWallet = (await connectEvmWallet()).address;
        setConnectedWallet(activeWallet);
      } catch (err: any) {
        console.error("Wallet connection failed during registration:", err);
        alert("Please connect your wallet to complete registration and payment.");
        return;
      }
    }

    setRegSubmitting(true);
    setErrorMsg('');

    try {
      // Switch UI to scanning mode and show payment step
      setShowModal(false);
      setStatus('scanning');
      setCurrentStep(`Waiting for ${feeLabel(paymentMethod)} payment...`);

      // Step 1: Process Fee Payment
      const signature = await processFeePayment(targetAddress);
      console.log("Registry fee payment successful, tx:", signature);
      paidTxRef.current = { address: targetAddress.toLowerCase(), tx: signature };

      // Step 2: Submit Application
      setCurrentStep('Submitting Registry Application...');
      const formData = new FormData();
      formData.append('projectName', regProjectName.trim());
      formData.append('twitterHandle', regTwitter.trim());
      formData.append('contractAddress', targetAddress);
      formData.append('contactEmail', regEmail.trim());
      formData.append('paymentSignature', signature);
      if (regMascot) {
        formData.append('mascotImage', regMascot);
      }

      const applyRes = await fetch('/api/stache/apply', {
        method: 'POST',
        body: formData,
      });

      if (!applyRes.ok) {
        const errJson = await applyRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to submit registry application.');
      }

      // Step 3: Trigger Registry Scan
      setCurrentStep('Triggering Registry Security Scan...');
      const stacheScanRes = await fetch('/api/stache/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress: targetAddress }),
      });

      if (!stacheScanRes.ok) {
        console.warn('Registry audit scan failed, but proceeding to standard scan.');
      }

      // Step 4: Trigger Forensic Token Scan
      await executeForensicScan(targetAddress);

    } catch (err: any) {
      console.error(err);
      setShowModal(false);
      setErrorMsg(err.message || 'An error occurred during registry submission.');
      setStatus('error');
    } finally {
      setRegSubmitting(false);
    }
  };

  const loadSample = (type: 'safe' | 'mid' | 'rug') => {
    const address = SAMPLE_CAS[type];
    setCaInput(address);
    runScan(address);
  };

  const handleClaimPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanResult) return;

    setClaimStatus('claiming');
    setClaimError('');

    try {
      // Prove control of the wallet that registered this project; tier and score are decided by the server.
      if (!getEvmProvider()) {
        setShowWalletErrorModal(true);
        throw new Error('No EVM wallet found.');
      }
      const { provider, address } = await connectEvmWallet();
      setConnectedWallet(address);
      setWallet(address);
      const message = `Claim ELYSIQ Stache Pass
Token: ${scanResult.mint}
Wallet: ${address}
Timestamp: ${Date.now()}`;
      const signature = await signMessage(provider, address, message);

      const res = await fetch('/api/stache/certify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mint: scanResult.mint, address, message, signature })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to mint Stache Pass.');
      }

      setClaimStatus('claimed');
      if (onScanSuccess) {
        onScanSuccess(); // Refresh parent components/registry
      }
    } catch (err: any) {
      setClaimStatus('error');
      setClaimError(err.message || 'Error occurred while claiming.');
    }
  };

  const handleDownloadSVG = () => {
    if (!scanResult) return;

    const tierColor = scanResult.stache.color || '#C9A84C';

    // Construct the pixelated stache SVG elements dynamically
    const leftHalf = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
      [1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    const grid = leftHalf.map(row => [...row, ...[...row].reverse()]);
    const pixelSize = 5;
    const w = 34 * pixelSize;
    const startX = 300 - w / 2;
    const startY = 60;

    let stacheRects = '';
    grid.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val === 1) {
          stacheRects += `<rect x="${startX + c * pixelSize}" y="${startY + r * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${tierColor}" />`;
        }
      });
    });

    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" style="background:#F5F0E8;font-family:'DM Sans', sans-serif;">
  <rect x="20" y="20" width="560" height="360" fill="none" stroke="${tierColor}" stroke-width="4" stroke-dasharray="12,6" rx="8"/>
  <rect x="25" y="25" width="550" height="350" fill="none" stroke="${tierColor}" stroke-width="1" rx="6"/>
  
  <g>${stacheRects}</g>
  <text x="300" y="150" font-size="28" fill="#1A1814" text-anchor="middle" font-weight="bold">${scanResult.name}</text>
  <text x="300" y="190" font-size="20" fill="${tierColor}" text-anchor="middle" font-weight="600">${scanResult.stache.tier} STACHE CERTIFIED</text>
  
  <text x="300" y="235" font-size="12" fill="#8A8880" text-anchor="middle" letter-spacing="1">TRUST SCORE: ${scanResult.trust_score}/100</text>
  <text x="300" y="260" font-size="11" fill="#8A8880" text-anchor="middle" letter-spacing="0.5">CONTRACT: ${scanResult.mint}</text>
  
  <text x="300" y="325" font-size="11" fill="#D4633A" text-anchor="middle" letter-spacing="2">ELYSIQ STACHE CERTIFICATE</text>
  <text x="300" y="345" font-size="9" fill="#8A8880" text-anchor="middle">Powered by Claude &amp; Elysium Forensics</text>
</svg>
    `.trim();

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ELYSIQ_STACHE_${scanResult.name.toUpperCase()}_CERTIFICATE.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getRiskClass = (r: string) => {
    if (r === 'SAFE' || r === 'LOW') return 'good';
    if (r === 'MEDIUM') return 'warn';
    return 'bad';
  };

  return (
    <div className="scanner-container">
      <div className="scanner-card">
        {/* Wallet connection & payment row */}
        <div className="wallet-row">
          {connectedWallet ? (
            <div style={{ position: 'relative' }}>
              <button
                className="wallet-connected-btn"
                onClick={() => setShowDisconnectMenu(!showDisconnectMenu)}
              >
                <span className="wallet-icon">◈</span>
                {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                <span style={{ fontSize: '8px', marginLeft: '6px', opacity: 0.7 }}>▼</span>
              </button>
              {showDisconnectMenu && (
                <div className="wallet-dropdown">
                  <button onClick={connectWallet} className="dropdown-item">
                    Change Account
                  </button>
                  <button onClick={disconnectWallet} className="dropdown-item disconnect">
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="wallet-connect-btn" onClick={connectWallet}>
              <span className="wallet-icon">◈</span>
              Connect Wallet
            </button>
          )}

          <div className="pay-fee-options">
            <span className="pay-fee-label">Pay CA Fee Via:</span>
            <button
              className={`pay-fee-btn ${paymentMethod === 'USDC' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('USDC')}
            >
              USDC
            </button>
            <button
              className={`pay-fee-btn ${paymentMethod === 'ELYSIQ' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('ELYSIQ')}
            >
              ELYSIQ
            </button>
          </div>
        </div>

        <div className="scanner-label">Contract Address (Elysium)</div>
        <div className="input-row">
          <input
            className="ca-input"
            value={caInput}
            onChange={(e) => setCaInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePayAndScan()}
            placeholder="Paste any token CA (0x...)"
            spellCheck="false"
            disabled={status === 'scanning' || paying}
          />
          <button
            className="scan-btn"
            onClick={() => handlePayAndScan()}
            disabled={status === 'scanning' || paying || !caInput.trim()}
            data-magnetic
          >
            {paying ? 'Paying...' : status === 'scanning' ? 'Scanning...' : 'Scan'}
          </button>
        </div>
      </div>

      {/* Loading Block */}
      {status === 'scanning' && (
        <div className="loading">
          <div className="loading-stache-box">
            <span className="loading-stache">〰️</span>
          </div>
          <div className="loading-text">reading the chain...</div>
          <div className="loading-steps">{currentStep}</div>
        </div>
      )}

      {/* Error Block */}
      {status === 'error' && (
        <div className="error-box">
          <span className="error-icon">⚠️</span>
          <div className="error-title">Audit Terminated Prematurely</div>
          <div className="error-desc">{errorMsg}</div>
          <button className="retry-btn" onClick={() => setStatus('idle')}>Try Again</button>
        </div>
      )}

      {/* Result Block */}
      {status === 'done' && scanResult && (
        <div className="result-wrapper">
          <div className="result-card">
            <div className="result-head">
              <div>
                <span className="token-name">{scanResult.name}</span>
                {scanResult.symbol && <span className="token-symbol">${scanResult.symbol}</span>}
              </div>
              <span
                className="risk-badge"
                style={{
                  color: RISK_COLORS[displayRisk],
                  backgroundColor: RISK_BG[displayRisk]
                }}
              >
                {displayRisk.replace('_', ' ')}
              </span>
            </div>

            <div className="score-block">
              <div
                className="score-num"
                style={{ color: RISK_COLORS[displayRisk] }}
              >
                {animatedScore}
              </div>
              <div className="score-meta">
                <div className="score-label">ELYSIQ Trust Score</div>
                <div className="score-bar">
                  <div
                    className="score-fill"
                    style={{
                      width: `${fillPercent}%`,
                      backgroundColor: RISK_COLORS[displayRisk]
                    }}
                  />
                </div>
                <div className="score-verdict">"{scanResult.verdict}"</div>
              </div>
            </div>

            {scanResult.reasoning && (
              <div className="reasoning-box-inline">
                <span className="reasoning-title">ELYSIQ AGENT LOGICAL TRACE:</span>
                <div className="reasoning-steps-list">
                  {scanResult.reasoning.split(/(?=Step \d+:)/gi)
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0)
                    .map((step, idx) => (
                      <div key={idx} className="reasoning-step-item">
                        {step}
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            <div className="stats-grid">
              <div className="stat">
                <div className="stat-label">Mint Control</div>
                <div className={`stat-val ${scanResult.mint_authority === 'revoked' ? 'good' : scanResult.mint_authority === 'unknown' ? '' : 'bad'}`}>
                  {scanResult.mint_authority}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Pause / Blacklist</div>
                <div className={`stat-val ${scanResult.freeze_authority === 'revoked' ? 'good' : scanResult.freeze_authority === 'unknown' ? '' : 'bad'}`}>
                  {scanResult.freeze_authority}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Liquidity Locked</div>
                <div className={`stat-val ${scanResult.lp_locked === null ? '' : scanResult.lp_locked ? 'good' : 'bad'}`}>
                  {scanResult.lp_locked === null ? 'Unknown' : scanResult.lp_locked ? 'Locked' : 'Not locked'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Top Holders</div>
                <div className="stat-val">{scanResult.top_holder_concentration}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Wallet Cluster Risk</div>
                <div className={`stat-val ${getRiskClass(scanResult.bundler_risk)}`}>
                  {scanResult.bundler_risk}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Market Cap</div>
                <div className="stat-val">{fmtMcap(scanResult.market_cap)}</div>
              </div>
            </div>

            {(scanResult.findings.length > 0 || scanResult.green_flags.length > 0) && (
              <div className="findings">
                {scanResult.findings.length > 0 && (
                  <>
                    <div className="findings-label">Risk Findings</div>
                    {scanResult.findings.map((f, i) => (
                      <div key={i} className="finding flag">
                        <span className="dot">▲</span>{f}
                      </div>
                    ))}
                  </>
                )}
                {scanResult.green_flags.length > 0 && (
                  <>
                    <div className="findings-label" style={{ marginTop: '16px' }}>Green Flags</div>
                    {scanResult.green_flags.map((g, i) => (
                      <div key={i} className="finding green">
                        <span className="dot">✓</span>{g}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Certificate Block */}
          {scanResult.stache.certified ? (
            <div className="certificate">
              <div className="cert-frame" style={{ color: scanResult.stache.color || '#C9A84C', borderColor: 'currentColor' }}>
                <span className="cert-corner tl"></span>
                <span className="cert-corner tr"></span>
                <span className="cert-corner bl"></span>
                <span className="cert-corner br"></span>

                <div className="cert-stache cert-stache-pixel">
                  <PixelStache color={scanResult.stache.color || '#C9A84C'} pixelSize={4.5} />
                </div>
                <div className="cert-tier" style={{ color: 'currentColor' }}>
                  {scanResult.stache.tier} STACHE
                </div>
                <div className="cert-sub">Stache Certified · ELYSIQ</div>

                <div className="cert-actions">
                  {!showClaimForm && claimStatus !== 'claimed' && (
                    <button
                      className="cert-claim"
                      onClick={() => setShowClaimForm(true)}
                      data-magnetic
                    >
                      Claim Stache Pass ∴
                    </button>
                  )}

                  {showClaimForm && claimStatus !== 'claimed' && (
                    <form onSubmit={handleClaimPass} className="claim-form">
                      <div className="claim-wallet-input" style={{ opacity: 0.8 }}>
                        {connectedWallet
                          ? `Mint to ${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)} (must be the wallet that registered this project)`
                          : 'Your wallet will ask you to sign. It must be the wallet that registered this project.'}
                      </div>
                      <div className="claim-form-btns">
                        <button
                          type="submit"
                          className="claim-submit-btn"
                          disabled={claimStatus === 'claiming'}
                        >
                          {claimStatus === 'claiming' ? 'MINTING...' : 'CONFIRM MINT'}
                        </button>
                        <button
                          type="button"
                          className="claim-cancel-btn"
                          onClick={() => setShowClaimForm(false)}
                          disabled={claimStatus === 'claiming'}
                        >
                          CANCEL
                        </button>
                      </div>
                      {claimStatus === 'error' && (
                        <div className="claim-error">{claimError}</div>
                      )}
                    </form>
                  )}

                  {claimStatus === 'claimed' && (
                    <div className="claim-success-msg">
                      🎉 Stache Pass Minted Successfully! Registered to registry.
                    </div>
                  )}

                  <button
                    className="cert-download"
                    onClick={handleDownloadSVG}
                    data-magnetic
                  >
                    Download Certificate
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="not-certified">
              <div className="nc-stache">〰️</div>
              <div className="nc-text">This token did not earn the stache.</div>
            </div>
          )}
        </div>
      )}

      {/* Modal Wallet Tidak Terdeteksi */}
      {showWalletErrorModal && (
        <div className="modal-overlay" onClick={() => setShowWalletErrorModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowWalletErrorModal(false)}>✕</button>
            <div className="modal-step-prompt">
              <h3 className="modal-title" style={{ color: '#8B3A2A' }}>Wallet Not Detected</h3>
              <div className="modal-subtitle">
                We couldn't detect an EVM wallet extension (MetaMask, Rabby, ...) in your browser.
                <br /><br />
                If you recently reinstalled or enabled the extension:
                <ul style={{ paddingLeft: '20px', marginTop: '10px', textAlign: 'left', lineHeight: '1.6' }}>
                  <li>Make sure the extension is active in your browser's extension settings.</li>
                  <li><strong>Refresh this page</strong> to allow the extension to properly inject itself.</li>
                </ul>
              </div>
              <div className="modal-action-row">
                <a
                  href="https://metamask.io"
                  target="_blank"
                  rel="noreferrer"
                  className="modal-btn-primary"
                  style={{ textDecoration: 'none', textAlign: 'center' }}
                >
                  Get MetaMask
                </a>
                <button
                  className="modal-btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal/Pop-up Registrasi */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !regSubmitting && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => !regSubmitting && setShowModal(false)} disabled={regSubmitting}>✕</button>

            {modalStep === 'prompt' ? (
              <div className="modal-step-prompt">
                <h3 className="modal-title">Project Not Registered</h3>
                <p className="modal-subtitle">
                  The token with contract address <code>{caInput}</code> is not registered in the Elysiq Stache Registry.
                  Would you like to register it first to gain official certification?
                </p>
                <div className="modal-action-row">
                  <button
                    className="modal-btn-primary"
                    onClick={() => setModalStep('form')}
                  >
                    Yes, Register Project
                  </button>
                  <button
                    className="modal-btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      executeForensicScan(caInput.trim());
                    }}
                  >
                    No, Scan Directly
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleRegistrationAndScan(); }} className="modal-step-form">
                <h3 className="modal-title">Project Registration Form</h3>
                <p className="modal-subtitle">Fill in the details below to register this project. A registry & audit fee is required ({feeLabel('USDC')} or {feeLabel('ELYSIQ')}).</p>

                <div className="form-group">
                  <label htmlFor="regProjectName">Project Name *</label>
                  <input
                    type="text"
                    id="regProjectName"
                    value={regProjectName}
                    onChange={(e) => setRegProjectName(e.target.value)}
                    required
                    placeholder="e.g. PenguinDAO"
                    disabled={regSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="regTwitter">Twitter Handle (Optional)</label>
                  <input
                    type="text"
                    id="regTwitter"
                    value={regTwitter}
                    onChange={(e) => setRegTwitter(e.target.value)}
                    placeholder="e.g. @PenguinDAO"
                    disabled={regSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="regEmail">Contact Email (Optional)</label>
                  <input
                    type="email"
                    id="regEmail"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. core@penguindao.com"
                    disabled={regSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="regMascot">Upload Mascot (Optional)</label>
                  <input
                    type="file"
                    id="regMascot"
                    accept="image/*"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const selectedFile = files[0];
                        if (selectedFile.size > 2 * 1024 * 1024) {
                          alert('Mascot image size must be less than 2MB');
                          e.target.value = '';
                          setRegMascot(null);
                          return;
                        }
                        setRegMascot(selectedFile);
                      } else {
                        setRegMascot(null);
                      }
                    }}
                    disabled={regSubmitting}
                  />
                  <span className="input-hint">Max size: 2MB (SVG, PNG, or JPG)</span>
                </div>

                <div className="modal-action-row" style={{ marginTop: '20px' }}>
                  {!connectedWallet ? (
                    <button
                      type="button"
                      className="modal-btn-primary"
                      onClick={connectWallet}
                      disabled={regSubmitting}
                    >
                      Connect Wallet to Pay
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="modal-btn-primary"
                      disabled={regSubmitting || !regProjectName.trim()}
                    >
                      {regSubmitting ? 'PROCESSING...' : `Pay ${feeLabel(paymentMethod)} & Register`}
                    </button>
                  )}
                  <button
                    type="button"
                    className="modal-btn-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={regSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .scanner-container {
          width: 100%;
          color: #1A1814;
        }
        .scanner-card {
          background: #F5F0E8;
          border: 1px solid #E0D9CE;
          border-radius: 12px;
          padding: 28px;
          margin-bottom: 24px;
          box-shadow: 0 4px 24px rgba(26,24,20,.04);
        }
        .scanner-label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #8A8880;
          margin-bottom: 12px;
          text-align: left;
        }
        .input-row {
          display: flex;
          gap: 10px;
        }
        .ca-input {
          flex: 1;
          background: #EDE8DE;
          border: 1px solid #E0D9CE;
          border-radius: 6px;
          padding: 14px 16px;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          color: #1A1814;
          outline: none;
          transition: border-color .15s;
          cursor: none !important;
        }
        .ca-input:focus {
          border-color: #D4633A;
        }
        .scan-btn {
          background: #1A1814;
          color: #F5F0E8;
          border: none;
          border-radius: 6px;
          padding: 14px 28px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: .1em;
          text-transform: uppercase;
          cursor: none !important;
          transition: background .15s, transform .15s;
        }
        .scan-btn:hover {
          background: #D4633A;
        }
        .scan-btn:active {
          transform: scale(.97);
        }
        .scan-btn:disabled {
          opacity: .5;
          cursor: not-allowed !important;
        }
        .samples {
          display: flex;
          gap: 8px;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .sample-chip {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #8A8880;
          background: #EDE8DE;
          border: 1px solid #E0D9CE;
          border-radius: 14px;
          padding: 5px 12px;
          cursor: none !important;
          transition: all .15s;
        }
        .sample-chip:hover {
          border-color: #D4633A;
          color: #D4633A;
        }

        /* Loading */
        .loading {
          text-align: center;
          padding: 48px 0;
        }
        .loading-stache-box {
          margin-bottom: 8px;
        }
        .loading-stache {
          display: inline-block;
          font-size: 40px;
          animation: bob 1.2s ease-in-out infinite;
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-8px) rotate(3deg); }
        }
        .loading-text {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #8A8880;
          letter-spacing: .1em;
          margin-top: 16px;
        }
        .loading-steps {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #D4633A;
          margin-top: 8px;
          min-height: 16px;
        }

        /* Error */
        .error-box {
          text-align: center;
          padding: 30px 20px;
          background: #EDE8DE;
          border: 1px solid #E0D9CE;
          border-radius: 8px;
        }
        .error-icon {
          font-size: 36px;
          margin-bottom: 12px;
          display: block;
        }
        .error-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          color: #8B3A2A;
          margin-bottom: 6px;
          font-weight: 600;
        }
        .error-desc {
          font-size: 13px;
          color: #8A8880;
          margin-bottom: 18px;
        }
        .retry-btn {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          padding: 8px 16px;
          background: #1A1814;
          color: #F5F0E8;
          border: none;
          border-radius: 4px;
          cursor: none !important;
        }
        .retry-btn:hover {
          background: #D4633A;
        }

        /* Result */
        .result-wrapper {
          animation: fadeUp .5s ease;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .result-card {
          background: #F5F0E8;
          border: 1px solid #E0D9CE;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 20px;
          box-shadow: 0 4px 24px rgba(26,24,20,.02);
        }
        .result-head {
          padding: 16px 24px;
          background: #EDE8DE;
          border-bottom: 1px solid #E0D9CE;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .token-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: bold;
        }
        .token-symbol {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #8A8880;
          margin-left: 8px;
        }
        .risk-badge {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: .1em;
          padding: 4px 14px;
          border-radius: 20px;
          text-transform: uppercase;
        }

        /* Score Block */
        .score-block {
          padding: 32px 24px;
          display: flex;
          align-items: center;
          gap: 32px;
          border-bottom: 1px solid #E0D9CE;
        }
        .score-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 84px;
          font-weight: 300;
          line-height: 1;
        }
        .score-meta {
          flex: 1;
          text-align: left;
        }
        .score-label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #8A8880;
          margin-bottom: 8px;
        }
        .score-bar {
          height: 6px;
          background: #E0D9CE;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .score-fill {
          height: 100%;
          border-radius: 3px;
          width: 0;
          transition: width 1.2s cubic-bezier(.16,1,.3,1);
        }
        .score-verdict {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 18px;
          color: #D4633A;
          line-height: 1.4;
        }
        .reasoning-box-inline {
          padding: 24px;
          background: rgba(26,24,20, 0.02);
          border-bottom: 1px solid #E0D9CE;
          text-align: left;
        }
        .reasoning-title {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #8D6914;
          display: block;
          margin-bottom: 12px;
          font-weight: 700;
        }
        .reasoning-steps-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .reasoning-step-item {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #5A5750;
          line-height: 1.6;
          word-break: break-word;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1px;
          background: #E0D9CE;
        }
        .stat {
          background: #F5F0E8;
          padding: 16px 20px;
          text-align: left;
        }
        .stat-label {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #8A8880;
          margin-bottom: 6px;
        }
        .stat-val {
          font-family: 'DM Mono', monospace;
          font-size: 14px;
          color: #1A1814;
        }
        .stat-val.good { color: #4A7C59; }
        .stat-val.bad { color: #8B3A2A; }
        .stat-val.warn { color: #8B6914; }

        /* Findings */
        .findings {
          padding: 18px 24px;
          border-top: 1px solid #E0D9CE;
          text-align: left;
        }
        .findings-label {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #8A8880;
          margin-bottom: 10px;
        }
        .finding {
          font-size: 13px;
          color: #D4633A;
          padding: 5px 0;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .finding .dot {
          flex-shrink: 0;
        }
        .finding.flag .dot { color: #8B3A2A; }
        .finding.green .dot { color: #4A7C59; }

        /* Certificate */
        .certificate {
          margin-top: 20px;
          animation: certReveal .8s cubic-bezier(.16,1,.3,1);
        }
        @keyframes certReveal {
          from { opacity: 0; transform: scale(.92) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .cert-frame {
          border: 1px solid currentColor;
          border-radius: 8px;
          padding: 36px 32px 32px 32px;
          text-align: center;
          background: #F5F0E8;
          position: relative;
        }
        .cert-frame::after {
          content: '';
          position: absolute;
          top: 6px;
          bottom: 6px;
          left: 6px;
          right: 6px;
          border: 1.5px dashed currentColor;
          border-radius: 4px;
          pointer-events: none;
          opacity: 0.75;
        }
        .cert-corner {
          position: absolute;
          width: 16px;
          height: 16px;
        }
        .cert-corner.tl { top: 12px; left: 12px; border-top: 2px solid; border-left: 2px solid; }
        .cert-corner.tr { top: 12px; right: 12px; border-top: 2px solid; border-right: 2px solid; }
        .cert-corner.bl { bottom: 12px; left: 12px; border-bottom: 2px solid; border-left: 2px solid; }
        .cert-corner.br { bottom: 12px; right: 12px; border-bottom: 2px solid; border-right: 2px solid; }
        
        .cert-stache {
          font-size: 56px;
          margin-bottom: 8px;
          line-height: 1;
        }
        .cert-stache-pixel {
          display: inline-block;
          margin-top: 4px;
          margin-bottom: 14px;
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .cert-stache-pixel:hover {
          transform: scale(1.18) rotate(-3deg);
        }
        .cert-tier {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 700;
          letter-spacing: .06em;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .cert-sub {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: #8A8880;
          margin-bottom: 24px;
        }
        .cert-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .cert-claim {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: .1em;
          text-transform: uppercase;
          padding: 12px 28px;
          border: none;
          border-radius: 6px;
          background: #1A1814;
          color: #F5F0E8;
          cursor: none !important;
          transition: background .15s;
        }
        .cert-claim:hover {
          background: #D4633A;
        }
        .cert-download {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: .08em;
          text-transform: uppercase;
          padding: 8px 18px;
          border: 1px solid #E0D9CE;
          border-radius: 4px;
          background: transparent;
          color: #8A8880;
          cursor: none !important;
          transition: all .15s;
        }
        .cert-download:hover {
          border-color: #D4633A;
          color: #D4633A;
          background: rgba(212,99,58, 0.04);
        }

        /* Claim Form styling */
        .claim-form {
          width: 100%;
          max-width: 320px;
          background: #EDE8DE;
          border: 1px solid #E0D9CE;
          padding: 16px;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .claim-wallet-input {
          width: 100%;
          background: #F5F0E8;
          border: 1px solid #E0D9CE;
          border-radius: 4px;
          padding: 8px 12px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #1A1814;
          outline: none;
          cursor: none !important;
        }
        .claim-wallet-input:focus {
          border-color: #D4633A;
        }
        .claim-form-btns {
          display: flex;
          gap: 8px;
        }
        .claim-submit-btn {
          flex: 2;
          background: #4A7C59;
          color: #F5F0E8;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.06em;
          border: none;
          padding: 8px;
          border-radius: 4px;
          cursor: none !important;
          transition: background 0.15s;
        }
        .claim-submit-btn:hover:not(:disabled) {
          background: #365e43;
        }
        .claim-submit-btn:disabled {
          opacity: 0.6;
        }
        .claim-cancel-btn {
          flex: 1;
          background: transparent;
          border: 1px solid #E0D9CE;
          color: #8A8880;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          padding: 8px;
          border-radius: 4px;
          cursor: none !important;
          transition: all 0.15s;
        }
        .claim-cancel-btn:hover {
          border-color: #8B3A2A;
          color: #8B3A2A;
        }
        .claim-error {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #8B3A2A;
          text-align: center;
        }
        .claim-success-msg {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #4A7C59;
          font-weight: 600;
          background: rgba(74, 124, 89, 0.1);
          padding: 10px 14px;
          border-radius: 4px;
          border: 1px solid rgba(74, 124, 89, 0.2);
        }

        .not-certified {
          margin-top: 20px;
          padding: 24px;
          text-align: center;
          border: 1px dashed #E0D9CE;
          border-radius: 8px;
        }
        .nc-stache {
          font-size: 40px;
          opacity: .3;
          margin-bottom: 8px;
        }
        .nc-text {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 18px;
          color: #8A8880;
        }

        /* Modal styling */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(26,24,20, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: none;
        }
        .modal-content {
          background: #EDE8DE;
          border: 1px solid #E0D9CE;
          padding: 40px;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 24px 60px rgba(26,24,20, 0.3);
          position: relative;
          cursor: none;
          text-align: left;
        }
        .modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: none;
          border: none;
          font-size: 20px;
          color: #8A8880;
          cursor: none !important;
          transition: color 0.15s;
        }
        .modal-close:hover { color: #1A1814; }
        .modal-close:disabled { opacity: 0.5; cursor: not-allowed !important; }
        
        .modal-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          color: #1A1814;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .modal-subtitle {
          font-size: 13px;
          color: #8A8880;
          margin-bottom: 24px;
          line-height: 1.5;
        }
        .modal-action-row {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }
        .modal-btn-primary {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 12px 24px;
          background: #D4633A;
          color: #F5F0E8;
          border: none;
          border-radius: 4px;
          cursor: none !important;
          transition: background 0.15s;
          font-weight: 500;
        }
        .modal-btn-primary:hover:not(:disabled) {
          background: #D4633A;
        }
        .modal-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed !important;
        }
        .modal-btn-secondary {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 12px 24px;
          background: #1A1814;
          color: #F5F0E8;
          border: none;
          border-radius: 4px;
          cursor: none !important;
          transition: background 0.15s;
          font-weight: 500;
        }
        .modal-btn-secondary:hover:not(:disabled) {
          background: #D4633A;
        }
        .modal-btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed !important;
        }

        .modal-step-form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #D4633A;
          text-align: left;
        }
        .form-group input {
          background: #F5F0E8;
          border: 1px solid #E0D9CE;
          border-radius: 4px;
          padding: 10px 14px;
          font-size: 14px;
          color: #1A1814;
          outline: none;
          transition: border-color 0.15s;
          cursor: none !important;
        }
        .form-group input:focus { border-color: #D4633A; }
        .form-group input[type="file"] {
          padding: 8px 12px;
        }
        .form-group input[type="file"]::file-selector-button {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: #1A1814;
          color: #F5F0E8;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: none !important;
          transition: background 0.15s;
          margin-right: 12px;
        }
        .form-group input[type="file"]::file-selector-button:hover {
          background: #D4633A;
        }
        .input-hint {
          font-size: 11px;
          color: #8A8880;
          display: block;
          margin-top: 4px;
          text-align: left;
        }

        @media (max-width: 600px) {
          .score-block {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }
          .score-meta {
            text-align: center;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
        .wallet-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px dashed #E0D9CE;
          gap: 16px;
          flex-wrap: wrap;
        }
        .wallet-connect-btn, .wallet-connected-btn {
          background: #D4633A;
          color: #F5F0E8;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: .05em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s;
          cursor: none !important;
        }
        .wallet-connect-btn:hover, .wallet-connected-btn:hover {
          background: #D4633A;
        }
        .wallet-icon {
          font-size: 14px;
        }
        .pay-fee-options {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pay-fee-label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: .05em;
          text-transform: uppercase;
          color: #8A8880;
        }
        .pay-fee-btn {
          background: transparent;
          border: 1px solid #E0D9CE;
          border-radius: 4px;
          padding: 4px 10px;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #D4633A;
          cursor: none !important;
          transition: all 0.15s;
        }
        .pay-fee-btn:hover {
          border-color: #1A1814;
          color: #1A1814;
        }
        .pay-fee-btn.active {
          background: #1A1814;
          border-color: #1A1814;
          color: #F5F0E8;
        }

        .wallet-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          background: #EDE8DE;
          border: 1px solid #E0D9CE;
          border-radius: 6px;
          padding: 4px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 140px;
          z-index: 100;
          box-shadow: 0 4px 16px rgba(26,24,20,0.1);
        }
        .dropdown-item {
          background: transparent;
          border: none;
          border-radius: 4px;
          padding: 8px 12px;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: .02em;
          text-transform: uppercase;
          color: #D4633A;
          text-align: left;
          cursor: none !important;
          transition: all 0.15s;
          width: 100%;
        }
        .dropdown-item:hover {
          background: #E0D9CE;
          color: #1A1814;
        }
        .dropdown-item.disconnect {
          color: #8B3A2A;
        }
        .dropdown-item.disconnect:hover {
          background: #8B3A2A;
          color: #F5F0E8;
        }
      `}</style>
    </div>
  );
}
