'use client';

import { motion } from 'framer-motion';

const BENEFITS = [
  'NFT on Elysium',
  'Proof of audit & security verification',
  'Access to ELYSIQ Wallet Analyzer',
  'Priority support & recovery services',
  'Discounted deep scans',
];

export default function StachePass() {
  return (
    <section className="pass">
      <div className="pass-inner">
        <div className="pass-left">
          <div className="section-label">The Stache Pass</div>
          <h2 className="pass-title">Onchain proof.<br /><em>Holder utility.</em></h2>
          <p className="pass-desc">
            Every certified project mints a Stache Pass — an NFT on Elysium
            that proves the audit happened and unlocks the ELYSIQ ecosystem.
          </p>
          <ul className="pass-benefits">
            {BENEFITS.map((b, i) => (
              <motion.li
                key={b}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <span className="check">✓</span> {b}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Apple-Wallet-style pass card */}
        <motion.div
          className="pass-card"
          initial={{ opacity: 0, y: 30, rotateY: -12 }}
          whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          whileHover={{ rotateY: 6, rotateX: -4 }}
          data-magnetic
        >
          <div className="card-top">
            <span className="card-brand">∴ STACHE PASS</span>
            <span className="card-chip" />
          </div>
          <svg className="card-stache" width="120" height="70" viewBox="0 0 120 70">
            <path d="M60 40 C46 22, 28 22, 12 32 C4 36, 0 44, 8 48 C20 44, 32 40, 42 48 C50 54, 56 48, 60 44 C64 48, 70 54, 78 48 C88 40, 100 44, 112 48 C120 44, 116 36, 108 32 C92 22, 74 22, 60 40 Z" fill="#F5F0E8" />
          </svg>
          <div className="card-meta">
            <div>
              <div className="card-meta-label">CERTIFIED BY</div>
              <div className="card-meta-val">ELYSIQ</div>
            </div>
            <div>
              <div className="card-meta-label">STANDARD</div>
              <div className="card-meta-val">NFT · Elysium</div>
            </div>
          </div>
        </motion.div>
      </div>
      <style jsx>{`
        .pass { padding: 100px 40px; max-width: 1100px; margin: 0 auto; }
        .pass-inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .section-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8A8880;
          margin-bottom: 20px;
        }
        .pass-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 5vw, 56px);
          font-weight: 300;
          line-height: 1;
          color: #1A1814;
          margin-bottom: 20px;
        }
        .pass-title em { font-style: italic; color: #D4633A; }
        .pass-desc { font-size: 14px; color: #8A8880; line-height: 1.7; margin-bottom: 28px; }
        .pass-benefits { list-style: none; padding: 0; }
        .pass-benefits li {
          padding: 12px 0;
          border-bottom: 1px solid #E0D9CE;
          font-size: 14px;
          color: #D4633A;
        }
        .check { color: #D4633A; margin-right: 10px; }
        .pass-card {
          background: #1A1814;
          border-radius: 16px;
          padding: 28px;
          aspect-ratio: 1.586;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 24px 60px rgba(26,24,20,.25);
          transform-style: preserve-3d;
          cursor: none;
        }
        .card-top { display: flex; justify-content: space-between; align-items: center; }
        .card-brand {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.14em;
          color: #F5F0E8;
        }
        .card-chip {
          width: 36px; height: 26px;
          border-radius: 5px;
          background: linear-gradient(135deg, #D4633A, #F0A882);
        }
        .card-stache { align-self: center; }
        .card-meta { display: flex; justify-content: space-between; }
        .card-meta-label {
          font-family: 'DM Mono', monospace;
          font-size: 8px;
          letter-spacing: 0.14em;
          color: rgba(245,240,232,.4);
          margin-bottom: 4px;
        }
        .card-meta-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          color: #F5F0E8;
        }
        @media (max-width: 820px) {
          .pass-inner { grid-template-columns: 1fr; gap: 40px; }
        }
      `}</style>
    </section>
  );
}
