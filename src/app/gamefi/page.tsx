'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import Image from 'next/image';

declare global {
  interface Window {
    ElysiqGuard: any;
  }
}

export default function GameFiPage() {
  const [picked, setPicked] = useState('legendary');
  const [guardInstance, setGuardInstance] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [gfLabel, setGfLabel] = useState('↑ connect a player to begin');
  const [gameCert, setGameCert] = useState<{ show: boolean; tier: string; color: string; background: string } | null>(null);
  const [perksHtml, setPerksHtml] = useState<string>('');
  const [companion, setCompanion] = useState<{ show: boolean; level: string; msg: string; expression: string; pulse: boolean } | null>(null);

  // Custom Cursor state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorActive, setCursorActive] = useState(false);

  // Color theme mapping
  const C = {
    safe: '#4A7C59',
    caution: '#C9A84C',
    danger: '#D4633A',
  };

  // Nav scroll listener
  useEffect(() => {
    const onScroll = () => {
      const nav = document.getElementById('nav');
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Float Decor elements
  const [decorElements, setDecorElements] = useState<any[]>([]);
  useEffect(() => {
    const icons = ['∴', '⌥', '◈', '🛡️', '🎮', '🎫', '⬡', '{ }', '◇', '●'];
    const items = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      char: icons[i % icons.length],
      size: 10 + Math.random() * 20,
      left: Math.random() * 95,
      top: Math.random() * 95,
      color: Math.random() > 0.5 ? 'rgba(212,99,58, 0.2)' : 'rgba(26,24,20, 0.09)',
      sp: 0.2 + Math.random() * 0.5,
      ph: Math.random() * 6,
    }));
    setDecorElements(items);
  }, []);

  // Floating animation loop
  useEffect(() => {
    let frameId: number;
    let t = 0;
    const updateDecor = () => {
      t += 0.01;
      const sy = window.scrollY;
      const els = document.querySelectorAll('.float-icon');
      els.forEach((el: any) => {
        const sp = parseFloat(el.dataset.sp || '0.3');
        const ph = parseFloat(el.dataset.ph || '0');
        el.style.transform = `translate(${Math.sin(t + ph) * 28 * sp}px, ${Math.cos(t * 0.8 + ph) * 24 * sp - sy * sp * 0.12}px) rotate(${Math.sin(t + ph) * 10}deg)`;
      });
      frameId = requestAnimationFrame(updateDecor);
    };
    frameId = requestAnimationFrame(updateDecor);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Custom Cursor listeners
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [data-mag], .chip')) {
        setCursorActive(true);
      }
    };
    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [data-mag], .chip')) {
        setCursorActive(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);
    window.addEventListener('mouseout', onMouseOut);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mouseout', onMouseOut);
    };
  }, []);

  // Reveal observer
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Magnetic elements
  useEffect(() => {
    const els = document.querySelectorAll('[data-mag]');
    const onMove = (e: any) => {
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.18}px)`;
    };
    const onLeave = (e: any) => {
      e.currentTarget.style.transform = '';
    };
    els.forEach((el) => {
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
    });
    return () => {
      els.forEach((el) => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
      });
    };
  }, []);

  // Initialize ElysiqGuard after Script loads
  const initSDK = () => {
    if (window.ElysiqGuard && !guardInstance) {
      const inst = window.ElysiqGuard.init({
        gameMint: 'GLD_GAME_123',
        onGuard: (guardianState: any) => {
          showCompanion(guardianState.level, guardianState.message, guardianState.expression);
        },
      });
      setGuardInstance(inst);

      // Auto-connect once visible
      const demoSec = document.getElementById('demo');
      if (demoSec) {
        const io2 = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                // Auto trigger first connection
                setTimeout(() => {
                  triggerConnect(inst, 'legendary');
                }, 600);
                io2.disconnect();
              }
            });
          },
          { threshold: 0.3 }
        );
        io2.observe(demoSec);
      }
    }
  };

  const showCompanion = (level: string, message: string, expression: string) => {
    setCompanion({
      show: true,
      level,
      msg: message,
      expression,
      pulse: true,
    });
    setTimeout(() => {
      setCompanion((prev: any) => prev ? { ...prev, pulse: false } : null);
    }, 500);
  };

  const triggerConnect = async (instOverride?: any, tierOverride?: string) => {
    const activeInst = instOverride || guardInstance;
    const activeTier = tierOverride || picked;
    if (!activeInst) return;

    setSessionLoading(true);
    setGfLabel('reading session…');

    let wallet = 'wallet_test_NONE';
    if (activeTier === 'legendary') wallet = 'wallet_test_LEG';
    else if (activeTier === 'gold') wallet = 'wallet_test_GLD';

    try {
      const session = await activeInst.connect(wallet);
      setSessionLoading(false);

      if (session.game.certified) {
        setGameCert({
          show: true,
          tier: session.game.tier,
          color: C.safe,
          background: 'rgba(74, 124, 89, 0.15)',
        });
      } else {
        setGameCert({
          show: true,
          tier: 'FAILED',
          color: C.danger,
          background: 'rgba(139, 58, 42, 0.15)',
        });
      }
      setGfLabel('[ game world ]');

      const t = session.player.stachePassTier;
      const p = session.player.perks;
      if (t === 'NONE') {
        setPerksHtml(`
          <div class="perk-line"><span>Stache Pass</span><b style="color:${C.caution}">none</b></div>
          <div class="perk-line"><span>Perks</span><b>—</b></div>
        `);
      } else {
        setPerksHtml(`
          <div class="perk-line on"><span>Stache Pass</span><b>${t}</b></div>
          <div class="perk-line on"><span>XP boost</span><b>+${p.xp_boost_pct}%</b></div>
          <div class="perk-line on"><span>Fee discount</span><b>-${p.marketplace_fee_discount_pct}%</b></div>
          <div class="perk-line ${p.verified_seller ? 'on' : ''}"><span>Verified seller</span><b>${p.verified_seller ? '✓' : '—'}</b></div>
        `);
      }
    } catch (e) {
      console.error(e);
      setSessionLoading(false);
      setGfLabel('[ game world ]');
    }
  };

  const triggerTrade = async (kind: string) => {
    if (!guardInstance) return;
    setTradeLoading(true);
    setGfLabel('checking counterparty…');

    let target = 'wallet_test_SAFE';
    if (kind === 'caution') target = 'wallet_test_WARN';
    else if (kind === 'danger') target = 'wallet_test_RUG';

    try {
      const check = await guardInstance.check(target, 'wallet');
      setTradeLoading(false);
      setGfLabel('[ game world ]');

      if (check.level !== 'safe') {
        await guardInstance.warn(check);
      }
    } catch (e) {
      console.error(e);
      setTradeLoading(false);
      setGfLabel('[ game world ]');
    }
  };

  // Helper face renderer for companion
  const renderFaceSvg = (expression: string, levelColor: string) => {
    const wide = expression === 'threat' || expression === 'ALERT' || expression === 'THREAT';
    const narrow = expression === 'on_guard' || expression === 'SKEPTICAL' || expression === 'THINKING';
    const eh = narrow ? 6 : wide ? 20 : 14;
    const ey = narrow ? 38 : 32;
    let suffix = '';
    if (expression === 'THREAT' || expression === 'ALERT') {
      suffix = `<text x="100" y="22" font-size="22" fill="${levelColor}" font-weight="bold">!</text>`;
    } else if (expression === 'SATISFIED' || expression === 'SAFE') {
      suffix = `<text x="98" y="22" font-size="20" fill="${levelColor}">✓</text>`;
    }
    return (
      <svg width="52" height="44" viewBox="0 0 120 100">
        <rect x="24" y="20" width="72" height="56" rx="6" fill="#D4633A" />
        <rect x="42" y={ey} width="12" height={eh} rx="2" fill="#fff" />
        <rect x="66" y={ey} width="12" height={eh} rx="2" fill="#fff" />
        <path d="M60 64 C50 54,38 54,28 60 C24 62,24 68,30 68 C40 64,50 62,56 68 C60 72,64 68,60 64 C66 68,70 72,74 68 C84 62,94 64,100 68 C106 68,106 62,102 60 C92 54,80 54,60 64 Z" fill="#1A1814" />
        {suffix && <g dangerouslySetInnerHTML={{ __html: suffix }} />}
      </svg>
    );
  };

  return (
    <>
      <Script src="/sdk/elysiq-guard.js" strategy="afterInteractive" onLoad={initSDK} />

      {/* Custom cursor elements */}
      <div
        id="cursor"
        className={cursorActive ? 'active' : ''}
        style={{ transform: `translate(${mousePos.x - 16}px, ${mousePos.y - 10}px)` }}
      >
        <svg viewBox="0 0 64 40">
          <path d="M32 18 C24 8,14 8,6 14 C2 16,0 20,4 22 C10 20,16 18,22 22 C26 24,30 22,32 20 C34 22,38 24,42 22 C48 18,54 20,60 22 C64 20,62 16,58 14 C50 8,40 8,32 18 Z" fill="#1A1814" />
        </svg>
      </div>
      <div
        id="cursorRing"
        className={cursorActive ? 'active' : ''}
        style={{ transform: `translate(${mousePos.x - 18}px, ${mousePos.y - 18}px)` }}
      />

      <div className="orb orb1" />
      <div className="orb orb2" />

      {decorElements.map((el) => (
        <div
          key={el.id}
          className="float-icon"
          data-sp={el.sp}
          data-ph={el.ph}
          style={{
            fontSize: `${el.size}px`,
            left: `${el.left}vw`,
            top: `${el.top}vh`,
            color: el.color,
          }}
        >
          {el.char}
        </div>
      ))}

      {/* Navigation */}
      <nav id="nav">
        <Link href="/" className="nav-logo">
          <Image
            src="/mascot.png"
            width={30}
            height={30}
            style={{
              imageRendering: 'pixelated',
              borderRadius: '4px',
            }}
            alt="ELYSIQ mascot"
          />
          <span className="nav-logo-type">ELYSIQ</span>
        </Link>
        <span className="nav-pill">GameFi Security Layer</span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a
            href="/gamefi/outpost"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-cta play-outpost"
            style={{ textDecoration: "none", color: "#fff" }}
          >
            Let's Play Outpost
          </a>
          <Link href="/" className="nav-cta" style={{ textDecoration: "none", color: "#fff" }}>
            Back to Terminal
          </Link>
        </div>
      </nav >

      {/* Hero */}
      < header className="hero" >
        <div className="hero-eyebrow">The Layer Games Plug Into</div>
        <h1>
          ELYSIQ in<br />GameFi <em>Ecosystem.</em>
        </h1>
        <p className="hero-sub">
          Every play-to-earn world has the same holes: rug tokens, scam sellers, no portable trust.{' '}
          <em>ELYSIQ is the security layer that fills all three.</em>
        </p>
        <div className="hero-cta">
          <a href="#demo" className="btn btn-primary" data-mag>
            <span>Play the demo</span>
          </a>
          <a href="#integrate" className="btn btn-ghost" data-mag>
            <span>Integrate your game</span>
          </a>
        </div>
      </header >

      {/* Pillars */}
      < section id="pillars" >
        <div className="sec">
          <div className="sec-label reveal">Three holes. One layer.</div>
          <h2 className="sec-title reveal">
            What every P2E game<br />is <em>missing.</em>
          </h2>
          <div className="pillars">
            <div className="reveal pillar">
              <div className="pillar-icon">🎮</div>
              <div className="pillar-h">Scan-to-Play</div>
              <div className="pillar-d">
                A game's token is scanned before players enter. Pass the audit, earn the stache. Players learn to look for the mustache before they ape into a world.
              </div>
            </div>
            <div className="reveal pillar">
              <div className="pillar-icon">🛡️</div>
              <div className="pillar-h">The Guardian</div>
              <div className="pillar-d">
                The ELYSIQ companion rides along inside the game. Before you trade with a seller, it checks them — and warns you in real time if they match a rug pattern.
              </div>
            </div>
            <div className="reveal pillar">
              <div className="pillar-icon">🎫</div>
              <div className="pillar-h">Stache Pass</div>
              <div className="pillar-d">
                One credential in your wallet, read by every integrated game. Verified once, trusted everywhere. Perks, badges, and reputation that travel with you.
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* Live Session Demo */}
      < section id="demo" >
        <div className="sec">
          <div className="sec-label reveal">Live demo</div>
          <h2 className="sec-title reveal">
            Connect a wallet.<br />Watch ELYSIQ <em>guard it.</em>
          </h2>
          <p className="sec-intro reveal">
            This is exactly what a game sees. Pick a player, connect, and the layer returns the game's certification, the player's perks, and a guardian. Then try trading with a wallet mid-game.
          </p>
          <div className="reveal demo" id="demo">
            <div className="demo-left">
              <div className="demo-label">GET /api/gamefi/session</div>
              <div className="demo-h">Player connects</div>
              <div className="demo-p">Pick a sample player wallet, then connect to the (certified) game.</div>
              <div className="demo-chips">
                <span className={`chip safe ${picked === 'legendary' ? 'active-chip' : ''}`} onClick={() => setPicked('legendary')}>
                  Legendary holder
                </span>
                <span className={`chip ${picked === 'gold' ? 'active-chip' : ''}`} onClick={() => setPicked('gold')}>
                  Gold holder
                </span>
                <span className={`chip ${picked === 'none' ? 'active-chip' : ''}`} onClick={() => setPicked('none')}>
                  No pass
                </span>
              </div>
              <button className="demo-btn" id="connectBtn" disabled={sessionLoading} onClick={() => triggerConnect()}>
                {sessionLoading ? 'Connecting…' : 'Connect to game'}
              </button>
              {perksHtml && <div className="perks-out show" id="perksOut" dangerouslySetInnerHTML={{ __html: perksHtml }} />}

              <div className="demo-divider" />
              <div className="demo-mini">Mid-game · about to trade</div>
              <div className="demo-chips">
                <span className="chip safe" onClick={() => triggerTrade('safe')}>
                  Verified seller
                </span>
                <span className="chip" onClick={() => triggerTrade('caution')}>
                  Unknown seller
                </span>
                <span className="chip danger" onClick={() => triggerTrade('danger')}>
                  Suspicious seller
                </span>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'rgba(245,240,232,.3)', marginTop: '4px' }}>
                POST /api/gamefi/guard-check
              </div>
            </div>
            <div className="demo-right">
              <div className="game-frame">
                {gameCert?.show && (
                  <div className="game-cert show" style={{ color: gameCert.color, background: gameCert.background }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: gameCert.color }} />
                    GAME CERTIFIED · {gameCert.tier}
                  </div>
                )}
                <div className="gf-label" id="gfLabel">
                  {gfLabel}
                </div>
              </div>

              {companion?.show && (
                <div
                  className={`companion show ${companion.pulse ? 'pulse' : ''}`}
                  id="companion"
                  style={{ borderLeftColor: (C as any)[companion.level] }}
                >
                  <div className="cp-face" id="cpFace">
                    {renderFaceSvg(companion.expression, (C as any)[companion.level])}
                  </div>
                  <div>
                    <div className="cp-level" id="cpLevel" style={{ color: (C as any)[companion.level] }}>
                      ∴ ELYSIQ Guard · {companion.level}
                    </div>
                    <div className="cp-msg" id="cpMsg">
                      {companion.msg}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section >

      {/* Flywheel */}
      < section id="flywheel" >
        <div className="sec">
          <div className="sec-label reveal">Why it compounds</div>
          <h2 className="sec-title reveal">
            Every game makes<br />the layer <em>stronger.</em>
          </h2>
          <div className="reveal flywheel">
            <div className="fw">
              <div className="fw-ring" />
              <div className="fw-c">
                <svg viewBox="0 0 120 70">
                  <path d="M60 40 C46 22,28 22,12 32 C4 36,0 44,8 48 C20 44,32 40,42 48 C50 54,56 48,60 44 C64 48,70 54,78 48 C88 40,100 44,112 48 C120 44,116 36,108 32 C92 22,74 22,60 40 Z" fill="#D4633A" />
                </svg>
                <div className="l">ELYSIQ</div>
              </div>
              <div className="fw-n t">
                <b>Games certify</b>scan-to-play · earn stache
              </div>
              <div className="fw-n r">
                <b>Players hold</b>the Pass · perks everywhere
              </div>
              <div className="fw-n b">
                <b>Guard learns</b>every check sharpens it
              </div>
              <div className="fw-n le">
                <b>More integrate</b>the layer spreads
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* Integration */}
      < section id="integrate" >
        <div className="sec">
          <div className="sec-label reveal">Integrate</div>
          <h2 className="sec-title reveal">
            One script.<br />The whole <em>layer.</em>
          </h2>
          <div className="reveal integ">
            <div className="integ-h">Drop ELYSIQ Guard into any web3 game</div>
            <div className="integ-sub">No keys. Read-only. Never touches funds. Under an hour to integrate.</div>
            <div className="integ-code">
              <span className="c">// one script tag, then:</span>
              <br />
              <span className="k">const</span> guard = ElysiqGuard.init({'{'} gameMint: <span className="s">'YOUR_GAME_TOKEN'</span> {'}'});
              <br />
              <br />
              <span className="c">// when a player connects</span>
              <br />
              <span className="k">const</span> session = <span className="k">await</span> guard.connect(playerWallet);
              <br />
              <span className="k">if</span> (session.game.certified) showStache();
              <br />
              player.xpMultiplier = <span className="s">1</span> + session.player.perks.xp_boost_pct / <span className="s">100</span>;
              <br />
              <br />
              <span className="c">// before a trade — ELYSIQ warns if it's dangerous</span>
              <br />
              <span className="k">const</span> check = <span className="k">await</span> guard.check(sellerWallet, <span className="s">'wallet'</span>);
              <br />
              <span className="k">if</span> (check.level === <span className="s">'danger'</span>) guard.warn(check);
            </div>
          </div>

          <div className="reveal phase2">
            <div className="tag">Phase 2 · coming later</div>
            <h3>The Rug-Hunter Game</h3>
            <p>
              Once the layer is live across games, ELYSIQ ships its own simple game where the gameplay is security itself — players become rug hunters, learning to read threats the way ELYSIQ does, with case material drawn from ELYSIQ's real skill archive. The layer comes first. The game is built on top of it.
            </p>
          </div>
        </div>
      </section >

      {/* Footer */}
      < footer >
        <div className="foot-mark">∴ ELYSIQ</div>
        <div className="foot-tag">One credential. Every world. A guardian in all of them.</div>
        <div className="foot-meta">
          THE SECURITY LAYER FOR GAMEFI · CLAUDE OPUS 4.8 · ERC-8004 · ELYSIUM
          <br />
          elysiq.xyz · $ELYSIQ
        </div>
      </footer >

      {/* Global CSS Styles injected locally to completely replicate premium design tokens */}
      < style jsx global > {`
        :root {
          --bone: #F5F0E8;
          --bone2: #EDE8DE;
          --bone3: #E0D9CE;
          --ink: #1A1814;
          --ink2: #D4633A;
          --ink3: #8A8880;
          --terra: #D4633A;
          --terra2: #D4633A;
          --terra3: #F0A882;
          --terra4: #FBF0EA;
          --green: #4A7C59;
          --gold: #c9a84c;
          --bronze: #8b6914;
          --serif: 'Cormorant Garamond', Georgia, serif;
          --mono: 'DM Mono', monospace;
          --sans: 'DM Sans', sans-serif;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          font-family: var(--sans);
          background: var(--bone);
          color: var(--ink);
          overflow-x: hidden;
          cursor: none;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        ::selection {
          background: var(--terra);
          color: var(--bone);
        }

        #cursor {
          position: fixed;
          top: 0;
          left: 0;
          width: 32px;
          height: 20px;
          z-index: 99999;
          pointer-events: none;
          mix-blend-mode: multiply;
          will-change: transform;
        }

        #cursor svg {
          width: 100%;
          height: 100%;
          transition: transform 0.18s;
        }

        #cursor.active svg {
          transform: scale(1.6) rotate(-7deg);
        }

        #cursorRing {
          position: fixed;
          top: 0;
          left: 0;
          width: 36px;
          height: 36px;
          border: 1px solid var(--terra3);
          border-radius: 50%;
          z-index: 99998;
          pointer-events: none;
          will-change: transform;
          transition: width 0.25s, height 0.25s;
          opacity: 0.6;
        }

        #cursorRing.active {
          width: 60px;
          height: 60px;
          border-color: var(--terra);
        }

        @media (hover: none) {
          #cursor,
          #cursorRing {
            display: none;
          }
          body {
            cursor: auto;
          }
        }

        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(70px);
          z-index: 0;
          pointer-events: none;
          will-change: transform;
          opacity: 0.4;
        }

        .orb1 {
          width: 480px;
          height: 480px;
          background: radial-gradient(circle, rgba(212,99,58, 0.16), transparent 70%);
          top: -100px;
          left: -120px;
        }

        .orb2 {
          width: 520px;
          height: 520px;
          background: radial-gradient(circle, rgba(201, 168, 76, 0.14), transparent 70%);
          bottom: -150px;
          right: -140px;
        }

        .float-icon {
          position: fixed;
          z-index: 1;
          pointer-events: none;
          opacity: 0.45;
          will-change: transform;
          font-family: var(--mono);
        }

        nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 40px;
          backdrop-filter: blur(14px);
          background: rgba(245,240,232, 0.6);
          border-bottom: 1px solid transparent;
          transition: 0.3s;
        }

        nav.scrolled {
          border-bottom-color: var(--bone3);
          background: rgba(245,240,232, 0.9);
        }

        .nav-cta.play-outpost {
          background: var(--terra);
        }

        .nav-cta.play-outpost:hover {
          background: var(--terra2);
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--serif);
          font-size: 22px;
          font-weight: 600;
        }

        .nav-logo .mk {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          background: var(--ink);
          color: var(--bone);
          border-radius: 6px;
          font-size: 15px;
        }

        .nav-links {
          display: flex;
          gap: 24px;
          align-items: center;
        }

        .nav-links a {
          font-family: var(--sans);
          font-size: 13px;
          color: var(--ink2);
          transition: color 0.2s;
        }

        .nav-links a:hover,
        .nav-links a.active {
          color: var(--terra);
        }

        .nav-pill {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--terra);
          border: 1px solid var(--terra3);
          padding: 6px 14px;
          border-radius: 20px;
        }

        .hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 110px 40px 50px;
          z-index: 2;
          text-align: center;
        }

        .hero-eyebrow {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--terra);
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .hero-eyebrow::before,
        .hero-eyebrow::after {
          content: '';
          width: 28px;
          height: 1px;
          background: var(--terra);
        }

        .hero h1 {
          font-family: var(--serif);
          font-weight: 300;
          font-size: clamp(46px, 8vw, 116px);
          line-height: 0.92;
          letter-spacing: -0.02em;
          margin-bottom: 22px;
        }

        .hero h1 em {
          font-style: italic;
          color: var(--terra);
        }

        .hero-sub {
          font-family: var(--serif);
          font-size: clamp(18px, 2.6vw, 27px);
          font-weight: 300;
          color: var(--ink2);
          max-width: 680px;
          line-height: 1.45;
          margin-bottom: 34px;
        }

        .hero-cta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn {
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 15px 34px;
          border-radius: 6px;
          cursor: none;
          transition: all 0.2s;
          border: 1px solid transparent;
          position: relative;
          overflow: hidden;
        }

        .btn span {
          position: relative;
          z-index: 2;
        }

        .btn-primary {
          background: var(--ink);
          color: var(--bone);
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--terra);
          transform: translateY(101%);
          transition: transform 0.3s;
          z-index: 1;
        }

        .btn-primary:hover::before {
          transform: translateY(0);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
        }

        .btn-ghost {
          background: transparent;
          color: var(--ink);
          border-color: var(--bone3);
        }

        .btn-ghost:hover {
          border-color: var(--terra);
          color: var(--terra);
        }

        section {
          position: relative;
          z-index: 2;
        }

        .sec {
          max-width: 1180px;
          margin: 0 auto;
          padding: 90px 40px;
        }

        .sec-label {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ink3);
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sec-label::before {
          content: '';
          width: 24px;
          height: 1px;
          background: var(--terra);
        }

        .sec-title {
          font-family: var(--serif);
          font-size: clamp(32px, 4.6vw, 54px);
          font-weight: 300;
          line-height: 1.04;
          margin-bottom: 18px;
        }

        .sec-title em {
          font-style: italic;
          color: var(--terra);
        }

        .sec-intro {
          font-size: 15px;
          color: var(--ink2);
          max-width: 640px;
          line-height: 1.8;
        }

        .reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .reveal.in {
          opacity: 1;
          transform: translateY(0);
        }

        /* Pillars */
        .pillars {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          margin-top: 48px;
        }

        @media (max-width: 880px) {
          .pillars {
            grid-template-columns: 1fr;
          }
        }

        .pillar {
          background: var(--bone);
          border: 1px solid var(--bone3);
          border-radius: 14px;
          padding: 30px 26px;
          transition: 0.25s;
          position: relative;
          overflow: hidden;
        }

        .pillar::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--terra3);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s;
        }

        .pillar:hover::before {
          transform: scaleX(1);
        }

        .pillar:hover {
          transform: translateY(-6px);
          box-shadow: 0 18px 44px rgba(26,24,20, 0.1);
          border-color: var(--terra3);
        }

        .pillar-icon {
          width: 48px;
          height: 48px;
          border-radius: 11px;
          background: var(--terra4);
          display: grid;
          place-items: center;
          margin-bottom: 18px;
          font-size: 22px;
        }

        .pillar-h {
          font-family: var(--serif);
          font-size: 23px;
          margin-bottom: 10px;
        }

        .pillar-d {
          font-size: 13px;
          color: var(--ink3);
          line-height: 1.7;
        }

        /* Live Session Demo */
        .demo {
          margin-top: 48px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          background: var(--ink);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 30px 70px rgba(26,24,20, 0.22);
          text-align: left;
        }

        @media (max-width: 860px) {
          .demo {
            grid-template-columns: 1fr;
          }
        }

        .demo-left {
          padding: 32px;
          border-right: 1px solid rgba(245,240,232, 0.08);
        }

        @media (max-width: 860px) {
          .demo-left {
            border-right: none;
            border-bottom: 1px solid rgba(245,240,232, 0.08);
          }
        }

        .demo-label {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--terra3);
          margin-bottom: 16px;
        }

        .demo-h {
          font-family: var(--serif);
          font-size: 24px;
          color: var(--bone);
          margin-bottom: 6px;
        }

        .demo-p {
          font-size: 12px;
          color: rgba(245,240,232, 0.5);
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .demo-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .chip {
          font-family: var(--mono);
          font-size: 10px;
          color: rgba(245,240,232, 0.6);
          border: 1px solid rgba(245,240,232, 0.15);
          border-radius: 14px;
          padding: 7px 12px;
          cursor: none;
          transition: 0.2s;
        }

        .chip:hover,
        .chip.active-chip {
          border-color: var(--terra3);
          color: var(--terra3);
          opacity: 1 !important;
        }

        .chip.danger:hover {
          border-color: var(--terra);
          color: var(--terra);
        }

        .chip.safe:hover {
          border-color: var(--green);
          color: var(--green);
        }

        .demo-btn {
          width: 100%;
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 13px;
          background: var(--terra);
          color: var(--bone);
          border: none;
          border-radius: 8px;
          cursor: none;
          transition: 0.2s;
        }

        .demo-btn:hover {
          background: var(--terra2);
        }

        .demo-btn:disabled {
          opacity: 0.5;
        }

        .demo-divider {
          height: 1px;
          background: rgba(245,240,232, 0.08);
          margin: 20px 0;
        }

        .demo-mini {
          font-family: var(--mono);
          font-size: 10px;
          color: rgba(245,240,232, 0.4);
          margin-bottom: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .demo-right {
          padding: 32px;
          position: relative;
          min-height: 420px;
          background: radial-gradient(circle at 60% 30%, rgba(212,99,58, 0.06), transparent 60%);
        }

        .game-frame {
          border: 1px solid rgba(245,240,232, 0.12);
          border-radius: 12px;
          height: 200px;
          position: relative;
          overflow: hidden;
          background: repeating-linear-gradient(45deg, rgba(245,240,232, 0.02), rgba(245,240,232, 0.02) 12px, transparent 12px, transparent 24px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .game-frame .gf-label {
          font-family: var(--mono);
          font-size: 10px;
          color: rgba(245,240,232, 0.3);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .game-cert {
          position: absolute;
          top: 12px;
          left: 12px;
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 5px 10px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.4s;
        }

        .game-cert.show {
          opacity: 1;
        }

        .companion {
          position: absolute;
          bottom: 24px;
          right: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 300px;
          background: rgba(26,24,20, 0.92);
          border-radius: 14px;
          padding: 12px 16px;
          border-left: 3px solid var(--green);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
          opacity: 0;
          transform: translateY(10px) scale(0.96);
          transition: 0.4s;
        }

        .companion.show {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .companion.pulse {
          animation: cpulse 0.5s;
        }

        @keyframes cpulse {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(0) scale(1.04);
          }
        }

        .cp-face {
          flex-shrink: 0;
        }

        .cp-level {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 4px;
          text-align: left;
        }

        .cp-msg {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--bone);
          line-height: 1.45;
          text-align: left;
        }

        .perks-out {
          margin-top: 18px;
          display: none;
          text-align: left;
        }

        .perks-out.show {
          display: block;
          animation: fadeUpDemo 0.5s;
        }

        @keyframes fadeUpDemo {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .perk-line {
          display: flex;
          justify-content: space-between;
          font-family: var(--mono);
          font-size: 11px;
          padding: 7px 0;
          border-bottom: 1px solid rgba(245,240,232, 0.08);
          color: rgba(245,240,232, 0.55);
        }

        .perk-line b {
          color: var(--bone);
        }

        .perk-line.on b {
          color: var(--green);
        }

        /* Flywheel */
        .flywheel {
          margin-top: 48px;
          display: flex;
          justify-content: center;
        }

        .fw {
          position: relative;
          width: 330px;
          height: 330px;
        }

        .fw-ring {
          position: absolute;
          inset: 0;
          border: 1px dashed var(--terra3);
          border-radius: 50%;
          animation: spin 40s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .fw-c {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .fw-c svg {
          width: 70px;
          height: 42px;
        }

        .fw-c .l {
          font-family: var(--serif);
          font-size: 20px;
          font-weight: 600;
          margin-top: 4px;
        }

        .fw-n {
          position: absolute;
          width: 150px;
          text-align: center;
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink2);
          line-height: 1.5;
        }

        .fw-n b {
          display: block;
          color: var(--terra);
          font-size: 11px;
          margin-bottom: 2px;
        }

        .fw-n.t {
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
        }

        .fw-n.r {
          top: 50%;
          right: -86px;
          transform: translateY(-50%);
        }

        .fw-n.b {
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
        }

        .fw-n.le {
          top: 50%;
          left: -86px;
          transform: translateY(-50%);
        }

        /* Integration */
        .integ {
          margin-top: 48px;
          background: var(--bone2);
          border: 1px solid var(--bone3);
          border-radius: 14px;
          padding: 38px;
          text-align: left;
        }

        .integ-h {
          font-family: var(--serif);
          font-size: 24px;
          margin-bottom: 8px;
        }

        .integ-sub {
          font-size: 13px;
          color: var(--ink3);
          margin-bottom: 22px;
        }

        .integ-code {
          font-family: var(--mono);
          font-size: 12px;
          line-height: 1.85;
          background: var(--ink);
          color: rgba(245,240,232, 0.85);
          padding: 22px;
          border-radius: 10px;
          overflow-x: auto;
        }

        .integ-code .k {
          color: var(--terra3);
        }

        .integ-code .c {
          color: var(--ink3);
        }

        .integ-code .s {
          color: var(--green);
        }

        .phase2 {
          margin-top: 40px;
          border: 1px dashed var(--bone3);
          border-radius: 14px;
          padding: 28px 30px;
          background: var(--terra4);
          text-align: left;
        }

        .phase2 .tag {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--terra2);
          margin-bottom: 10px;
        }

        .phase2 h3 {
          font-family: var(--serif);
          font-size: 24px;
          font-weight: 400;
          margin-bottom: 8px;
        }

        .phase2 p {
          font-size: 13px;
          color: var(--ink2);
          line-height: 1.7;
          max-width: 640px;
        }

        footer {
          position: relative;
          z-index: 2;
          background: var(--ink);
          margin-top: 90px;
          padding: 70px 40px 40px;
          text-align: center;
          color: var(--bone);
        }

        .foot-mark {
          font-family: var(--serif);
          font-size: 40px;
          font-weight: 600;
          color: var(--bone);
          margin-bottom: 12px;
        }

        .foot-tag {
          font-family: var(--serif);
          font-style: italic;
          font-size: 20px;
          color: var(--terra);
          margin-bottom: 24px;
        }

        .foot-meta {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.08em;
          color: rgba(245,240,232, 0.35);
          line-height: 2;
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
          .orb,
          .float-icon,
          .fw-ring {
            display: none;
          }
        }
      `}</style >
    </>
  );
}
