'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CustomCursor from '@/components/intelligence/CustomCursor';
import ReasoningGraph from '@/components/intelligence/ReasoningGraph';
import WaterfallTrace from '@/components/intelligence/WaterfallTrace';
import SkillConstellation from '@/components/intelligence/SkillConstellation';
import type { SkillBubble } from '@/lib/intelligence/types';

/**
 * ELYSIQ — Self-Improving Intelligence landing.
 * Route: /intelligence
 *
 * Sections: hero + live ReasoningGraph, WaterfallTrace, SkillConstellation
 * (the bubble map), differentiator pillars, the Gödel→DGM→ELYSIQ lineage,
 * and the roadmap.
 */
export default function IntelligencePage() {
  const [skills, setSkills] = useState<SkillBubble[] | undefined>();

  // fetch live memory stats
  useEffect(() => {
    fetch('/api/agent/memory')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.recent_skills) {
          setSkills(d.recent_skills);
        }
      })
      .catch(() => { });
  }, []);

  // scroll reveal
  useEffect(() => {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    const onScroll = () => document.getElementById('nav')?.classList.toggle('scrolled', window.scrollY > 40);
    addEventListener('scroll', onScroll);
    // magnetic
    document.querySelectorAll<HTMLElement>('[data-mag]').forEach((el) => {
      const mv = (e: MouseEvent) => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px,${(e.clientY - r.top - r.height / 2) * 0.18}px)`; };
      const lv = () => { el.style.transform = ''; };
      el.addEventListener('mousemove', mv); el.addEventListener('mouseleave', lv);
    });
    return () => { io.disconnect(); removeEventListener('scroll', onScroll); };
  }, []);

  return (
    <main className="intel">
      <CustomCursor />
      <div className="orb orb1" /><div className="orb orb2" />

      <nav id="nav">
        <Link href="/" className="nav-logo">
          <Image
            src="/mascot.png"
            width={30}
            height={30}
            style={{
              imageRendering: 'pixelated',
              borderRadius: '4px',
            }}
            alt="ELYSIQ mascot"
          />
          <span className="nav-logo-type">ELYSIQ</span>
        </Link>
        <span className="nav-pill">Self-Improving Agent</span>
        <Link href="/" className="nav-cta" style={{ textDecoration: "none", color: "#fff" }}>
          Back to Terminal
        </Link>
      </nav>

      <header className="hero">
        <div className="eyebrow">Open-Ended Self-Improvement</div>
        <h1>The agent that<br /><em>rewrites itself.</em></h1>
        <p className="sub">ELYSIQ keeps an archive of every threat pattern it has ever learned, validates each one against real on-chain outcomes, and gets <em>harder to fool</em> with every scan.</p>
        <div className="lineage-line">GÖDEL MACHINE <span className="arr">→</span> DARWIN GÖDEL MACHINE <span className="arr">→</span> <b>ELYSIQ</b></div>
        <div className="cta">
          <a href="#how" className="btn btn-primary" data-mag><span>Watch it think</span></a>
          <a href="#archive" className="btn btn-ghost" data-mag><span>See what it knows</span></a>
        </div>
        <div className="graph-wrap"><ReasoningGraph /></div>
      </header>

      <section id="how"><div className="sec">
        <div className="sec-label reveal">How it works</div>
        <h2 className="sec-title reveal">A reasoning graph,<br />not a <em>black box.</em></h2>
        <p className="sec-intro reveal">Every ELYSIQ scan flows through an explicit graph of stages. Watch each node activate, see data move between them, and read which learned patterns fired. Built the way frontier agents are built in 2026 — as graphs you can see.</p>
        <div className="reveal"><WaterfallTrace /></div>
      </div></section>

      <section id="archive"><div className="sec">
        <div className="sec-label reveal">The archive</div>
        <h2 className="sec-title reveal">Everything ELYSIQ<br />has <em>learned.</em></h2>
        <p className="sec-intro reveal">Each bubble is a distilled threat pattern, sized by how often it has fired, clustered by type. They drift, link, and scatter from your cursor. The archive grows denser with every scan. Hover any node.</p>
        <div className="reveal"><SkillConstellation skills={skills} /></div>
      </div></section>

      <section id="why"><div className="sec">
        <div className="sec-label reveal">Why it&apos;s different</div>
        <h2 className="sec-title reveal">Validated by <em>reality.</em></h2>
        <div className="pillars">
          {[
            { n: '01', h: 'The Archive', d: 'Like the Darwin Gödel Machine, ELYSIQ keeps every pattern it has distilled and explores from all of them — a growing tree of intelligence, not a single climb.' },
            { n: '02', h: 'Empirical, not vibes', d: 'Academic agents improve against static benchmarks. ELYSIQ validates every lesson against whether real money was saved or lost on-chain.' },
            { n: '03', h: 'Adversarial edge', d: 'Scammers actively try to beat it. Every trick that fools ELYSIQ becomes a permanent pattern the next attacker cannot reuse.' },
          ].map((p, i) => (
            <div key={p.n} className="pillar reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="pillar-n">{p.n}</div><div className="pillar-h">{p.h}</div><div className="pillar-d">{p.d}</div>
            </div>
          ))}
        </div>
      </div></section>

      <section id="lineage"><div className="sec">
        <div className="sec-label reveal">The lineage</div>
        <h2 className="sec-title reveal">From theory<br />to <em>the chain.</em></h2>
        <div className="lineage">
          <div className="lin reveal"><div className="lin-y">2003 · THEORY</div><div className="lin-n">Gödel Machine</div><div className="lin-d">Schmidhuber&apos;s dream: an AI that rewrites itself in provably beneficial ways. Impossible to prove in practice.</div></div>
          <div className="lin reveal" style={{ transitionDelay: '.08s' }}><div className="lin-y">2026 · ICLR</div><div className="lin-n">Darwin Gödel Machine</div><div className="lin-d">Sakana AI&apos;s breakthrough: skip the proof, validate empirically. An archive of agents that rewrite their own code.</div></div>
          <div className="lin elysiq reveal" style={{ transitionDelay: '.16s' }}><div className="lin-y">NOW · ON-CHAIN</div><div className="lin-n">ELYSIQ</div><div className="lin-d">Open-ended self-improvement pointed at adversaries. Validated by real outcomes. Auditable via ERC-8004.</div></div>
        </div>
      </div></section>

      <section id="roadmap"><div className="sec">
        <div className="sec-label reveal">The roadmap</div>
        <h2 className="sec-title reveal">How the intelligence<br /><em>compounds.</em></h2>
        <div className="road">
          {[
            { r: 'I', cls: 'done', s: 'Complete ∴', n: 'The Loop', d: 'Fail, investigate, verify, distill, consult on every scan. A separate verifier checks every verdict.' },
            { r: 'II', cls: 'now', s: 'Live · building', n: 'The Archive', d: 'The skill library accumulates distilled patterns with earned accuracy. Outcome tracking closes the loop.' },
            { r: 'III', cls: '', s: 'Approaching', n: 'On-Chain Proof', d: 'Accuracy anchored via ERC-8004. The self-improvement becomes publicly auditable.' },
            { r: 'IV', cls: '', s: 'Approaching', n: 'Shared Evolution', d: 'Patterns learned by one instance propagate to all. The network improves together.' },
            { r: 'V', cls: '', s: 'Inevitable', n: 'The Standard', d: 'The security primitive other agents query before they transact. On every chain.' },
          ].map((st, i) => (
            <div key={st.r} className="road-step reveal" style={{ transitionDelay: `${i * 0.06}s` }}>
              <div className={`road-node ${st.cls}`}>{st.r}</div>
              <div><div className="road-status">{st.s}</div><div className="road-name">{st.n}</div><div className="road-desc">{st.d}</div></div>
            </div>
          ))}
        </div>
      </div></section>

      <footer>
        <div className="foot-mark">∴ ELYSIQ</div>
        <div className="foot-tag">It rewrites itself. So the scammers can&apos;t win twice.</div>
        <div className="foot-meta">OPEN-ENDED SELF-IMPROVEMENT · CLAUDE OPUS 4.8 · ERC-8004 · ELYSIUM<br />elysiq.xyz · $ELYSIQ</div>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        .intel{--bone:#F5F0E8;--bone2:#EDE8DE;--bone3:#E0D9CE;--ink:#1A1814;--ink2:#D4633A;--ink3:#8A8880;--terra:#D4633A;--terra2:#D4633A;--terra3:#F0A882;--green:#4A7C59;--gold:#C9A84C;--serif:'Cormorant Garamond',Georgia,serif;--mono:'DM Mono',monospace;--sans:'DM Sans',sans-serif;background:var(--bone);color:var(--ink);font-family:var(--sans);overflow-x:hidden;cursor:none;line-height:1.5}
        .intel a{color:inherit;text-decoration:none}
        .intel ::selection{background:var(--terra);color:var(--bone)}
        .orb{position:fixed;border-radius:50%;filter:blur(70px);z-index:0;pointer-events:none;opacity:.4}
        .orb1{width:480px;height:480px;background:radial-gradient(circle,rgba(212,99,58,.16),transparent 70%);top:-100px;left:-120px}
        .orb2{width:520px;height:520px;background:radial-gradient(circle,rgba(201,168,76,.14),transparent 70%);bottom:-150px;right:-140px}
        #nav{position:fixed;top:0;left:0;right:0;z-index:1000;display:flex;align-items:center;justify-content:space-between;padding:16px 40px;backdrop-filter:blur(14px);background:rgba(245,240,232,.6);border-bottom:1px solid transparent;transition:.3s}
        #nav.scrolled{border-bottom-color:var(--bone3);background:rgba(245,240,232,.9)}
        .nav-logo{display:flex;align-items:center;gap:10px;font-family:var(--serif);font-size:22px;font-weight:600}
        .nav-logo .mk{width:30px;height:30px;display:grid;place-items:center;background:var(--ink);color:var(--bone);border-radius:6px;font-size:15px}
        .nav-pill{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--terra);border:1px solid var(--terra3);padding:6px 14px;border-radius:20px}
        .hero{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:110px 40px 40px;z-index:2;text-align:center}
        .eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--terra);margin-bottom:24px;display:flex;align-items:center;gap:12px}
        .eyebrow::before,.eyebrow::after{content:"";width:28px;height:1px;background:var(--terra)}
        .hero h1{font-family:var(--serif);font-weight:300;font-size:clamp(44px,7.5vw,108px);line-height:.94;letter-spacing:-.02em;margin-bottom:22px}
        .hero h1 em{font-style:italic;color:var(--terra)}
        .sub{font-family:var(--serif);font-size:clamp(18px,2.6vw,26px);font-weight:300;color:var(--ink2);max-width:680px;line-height:1.45;margin-bottom:14px}
        .sub em{font-style:italic;color:var(--terra)}
        .lineage-line{font-family:var(--mono);font-size:11px;letter-spacing:.1em;color:var(--ink3);margin-bottom:34px}
        .lineage-line b{color:var(--terra2);font-weight:500}.lineage-line .arr{color:var(--terra)}
        .cta{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}
        .btn{font-family:var(--mono);font-size:12px;letter-spacing:.1em;text-transform:uppercase;padding:15px 34px;border-radius:6px;cursor:none;transition:all .2s;border:1px solid transparent;position:relative;overflow:hidden}
        .btn span{position:relative;z-index:2}
        .intel .btn-primary{background:var(--ink);color:var(--bone)}
        .btn-primary::before{content:"";position:absolute;inset:0;background:var(--terra);transform:translateY(101%);transition:transform .3s;z-index:1}
        .btn-primary:hover{transform:translateY(-2px)}
        .btn-primary:hover::before{transform:translateY(0)}
        .intel .btn-ghost{background:transparent;color:var(--ink);border-color:var(--bone3)}
        .intel .btn-ghost:hover{border-color:var(--terra);color:var(--terra)}
        .graph-wrap{position:relative;width:100%;max-width:760px;margin:40px auto 0}
        section{position:relative;z-index:2}
        .sec{max-width:1180px;margin:0 auto;padding:90px 40px}
        .sec-label{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink3);margin-bottom:18px;display:flex;align-items:center;gap:10px}
        .sec-label::before{content:"";width:24px;height:1px;background:var(--terra)}
        .sec-title{font-family:var(--serif);font-size:clamp(32px,4.6vw,54px);font-weight:300;line-height:1.04;margin-bottom:18px}
        .sec-title em{font-style:italic;color:var(--terra)}
        .sec-intro{font-size:15px;color:var(--ink2);max-width:620px;line-height:1.8;margin-bottom:30px}
        .reveal{opacity:0;transform:translateY(30px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
        .reveal.in{opacity:1;transform:translateY(0)}
        .pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
        @media(max-width:880px){.pillars{grid-template-columns:1fr}}
        .pillar{background:var(--bone);border:1px solid var(--bone3);border-radius:14px;padding:32px 28px;transition:.25s}
        .pillar:hover{transform:translateY(-6px);box-shadow:0 18px 44px rgba(26,24,20,.1);border-color:var(--terra3)}
        .pillar-n{font-family:var(--mono);font-size:10px;color:var(--terra);letter-spacing:.14em;margin-bottom:14px}
        .pillar-h{font-family:var(--serif);font-size:24px;margin-bottom:12px}
        .pillar-d{font-size:13px;color:var(--ink3);line-height:1.7}
        .lineage{display:flex;align-items:stretch;flex-wrap:wrap}
        .lin{flex:1;min-width:200px;background:var(--bone);border:1px solid var(--bone3);padding:28px 24px;position:relative}
        .lin:not(:last-child)::after{content:"→";position:absolute;right:-11px;top:50%;transform:translateY(-50%);color:var(--terra);font-size:20px;z-index:2;background:var(--bone);padding:2px}
        .lin.elysiq{background:var(--ink);border-color:var(--ink)}
        .lin-y{font-family:var(--mono);font-size:10px;letter-spacing:.12em;color:var(--ink3);margin-bottom:8px}
        .lin.elysiq .lin-y{color:var(--terra3)}
        .lin-n{font-family:var(--serif);font-size:21px;margin-bottom:8px}.lin.elysiq .lin-n{color:var(--bone)}
        .lin-d{font-size:12px;color:var(--ink3);line-height:1.6}.lin.elysiq .lin-d{color:rgba(245,240,232,.6)}
        .road{display:flex;flex-direction:column;position:relative;max-width:780px}
        .road::before{content:"";position:absolute;left:27px;top:40px;bottom:40px;width:1px;background:linear-gradient(var(--terra3),var(--bone3))}
        .road-step{display:flex;gap:24px;padding:18px 0;align-items:flex-start}
        .road-node{width:56px;height:56px;flex-shrink:0;border-radius:50%;background:var(--bone);border:1px solid var(--bone3);display:grid;place-items:center;font-family:var(--serif);font-style:italic;font-size:20px;color:var(--terra);z-index:2}
        .road-node.done{background:var(--green);color:var(--bone);border-color:var(--green)}
        .road-node.now{background:var(--gold);color:var(--ink);border-color:var(--gold)}
        .road-status{font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);margin-bottom:4px}
        .road-name{font-family:var(--serif);font-size:23px;margin-bottom:6px}
        .road-desc{font-size:13px;color:var(--ink3);line-height:1.65}
        footer{position:relative;z-index:2;background:var(--ink);margin-top:90px;padding:70px 40px 40px;text-align:center}
        .foot-mark{font-family:var(--serif);font-size:40px;font-weight:600;color:var(--bone);margin-bottom:12px}
        .foot-tag{font-family:var(--serif);font-style:italic;font-size:20px;color:var(--terra);margin-bottom:24px}
        .foot-meta{font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:rgba(245,240,232,.35);line-height:2}
        @media(prefers-reduced-motion:reduce){.intel *,.intel *::before,.intel *::after{animation-duration:.01ms!important;transition-duration:.01ms!important}.orb{display:none}}
      `}</style>
    </main>
  );
}
