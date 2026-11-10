'use client';
import { useEffect, useRef } from 'react';

/** Mustache cursor + trailing ring. Hidden on touch devices. */
export default function CustomCursor() {
  const curRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cur = curRef.current!, ring = ringRef.current!;
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my, rx = mx, ry = my, raf = 0;
    const move = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    addEventListener('mousemove', move);
    const loop = () => {
      cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2; rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
      cur.style.transform = `translate(${cx - 16}px,${cy - 10}px)`;
      ring.style.transform = `translate(${rx - 18}px,${ry - 18}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const over = (e: MouseEvent) => { if ((e.target as HTMLElement).closest('a,button,[data-mag],canvas')) { cur.classList.add('on'); ring.classList.add('on'); } };
    const out = (e: MouseEvent) => { if ((e.target as HTMLElement).closest('a,button,[data-mag],canvas')) { cur.classList.remove('on'); ring.classList.remove('on'); } };
    addEventListener('mouseover', over); addEventListener('mouseout', out);
    return () => { cancelAnimationFrame(raf); removeEventListener('mousemove', move); removeEventListener('mouseover', over); removeEventListener('mouseout', out); };
  }, []);
  return (
    <>
      <div ref={curRef} className="cur"><svg viewBox="0 0 64 40"><path d="M32 18 C24 8,14 8,6 14 C2 16,0 20,4 22 C10 20,16 18,22 22 C26 24,30 22,32 20 C34 22,38 24,42 22 C48 18,54 20,60 22 C64 20,62 16,58 14 C50 8,40 8,32 18 Z" fill="#1A1814"/></svg></div>
      <div ref={ringRef} className="ring" />
      <style jsx>{`
        .cur{position:fixed;top:0;left:0;width:32px;height:20px;z-index:99999;pointer-events:none;mix-blend-mode:multiply;will-change:transform}
        .cur :global(svg){width:100%;height:100%;transition:transform .18s}
        .cur.on :global(svg){transform:scale(1.6) rotate(-7deg)}
        .ring{position:fixed;top:0;left:0;width:36px;height:36px;border:1px solid #F0A882;border-radius:50%;z-index:99998;pointer-events:none;will-change:transform;transition:width .25s,height .25s;opacity:.6}
        .ring.on{width:60px;height:60px;border-color:#D4633A}
        @media(hover:none){.cur,.ring{display:none}}
      `}</style>
    </>
  );
}
