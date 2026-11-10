'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { connectEvmWallet, signMessage } from '@/lib/chain/wallet-client';

interface OutpostPlayer {
  walletAddress: string;
  rep: number;
  intel: number;
  cred: number;
  scannerLevel: number;
  harvestMultiplier: number;
  guildId: number | null;
  boost5Count?: number;
  boost15Count?: number;
  boost25Count?: number;
}

interface OutpostPlot {
  id: string;
  walletAddress: string;
  plotIndex: number;
  state: 'EMPTY' | 'WORKING' | 'READY' | 'LOCKED';
  scannerTier: number;
  startedAt: number;
  duration: number;
  expectedYield: number;
}

interface OutpostGuild {
  id: number;
  name: string;
  pooledIntel: number;
  bonusMultiplier: number;
  members: string[];
}

interface OutpostHunt {
  id: string;
  ticker: string;
  signals: {
    k: string;
    v: string;
    cls: 'good' | 'bad' | 'warn';
    rug: number;
  }[];
  isRug: boolean;
  marketCap: string;
  spawnedAt: number;
  deadline: number;
  winnerWallet: string | null;
  othersCount: number;
}

interface ToastItem {
  id: string;
  message: string;
  type: 'good' | 'bad' | 'gold';
}

const SCANNER_TIERS = [
  { name: 'BASIC', dur: 8000, yield: 30, col: '#5fa06f', cost: 20 },
  { name: 'PRO', dur: 14000, yield: 80, col: '#C9A84C', cost: 50 },
  { name: 'ELITE', dur: 22000, yield: 180, col: '#D4633A', cost: 110 }
];

export default function OutpostPage() {
  const [activeTab, setActiveTab] = useState<'outpost' | 'hunt' | 'upgrade' | 'market' | 'guild' | 'ranks'>('outpost');
  const [intelConvertAmt, setIntelConvertAmt] = useState<string>('');
  const [credConvertAmt, setCredConvertAmt] = useState<string>('');
  const [player, setPlayer] = useState<OutpostPlayer | null>(null);
  const [plots, setPlots] = useState<OutpostPlot[]>([]);
  const [activeHunt, setActiveHunt] = useState<OutpostHunt | null>(null);
  const [guilds, setGuilds] = useState<OutpostGuild[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<{ rank: number; player: any } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [wallet, setWallet] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [huntCalling, setHuntCalling] = useState(false);

  // Timers trigger state updates on client side
  const [time, setTime] = useState(Date.now());

  const addToast = useCallback((message: string, type: 'good' | 'bad' | 'gold') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  // Fetch full game state
  const fetchGameState = useCallback(async () => {
    try {
      const res = await fetch('/api/outpost/action');
      if (res.ok) {
        const data = await res.json();
        setPlayer(data.player);
        if (data.plots) setPlots(data.plots);
        setWallet(data.player.walletAddress);
      } else if (res.status === 401) {
        setPlayer(null);
        setWallet(null);
      }
    } catch (err) {
      console.error('Failed to fetch game state:', err);
    }
  }, []);

  const fetchThreats = useCallback(async () => {
    try {
      const res = await fetch('/api/outpost/threat');
      if (res.status === 401) {
        setPlayer(null);
        setWallet(null);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setActiveHunt(data.hunt);
      }
    } catch (err) {
      console.error('Failed to fetch threats:', err);
    }
  }, []);

  const fetchGuilds = useCallback(async () => {
    try {
      // In local mode we simulate guilds listing
      setGuilds([
        {
          id: 1,
          name: '∴ THE ARCHIVISTS',
          pooledIntel: player?.guildId === 1 ? player?.intel + 14200 : 14200,
          bonusMultiplier: 1.15,
          members: ['cprkrn', 'stache_lord', 'degen42', 'rug_nuked']
        },
        {
          id: 2,
          name: '∴ RUG BUSTERS',
          pooledIntel: 8900,
          bonusMultiplier: 1.08,
          members: ['0xMira', 'penguin_g']
        }
      ]);
    } catch (err) {}
  }, [player]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/outpost/leaderboard');
      if (res.status === 401) {
        setPlayer(null);
        setWallet(null);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setUserRank(data.userRank || null);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  }, []);

  // Initial check
  useEffect(() => {
    fetchGameState().then(() => setAuthChecked(true));
  }, [fetchGameState]);

  // Periodic ticks for timer sync
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Polling data updates
  useEffect(() => {
    if (!wallet) return;
    fetchThreats();
    fetchGuilds();

    const interval = setInterval(() => {
      fetchThreats();
      fetchGuilds();
    }, 5000);

    return () => clearInterval(interval);
  }, [wallet, fetchThreats, fetchGuilds]);

  // Connect wallet (EVM, sign-in with Ethereum style)
  const connectWallet = async () => {
    setConnecting(true);
    try {
      let provider: any = null;
      let address: string;
      let isMock = false;
      try {
        ({ provider, address } = await connectEvmWallet());
      } catch (connErr) {
        if (process.env.NODE_ENV === 'production') throw connErr;
        console.warn('No EVM wallet available. Using dev mock wallet.', connErr);
        isMock = true;
        address = '0x00000000000000000000000000000000000e1151';
      }

      // 1. Get nonce
      const nonceRes = await fetch('/api/outpost/auth');
      const { nonce: serverNonce } = await nonceRes.json();
      setNonce(serverNonce);

      // 2. Sign message
      const messageText = `ELYSIQ Outpost login
Wallet: ${address}
nonce: ${serverNonce}
Timestamp: ${Date.now()}`;
      const signature = isMock ? 'sim_sig_dev_only' : await signMessage(provider, address, messageText);

      // 3. Verify
      const verifyRes = await fetch('/api/outpost/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message: messageText, signature, nonce: serverNonce })
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok) {
        setWallet(address);
        addToast('Connected. Welcome to ELYSIQ Outpost.', 'good');
        fetchGameState();
      } else {
        addToast(verifyData.error || 'Access Gating check failed', 'bad');
      }
    } catch (err) {
      console.error('Connection failed:', err);
      addToast('Wallet signing cancelled.', 'bad');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await fetch('/api/auth/siwe', { method: 'DELETE' }); // signs out of session
      setWallet(null);
      setPlayer(null);
      setPlots([]);
      addToast('Disconnected.', 'bad');
    } catch (err) {}
  };

  const handleAction = async (action: string, plotIndex?: number, extra = {}) => {
    if (!wallet) {
      addToast('Connect wallet to perform actions', 'bad');
      return;
    }

    try {
      const res = await fetch('/api/outpost/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, plotIndex, ...extra })
      });
      if (res.status === 401) {
        setPlayer(null);
        setWallet(null);
        addToast('Session expired. Please reconnect.', 'bad');
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setPlayer(data.player);
        if (data.plots) setPlots(data.plots);

        if (action === 'harvest') {
          addToast(`+${data.harvested} Intel harvested!`, 'gold');
        } else if (action === 'deploy') {
          addToast('Harvester deployed.', 'good');
        } else if (action === 'unlock') {
          addToast('Plot location unlocked!', 'good');
        } else if (action === 'convert') {
          addToast(`Converted intel into +${data.converted} CRED.`, 'gold');
        } else if (action === 'convert_cred_to_rep') {
          addToast(`Converted credits into +${data.repGained} REP.`, 'gold');
        } else if (action === 'upgrade') {
          addToast('Upgrade successful!', 'good');
        } else if (action === 'guild_join') {
          addToast(`Joined ${data.guild.name}!`, 'good');
        } else if (action === 'guild_contribute') {
          addToast('Contributed 100 Intel to Guild pool.', 'good');
        }
      } else {
        addToast(data.error || 'Action failed', 'bad');
      }
    } catch (err) {
      addToast('Network intent failed.', 'bad');
    }
  };

  const handleCallHunt = async (saidSafe: boolean) => {
    if (!activeHunt || huntCalling) return;

    setHuntCalling(true);
    try {
      const res = await fetch('/api/outpost/threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saidSafe })
      });
      if (res.status === 401) {
        setPlayer(null);
        setWallet(null);
        addToast('Session expired. Please reconnect.', 'bad');
        return;
      }
      const data = await res.json();
      if (res.ok) {
        if (data.correct) {
          if (data.winner) {
            addToast(`✓ Success! Win +${data.rewardIntel} intel, +${data.rewardRep} rep!`, 'gold');
          } else {
            addToast(data.message || 'Someone else won first.', 'bad');
          }
        } else {
          addToast(`✗ Incorrect call! Deducted 15 rep.`, 'bad');
        }
        if (data.player) setPlayer(data.player);
        setActiveHunt(null);
      } else {
        addToast(data.error || 'Hunt call failed', 'bad');
      }
    } catch (err) {
      addToast('Network hunt call failed', 'bad');
    } finally {
      setHuntCalling(false);
    }
  };

  return (
    <div className="outpost-body">
      {/* Scan Lines overlay for Retro feel */}
      <div className="scan-lines"></div>

      {/* Auth Screen Overlay */}
      {!wallet && authChecked && (
        <div className="overlay" id="startScreen">
          <div className="modetag">∴ MULTIPLAYER OUTPOST ∴</div>
          <svg className="mascot-big" viewBox="0 0 110 84">
            <rect x="28" y="10" width="54" height="12" fill="#D4633A"/>
            <rect x="20" y="22" width="70" height="40" fill="#D4633A"/>
            <rect x="34" y="38" width="11" height="16" fill="#fff"/>
            <rect x="63" y="38" width="11" height="16" fill="#fff"/>
            <rect x="39" y="44" width="6" height="8" fill="#1A1814"/>
            <rect x="68" y="44" width="6" height="8" fill="#1A1814"/>
            <path d="M55 64 L36 54 L18 58 L16 52 L38 48 L58 58 L78 48 L100 52 L98 58 L78 54 Z" fill="#1A1814"/>
            <rect x="30" y="62" width="9" height="11" fill="#D4633A"/>
            <rect x="71" y="62" width="9" height="11" fill="#D4633A"/>
            <rect x="51" y="62" width="9" height="11" fill="#D4633A"/>
          </svg>
          <div className="title">ELYSIQ</div>
          <div className="subtitle">OUTPOST GAME</div>
          <div className="intro">
            A secure shared cybersecurity world. <b>Deploy harvesters</b> to yield intel. <b>Race to solve CA hunts</b>. Pool forces in Guilds.
          </div>
          <button className="wallet-chip" id="connectBtn" onClick={connectWallet} disabled={connecting} style={{ fontSize: '11px', padding: '16px 28px' }}>
            {connecting ? 'VERIFYING...' : 'CONNECT WALLET & PLAY (1,000 $ELYSIQ)'}
          </button>
          <div className="gate-note">
            Required balance: 1,000 $ELYSIQ. System checks ownership on-chain securely.
          </div>
        </div>
      )}

      {wallet && player && (
        <div id="game">
          {/* Top Info Bar */}
          <div className="topbar">
            <div className="brand">
              <svg className="m" viewBox="0 0 70 56">
                <rect x="18" y="6" width="34" height="8" fill="#D4633A"/>
                <rect x="12" y="14" width="46" height="26" fill="#D4633A"/>
                <rect x="22" y="24" width="7" height="10" fill="#fff"/>
                <rect x="41" y="24" width="7" height="10" fill="#fff"/>
                <path d="M35 40 L23 34 L11 37 L10 33 L24 30 L36 37 L48 30 L60 33 L59 37 L47 34 Z" fill="#1A1814"/>
              </svg>
              ELYSIQ OUTPOST
            </div>
            <div className="resources">
              <div className="res intel"><span className="ico" style={{ background: '#5fa06f' }}></span> <span id="rIntel">{player.intel}</span> INTEL</div>
              <div className="res cred"><span className="ico" style={{ background: '#C9A84C' }}></span> <span id="rCred">{player.cred}</span> CRED</div>
              <div className="res rep"><span className="ico" style={{ background: '#D4633A' }}></span> <span id="rRep">{player.rep}</span> REP</div>
            </div>
            <button className="wallet-chip on" id="walletChip" onClick={disconnectWallet}>
              {wallet.slice(0, 4)}...{wallet.slice(-4)} [SIGNOUT]
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="tabs">
            <button className={`tab ${activeTab === 'outpost' ? 'active' : ''}`} onClick={() => setActiveTab('outpost')}>OUTPOST</button>
            <button className={`tab ${activeTab === 'hunt' ? 'active' : ''}`} onClick={() => setActiveTab('hunt')}>
              HUNT {activeHunt && <span className="badge" id="huntBadge">!</span>}
            </button>
            <button className={`tab ${activeTab === 'upgrade' ? 'active' : ''}`} onClick={() => setActiveTab('upgrade')}>UPGRADE</button>
            <button className={`tab ${activeTab === 'market' ? 'active' : ''}`} onClick={() => setActiveTab('market')}>MARKET</button>
            <button className={`tab ${activeTab === 'guild' ? 'active' : ''}`} onClick={() => setActiveTab('guild')}>GUILD</button>
            <button className={`tab ${activeTab === 'ranks' ? 'active' : ''}`} onClick={() => { setActiveTab('ranks'); fetchLeaderboard(); }}>RANKS</button>
          </div>

          {/* Main Workspace Panels */}
          <div className="main">
            {/* OUTPOST PANEL */}
            {activeTab === 'outpost' && (
              <div className="panel active" id="panel-outpost">
                <div className="section-h">YOUR SCANNERS — deploy, wait, harvest intel</div>
                <div className="grid" id="plotGrid">
                  {plots.map((plot) => {
                    if (plot.state === 'LOCKED') {
                      const unlockedCount = plots.filter((p) => p.state !== 'LOCKED').length;
                      let cost = 1000;
                      for (let i = 3; i < unlockedCount; i++) {
                        cost = Math.floor(cost * 2.0);
                      }
                      return (
                        <div key={plot.id} className="plot locked" onClick={() => handleAction('unlock', plot.plotIndex)}>
                          <div className="lock">🔒<br />{cost} CRED</div>
                        </div>
                      );
                    }

                    if (plot.state === 'EMPTY') {
                      return (
                        <div key={plot.id} className="plot empty" onClick={() => handleAction('deploy', plot.plotIndex)}>
                          <div className="plus">+</div>
                          <div className="plot-lbl">deploy<br />scanner</div>
                        </div>
                      );
                    }

                    const elapsed = time - plot.startedAt;
                    const progress = Math.min(1, elapsed / plot.duration);
                    const isReady = elapsed >= plot.duration || plot.state === 'READY';

                    const tier = SCANNER_TIERS[plot.scannerTier];

                    return (
                      <div key={plot.id} className={`plot ${isReady ? 'ready' : 'working'}`} onClick={() => isReady ? handleAction('harvest', plot.plotIndex) : addToast(`Still scanning... ${Math.ceil((plot.duration - elapsed) / 1000)}s left`, 'bad')}>
                        <div className="tier-pip" style={{ background: tier.col, color: '#0e0c0a' }}>{tier.name[0]}</div>
                        <svg className="scanner-ico" viewBox="0 0 40 40">
                          <rect x="8" y="14" width="24" height="18" fill={tier.col}/>
                          <rect x="12" y="18" width="6" height="6" fill="#0e0c0a"/>
                          <rect x="22" y="18" width="6" height="6" fill="#0e0c0a"/>
                          <rect x="17" y="6" width="6" height="8" fill={tier.col}/>
                          <rect x="18" y="2" width="4" height="4" fill="#fff"/>
                        </svg>
                        {isReady ? (
                          <div className="ready-tag">✓ HARVEST</div>
                        ) : (
                          <div className="plot-lbl">scanning</div>
                        )}
                        <div className="pbar">
                          <div className="pbar-fill" style={{ width: `${progress * 100}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* HUNT THREAT FEED PANEL */}
            {activeTab === 'hunt' && (
              <div className="panel active" id="panel-hunt">
                <div className="section-h">SHARED THREAT FEED — race to call it</div>
                <div id="huntArea">
                  {activeHunt ? (
                    <div>
                      <div className="alert-banner">
                        <div className="alert-txt">
                          <b>⚠ THREAT SPOTTED</b><br />
                          {activeHunt.othersCount} hunters scanning
                        </div>
                        <div className="alert-timer">
                          {Math.max(0, Math.ceil((activeHunt.deadline - time) / 1000))}s
                        </div>
                      </div>
                      <div className="hunt-card">
                        <div className="hunt-top">
                          <span className="hunt-ticker">{activeHunt.ticker}</span>
                          <span className="hunt-meta">MC {activeHunt.marketCap}</span>
                        </div>
                        <div className="hunt-rows">
                          {activeHunt.signals.map((sig, idx) => (
                            <div key={idx} className="hrow">
                              <span className="k">{sig.k}</span>
                              <span className={`v ${sig.cls}`}>{sig.v}</span>
                            </div>
                          ))}
                        </div>
                        <div className="hunt-actions">
                          <button className="hbtn safe" onClick={() => handleCallHunt(true)} disabled={huntCalling}>{huntCalling ? 'CALLING...' : 'SAFE'}</button>
                          <button className="hbtn rug" onClick={() => handleCallHunt(false)} disabled={huntCalling}>{huntCalling ? 'CALLING...' : 'RUG'}</button>
                        </div>
                        <div className="players-scanning">⚡ be fast — first correct call takes the reward</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="alert-banner none">
                        <div className="alert-txt" style={{ color: '#7a736a' }}>No active threat. Scanning the feed...</div>
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: '#6a635a', textAlign: 'center', padding: '30px', lineHeight: '1.7' }}>
                        A suspicious token appears in the shared feed every so often.<br />
                        All hunters see it. First correct call wins the reward.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* UPGRADE PANEL */}
            {activeTab === 'upgrade' && (
              <div className="panel active" id="panel-upgrade">
                <div className="section-h">UPGRADES — spend CRED to grow your outpost</div>
                <div id="shopArea">
                  {/* Upgrade Pro */}
                  {player.scannerLevel < 2 && (
                    <div className="shop-item">
                      <div className="shop-ico">
                        <svg className="scanner-ico" viewBox="0 0 40 40">
                          <rect x="8" y="14" width="24" height="18" fill="#C9A84C"/>
                          <rect x="12" y="18" width="6" height="6" fill="#0e0c0a"/>
                          <rect x="22" y="18" width="6" height="6" fill="#0e0c0a"/>
                          <rect x="17" y="6" width="6" height="8" fill="#C9A84C"/>
                          <rect x="18" y="2" width="4" height="4" fill="#fff"/>
                        </svg>
                      </div>
                      <div className="shop-info">
                        <div className="shop-name">PRO SCANNERS</div>
                        <div className="shop-desc">Unlock PRO tier scanners — slower, but far more intel.</div>
                      </div>
                      <button className="shop-buy" onClick={() => handleAction('upgrade', undefined, { upgradeId: 'pro' })} disabled={player.cred < 1000}>
                        {player.cred < 1000 ? 'LACK CRED' : 'BUY'}<br /><span className="cost">1000 CR</span>
                      </button>
                    </div>
                  )}

                  {/* Upgrade Elite */}
                  {player.scannerLevel === 2 && (
                    <div className="shop-item">
                      <div className="shop-ico">
                        <svg className="scanner-ico" viewBox="0 0 40 40">
                          <rect x="8" y="14" width="24" height="18" fill="#D4633A"/>
                          <rect x="12" y="18" width="6" height="6" fill="#0e0c0a"/>
                          <rect x="22" y="18" width="6" height="6" fill="#0e0c0a"/>
                          <rect x="17" y="6" width="6" height="8" fill="#D4633A"/>
                          <rect x="18" y="2" width="4" height="4" fill="#fff"/>
                        </svg>
                      </div>
                      <div className="shop-info">
                        <div className="shop-name">ELITE SCANNERS</div>
                        <div className="shop-desc">Unlock ELITE tier — the deepest scans, the biggest yield.</div>
                      </div>
                      <button className="shop-buy" onClick={() => handleAction('upgrade', undefined, { upgradeId: 'elite' })} disabled={player.cred < 2000}>
                        {player.cred < 2000 ? 'LACK CRED' : 'BUY'}<br /><span className="cost">2000 CR</span>
                      </button>
                    </div>
                  )}

                  {/* Multiplier Upgrade +5% */}
                  <div className="shop-item">
                    <div className="shop-ico">
                      <svg className="scanner-ico" viewBox="0 0 40 40">
                        <rect x="8" y="14" width="24" height="18" fill="#5fa06f"/>
                        <rect x="12" y="18" width="6" height="6" fill="#0e0c0a"/>
                        <rect x="22" y="18" width="6" height="6" fill="#0e0c0a"/>
                        <rect x="17" y="6" width="6" height="8" fill="#5fa06f"/>
                        <rect x="18" y="2" width="4" height="4" fill="#fff"/>
                      </svg>
                    </div>
                    <div className="shop-info">
                      <div className="shop-name">HARVEST BOOST +5%</div>
                      <div className="shop-desc">Every scanner harvests 5% more intel. Current multiplier: x{player.harvestMultiplier.toFixed(2)}.</div>
                    </div>
                    {(() => {
                      const count = player.boost5Count || 0;
                      const cost = 400 + count * 100;
                      return (
                        <button className="shop-buy" onClick={() => handleAction('upgrade', undefined, { upgradeId: 'mult_5' })} disabled={player.cred < cost}>
                          {player.cred < cost ? 'LACK CRED' : 'BUY'}<br /><span className="cost">{cost} CR</span>
                        </button>
                      );
                    })()}
                  </div>

                  {/* Multiplier Upgrade +15% */}
                  <div className="shop-item">
                    <div className="shop-ico">
                      <svg className="scanner-ico" viewBox="0 0 40 40">
                        <rect x="8" y="14" width="24" height="18" fill="#5fa06f"/>
                        <rect x="12" y="18" width="6" height="6" fill="#0e0c0a"/>
                        <rect x="22" y="18" width="6" height="6" fill="#0e0c0a"/>
                        <rect x="17" y="6" width="6" height="8" fill="#5fa06f"/>
                        <rect x="18" y="2" width="4" height="4" fill="#fff"/>
                      </svg>
                    </div>
                    <div className="shop-info">
                      <div className="shop-name">HARVEST BOOST +15%</div>
                      <div className="shop-desc">Every scanner harvests 15% more intel. Current multiplier: x{player.harvestMultiplier.toFixed(2)}.</div>
                    </div>
                    {(() => {
                      const count = player.boost15Count || 0;
                      const cost = 1200 + count * 300;
                      return (
                        <button className="shop-buy" onClick={() => handleAction('upgrade', undefined, { upgradeId: 'mult_15' })} disabled={player.cred < cost}>
                          {player.cred < cost ? 'LACK CRED' : 'BUY'}<br /><span className="cost">{cost} CR</span>
                        </button>
                      );
                    })()}
                  </div>

                  {/* Multiplier Upgrade +25% */}
                  <div className="shop-item">
                    <div className="shop-ico">
                      <svg className="scanner-ico" viewBox="0 0 40 40">
                        <rect x="8" y="14" width="24" height="18" fill="#5fa06f"/>
                        <rect x="12" y="18" width="6" height="6" fill="#0e0c0a"/>
                        <rect x="22" y="18" width="6" height="6" fill="#0e0c0a"/>
                        <rect x="17" y="6" width="6" height="8" fill="#5fa06f"/>
                        <rect x="18" y="2" width="4" height="4" fill="#fff"/>
                      </svg>
                    </div>
                    <div className="shop-info">
                      <div className="shop-name">HARVEST BOOST +25%</div>
                      <div className="shop-desc">Every scanner harvests 25% more intel. Current multiplier: x{player.harvestMultiplier.toFixed(2)}.</div>
                    </div>
                    {(() => {
                      const count = player.boost25Count || 0;
                      const cost = 2000 + count * 500;
                      return (
                        <button className="shop-buy" onClick={() => handleAction('upgrade', undefined, { upgradeId: 'mult_25' })} disabled={player.cred < cost}>
                          {player.cred < cost ? 'LACK CRED' : 'BUY'}<br /><span className="cost">{cost} CR</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* MARKET PANEL */}
            {activeTab === 'market' && (
              <div className="panel active" id="panel-market">
                <div className="section-h">MARKET — convert resources</div>
                <div className="market-note">Convert harvested INTEL to CRED for upgrades, or CRED to REP.</div>
                
                {/* Intel -> Cred */}
                <div className="convert-card" style={{ marginBottom: '20px', padding: '14px', background: 'rgba(0,0,0,0.2)', border: '2px solid #2a2520' }}>
                  <div className="section-h" style={{ color: '#5fa06f', marginBottom: '8px' }}>INTEL ➔ CRED (1:1)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <input 
                      type="number" 
                      min="0" 
                      max={player.intel}
                      value={intelConvertAmt}
                      onChange={(e) => setIntelConvertAmt(e.target.value)}
                      placeholder={`Max ${player.intel}`}
                      style={{ 
                        background: '#0c0a08', 
                        border: '2px solid #3a332c', 
                        color: '#F5F0E8', 
                        fontFamily: 'DM Mono, monospace', 
                        padding: '6px',
                        width: '120px'
                      }}
                    />
                    <button 
                      className="shop-buy" 
                      onClick={() => setIntelConvertAmt(player.intel.toString())}
                      style={{ background: '#5fa06f', color: '#0e0c0a', padding: '6px 10px', fontSize: '8px', fontWeight: 'bold' }}
                    >
                      MAX
                    </button>
                  </div>
                  <div style={{ fontSize: '9px', color: '#9a938a', marginTop: '10px' }}>
                    Expected: {Number(intelConvertAmt) > 0 ? Math.floor(Number(intelConvertAmt)) : 0} CRED
                  </div>
                  <button 
                    className="shop-buy" 
                    onClick={async () => {
                      const amt = Number(intelConvertAmt);
                      if (amt > 0 && amt <= player.intel) {
                        await handleAction('convert', undefined, { amount: amt });
                        setIntelConvertAmt('');
                      }
                    }} 
                    disabled={player.intel <= 0 || !intelConvertAmt || Number(intelConvertAmt) <= 0 || Number(intelConvertAmt) > player.intel} 
                    style={{ background: '#4A7C59', marginTop: '10px', width: '100%' }}
                  >
                    {!intelConvertAmt || Number(intelConvertAmt) <= 0 ? 'FILL AMOUNT' : (Number(intelConvertAmt) > player.intel ? 'EXCEEDS INTEL' : 'CONVERT')}
                  </button>
                </div>

                {/* Cred -> Rep */}
                <div className="convert-card" style={{ padding: '14px', background: 'rgba(0,0,0,0.2)', border: '2px solid #2a2520' }}>
                  <div className="section-h" style={{ color: '#C9A84C', marginBottom: '8px' }}>CRED ➔ REP (5:1)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <input 
                      type="number" 
                      min="0" 
                      step="5"
                      max={player.cred}
                      value={credConvertAmt}
                      onChange={(e) => setCredConvertAmt(e.target.value)}
                      placeholder={`Multiples of 5`}
                      style={{ 
                        background: '#0c0a08', 
                        border: '2px solid #3a332c', 
                        color: '#F5F0E8', 
                        fontFamily: 'DM Mono, monospace', 
                        padding: '6px',
                        width: '120px'
                      }}
                    />
                    <button 
                      className="shop-buy" 
                      onClick={() => setCredConvertAmt((Math.floor(player.cred / 5) * 5).toString())}
                      style={{ background: '#C9A84C', color: '#0e0c0a', padding: '6px 10px', fontSize: '8px', fontWeight: 'bold' }}
                    >
                      MAX
                    </button>
                  </div>
                  <div style={{ fontSize: '9px', color: '#9a938a', marginTop: '10px' }}>
                    Expected: {Number(credConvertAmt) > 0 ? Math.floor(Number(credConvertAmt) / 5) : 0} REP
                  </div>
                  <button 
                    className="shop-buy" 
                    onClick={async () => {
                      const amt = Number(credConvertAmt);
                      if (amt > 0 && amt <= player.cred && amt % 5 === 0) {
                        await handleAction('convert_cred_to_rep', undefined, { amount: amt });
                        setCredConvertAmt('');
                      }
                    }} 
                    disabled={player.cred < 5 || !credConvertAmt || Number(credConvertAmt) <= 0 || Number(credConvertAmt) > player.cred || Number(credConvertAmt) % 5 !== 0} 
                    style={{ background: '#D4633A', marginTop: '10px', width: '100%' }}
                  >
                    {!credConvertAmt || Number(credConvertAmt) <= 0 ? 'FILL AMOUNT' : (Number(credConvertAmt) > player.cred ? 'EXCEEDS CRED' : (Number(credConvertAmt) % 5 !== 0 ? 'MULTIPLE OF 5' : 'CONVERT'))}
                  </button>
                </div>
              </div>
            )}

            {/* GUILD PANEL */}
            {activeTab === 'guild' && (
              <div className="panel active" id="panel-guild">
                <div className="section-h">GUILDS — pool intel, share the bonus</div>
                {guilds.map((g) => {
                  const isMember = player.guildId === g.id;
                  return (
                    <div key={g.id} className="guild-card" style={{ border: isMember ? '2px solid #4A7C59' : '' }}>
                      <div className="guild-name">{g.name} {isMember && <span style={{ fontSize: '7px', color: '#5fa06f' }}>[YOUR GUILD]</span>}</div>
                      <div className="guild-stat">MEMBERS: {g.members.length + (isMember && !g.members.includes(wallet) ? 1 : 0)}</div>
                      <div className="guild-stat">POOLED INTEL: {g.pooledIntel}</div>
                      <div className="guild-stat">GUILD BONUS: <span style={{ color: '#5fa06f' }}>+{Math.round((g.bonusMultiplier - 1) * 100)}% harvest speed</span></div>
                      <div className="guild-members">
                        {isMember && <span className="gmember you">YOU</span>}
                        {g.members.map((m, midx) => (
                          <span key={midx} className="gmember">{m}</span>
                        ))}
                      </div>
                      {!player.guildId && (
                        <button className="shop-buy" onClick={() => handleAction('guild_join', undefined, { guildId: g.id })} style={{ background: '#4A7C59', marginTop: '10px' }}>JOIN GUILD</button>
                      )}
                      {isMember && (
                        <button className="shop-buy" onClick={() => handleAction('guild_contribute')} disabled={player.intel < 100} style={{ background: '#4A7C59', marginTop: '10px' }}>CONTRIBUTE 100 INTEL</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

             {/* RANKS PANEL */}
            {activeTab === 'ranks' && (
              <div className="panel active" id="panel-ranks">
                <div className="section-h">TOP RUG HUNTERS — by REP</div>
                <div id="lbArea">
                  {leaderboard.map((item, idx) => {
                    const isYou = item.walletAddress === wallet || item.walletAddress === 'YOU';
                    return (
                      <div key={idx} className={`lb-row ${isYou ? 'you' : ''}`}>
                        <span className="lb-rank">#{idx + 1}</span>
                        <span className={`lb-name ${isYou ? 'you' : ''}`}>{isYou ? 'YOU' : item.walletAddress}</span>
                        <span className="lb-score">{item.rep.toLocaleString()} REP</span>
                      </div>
                    );
                  })}
                  {userRank && (
                    <>
                      <div className="lb-divider" style={{ borderBottom: '2px dashed #3a332c', margin: '8px 0' }} />
                      <div className="lb-row you">
                        <span className="lb-rank">#{userRank.rank}</span>
                        <span className="lb-name you">YOU</span>
                        <span className="lb-score">{userRank.player.rep.toLocaleString()} REP</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toast Notification Container */}
          <div className="toasts" id="toasts">
            {toasts.map((t) => (
              <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
            ))}
          </div>
        </div>
      )}

      {/* Global CSS Styling to fit the theme */}
      <style jsx global>{`
        .outpost-body {
          font-family: 'DM Mono', monospace;
          background: #0e0c0a;
          color: #F5F0E8;
          min-height: 100vh;
          overflow: hidden;
          image-rendering: pixelated;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: default;
        }

        #game {
          width: 100vw;
          max-width: 920px;
          height: 100vh;
          max-height: 680px;
          position: relative;
          background: radial-gradient(circle at 50% 0%, #1a1612, #0e0c0a);
          display: flex;
          flex-direction: column;
          border-left: 2px solid #2a2520;
          border-right: 2px solid #2a2520;
        }

        .scan-lines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 90;
          background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.1) 0 1px, transparent 1px 3px);
          opacity: 0.5;
        }

        button {
          font-family: 'Press Start 2P', monospace;
          cursor: pointer;
          border: none;
          color: #F5F0E8;
        }

        /* Top Bar Info */
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 2px solid #2a2520;
          background: rgba(0, 0, 0, 0.3);
          z-index: 20;
          flex-wrap: wrap;
          gap: 8px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Press Start 2P', monospace;
          font-size: 11px;
          color: #D4633A;
        }

        .brand .m {
          width: 22px;
          height: 18px;
        }

        .resources {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }

        .res {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
        }

        .res .ico {
          width: 12px;
          height: 12px;
          display: inline-block;
        }

        .res.intel { color: #5fa06f; }
        .res.cred { color: #C9A84C; }
        .res.rep { color: #D4633A; }

        .wallet-chip {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          padding: 6px 8px;
          background: #D4633A;
          color: #7a736a;
          box-shadow: inset -2px -2px 0 rgba(0, 0, 0, 0.4);
          cursor: pointer;
        }

        .wallet-chip.on {
          color: #5fa06f;
        }

        /* Tabs Menu */
        .tabs {
          display: flex;
          border-bottom: 2px solid #2a2520;
          background: rgba(0, 0, 0, 0.2);
          z-index: 20;
        }

        .tab {
          flex: 1;
          padding: 11px 4px;
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: #7a736a;
          background: transparent;
          border-bottom: 3px solid transparent;
          transition: 0.15s;
        }

        .tab.active {
          color: #F5F0E8;
          border-bottom-color: #D4633A;
          background: rgba(212,99,58, 0.08);
        }

        .tab .badge {
          display: inline-block;
          min-width: 14px;
          padding: 1px 3px;
          margin-left: 4px;
          background: #ff3b5c;
          color: #fff;
          font-size: 6px;
        }

        /* Main Game Panel Area */
        .main {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          position: relative;
        }

        .main::-webkit-scrollbar {
          width: 8px;
        }

        .main::-webkit-scrollbar-thumb {
          background: #2a2520;
        }

        .panel {
          display: block;
          animation: fade 0.2s;
        }

        @keyframes fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .section-h {
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          color: #9a938a;
          margin-bottom: 12px;
          letter-spacing: 1px;
        }

        /* Plots Farm Grid */
        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          max-width: 560px;
        }

        @media (max-width: 560px) {
          .grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .plot {
          aspect-ratio: 1;
          background: #15110d;
          border: 3px solid #3a332c;
          position: relative;
          cursor: pointer;
          box-shadow: inset -3px -3px 0 rgba(0, 0, 0, 0.4), inset 3px 3px 0 rgba(255, 255, 255, 0.03);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px;
          transition: 0.1s;
        }

        .plot:hover {
          border-color: #4a4038;
        }

        .plot.empty .plus {
          font-family: 'Press Start 2P', monospace;
          font-size: 18px;
          color: #3a332c;
        }

        .plot.locked {
          cursor: not-allowed;
          opacity: 0.4;
        }

        .plot.locked .lock {
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: #6a635a;
          text-align: center;
          line-height: 1.4;
        }

        .plot.working {
          border-color: #4a6d8c;
        }

        .plot.ready {
          border-color: #4A7C59;
          animation: pulse-g 1s steps(2) infinite;
        }

        @keyframes pulse-g {
          0%, 100% {
            box-shadow: inset -3px -3px 0 rgba(0,0,0,.4), 0 0 0 rgba(74, 124, 89, 0);
          }
          50% {
            box-shadow: inset -3px -3px 0 rgba(0,0,0,.4), 0 0 12px rgba(95, 160, 111, 0.5);
          }
        }

        .plot .scanner-ico {
          width: 30px;
          height: 30px;
        }

        .plot .plot-lbl {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: #9a938a;
          text-align: center;
          line-height: 1.3;
        }

        .plot .pbar {
          width: 100%;
          height: 5px;
          background: #0c0a08;
          margin-top: 2px;
          position: relative;
          overflow: hidden;
        }

        .plot .pbar-fill {
          height: 100%;
          background: #4a6d8c;
          width: 0;
          transition: width 0.3s;
        }

        .plot.ready .pbar-fill {
          background: #4A7C59;
        }

        .plot .ready-tag {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: #5fa06f;
        }

        .plot .tier-pip {
          position: absolute;
          top: 3px;
          right: 3px;
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          padding: 1px 3px;
        }

        /* Hunt Alerts threat banner */
        .alert-banner {
          background: linear-gradient(90deg, rgba(255, 59, 92, 0.15), transparent);
          border: 2px solid #ff3b5c;
          padding: 12px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          animation: pulse-r 1.5s steps(2) infinite;
        }

        @keyframes pulse-r {
          0%, 100% { border-color: #ff3b5c; }
          50% { border-color: #7a2030; }
        }

        .alert-banner.none {
          border-color: #3a332c;
          background: none;
          animation: none;
        }

        .alert-txt {
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          line-height: 1.6;
        }

        .alert-txt b {
          color: #ff3b5c;
        }

        .alert-timer {
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          color: #C9A84C;
        }

        .hunt-card {
          background: #15110d;
          border: 3px solid #3a332c;
          padding: 14px;
          margin-bottom: 12px;
        }

        .hunt-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 2px dashed #3a332c;
        }

        .hunt-ticker {
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          color: #D4633A;
        }

        .hunt-meta {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: #9a938a;
        }

        .hunt-rows {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 12px;
        }

        .hrow {
          display: flex;
          justify-content: space-between;
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
        }

        .hrow .k { color: #8a837a; }
        .hrow .v.good { color: #5fa06f; }
        .hrow .v.bad { color: #ff3b5c; }
        .hrow .v.warn { color: #C9A84C; }

        .hunt-actions {
          display: flex;
          gap: 10px;
        }

        .hbtn {
          flex: 1;
          padding: 14px 0;
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          box-shadow: inset -3px -3px 0 rgba(0, 0, 0, 0.4);
        }

        .hbtn.safe { background: #4A7C59; color: #0c1a10; }
        .hbtn.rug { background: #ff3b5c; color: #2a0810; }

        .players-scanning {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: #6a635a;
          margin-top: 8px;
          text-align: center;
        }

        /* Upgrades & Shop */
        .shop-item {
          background: #15110d;
          border: 3px solid #3a332c;
          padding: 12px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .shop-ico {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
        }

        .shop-info {
          flex: 1;
        }

        .shop-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          margin-bottom: 5px;
        }

        .shop-desc {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #9a938a;
          line-height: 1.4;
        }

        .shop-buy {
          padding: 9px 12px;
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          background: #D4633A;
          color: #2a0e06;
          box-shadow: inset -2px -2px 0 rgba(0, 0, 0, 0.4);
          white-space: nowrap;
        }

        .shop-buy:disabled {
          background: #2a2520;
          color: #6a635a;
          cursor: not-allowed;
        }

        .shop-buy .cost {
          color: #C9A84C;
        }

        /* Conversion Market */
        .market-note {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #9a938a;
          line-height: 1.6;
          margin-bottom: 12px;
          background: rgba(0,0,0,.2);
          padding: 10px;
          border-left: 3px solid #4a6d8c;
        }

        .convert {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #15110d;
          border: 3px solid #3a332c;
          padding: 14px;
          flex-wrap: wrap;
        }

        .convert-side {
          flex: 1;
          text-align: center;
          min-width: 90px;
        }

        .convert-amt {
          font-family: 'Press Start 2P', monospace;
          font-size: 14px;
        }

        .convert-lbl {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: #9a938a;
          margin-top: 4px;
        }

        .convert-arrow {
          font-family: 'Press Start 2P', monospace;
          font-size: 14px;
          color: #D4633A;
        }

        /* Guild panel cards */
        .guild-card {
          background: #15110d;
          border: 3px solid #3a332c;
          padding: 14px;
          margin-bottom: 12px;
        }

        .guild-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          color: #D4633A;
          margin-bottom: 6px;
        }

        .guild-stat {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          color: #9a938a;
          line-height: 1.8;
        }

        .guild-members {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }

        .gmember {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          padding: 4px 6px;
          background: #D4633A;
          color: #9a938a;
        }

        .gmember.you {
          color: #5fa06f;
          border: 1px solid #4A7C59;
        }

        /* Leaderboard rankings table */
        .lb-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-bottom: 2px solid #3a332c;
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
        }

        .lb-rank {
          width: 26px;
          color: #C9A84C;
        }

        .lb-name {
          flex: 1;
          color: #F5F0E8;
        }

        .lb-name.you {
          color: #5fa06f;
        }

        .lb-score {
          color: #D4633A;
        }

        .lb-row.you {
          background: rgba(95, 160, 111, 0.08);
        }

        /* Interactive Toast notifications */
        .toasts {
          position: absolute;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 80;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          width: 90%;
          max-width: 400px;
        }

        .toast {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          line-height: 1.5;
          padding: 9px 12px;
          background: #D4633A;
          box-shadow: inset -2px -2px 0 rgba(0,0,0,.4), 0 4px 0 rgba(0,0,0,.3);
          animation: tin 0.3s;
          text-align: center;
          width: 100%;
        }

        .toast.good { border-left: 3px solid #4A7C59; }
        .toast.bad { border-left: 3px solid #ff3b5c; }
        .toast.gold { border-left: 3px solid #C9A84C; }

        @keyframes tin {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* Gating Overlay Screen */
        .overlay {
          position: absolute;
          inset: 0;
          z-index: 200;
          background: rgba(8, 7, 6, 0.97);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px;
          text-align: center;
          gap: 16px;
        }

        .title {
          font-family: 'Press Start 2P', monospace;
          font-size: 26px;
          color: #D4633A;
          line-height: 1.15;
          text-shadow: 4px 4px 0 #2a0e06;
        }

        .subtitle {
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: #F5F0E8;
          letter-spacing: 2px;
        }

        .intro {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #9a938a;
          line-height: 1.7;
          max-width: 380px;
        }

        .intro b {
          color: #F5F0E8;
        }

        .gate-note {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #6a635a;
          max-width: 320px;
          line-height: 1.6;
        }

        .mascot-big {
          width: 96px;
          height: 74px;
        }

        .modetag {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: #6a635a;
          letter-spacing: 2px;
        }
      `}</style>
    </div>
  );
}
