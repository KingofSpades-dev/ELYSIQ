'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * FloatingStache3D — the living mustache mascot.
 *
 * Behaviors:
 *  - idle breathing (scale pulse) + gentle bob
 *  - cursor curiosity: drifts toward cursor when it moves, but keeps distance (avoidance)
 *  - long idle: wanders the screen to random anchor points (DVD-screensaver energy)
 *  - blinking eyes on a timer
 *  - double-click → dispatches 'nietzsche-mode' event (handled by NietzscheMode)
 *
 * Implementation note: This uses a 2D SVG with CSS 3D transforms for soft physics.
 * For a true Three.js / R3F version, see devbrief.md → "True 3D upgrade path".
 * The 2D physics version ships first because it is lightweight (no WebGL),
 * works on every device, and reads as "alive" without a 1MB bundle.
 */
export default function FloatingStache3D() {
  const ref = useRef<HTMLDivElement>(null);
  const [blinking, setBlinking] = useState(false);

  // physics state
  const state = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth * 0.7 : 600,
    y: typeof window !== 'undefined' ? window.innerHeight * 0.4 : 300,
    vx: 0,
    vy: 0,
    rot: 0,
    targetX: 0,
    targetY: 0,
    lastMove: Date.now(),
    mouseX: 0,
    mouseY: 0,
    mode: 'idle' as 'idle' | 'curious' | 'wander',
  });

  useEffect(() => {
    const s = state.current;
    s.targetX = s.x;
    s.targetY = s.y;

    const onMove = (e: MouseEvent) => {
      s.mouseX = e.clientX;
      s.mouseY = e.clientY;
      s.lastMove = Date.now();
      s.mode = 'curious';
    };
    window.addEventListener('mousemove', onMove);

    // blink timer
    const blinkTimer = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 160);
    }, 3200 + Math.random() * 2000);

    // wander target picker
    const wanderTimer = setInterval(() => {
      if (Date.now() - s.lastMove > 4000) {
        s.mode = 'wander';
        s.targetX = 80 + Math.random() * (window.innerWidth - 160);
        s.targetY = 80 + Math.random() * (window.innerHeight - 160);
      }
    }, 3500);

    let raf = 0;
    const loop = () => {
      const now = Date.now();
      const idleFor = now - s.lastMove;

      if (s.mode === 'curious' && idleFor < 4000) {
        // approach cursor but keep ~140px distance (avoidance)
        const dx = s.mouseX - s.x;
        const dy = s.mouseY - s.y;
        const dist = Math.hypot(dx, dy) || 1;
        const desired = 140;
        const pull = (dist - desired) / dist;
        s.targetX = s.x + dx * pull * 0.6;
        s.targetY = s.y + dy * pull * 0.6;
      }

      // spring toward target
      const ax = (s.targetX - s.x) * 0.012;
      const ay = (s.targetY - s.y) * 0.012;
      s.vx = (s.vx + ax) * 0.86;
      s.vy = (s.vy + ay) * 0.86;
      s.x += s.vx;
      s.y += s.vy;

      // rotation follows horizontal velocity
      s.rot += (s.vx * 1.4 - s.rot) * 0.1;

      // breathing
      const breathe = 1 + Math.sin(now / 600) * 0.04;
      const bob = Math.sin(now / 800) * 4;

      if (ref.current) {
        ref.current.style.transform =
          `translate(${s.x}px, ${s.y + bob}px) translate(-50%,-50%) rotate(${s.rot}deg) scale(${breathe})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      clearInterval(blinkTimer);
      clearInterval(wanderTimer);
      cancelAnimationFrame(raf);
    };
  }, []);

  const onDoubleClick = () => {
    window.dispatchEvent(new CustomEvent('nietzsche-mode-toggle'));
    const s = state.current;
    s.vy = -8; // little jump
  };

  return (
    <div
      ref={ref}
      className="floating-stache"
      onDoubleClick={onDoubleClick}
      data-magnetic
      aria-hidden
    >
      <svg width="120" height="80" viewBox="0 0 120 80">
        {/* eyes above mustache */}
        <rect x="40" y="8" width="10" height={blinking ? 2 : 12} rx="2" fill="#1A1814" />
        <rect x="70" y="8" width="10" height={blinking ? 2 : 12} rx="2" fill="#1A1814" />
        {/* the stache */}
        <path
          d="M60 44 C46 24, 28 24, 12 34 C4 38, 0 46, 8 50 C20 46, 32 42, 42 50 C50 56, 56 50, 60 46 C64 50, 70 56, 78 50 C88 42, 100 46, 112 50 C120 46, 116 38, 108 34 C92 24, 74 24, 60 44 Z"
          fill="#1A1814"
        />
      </svg>
      <style jsx>{`
        .floating-stache {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9000;
          pointer-events: auto;
          cursor: none;
          will-change: transform;
          filter: drop-shadow(0 8px 12px rgba(26,24,20, 0.18));
        }
        @media (max-width: 768px) {
          .floating-stache { display: none; }
        }
      `}</style>
    </div>
  );
}
