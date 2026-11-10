"use client";
import { useEffect, useRef, useState } from "react";
import {
  GRAPH_NODES,
  GRAPH_EDGES,
  GRAPH_ORDER,
  SCAN_STATUS,
} from "@/lib/intelligence/constants";

/**
 * ReasoningGraph — the hero visual. Renders a ELYSIQ scan as a live node-graph.
 * Nodes activate in order; a light pulse travels each edge; a status line narrates.
 * Pure canvas, one rAF loop. Loops forever.
 *
 * To drive this from a REAL scan: call POST /api/agent/scan, then advance
 * `active` as each stage resolves instead of on the demo timer (see advanceStep).
 */
export default function ReasoningGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('<span class="tag">idle</span>');
  const stateRef = useRef({ active: -1, pulse: 0, t: 0 });

  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;
    let W = 0,
      H = 0,
      raf = 0;

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      W = r.width;
      H = r.height;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener("resize", size);

    const nodeById = (id: string) => GRAPH_NODES.find((n) => n.id === id)!;
    const PAD_X = 11;
    const PAD_Y = 9;

    const px = (n: { x: number }) => PAD_X + n.x * (W - PAD_X * 2);
    const py = (n: { y: number }) => PAD_Y + n.y * (H - PAD_Y * 2);

    const draw = () => {
      const s = stateRef.current;
      s.t += 0.016;
      ctx.clearRect(0, 0, W, H);

      // edges
      GRAPH_EDGES.forEach(([a, b]) => {
        const na = nodeById(a),
          nb = nodeById(b);
        const bi = GRAPH_ORDER.indexOf(b);
        const lit = s.active >= bi;
        const mx = (px(na) + px(nb)) / 2;
        ctx.beginPath();
        ctx.moveTo(px(na), py(na));
        ctx.bezierCurveTo(mx, py(na), mx, py(nb), px(nb), py(nb));
        ctx.strokeStyle = lit ? "rgba(212,99,58,.5)" : "rgba(245,240,232,.12)";
        ctx.lineWidth = lit ? 2 : 1;
        ctx.stroke();
        if (s.active === bi && s.pulse < 1) {
          const tt = s.pulse;
          const x =
            Math.pow(1 - tt, 3) * px(na) +
            3 * Math.pow(1 - tt, 2) * tt * mx +
            3 * (1 - tt) * tt * tt * mx +
            tt * tt * tt * px(nb);
          const y =
            Math.pow(1 - tt, 3) * py(na) +
            3 * Math.pow(1 - tt, 2) * tt * py(na) +
            3 * (1 - tt) * tt * tt * py(nb) +
            tt * tt * tt * py(nb);
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 7);
          ctx.fillStyle = "#F0A882";
          ctx.fill();
        }
      });

      // nodes
      GRAPH_NODES.forEach((n, i) => {
        const lit = s.active >= i;
        const isActive = s.active === i;
        const r = isActive ? 26 + Math.sin(s.t * 6) * 2 : 22;
        ctx.beginPath();
        ctx.arc(px(n), py(n), r, 0, 7);
        ctx.fillStyle = lit
          ? isActive
            ? "#D4633A"
            : "rgba(212,99,58,.22)"
          : "rgba(245,240,232,.06)";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = lit ? "#F0A882" : "rgba(245,240,232,.2)";
        ctx.stroke();
        if (isActive) {
          ctx.beginPath();
          ctx.arc(px(n), py(n), r + 8 + Math.sin(s.t * 6) * 3, 0, 7);
          ctx.strokeStyle = "rgba(212,99,58,.3)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.fillStyle = lit ? "#F5F0E8" : "rgba(245,240,232,.35)";
        ctx.font = "600 9px DM Mono, monospace";
        ctx.textAlign = "center";
        ctx.fillText(n.label, px(n), py(n) + r + 16);
      });

      raf = requestAnimationFrame(draw);
    };

    const advanceStep = () => {
      const s = stateRef.current;
      s.active++;
      if (s.active >= GRAPH_NODES.length) {
        setStatus(
          '<span class="tag">complete ·</span> scan recorded · archive updated ∴',
        );
        setTimeout(() => {
          s.active = -1;
          setStatus('<span class="tag">idle</span>');
          setTimeout(advanceStep, 1400);
        }, 2600);
        return;
      }
      s.pulse = 0;
      const pi = setInterval(() => {
        s.pulse += 0.05;
        if (s.pulse >= 1) clearInterval(pi);
      }, 16);
      setStatus(SCAN_STATUS[GRAPH_ORDER[s.active]]);
      setTimeout(advanceStep, 1300);
    };

    draw();
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            setTimeout(advanceStep, 800);
            io.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );
    io.observe(cv);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      io.disconnect();
    };
  }, []);

  return (
    <div className="graph-stage">
      <div className="graph-bar">
        <span className="gd" style={{ background: "#ff5f57" }} />
        <span className="gd" style={{ background: "#febc2e" }} />
        <span className="gd" style={{ background: "#28c840" }} />
        <span className="graph-title">elysiq · live reasoning graph</span>
      </div>
      <canvas ref={canvasRef} className="graph-canvas" />
      <div
        className="graph-status"
        dangerouslySetInnerHTML={{ __html: status }}
      />
      <style jsx>{`
        .graph-stage {
          position: relative;
          width: 100%;
          height: 420px;
          background: #1A1814;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 30px 70px rgba(26,24,20, 0.22);
        }
        .graph-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 18px;
          background: rgba(245,240,232, 0.04);
          border-bottom: 1px solid rgba(245,240,232, 0.08);
          z-index: 5;
        }
        .gd {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .graph-title {
          margin-left: 12px;
          font-family: "DM Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          color: rgba(245,240,232, 0.4);
          text-transform: uppercase;
        }
        .graph-canvas {
          position: absolute;
          inset: 0;
          top: 44px;
        }
        .graph-status {
          position: absolute;
          bottom: 14px;
          left: 18px;
          right: 18px;
          font-family: "DM Mono", monospace;
          font-size: 11px;
          color: #F0A882;
          z-index: 5;
          min-height: 16px;
        }
        .graph-status :global(.tag) {
          color: rgba(245,240,232, 0.4);
        }
      `}</style>
    </div>
  );
}
