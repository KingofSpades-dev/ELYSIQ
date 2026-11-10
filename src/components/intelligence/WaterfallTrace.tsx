'use client';
import { useEffect, useRef } from 'react';
import { TRACE_ROWS } from '@/lib/intelligence/constants';

/**
 * WaterfallTrace — a single scan's execution trace as staggered filling bars.
 * Observability-tool aesthetic. Animates when scrolled into view.
 */
export default function WaterfallTrace() {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current!;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          const rows = Array.from(body.querySelectorAll<HTMLElement>('.wf-row'));
          rows.forEach((row, i) => setTimeout(() => {
            row.classList.add('in');
            const fill = row.querySelector<HTMLElement>('.wf-fill')!;
            fill.style.width = TRACE_ROWS[i].widthPct + '%';
          }, i * 180));
          io.disconnect();
        }
      });
    }, { threshold: 0.4 });
    io.observe(body);
    return () => io.disconnect();
  }, []);

  return (
    <div className="waterfall">
      <div className="wf-bar">
        <span className="gd" style={{ background: '#ff5f57' }} /><span className="gd" style={{ background: '#febc2e' }} /><span className="gd" style={{ background: '#28c840' }} />
        <span className="wf-title">single scan · execution trace</span>
      </div>
      <div ref={bodyRef} className="wf-body">
        {TRACE_ROWS.map((r) => (
          <div key={r.label} className="wf-row">
            <div className="wf-label">{r.label}</div>
            <div className="wf-track"><div className="wf-fill" style={{ background: r.color }} /></div>
            <div className="wf-dur">{r.duration}</div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .waterfall{background:#1A1814;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(26,24,20,.2)}
        .wf-bar{display:flex;align-items:center;gap:8px;padding:14px 18px;background:rgba(245,240,232,.04);border-bottom:1px solid rgba(245,240,232,.08)}
        .gd{width:10px;height:10px;border-radius:50%}
        .wf-title{margin-left:12px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.12em;color:rgba(245,240,232,.4);text-transform:uppercase}
        .wf-body{padding:24px 26px}
        .wf-row{display:flex;align-items:center;gap:16px;margin-bottom:14px;opacity:0;transform:translateX(-12px);transition:opacity .5s,transform .5s}
        .wf-row.in{opacity:1;transform:translateX(0)}
        .wf-label{width:130px;flex-shrink:0;font-family:'DM Mono',monospace;font-size:11px;color:rgba(245,240,232,.6);text-transform:uppercase;letter-spacing:.08em}
        .wf-track{flex:1;height:26px;background:rgba(245,240,232,.04);border-radius:5px;position:relative;overflow:hidden}
        .wf-fill{position:absolute;top:0;bottom:0;border-radius:5px;width:0;transition:width .8s cubic-bezier(.16,1,.3,1)}
        .wf-dur{width:54px;flex-shrink:0;font-family:'DM Mono',monospace;font-size:10px;color:rgba(245,240,232,.4);text-align:right}
      `}</style>
    </div>
  );
}
