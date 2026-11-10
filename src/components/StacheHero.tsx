'use client';

import { motion } from 'framer-motion';

export default function StacheHero({ onApplyClick }: { onApplyClick?: () => void }) {
  return (
    <section className="hero">
      <div className="hero-grid" />
      <div className="hero-inner">
        <motion.div
          className="eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          ELYSIQ RESEARCH · ISSUE 005 · THE STACHE PROTOCOL
        </motion.div>

        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          THE<br />
          <span className="accent">STACHE</span><br />
          PROTOCOL
        </motion.h1>

        <motion.p
          className="hero-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          The mustache means <em>something.</em>
        </motion.p>

        <motion.p
          className="hero-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          A security certification layer for the Elysium ecosystem.
          Contract checked. Deployer verified. Wallets analyzed. Permanent record.
        </motion.p>

        <motion.div
          className="hero-cta"
          style={{ marginTop: "24px" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <button className="btn-primary" onClick={onApplyClick} data-magnetic>Apply For The Stache</button>
          <a href="#registry" className="btn-secondary" data-magnetic>View Registry</a>
        </motion.div>
      </div>

      <style jsx>{`
        .hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 0 40px;
        }
        .hero-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(26,24,20,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26,24,20,.04) 1px, transparent 1px);
          background-size: 64px 64px;
          pointer-events: none;
        }
        .hero-inner {
          max-width: 900px;
          text-align: center;
          position: relative;
          z-index: 2;
        }
        .eyebrow {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.22em;
          color: #D4633A;
          margin-bottom: 32px;
        }
        .hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(64px, 12vw, 160px);
          font-weight: 600;
          line-height: 0.92;
          letter-spacing: -0.02em;
          color: #1A1814;
          margin-bottom: 24px;
        }
        .hero-title .accent { color: #D4633A; }
        .hero-sub {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(22px, 3vw, 34px);
          color: #D4633A;
          margin-bottom: 20px;
        }
        .hero-sub em { font-style: italic; color: #D4633A; }
        .hero-body {
          font-size: 15px;
          color: #8A8880;
          max-width: 480px;
          margin: 0 auto 40px;
          line-height: 1.7;
        }
        .hero-cta {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 24px;
        }
        .btn-primary {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 14px 32px;
          background: #1A1814;
          color: #F5F0E8;
          border: none;
          border-radius: 4px;
          cursor: none;
          transition: background 0.15s, transform 0.15s;
        }
        .btn-primary:hover { background: #D4633A; transform: translateY(-2px); }
        .btn-secondary {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 14px 32px;
          background: transparent;
          color: #1A1814;
          border: 1px solid #E0D9CE;
          border-radius: 4px;
          cursor: none;
          text-decoration: none;
          transition: border-color 0.15s, color 0.15s;
        }
        .btn-secondary:hover { border-color: #D4633A; color: #D4633A; }
      `}</style>
    </section>
  );
}
