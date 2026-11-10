'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const SLICES = [
  { label: 'ELYSIQ Treasury', pct: 80, color: '#D4633A' },
  { label: 'Certified Projects', pct: 10, color: '#1A1814' },
  { label: '$ELYSIQ Stakers', pct: 10, color: '#BA7517' },
];

// Build SVG donut segments
function donutSegments() {
  let acc = 0;
  const R = 80;
  const C = 2 * Math.PI * R;
  return SLICES.map((s) => {
    const dash = (s.pct / 100) * C;
    const seg = { ...s, dash, gap: C - dash, offset: -(acc / 100) * C };
    acc += s.pct;
    return seg;
  });
}

export default function RevenueSharing() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const segs = donutSegments();

  return (
    <section className="revenue" ref={ref}>
      <div className="section-label">Revenue Sharing · The Obol</div>
      <h2 className="revenue-title">The mustache <em>pays.</em></h2>
      <div className="revenue-inner">
        <svg className="donut" width="220" height="220" viewBox="0 0 220 220">
          <g transform="rotate(-90 110 110)">
            {segs.map((s, i) => (
              <motion.circle
                key={s.label}
                cx="110" cy="110" r="80"
                fill="none"
                stroke={s.color}
                strokeWidth="32"
                strokeDasharray={`${s.dash} ${s.gap}`}
                initial={{ strokeDashoffset: s.offset, opacity: 0 }}
                animate={inView ? { strokeDashoffset: s.offset, opacity: 1 } : {}}
                transition={{ duration: 1, delay: i * 0.2 }}
              />
            ))}
          </g>
          <text x="110" y="104" textAnchor="middle" className="donut-center-num">OBOL</text>
          <text x="110" y="124" textAnchor="middle" className="donut-center-label">per scan</text>
        </svg>

        <div className="revenue-legend">
          {SLICES.map((s, i) => (
            <motion.div
              key={s.label}
              className="legend-row"
              initial={{ opacity: 0, x: 16 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
            >
              <span className="legend-dot" style={{ background: s.color }} />
              <span className="legend-pct">{s.pct}%</span>
              <span className="legend-label">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
      <style jsx>{`
        .revenue { padding: 100px 40px; max-width: 900px; margin: 0 auto; text-align: center; }
        .section-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8A8880;
          margin-bottom: 16px;
        }
        .revenue-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 5vw, 56px);
          font-weight: 300;
          color: #1A1814;
          margin-bottom: 56px;
        }
        .revenue-title em { font-style: italic; color: #D4633A; }
        .revenue-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 64px;
          flex-wrap: wrap;
        }
        .donut-center-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          fill: #1A1814;
        }
        .donut-center-label {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          fill: #8A8880;
          text-transform: uppercase;
        }
        .revenue-legend { display: flex; flex-direction: column; gap: 20px; text-align: left; }
        .legend-row { display: flex; align-items: center; gap: 14px; }
        .legend-dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
        .legend-pct {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          color: #1A1814;
          min-width: 60px;
        }
        .legend-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          color: #8A8880;
          text-transform: uppercase;
        }
      `}</style>
    </section>
  );
}
