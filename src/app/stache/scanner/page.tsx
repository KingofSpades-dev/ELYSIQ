'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import StacheCursor from '@/components/StacheCursor';
import FloatingStache3D from '@/components/FloatingStache3D';
import NietzscheMode from '@/components/NietzscheMode';
import TokenScanner from '@/components/TokenScanner';
import Link from 'next/link';

export default function ScannerPage() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <main className="stache-root">
      <StacheCursor />
      <FloatingStache3D />
      <NietzscheMode />

      {/* Floating Back Button */}
      <Link href="/stache" className="floating-back-btn" data-magnetic>
        ← Registry
      </Link>

      <div className="wrap">
        <div className="eyebrow">ELYSIQ · Token Scanner</div>
        <h1>Paste the CA.<br />Get the <em>verdict.</em></h1>
        <p className="sub">Contract checked. Deployer verified. Wallets analyzed.</p>

        <TokenScanner />

        <div className="footer-note">
          ELYSIQ · Powered by Claude · Elysium Explorer · DexScreener · $ELYSIQ
        </div>
      </div>

      <style jsx global>{`
        .stache-root {
          background: #F5F0E8;
          color: #1A1814;
          cursor: none;
          min-height: 100vh;
          overflow-x: hidden;
          font-family: 'DM Sans', sans-serif;
          padding: 80px 20px 40px;
          background-image:
            linear-gradient(rgba(26,24,20,.025) 1px,transparent 1px),
            linear-gradient(90deg,rgba(26,24,20,.025) 1px,transparent 1px);
          background-size: 48px 48px;
        }
        .stache-root, .stache-root * {
          cursor: none !important;
        }
        .wrap {
          max-width: 680px;
          margin: 0 auto;
        }

        /* Header */
        .eyebrow {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: #D4633A;
          text-align: center;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .eyebrow::before, .eyebrow::after {
          content: "";
          width: 24px;
          height: 1px;
          background: #D4633A;
        }
        h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(40px, 7vw, 68px);
          font-weight: 300;
          line-height: 1;
          text-align: center;
          letter-spacing: -.02em;
          margin-bottom: 10px;
        }
        h1 em {
          font-style: italic;
          color: #D4633A;
        }
        .sub {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 20px;
          color: #8A8880;
          text-align: center;
          margin-bottom: 40px;
        }

        .footer-note {
          text-align: center;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #8A8880;
          margin-top: 48px;
          letter-spacing: .06em;
        }

        /* Floating button */
        .floating-back-btn {
          position: fixed;
          top: 20px;
          left: 20px;
          background: #1A1814;
          color: #F5F0E8;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 8px 16px;
          border-radius: 20px;
          z-index: 99999;
          text-decoration: none;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(26,24,20, 0.15);
          transition: background 0.15s, transform 0.15s;
          cursor: none !important;
        }
        .floating-back-btn:hover {
          background: #D4633A;
          transform: scale(1.05);
        }
      `}</style>
    </main>
  );
}
