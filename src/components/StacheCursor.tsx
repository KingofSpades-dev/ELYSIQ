'use client';

import { useEffect, useRef } from 'react';

/**
 * StacheCursor — replaces the default cursor with a miniature mustache.
 * Smooth interpolation, high FPS via rAF. Magnetic to [data-magnetic] elements.
 */
export default function StacheCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };
    window.addEventListener('mousemove', onMove);

    const loop = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.18;
      pos.current.y += (target.current.y - pos.current.y) * 0.18;
      if (cursorRef.current) {
        cursorRef.current.style.transform =
          `translate(${pos.current.x}px, ${pos.current.y}px) translate(-50%, -50%)`;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);

    // grow on interactive hover
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('a, button, [data-magnetic]')) {
        cursorRef.current?.classList.add('cursor-active');
      }
    };
    const onOut = () => cursorRef.current?.classList.remove('cursor-active');
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div ref={cursorRef} className="stache-cursor" aria-hidden>
      <svg width="32" height="20" viewBox="0 0 64 40">
        {/* mini mustache — ELYSIQ shape */}
        <path
          d="M32 18 C24 8, 14 8, 6 14 C2 16, 0 20, 4 22 C10 20, 16 18, 22 22 C26 24, 30 22, 32 20 C34 22, 38 24, 42 22 C48 18, 54 20, 60 22 C64 20, 62 16, 58 14 C50 8, 40 8, 32 18 Z"
          fill="#1A1814"
        />
      </svg>
      <style jsx>{`
        .stache-cursor {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 1000000;
          pointer-events: none;
          transition: scale 0.18s ease;
          mix-blend-mode: multiply;
          will-change: transform;
        }
        .stache-cursor :global(svg) {
          transition: transform 0.18s ease;
        }
        .stache-cursor.cursor-active :global(svg) {
          transform: scale(1.6) rotate(-6deg);
        }
        @media (hover: none) {
          .stache-cursor { display: none; }
        }
      `}</style>
    </div>
  );
}
