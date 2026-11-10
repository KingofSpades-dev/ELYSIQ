'use client';
import { useEffect, useRef } from 'react';
import { SKILL_BUBBLES, CLUSTER_CENTERS, THREAT_COLORS } from '@/lib/intelligence/constants';
import type { SkillBubble } from '@/lib/intelligence/types';

/**
 * SkillConstellation — the bubble map / force graph of the skill archive.
 * Each bubble is a distilled pattern, sized by fire-count, clustered by category,
 * drifting with light physics, scattering from the cursor. Hover shows a tooltip.
 *
 * To use live data: pass `skills` prop from GET /api/agent/memory instead of the
 * SKILL_BUBBLES constant.
 */
export default function SkillConstellation({ skills = SKILL_BUBBLES }: { skills?: SkillBubble[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext('2d')!;
    const tip = tipRef.current!;
    let W = 0, H = 0, raf = 0, t = 0;
    const mouse = { x: -999, y: -999 };

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);

    const nodes = skills.map((d) => ({
      ...d,
      r: 14 + d.fired * 0.55,
      x: (CLUSTER_CENTERS[d.category].x + (Math.random() - 0.5) * 0.18) * 1000,
      y: (CLUSTER_CENTERS[d.category].y + (Math.random() - 0.5) * 0.18) * 500,
      vx: 0, vy: 0, seed: Math.random() * 7,
    }));

    const onMove = (e: MouseEvent) => {
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    };
    const onLeave = () => { mouse.x = -999; mouse.y = -999; tip.style.opacity = '0'; };
    cv.addEventListener('mousemove', onMove);
    cv.addEventListener('mouseleave', onLeave);

    const step = () => {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      const cx: Record<string, number> = {}, cy: Record<string, number> = {};
      Object.keys(CLUSTER_CENTERS).forEach((k) => { cx[k] = CLUSTER_CENTERS[k].x * W; cy[k] = CLUSTER_CENTERS[k].y * H; });

      // links within cluster
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].category === nodes[j].category) {
          const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 160) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(26,24,20,${0.05 * (1 - d / 160)})`; ctx.lineWidth = 1; ctx.stroke(); }
        }
      }

      let hover: typeof nodes[0] | null = null;
      nodes.forEach((n) => {
        n.vx += (cx[n.category] - n.x) * 0.002; n.vy += (cy[n.category] - n.y) * 0.002;
        n.vx += Math.cos(t + n.seed) * 0.02; n.vy += Math.sin(t * 0.8 + n.seed) * 0.02;
        nodes.forEach((m) => { if (m !== n) { const dx = n.x - m.x, dy = n.y - m.y, d = Math.hypot(dx, dy), min = n.r + m.r + 8; if (d < min && d > 0) { const f = (min - d) / d * 0.5; n.vx += dx * f * 0.05; n.vy += dy * f * 0.05; } } });
        const dx = n.x - mouse.x, dy = n.y - mouse.y, dm = Math.hypot(dx, dy);
        if (dm < n.r + 30) { hover = n; if (dm < 120 && dm > 0) { n.vx += dx / dm * 0.6; n.vy += dy / dm * 0.6; } }
        n.vx *= 0.9; n.vy *= 0.9; n.x += n.vx; n.y += n.vy;
        n.x = Math.max(n.r, Math.min(W - n.r, n.x)); n.y = Math.max(n.r, Math.min(H - n.r, n.y));
        const col = THREAT_COLORS[n.category]; const isH = hover === n;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 7);
        ctx.fillStyle = isH ? col : col + 'cc'; ctx.fill();
        if (isH) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 6, 0, 7); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke(); }
        if (n.r > 20) { ctx.fillStyle = '#F5F0E8'; ctx.font = '600 11px DM Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n.accuracy + '%', n.x, n.y); }
      });

      if (hover) {
        const h = hover as typeof nodes[0];
        tip.style.opacity = '1';
        tip.style.left = Math.min(h.x + h.r + 10, W - 220) + 'px';
        tip.style.top = h.y + 'px';
        tip.innerHTML = `<b>${h.name}</b><br>accuracy ${h.accuracy}% · fired ${h.fired}×`;
      }
      raf = requestAnimationFrame(step);
    };
    step();

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); cv.removeEventListener('mousemove', onMove); cv.removeEventListener('mouseleave', onLeave); };
  }, [skills]);

  return (
    <div className="constellation-wrap">
      <canvas ref={canvasRef} className="bubble-canvas" />
      <div className="bubble-legend">
        <div className="k"><span className="sw" style={{ background: '#D4633A' }} /> Deployer threats</div>
        <div className="k"><span className="sw" style={{ background: '#C9A84C' }} /> Liquidity threats</div>
        <div className="k"><span className="sw" style={{ background: '#4A7C59' }} /> Behavioral threats</div>
      </div>
      <div ref={tipRef} className="bubble-tip" />
      <style jsx>{`
        .constellation-wrap{position:relative;background:linear-gradient(180deg,#F5F0E8,#EDE8DE);border:1px solid #E0D9CE;border-radius:18px;overflow:hidden}
        .bubble-canvas{display:block;width:100%;height:520px;cursor:none}
        .bubble-legend{position:absolute;top:20px;left:20px;font-family:'DM Mono',monospace;font-size:10px;color:#8A8880;line-height:1.9}
        .bubble-legend .k{display:flex;align-items:center;gap:8px}
        .bubble-legend .sw{width:10px;height:10px;border-radius:50%}
        .bubble-tip{position:absolute;pointer-events:none;background:#1A1814;color:#F5F0E8;font-family:'DM Mono',monospace;font-size:10px;padding:8px 12px;border-radius:8px;opacity:0;transition:opacity .15s;max-width:220px;line-height:1.5;z-index:10}
        .bubble-tip :global(b){color:#F0A882}
      `}</style>
    </div>
  );
}
