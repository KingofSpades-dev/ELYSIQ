'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';

const CARDS = [
  { n: 'I', title: 'Contract Checked', desc: 'Mint authority, freeze authority, liquidity lock, honeypot detection. Read by Claude Fable 5.' },
  { n: 'II', title: 'Deployer Verified', desc: 'Deployer history cross-referenced against known rug patterns and malicious clusters.' },
  { n: 'III', title: 'Wallets Analyzed', desc: 'Holder concentration, bundler detection, coordinated entry patterns flagged.' },
  { n: 'IV', title: 'Permanent Onchain Record', desc: 'The certification is minted as a Stache Pass cNFT. The proof cannot be faked or deleted.' },
];

function TiltCard({ card, i }: { card: typeof CARDS[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTransform(`perspective(800px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateZ(8px)`);
  };
  const onLeave = () => setTransform('');

  return (
    <motion.div
      ref={ref}
      className="meaning-card"
      style={{ transform }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: i * 0.08 }}
      data-magnetic
    >
      <div className="card-num">{card.n}</div>
      <div className="card-title">{card.title}</div>
      <div className="card-desc">{card.desc}</div>
      <style jsx>{`
        .meaning-card {
          background: #F5F0E8;
          border: 1px solid #E0D9CE;
          border-radius: 8px;
          padding: 32px 28px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: none;
        }
        .meaning-card:hover {
          box-shadow: 0 16px 40px rgba(26,24,20,.1);
          border-color: #F0A882;
        }
        .card-num {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 40px;
          color: #F0A882;
          line-height: 1;
          margin-bottom: 20px;
        }
        .card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          color: #1A1814;
          margin-bottom: 12px;
        }
        .card-desc {
          font-size: 13px;
          color: #8A8880;
          line-height: 1.7;
        }
      `}</style>
    </motion.div>
  );
}

export default function StacheMeaning() {
  return (
    <section className="meaning">
      <div className="section-label">What does the mustache mean?</div>
      <div className="meaning-grid">
        {CARDS.map((c, i) => <TiltCard key={c.n} card={c} i={i} />)}
      </div>
      <style jsx>{`
        .meaning { padding: 100px 40px; max-width: 1100px; margin: 0 auto; }
        .section-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8A8880;
          margin-bottom: 48px;
          text-align: center;
        }
        .meaning-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        @media (max-width: 900px) {
          .meaning-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 560px) {
          .meaning-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
