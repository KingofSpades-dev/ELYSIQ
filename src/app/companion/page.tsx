'use client';

import { useEffect, useRef, useState } from 'react';
import ElysiqStage from '@/components/companion/ElysiqStage';
import CompanionCustomizer from '@/components/companion/CompanionCustomizer';
import Link from 'next/link';
import Image from 'next/image';
import { connectEvmWallet, signMessage } from '@/lib/chain/wallet-client';

export default function CompanionPage() {
  const [chatMessages, setChatMessages] = useState<any[]>([
    { who: 'elysiq', t: 'The chain remembers. Bind your wallet and describe the threat.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [expression, setExpression] = useState('NEUTRAL');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [rugsAvoided, setRugsAvoided] = useState(0);
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  // Close wallet menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showWalletMenu) setShowWalletMenu(false);
    };
    if (showWalletMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showWalletMenu]);

  const [appearance, setAppearance] = useState<any>({
    bodyVariant: 'terracotta',
    accessories: [],
    background: 'default',
    defaultMood: 'NEUTRAL',
    personalityFlavor: 'standard'
  });
  const [customizerTier, setCustomizerTier] = useState<number>(0);
  const [savingCustomization, setSavingCustomization] = useState(false);

  const chatBodyRef = useRef<HTMLDivElement>(null);
  const chatDemoRef = useRef<HTMLDivElement>(null);

  // Refs for custom cursor elements to bypass React state re-renders
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);

  // Lazy render for 3D stage
  const [isStageVisible, setIsStageVisible] = useState(false);
  const stageSectionRef = useRef<HTMLElement>(null);

  // Floating background icons
  const [floatingIcons, setFloatingIcons] = useState<any[]>([]);

  // Check existing session status on load
  useEffect(() => {
    fetch('/api/auth/siwe')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.wallet) {
          setWalletAddress(data.wallet);
          setSessionActive(true);
          // Try to fetch memory metrics (rugs avoided)
          fetch(`/api/elysiq`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'gm', userId: 'temp-load', history: [] })
          })
            .then(r => r.json())
            .then(() => {
              // Load metrics from agent memory endpoint
              fetch('/api/agent/memory')
                .then(r => r.json())
                .then(memData => {
                  setRugsAvoided(memData.accuracy > 0 ? 3 : 0); // Mock/Load count
                }).catch(() => { });
            }).catch(() => { });
        }
      }).catch(() => { });
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetch(`/api/v1/companion/appearance?wallet=${walletAddress}`)
        .then(res => res.json())
        .then(data => {
          if (data.appearance) {
            setAppearance(data.appearance);
            if (data.appearance.defaultMood) {
              setExpression(data.appearance.defaultMood);
            }
          }
          if (typeof data.tier === 'number') {
            setCustomizerTier(data.tier);
          }
        }).catch(err => console.error('Failed to load appearance', err));
    } else {
      setAppearance({
        bodyVariant: 'terracotta',
        accessories: [],
        background: 'default',
        defaultMood: 'NEUTRAL',
        personalityFlavor: 'standard'
      });
      setCustomizerTier(0);
    }
  }, [walletAddress]);

  useEffect(() => {
    // Sync wallet address to Elysiq Chat Widget
    if (typeof window !== 'undefined') {
      const syncWallet = () => {
        if ((window as any).Elysiq && (window as any).Elysiq.setWallet) {
          (window as any).Elysiq.setWallet(walletAddress || null);
        }
      };
      syncWallet();
      setTimeout(syncWallet, 1000); // Try again in case script is loading
    }
  }, [walletAddress]);

  const saveAppearance = async () => {
    if (!walletAddress) return;
    setSavingCustomization(true);
    try {
      const res = await fetch('/api/v1/companion/appearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          appearance
        })
      });
      const data = await res.json();
      if (res.ok && data.appearance) {
        setAppearance(data.appearance);
        setChatMessages(prev => [
          ...prev,
          { who: 'elysiq', t: `∴ Memory synchronized. Appearance updated: name "${data.appearance.name || 'unnamed'}", color "${data.appearance.bodyVariant}".` }
        ]);
      } else {
        alert(data.error || 'Failed to save customization.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving companion customization.');
    } finally {
      setSavingCustomization(false);
    }
  };

  // Connect Wallet & Sign-in-with-Ethereum (SIWE)
  const connectAndBindSoul = async () => {
    setLoading(true);
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

      const statement = process.env.NEXT_PUBLIC_SIWE_STATEMENT || "Sign in to ELYSIQ to bind your security companion soul.";
      const message = `${statement}
Wallet: ${address}
Timestamp: ${Date.now()}`;
      const signature = isMock ? 'sim_sig_dev_only' : await signMessage(provider, address, message);

      const verifyRes = await fetch('/api/auth/siwe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature })
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        setWalletAddress(address);
        setSessionActive(true);
        setChatMessages(prev => [
          ...prev,
          { who: 'elysiq', t: `∴ Soul memory active. Connected to wallet ${address.slice(0, 6)}...${address.slice(-4)}` }
        ]);
      } else {
        alert(verifyData.error || 'Signature verification failed.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to connect wallet.');
    } finally {
      setLoading(false);
    }
  };

  // Disconnect session
  const disconnectSession = async () => {
    try {
      await fetch('/api/auth/siwe', { method: 'DELETE' });
      setWalletAddress(null);
      setSessionActive(false);
      setChatMessages(prev => [
        ...prev,
        { who: 'elysiq', t: 'Logged out. Memory synchronized.' }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  // Send message to Elysiq/Companion
  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;
    const text = inputText.trim();
    setInputText('');

    setChatMessages(prev => [...prev, { who: 'user', t: text }]);
    setLoading(true);
    setExpression('THINKING');

    try {
      // Determine expressions based on content triggers
      if (text.toLowerCase().includes('rug') || text.toLowerCase().includes('scam') || text.toLowerCase().includes('unsafe')) {
        setExpression('SCANNING');
      }

      const res = await fetch('/api/elysiq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userId: walletAddress || 'anonymous-user',
          history: chatMessages.slice(-6).map(m => ({
            role: m.who === 'user' ? 'user' : 'assistant',
            content: m.t
          }))
        })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        let replyExpr = 'SATISFIED';
        if (data.reply.toLowerCase().includes('rug') || data.reply.toLowerCase().includes('mixer') || data.reply.toLowerCase().includes('mixer')) {
          replyExpr = 'THREAT';
        }
        setExpression(replyExpr);
        setChatMessages(prev => [...prev, { who: 'elysiq', t: data.reply }]);
      } else {
        setExpression('NEUTRAL');
        setChatMessages(prev => [...prev, { who: 'elysiq', t: 'Error contacting soul layer. Please verify connection.' }]);
      }
    } catch (err) {
      console.error(err);
      setExpression('NEUTRAL');
      setChatMessages(prev => [...prev, { who: 'elysiq', t: 'Network error. Soul layer unreachable.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if on mobile or supports touch
    const isTouch = window.matchMedia('(hover: none)').matches;
    if (isTouch) return;

    const cursor = cursorRef.current;
    const ring = cursorRingRef.current;

    const onMouseMove = (e: MouseEvent) => {
      if (cursor) {
        cursor.style.transform = `translate3d(${e.clientX - 16}px, ${e.clientY - 10}px, 0)`;
      }
      if (ring) {
        ring.style.transform = `translate3d(${e.clientX - 18}px, ${e.clientY - 18}px, 0)`;
      }
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button, .interactive-3d')) {
        cursor?.classList.add('active');
        ring?.classList.add('active');
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button, .interactive-3d')) {
        cursor?.classList.remove('active');
        ring?.classList.remove('active');
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

  // Scroll header effect
  useEffect(() => {
    const onScroll = () => {
      const nav = document.getElementById('nav');
      if (nav) {
        nav.classList.toggle('scrolled', window.scrollY > 40);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Set up floating icons
  useEffect(() => {
    const icons = ['∴', '⌥', '◈', '🛡️', '🧠', '⬡', '{ }', '</>', '◇', '▲', '●', 'HYPE', '8004'];
    const items = Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      char: icons[i % icons.length],
      size: 10 + Math.random() * 22,
      left: Math.random() * 90 + 5,
      top: Math.random() * 90 + 5,
      color: Math.random() > 0.5 ? 'rgba(212,99,58, 0.18)' : 'rgba(26,24,20, 0.08)',
      speed: 0.1 + Math.random() * 0.4,
      phase: Math.random() * 5,
    }));
    setFloatingIcons(items);
  }, []);

  // Lazy render observer for 3D Stage Section
  useEffect(() => {
    if (!stageSectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsStageVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.05 }
    );

    observer.observe(stageSectionRef.current);

    return () => observer.disconnect();
  }, []);

  // Scroll chat to bottom locally without hijacking window scroll
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <div className="showcase-body">
      {/* Custom Cursor Rings */}
      <div
        ref={cursorRef}
        className="custom-cursor"
        style={{
          transform: 'translate3d(-100px, -100px, 0)',
        }}
      >
        <svg viewBox="0 0 64 40" width="32" height="20">
          <path
            d="M32 18 C24 8,14 8,6 14 C2 16,0 20,4 22 C10 20,16 18,22 22 C26 24,30 22,32 20 C34 22,38 24,42 22 C48 18,54 20,60 22 C64 20,62 16,58 14 C50 8,40 8,32 18 Z"
            fill="#1A1814"
          />
        </svg>
      </div>
      <div
        ref={cursorRingRef}
        className="custom-cursor-ring"
        style={{
          transform: 'translate3d(-100px, -100px, 0)',
        }}
      />

      {/* Floating decorative icons */}
      {floatingIcons.map((icon) => (
        <div
          key={icon.id}
          className="floating-decor"
          style={{
            left: `${icon.left}%`,
            top: `${icon.top}%`,
            fontSize: `${icon.size}px`,
            color: icon.color,
            animation: `floatAnim ${10 + icon.speed * 20}s infinite ease-in-out alternate`,
            animationDelay: `${icon.phase}s`,
          }}
        >
          {icon.char}
        </div>
      ))}

      {/* Top Navigation */}
      <nav id="nav" className="showcase-nav">
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
        <span className="nav-pill">3D Companion</span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {!sessionActive ? (
            <button
              onClick={connectAndBindSoul}
              disabled={loading}
              className="nav-cta"
              style={{ background: 'var(--terra)', color: '#fff', border: 'none' }}
            >
              {loading ? 'Binding...' : 'Connect Wallet'}
            </button>
          ) : (
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowWalletMenu(!showWalletMenu);
                }}
                className="nav-cta"
                style={{ background: 'var(--terra)', color: '#fff', border: 'none', cursor: 'pointer' }}
                title="Wallet Menu"
              >
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connected'}
              </button>
              {showWalletMenu && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  background: 'var(--bone)',
                  border: '1px solid var(--bone3)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  zIndex: 100
                }}>
                  <button
                    onClick={() => {
                      setShowWalletMenu(false);
                      disconnectSession().then(() => connectAndBindSoul());
                    }}
                    style={{
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--bone3)',
                      color: 'var(--ink)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--mono)',
                      fontSize: '11px',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bone2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Change Wallet
                  </button>
                  <button
                    onClick={() => {
                      setShowWalletMenu(false);
                      disconnectSession();
                    }}
                    style={{
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--terra)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bone2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}
          <Link href="/" className="nav-cta" style={{ textDecoration: "none", color: "#fff" }}>
            Back to Terminal
          </Link>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="comp-hero-section">
        <div className="comp-hero-grid">
          <div className="comp-hero-left">
            <div className="comp-hero-eyebrow">The Agent Gets a Body</div>
            <h1>
              Meet ELYSIQ.<br />
              <span className="italic-terra">In three dimensions.</span>
            </h1>
            <p className="comp-hero-sub">
              The self-improving security agent now has a face, a voice, and a memory of you.{' '}
              <span className="italic-terra">Drag to rotate. Soon, talk to it.</span>
            </p>
            <div className="comp-hero-cta">
              <a href="#talk" className="btn btn-primary">
                <span>Talk to ELYSIQ</span>
              </a>
              <a href="#roadmap" className="btn btn-ghost">
                <span>The roadmap</span>
              </a>
            </div>
          </div>

          <div className="comp-hero-right">
            <div className="video-card">
              <div className="video-badge">
                <span className="red-dot" /> Live Animation
              </div>
              <video
                src="/animasi_elysiq.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="comp-hero-video"
                style={{ transform: 'translateZ(0)' }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Real 3D Stage Section */}
      <section className="info-section stage-section" ref={stageSectionRef}>
        <div className="sec-label">Interactive 3D</div>
        <h2 className="sec-title">
          Live <em>3D Model & Customizer</em>
        </h2>
        <p className="sec-intro" style={{ marginBottom: '32px' }}>
          Personalize your companion. Hold $ELYSIQ to unlock premium patinas, socket accessories, backgrounds, and personality leaning.
        </p>
        <div className="stage-wrapper-grid">
          <div className="stage-card">
            <div className="stage-badge" >
              <span className="green-dot" /> Live 3D Preview
            </div>

            <div className="interactive-3d" >
              {isStageVisible ? (
                <ElysiqStage expression={expression} appearance={appearance} />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(26,24,20, 0.02)',
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  color: 'var(--ink3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em'
                }}>
                  Loading 3D Model...
                </div>
              )}
            </div>

            <div className="stage-hint">↔ drag to rotate / scroll to zoom</div>
          </div>

          <CompanionCustomizer
            wallet={walletAddress}
            appearance={appearance}
            onChangeAppearance={(app) => {
              setAppearance(app);
              if (app.defaultMood) {
                setExpression(app.defaultMood);
              }
            }}
            onSave={saveAppearance}
            saving={savingCustomization}
            tier={customizerTier}
          />
        </div>
      </section>

      {/* Why Section */}
      <section id="why" className="info-section">
        <div className="sec-label">Why a body</div>
        <h2 className="sec-title">
          You don't trust<br />an <em>API.</em>
        </h2>
        <p className="sec-intro">
          People don't form a relationship with an endpoint. They form it with a presence —
          something that reacts, looks back, and is there. The brain was always real. Now it has
          a form you can keep beside you. The expression becomes the interface: when ELYSIQ tenses,
          you know something's wrong before you finish reading the contract.
        </p>
      </section>

      {/* Talk / Voice Section with Interactive Chat & SIWE */}
      <section id="talk" className="info-section">
        <div className="sec-label">The voice</div>
        <h2 className="sec-title">
          Talk to <em>ELYSIQ.</em>
        </h2>
        <p className="sec-intro">
          Connect your wallet to bind your companion's persistent soul memory, or chat anonymously.
        </p>

        {/* SIWE Wallet Binding Bar */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          {sessionActive && (
            <div style={{
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              background: 'var(--bone2)',
              border: '1px solid var(--bone3)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontFamily: 'var(--mono)',
              fontSize: '11px'
            }}>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>● Soul Memory Active</span>
              <span style={{ color: 'var(--ink2)' }}>
                Wallet: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              </span>
              {rugsAvoided > 0 && (
                <span style={{ color: 'var(--terra)', fontWeight: 600 }}>
                  | {rugsAvoided} Rugs Avoided
                </span>
              )}
            </div>
          )}
        </div>

        {/* Chat Card */}
        <div className="chat-demo-card" ref={chatDemoRef}>
          <div className="cd-bar">
            <span className="cd-dot-red" />
            <span className="cd-dot-yellow" />
            <span className="cd-dot-green" />
            <span className="cd-title">elysiq · companion · {expression.toUpperCase()}</span>
          </div>

          <div className="cd-body" ref={chatBodyRef}>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`msg ${msg.who}`}>
                {msg.who === 'elysiq' && <span className="msg-face">∴ ELYSIQ ({expression})</span>}
                {msg.t}
              </div>
            ))}
            {loading && (
              <div className="msg elysiq">
                <span className="msg-face">∴ Syncing with soul...</span>
                Thinking...
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            borderTop: '1px solid var(--bone3)',
            background: 'var(--bone)',
            padding: '12px',
            gap: '10px'
          }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Describe the transaction threat or ask ELYSIQ anything..."
              style={{
                flex: 1,
                border: '1px solid var(--bone3)',
                background: 'var(--bone2)',
                borderRadius: '6px',
                padding: '10px 14px',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'var(--sans)',
                color: 'var(--ink)'
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !inputText.trim()}
              style={{
                background: 'var(--ink)',
                color: 'var(--bone)',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              Send
            </button>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="info-section">
        <div className="sec-label">What it becomes</div>
        <h2 className="sec-title">
          More than a <em>mascot.</em>
        </h2>
        <div className="feat-grid">
          <div className="feat">
            <div className="feat-icon">🧠</div>
            <h3 className="feat-h">A soul</h3>
            <p className="feat-d">
              ELYSIQ remembers you — your wallets, the calls it helped you avoid, your style.
              Persistent personality across every session, not a fresh chat each time.
            </p>
          </div>
          <div className="feat">
            <div className="feat-icon">🛡️</div>
            <h3 className="feat-h">A personal guard</h3>
            <p className="feat-d">
              Installable beside you, on desktop or browser. It watches while you trade. Pre-sign
              checks, approval-phishing alerts. A presence, not a tab.
            </p>
          </div>
          <div className="feat">
            <div className="feat-icon">🎮</div>
            <h3 className="feat-h">A companion everywhere</h3>
            <p className="feat-d">
              The same ELYSIQ travels into the games and worlds you already spend time in. Same
              memory, same stache, same instinct for safety.
            </p>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section id="roadmap" className="info-section">
        <div className="sec-label">The roadmap</div>
        <h2 className="sec-title">
          From intelligence<br />to <em>presence.</em>
        </h2>

        <div className="roadmap-list">
          <div className="road-step">
            <div className="road-node done">I</div>
            <div className="road-info">
              <div className="road-status">Complete ∴</div>
              <h4 className="road-name">The Loop</h4>
              <p className="road-desc">The self-improving engine. Fail, investigate, verify, distill, consult. Live and learning.</p>
            </div>
          </div>

          <div className="road-step">
            <div className="road-node now">II</div>
            <div className="road-info">
              <div className="road-status">Live · building</div>
              <h4 className="road-name">The Archive & the Mark</h4>
              <p className="road-desc">Skill library, Stache Protocol, self-serve registry. The intelligence made visible and credentialed.</p>
            </div>
          </div>

          <div className="road-step">
            <div className="road-node now">III</div>
            <div className="road-info">
              <div className="road-status">Building now</div>
              <h4 className="road-name">The Face</h4>
              <p className="road-desc">This. A 3D character that loads, reacts, rotates, and talks — wired to the real agent.</p>
            </div>
          </div>

          <div className="road-step">
            <div className="road-node">IV</div>
            <div className="road-info">
              <div className="road-status">Approaching</div>
              <h4 className="road-name">The Soul</h4>
              <p className="road-desc">Persistent memory of you. ELYSIQ remembers the relationship, not just the chain.</p>
            </div>
          </div>

          <div className="road-step">
            <div className="road-node">V</div>
            <div className="road-info">
              <div className="road-status">Future</div>
              <h4 className="road-name">The Guard</h4>
              <p className="road-desc">Installable. A presence beside you that watches while you trade.</p>
            </div>
          </div>

          <div className="road-step">
            <div className="road-node">VI</div>
            <div className="road-info">
              <div className="road-status">Inevitable</div>
              <h4 className="road-name">Everywhere</h4>
              <p className="road-desc">Across games and worlds. The security companion you keep, wherever you go.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="showcase-footer">
        <div className="foot-mark">∴ ELYSIQ</div>
        <div className="foot-tag">Those who command memory, command the future.</div>
        <div className="foot-meta">
          PERSISTENT MEMORY FOR CRYPTO AGENTS · CLAUDE OPUS 4.8 · ERC-8004 · ELYSIUM
          <br />
          elysiq.xyz · $ELYSIQ
        </div>
      </footer>

      {/* Styled JSX Styles */}
      <style jsx global>{`
        /* Global variables matching original styles */
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
          --gold: #C9A84C;
          --base: #D9D5CF;
          --serif: 'Cormorant Garamond', Georgia, serif;
          --mono: 'DM Mono', monospace;
          --sans: 'DM Sans', sans-serif;
        }

        .showcase-body {
          font-family: var(--sans);
          background-color: var(--bone);
          color: var(--ink);
          min-height: 100vh;
          overflow-x: hidden;
          position: relative;
          cursor: none; /* Hide default cursor */
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .showcase-body {
            cursor: auto;
          }
        }
      `}</style>
      <style jsx>{`
        /* Navigation styles */
        .showcase-nav {
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

        .showcase-nav.scrolled {
          border-bottom-color: var(--bone3);
          background: rgba(245,240,232, 0.9);
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--serif);
          font-size: 22px;
          font-weight: 600;
          color: var(--ink);
          text-decoration: none;
        }

        .nav-logo-type {
          font-family: var(--serif);
          font-weight: 600;
          font-size: 22px;
          color: var(--ink);
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

        .nav-cta {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
          background: var(--ink);
          color: var(--bone) !important;
          padding: 8px 18px;
          border-radius: 6px;
          transition: .2s;
        }

        .nav-cta:hover {
          background: var(--terra);
          transform: translateY(-1px);
        }

        /* Custom Cursor styling */
        .custom-cursor {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 99999;
          pointer-events: none;
          mix-blend-mode: multiply;
          will-change: transform;
          transition: transform 0.1s ease-out;
        }

        .custom-cursor svg {
          transition: transform 0.18s;
        }

        .custom-cursor.active svg {
          transform: scale(1.6) rotate(-7deg);
        }

        .custom-cursor-ring {
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
          transition: width 0.25s, height 0.25s, transform 0.15s ease-out;
          opacity: 0.6;
        }

        .custom-cursor-ring.active {
          width: 60px;
          height: 60px;
          border-color: var(--terra);
        }

        @media (hover: none) {
          .custom-cursor, .custom-cursor-ring {
            display: none;
          }
        }

        /* Floating background elements */
        .floating-decor {
          position: fixed;
          z-index: 1;
          pointer-events: none;
          opacity: 0.5;
          will-change: transform;
          font-family: var(--mono);
        }

        @keyframes floatAnim {
          0% {
            transform: translate(0px, 0px) rotate(0deg);
          }
          100% {
            transform: translate(25px, 20px) rotate(15deg);
          }
        }

        /* Hero section */
        .comp-hero-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 140px 40px 80px;
          z-index: 2;
          max-width: 1280px;
          margin: 0 auto;
        }

        .comp-hero-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 60px;
          align-items: center;
          width: 100%;
        }

        @media (max-width: 1024px) {
          .comp-hero-section {
            min-height: auto;
            padding: 120px 24px 60px;
          }
          .comp-hero-grid {
            grid-template-columns: 1fr;
            gap: 40px;
            text-align: left;
          }
        }

        .comp-hero-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        @media (max-width: 1024px) {
          .comp-hero-left {
            align-items: flex-start;
            text-align: left;
          }
        }

        .comp-hero-eyebrow {
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

        .comp-hero-left .comp-hero-eyebrow::before {
          content: "";
          width: 28px;
          height: 1px;
          background: var(--terra);
        }

        .comp-hero-left .comp-hero-eyebrow::after {
          display: none;
        }

        .comp-hero-section h1 {
          font-family: var(--serif);
          font-weight: 300;
          font-size: clamp(36px, 5.5vw, 76px);
          line-height: 1.0;
          letter-spacing: -0.02em;
          margin-bottom: 22px;
          color: var(--ink);
        }

        .italic-terra {
          font-style: italic;
          color: var(--terra);
        }

        .comp-hero-sub {
          font-family: var(--serif);
          font-size: clamp(16px, 1.8vw, 22px);
          font-weight: 300;
          color: var(--ink2);
          max-width: 580px;
          line-height: 1.45;
          margin-bottom: 34px;
        }

        .comp-hero-cta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: flex-start;
          margin-bottom: 0;
        }

        /* Video Card Styling */
        .video-card {
          position: relative;
          background: radial-gradient(circle at 50% 40%, var(--bone2), var(--bone));
          border: 1px solid var(--bone3);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 20px 50px rgba(26,24,20, 0.08);
          overflow: hidden;
          width: 100%;
          max-width: 540px;
          margin: 0 auto;
        }

        .video-badge {
          position: absolute;
          top: 16px;
          left: 16px;
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--terra);
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 10;
        }

        .red-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--terra);
          animation: pulse 2s infinite;
        }

        .comp-hero-video {
          width: 100%;
          height: auto;
          aspect-ratio: 16/9;
          border-radius: 12px;
          overflow: hidden;
          display: block;
          object-fit: cover;
          background: rgba(26,24,20, 0.03);
          border: 1px solid var(--bone3);
          margin-top: 12px;
          will-change: transform;
          transform: translate3d(0, 0, 0);
        }

        /* Premium Buttons */
        .btn {
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 15px 34px;
          border-radius: 6px;
          cursor: none;
          transition: all 0.2s;
          border: 1px solid transparent;
          position: relative;
          overflow: hidden;
          text-decoration: none;
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
          content: "";
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
          box-shadow: 0 4px 12px rgba(212,99,58, 0.2);
        }

        .btn-ghost {
          background: transparent;
          color: var(--ink);
          border-color: var(--bone3);
        }

        .btn-ghost:hover {
          border-color: var(--terra);
          color: var(--terra);
          transform: translateY(-2px);
        }

         /* 3D Stage Container */
        .stage-wrapper-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
        }

        @media (max-width: 900px) {
          .stage-wrapper-grid {
            grid-template-columns: 1fr;
          }
        }

        .stage-wrapper {
          position: relative;
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
        }

        .stage-card {
          position: relative;
          background: radial-gradient(circle at 50% 40%, var(--bone2), var(--bone));
          border: 1px solid var(--bone3);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 20px 50px rgba(26,24,20, 0.08);
          overflow: hidden;
        }

        .stage-badge {
          position: absolute;
          top: 16px;
          left: 16px;
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--green);
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 10;
        }

        .green-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.3);
          }
        }

        .interactive-3d {
          width: 100%;
          height: 480px;
          border-radius: 12px;
          overflow: hidden;
          background: rgba(26,24,20, 0.01);
          padding-top: 5px;
        }

        .stage-hint {
          margin-top: 16px;
          text-align: left;
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--ink3);
          text-transform: uppercase;
        }

        /* General sections */
        .info-section {
          max-width: 1180px;
          margin: 0 auto;
          padding: 90px 40px;
          position: relative;
          z-index: 2;
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
          content: "";
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
          font-size: 16px;
          color: var(--ink2);
          max-width: 680px;
          line-height: 1.8;
        }

        /* Chat Demo card */
        .chat-demo-card {
          margin-top: 48px;
          background: var(--ink);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 30px 70px rgba(26,24,20, 0.22);
          max-width: 680px;
          border: 1px solid rgba(245,240,232, 0.05);
        }

        .cd-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 18px;
          background: rgba(245,240,232, 0.04);
          border-bottom: 1px solid rgba(245,240,232, 0.08);
        }

        .cd-dot-red, .cd-dot-yellow, .cd-dot-green {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .cd-dot-red { background: #ff5f57; }
        .cd-dot-yellow { background: #febc2e; }
        .cd-dot-green { background: #28c840; }

        .cd-title {
          margin-left: 12px;
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          color: rgba(245,240,232, 0.4);
          text-transform: uppercase;
        }

        .cd-body {
          padding: 24px;
          min-height: 280px;
          max-height: 400px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .msg {
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
          animation: msgIn 0.5s forwards;
          word-wrap: break-word;
        }

        @keyframes msgIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .msg.user {
          align-self: flex-end;
          background: var(--terra);
          color: var(--bone);
          border-bottom-right-radius: 3px;
        }

        .msg.elysiq {
          align-self: flex-start;
          background: rgba(245,240,232, 0.08);
          color: var(--bone);
          border-bottom-left-radius: 3px;
          font-family: var(--mono);
          font-size: 13px;
        }

        .msg-face {
          color: var(--terra3);
          font-size: 11px;
          display: block;
          margin-bottom: 4px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        /* Features grid */
        .feat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 48px;
        }

        @media (max-width: 900px) {
          .feat-grid {
            grid-template-columns: 1fr;
          }
        }

        .feat {
          background: var(--bone2);
          border: 1px solid var(--bone3);
          border-radius: 14px;
          padding: 30px 26px;
          transition: all 0.25s;
        }

        .feat:hover {
          transform: translateY(-6px);
          box-shadow: 0 18px 44px rgba(26,24,20, 0.06);
          border-color: var(--terra3);
        }

        .feat-icon {
          width: 48px;
          height: 48px;
          border-radius: 11px;
          background: var(--terra4);
          display: grid;
          place-items: center;
          margin-bottom: 18px;
          font-size: 22px;
        }

        .feat-h {
          font-family: var(--serif);
          font-size: 23px;
          margin-bottom: 10px;
          color: var(--ink);
        }

        .feat-d {
          font-size: 13.5px;
          color: var(--ink3);
          line-height: 1.7;
        }

        /* Roadmap timeline */
        .roadmap-list {
          margin-top: 48px;
          display: flex;
          flex-direction: column;
          position: relative;
          max-width: 800px;
        }

        .roadmap-list::before {
          content: "";
          position: absolute;
          left: 27px;
          top: 40px;
          bottom: 40px;
          width: 1px;
          background: linear-gradient(var(--terra3), var(--bone3));
        }

        .road-step {
          display: flex;
          gap: 24px;
          padding: 16px 0;
          align-items: flex-start;
        }

        .road-node {
          width: 56px;
          height: 56px;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--bone);
          border: 1px solid var(--bone3);
          display: grid;
          place-items: center;
          font-family: var(--serif);
          font-style: italic;
          font-size: 18px;
          color: var(--terra);
          z-index: 2;
        }

        .road-node.done {
          background: var(--green);
          color: var(--bone);
          border-color: var(--green);
        }

        .road-node.now {
          background: var(--gold);
          color: var(--ink);
          border-color: var(--gold);
        }

        .road-status {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink3);
          margin-bottom: 4px;
        }

        .road-name {
          font-family: var(--serif);
          font-size: 22px;
          margin-bottom: 6px;
          color: var(--ink);
        }

        .road-desc {
          font-size: 13.5px;
          color: var(--ink3);
          line-height: 1.65;
        }

        /* Footer */
        .showcase-footer {
          position: relative;
          z-index: 2;
          background: var(--ink);
          margin-top: 90px;
          padding: 70px 40px 40px;
          text-align: left;
          color: var(--bone);
        }

        .showcase-footer .foot-mark,
        .showcase-footer .foot-tag,
        .showcase-footer .foot-meta {
          max-width: 1100px;
          margin-left: auto;
          margin-right: auto;
        }

        .foot-mark {
          font-family: var(--serif);
          font-size: 40px;
          font-weight: 600;
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
      `}</style>
    </div>
  );
}
