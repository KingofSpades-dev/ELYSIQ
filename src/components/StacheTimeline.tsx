'use client';

import { motion } from 'framer-motion';

const STEPS = [
  { n: '01', title: 'Launch', desc: 'Project launches on Elysium.' },
  { n: '02', title: 'Apply', desc: 'Submit application at elysiq.xyz/stache.' },
  { n: '03', title: 'ELYSIQ Scan', desc: 'Contract audit, deployer check, holder analysis, risk assessment.' },
  { n: '04', title: 'Certified', desc: 'Pass → receive Stache Assets + Stache Pass NFT.' },
  { n: '05', title: 'Wear The Stache', desc: 'Add the mustache to your mascot. Show the world.' },
  { n: '06', title: 'Revenue Sharing', desc: 'Earn from every scan. Shared with certified projects and $ELYSIQ holders.' },
];

export default function StacheTimeline() {
  return (
    <section className="timeline">
      <div className="section-label">How it works</div>
      <div className="timeline-track">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            className="timeline-step"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
          >
            <div className="step-node">{s.n}</div>
            <div className="step-body">
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
      <style jsx>{`
        .timeline {
          padding: 100px 40px;
          max-width: 760px;
          margin: 0 auto;
        }
        .section-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8A8880;
          margin-bottom: 56px;
          text-align: center;
        }
        .timeline-track {
          display: flex;
          flex-direction: column;
          gap: 0;
          position: relative;
        }
        .timeline-track::before {
          content: '';
          position: absolute;
          left: 27px;
          top: 28px;
          bottom: 28px;
          width: 1px;
          background: linear-gradient(#F0A882, #E0D9CE);
        }
        .timeline-step {
          display: flex;
          gap: 24px;
          padding: 18px 0;
          align-items: flex-start;
        }
        .step-node {
          width: 56px;
          height: 56px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #F5F0E8;
          border: 1px solid #E0D9CE;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          color: #D4633A;
          z-index: 2;
        }
        .step-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          color: #1A1814;
          margin-bottom: 4px;
        }
        .step-desc {
          font-size: 13px;
          color: #8A8880;
          line-height: 1.6;
        }
      `}</style>
    </section>
  );
}
