"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ── Types ────────────────────────────────────────────
interface TimeLeft {
  days: string;
  hours: string;
  mins: string;
  secs: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Target: 3 days from first render — stored in sessionStorage so it persists
// across hot reloads but resets on new sessions (acceptable for coming-soon)
function getTarget(): number {
  if (typeof window === "undefined") return Date.now() + 3 * 24 * 60 * 60 * 1000;
  const stored = sessionStorage.getItem("elysiq_cs_target");
  if (stored) return Number(stored);
  const t = Date.now() + 3 * 24 * 60 * 60 * 1000;
  sessionStorage.setItem("elysiq_cs_target", String(t));
  return t;
}

export default function ComingSoon() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: "03",
    hours: "00",
    mins: "00",
    secs: "00",
  });
  const [progress, setProgress] = useState(68);
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const emailRef = useRef<HTMLInputElement>(null);
  const prevRef = useRef<TimeLeft | null>(null);
  const targetRef = useRef<number>(0);

  // ── Custom cursor ──────────────────────────────────
  useEffect(() => {
    const cur = document.getElementById("cur");
    const cur2 = document.getElementById("cur2");
    if (!cur || !cur2) return;
    let mx = 0, my = 0, rx = 0, ry = 0;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      cur.style.left = mx + "px"; cur.style.top = my + "px";
    };
    document.addEventListener("mousemove", onMove);
    let raf: number;
    const loop = () => {
      rx += (mx - rx) * 0.1; ry += (my - ry) * 0.1;
      cur2.style.left = rx + "px"; cur2.style.top = ry + "px";
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { document.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  // ── Countdown ─────────────────────────────────────
  useEffect(() => {
    targetRef.current = getTarget();
    const tick = () => {
      const diff = Math.max(0, targetRef.current - Date.now());
      const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs  = Math.floor((diff % (1000 * 60)) / 1000);
      const next: TimeLeft = { days: pad(days), hours: pad(hours), mins: pad(mins), secs: pad(secs) };

      if (prevRef.current) {
        const changed = new Set<string>();
        (Object.keys(next) as (keyof TimeLeft)[]).forEach((k) => {
          if (next[k] !== prevRef.current![k]) changed.add(k);
        });
        if (changed.size > 0) {
          setChangedKeys(changed);
          setTimeout(() => setChangedKeys(new Set()), 600);
        }
      }
      prevRef.current = next;
      setTimeLeft(next);

      // progress: 68% at start → 100% at launch
      const totalMs = 7 * 24 * 60 * 60 * 1000;
      const elapsed = totalMs - diff;
      setProgress(Math.min(100, Math.round(68 + (elapsed / totalMs) * 32)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch waitlist count ──────────────────────────
  useEffect(() => {
    fetch("/api/notify")
      .then((r) => r.json())
      .then((d) => setWaitlistCount(d.count || 0))
      .catch(() => {});
  }, []);

  // ── Notify submit ─────────────────────────────────
  const submitNotify = async () => {
    const val = emailRef.current?.value.trim();
    if (!val || notifyLoading) return;
    setNotifyLoading(true);
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val }),
      });
      if (res.ok) {
        setNotifySubmitted(true);
        setWaitlistCount((n) => n + 1);
      }
    } catch {
      // silently fail — form stays open
    }
    setNotifyLoading(false);
  };

  return (
    <>
      {/* Cursor */}
      <div id="cur" />
      <div id="cur2" />

      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(26,24,20,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(26,24,20,.07) 1px,transparent 1px)",
        backgroundSize: "72px 72px",
      }} />

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "18px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(245,240,232,.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--bone3)",
      }}>
        <Link href="/" style={{
          display: "flex", alignItems: "center", gap: "8px",
          fontFamily: "'DM Mono',monospace", fontSize: "10px",
          letterSpacing: ".12em", textTransform: "uppercase",
          color: "var(--ash2)", textDecoration: "none",
          transition: "color .2s",
        }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--terra)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--ash2)")}
        >
          ← elysiq.xyz
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: "18px", fontWeight: 600,
            color: "var(--nearblk)", letterSpacing: ".04em",
          }}>ELYSIQ</span>
          <span style={{
            fontFamily: "'DM Mono',monospace", fontSize: "9px",
            letterSpacing: ".14em", textTransform: "uppercase",
            color: "var(--terra)", padding: "3px 10px",
            border: "1px solid var(--terra3)", borderRadius: "20px",
            background: "var(--terra4)",
          }}>Coming Soon</span>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "100px 40px 60px",
        position: "relative", zIndex: 10,
        textAlign: "center",
      }}>
        {/* Radial glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 60% at 50% 50%,rgba(212,99,58,.07) 0%,transparent 70%)",
        }} />

        {/* Scan line */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
          opacity: .06,
        }}>
          <div style={{
            position: "absolute", left: 0, right: 0, height: "3px",
            background: "linear-gradient(transparent,var(--terra),transparent)",
            animation: "cs-scan 6s linear infinite",
          }} />
        </div>

        {/* Eyebrow */}
        <div style={{
          fontFamily: "'DM Mono',monospace", fontSize: "10px",
          letterSpacing: ".22em", textTransform: "uppercase",
          color: "var(--terra)", marginBottom: "28px",
          display: "flex", alignItems: "center", gap: "14px",
          justifyContent: "center",
          animation: "cs-up .8s .05s both",
        }}>
          <span style={{ width: "32px", height: "1px", background: "var(--terra3)", display: "block" }} />
          New Feature · Powered by Claude Fable 5
          <span style={{ width: "32px", height: "1px", background: "var(--terra3)", display: "block" }} />
        </div>

        {/* CA Bar */}
        <div style={{ animation: "cs-up .8s .07s both", marginBottom: "20px" }}>
          <CABar ca={process.env.NEXT_PUBLIC_ELYSIQ_TOKEN_ADDRESS || "TBA · Elysium mainnet"} />
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "'Cormorant Garamond',serif",
          fontSize: "clamp(48px,8vw,96px)",
          fontWeight: 300, lineHeight: 1.0,
          letterSpacing: "-.02em", color: "var(--nearblk)",
          marginBottom: "6px",
          animation: "cs-up .8s .1s both",
        }}>
          Wallet<br />
          <span style={{ fontStyle: "italic", color: "var(--terra)" }}>Analyzer</span>
        </h1>

        {/* Subhead */}
        <p style={{
          fontFamily: "'Cormorant Garamond',serif",
          fontSize: "clamp(18px,2.5vw,26px)",
          fontWeight: 300, fontStyle: "italic",
          color: "var(--ash2)", marginBottom: "48px",
          animation: "cs-up .8s .2s both",
        }}>
          Paste a wallet address.<br />
          The intelligence reads everything.
        </p>

        {/* Feature pills */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "10px",
          justifyContent: "center", marginBottom: "52px",
          animation: "cs-up .8s .28s both",
          maxWidth: "620px",
        }}>
          {[
            { label: "Bot or human detection", hot: true },
            { label: "Win rate & PnL analysis", hot: true },
            { label: "Rug exposure history", hot: true },
            { label: "Smart money scoring", hot: false },
            { label: "Scam probability", hot: false },
            { label: "ELYSIQ Trust Score", hot: false },
            { label: "Contract audit", hot: false },
            { label: "Elysium Explorer data", hot: false },
          ].map(({ label, hot }) => (
            <div key={label} style={{
              fontFamily: "'DM Mono',monospace", fontSize: "10px",
              letterSpacing: ".1em", textTransform: "uppercase",
              padding: "7px 16px", borderRadius: "24px",
              border: `1px solid ${hot ? "var(--terra3)" : "var(--bone3)"}`,
              background: hot ? "var(--terra4)" : "rgba(255,255,255,.7)",
              color: hot ? "var(--terra2)" : "var(--ash)",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <span style={{
                width: "5px", height: "5px", borderRadius: "50%",
                background: hot ? "var(--terra)" : "var(--terra3)",
                flexShrink: 0, display: "block",
              }} />
              {label}
            </div>
          ))}
        </div>

        {/* Countdown */}
        <div style={{ animation: "cs-up .8s .36s both", marginBottom: "52px" }}>
          <div style={{
            fontFamily: "'DM Mono',monospace", fontSize: "9px",
            letterSpacing: ".2em", textTransform: "uppercase",
            color: "var(--ash2)", marginBottom: "20px",
          }}>Launching in</div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
            {([
              { id: "days",  label: "Days" },
              { id: "hours", label: "Hours" },
              { id: "mins",  label: "Min" },
              { id: "secs",  label: "Sec" },
            ] as const).map(({ id, label }, i) => (
              <div key={id} style={{ textAlign: "center", padding: "0 20px", position: "relative" }}>
                {i < 3 && (
                  <span style={{
                    position: "absolute", right: "-4px", top: "8px",
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: "clamp(36px,5vw,56px)",
                    color: "var(--bone3)", lineHeight: 1,
                  }}>:</span>
                )}
                <span style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: "clamp(52px,8vw,84px)",
                  fontWeight: 300, lineHeight: 1,
                  letterSpacing: "-.03em", display: "block",
                  color: changedKeys.has(id) ? "var(--terra)" : "var(--nearblk)",
                  transition: "color .3s",
                }}>
                  {timeLeft[id]}
                </span>
                <span style={{
                  fontFamily: "'DM Mono',monospace", fontSize: "9px",
                  letterSpacing: ".18em", textTransform: "uppercase",
                  color: "var(--ash2)", marginTop: "6px", display: "block",
                }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          width: "100%", maxWidth: "480px", margin: "0 auto 52px",
          animation: "cs-up .8s .44s both",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
            <span style={{
              fontFamily: "'DM Mono',monospace", fontSize: "9px",
              letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ash2)",
            }}>Development progress</span>
            <span style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: "20px", fontStyle: "italic", color: "var(--terra)",
            }}>{progress}%</span>
          </div>
          <div style={{ width: "100%", height: "2px", background: "var(--bone3)", borderRadius: "1px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progress}%`,
              background: "linear-gradient(90deg,var(--terra3),var(--terra))",
              borderRadius: "1px", transition: "width 1s ease",
            }} />
          </div>
        </div>

        {/* Notify form */}
        <div style={{ animation: "cs-up .8s .52s both", maxWidth: "420px", width: "100%", margin: "0 auto 40px" }}>
          <div style={{
            fontFamily: "'DM Mono',monospace", fontSize: "9px",
            letterSpacing: ".16em", textTransform: "uppercase",
            color: "var(--ash2)", marginBottom: "6px", textAlign: "center",
          }}>Get notified at launch</div>
          {waitlistCount > 0 && (
            <div style={{
              fontFamily: "'DM Mono',monospace", fontSize: "10px",
              letterSpacing: ".1em", color: "var(--terra)",
              textAlign: "center", marginBottom: "10px",
            }}>
              {waitlistCount.toLocaleString()} Archivists registered
            </div>
          )}
          {!notifySubmitted ? (
            <div style={{
              display: "flex",
              border: "1px solid var(--bone3)", borderRadius: "4px",
              overflow: "hidden", background: "#fff",
            }}>
              <input
                ref={emailRef}
                type="email"
                placeholder="your@email.com"
                onKeyDown={e => e.key === "Enter" && submitNotify()}
                style={{
                  flex: 1, background: "transparent", border: "none",
                  padding: "12px 16px", color: "var(--nearblk)",
                  fontFamily: "'DM Mono',monospace", fontSize: "11px",
                  outline: "none", letterSpacing: ".04em",
                }}
              />
              <button
                onClick={submitNotify}
                disabled={notifyLoading}
                style={{
                  fontFamily: "'DM Mono',monospace", fontSize: "10px",
                  letterSpacing: ".12em", textTransform: "uppercase",
                  padding: "12px 20px", border: "none",
                  borderLeft: "1px solid var(--bone3)",
                  background: notifyLoading ? "var(--ash2)" : "var(--nearblk)",
                  color: "var(--bone)",
                  cursor: notifyLoading ? "default" : "none",
                  transition: "background .15s", whiteSpace: "nowrap",
                  opacity: notifyLoading ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!notifyLoading) e.currentTarget.style.background = "var(--terra)"; }}
                onMouseLeave={e => { if (!notifyLoading) e.currentTarget.style.background = "var(--nearblk)"; }}
              >
                {notifyLoading ? "..." : "Notify me"}
              </button>
            </div>
          ) : (
            <div style={{
              fontFamily: "'DM Mono',monospace", fontSize: "10px",
              letterSpacing: ".1em", color: "var(--terra)",
              textAlign: "center", padding: "12px",
            }}>
              ∴ Registered. The chain will remember.
            </div>
          )}
        </div>

        {/* Preview cards */}
        <div style={{ width: "100%", maxWidth: "860px", margin: "0 auto", animation: "cs-up .8s .6s both" }}>
          <div style={{
            fontFamily: "'DM Mono',monospace", fontSize: "9px",
            letterSpacing: ".2em", textTransform: "uppercase",
            color: "var(--ash2)", marginBottom: "20px",
            display: "flex", alignItems: "center", gap: "12px", justifyContent: "center",
          }}>
            <span style={{ flex: 1, maxWidth: "60px", height: "1px", background: "var(--bone3)", display: "block" }} />
            Preview — obscured until launch
            <span style={{ flex: 1, maxWidth: "60px", height: "1px", background: "var(--bone3)", display: "block" }} />
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3,1fr)",
            gap: "1px", background: "var(--bone3)",
            border: "1px solid var(--bone3)", borderRadius: "6px",
            overflow: "hidden",
          }}>
            {/* Card 1 – Identity */}
            <PreviewCard blurPx={3} lockDays="3 days">
              <div style={pcTag}>Identity Analysis</div>
              <div style={pcAddr}>7xKp...3mNq</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
                <span style={pcNum}>91</span>
                <span style={pcNumLabel}>/ 100 Trust Score</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
                <BarRow label="Human" pct={91} color="#4A7C59" />
                <BarRow label="Bot prob." pct={9} color="var(--terra)" />
              </div>
              <div style={pcVerdict}>&ldquo;Consistent human behavior. Early adopter pattern. High conviction holder.&rdquo;</div>
            </PreviewCard>

            {/* Card 2 – PnL */}
            <PreviewCard blurPx={5} lockDays="3 days">
              <div style={pcTag}>Performance</div>
              <div style={pcAddr}>9aRt...7vBw</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
                <span style={{ ...pcNum, color: "var(--terra)" }}>+340%</span>
                <span style={pcNumLabel}>30d PnL</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
                <BarRow label="Win rate" pct={74} color="var(--terra)" />
                <BarRow label="Rug exp." pct={12} color="#8B3A2A" />
              </div>
              <div style={pcVerdict}>&ldquo;Smart money signals. Entered 3 tokens pre-pump. Likely insider or early analyst.&rdquo;</div>
            </PreviewCard>

            {/* Card 3 – Risk */}
            <PreviewCard blurPx={7} lockDays="3 days">
              <div style={pcTag}>Risk Assessment</div>
              <div style={pcAddr}>3mKj...9xPz</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
                <span style={{ ...pcNum, color: "#8B3A2A" }}>23</span>
                <span style={pcNumLabel}>/ 100 Trust Score</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
                <BarRow label="Scam risk" pct={77} color="#8B3A2A" />
                <BarRow label="Rug count" pct={60} color="var(--terra)" />
              </div>
              <div style={pcVerdict}>&ldquo;Pattern matches known deployer cluster. 4 rugged projects. Avoid.&rdquo;</div>
            </PreviewCard>
          </div>
        </div>

        {/* Meta */}
        <div style={{
          marginTop: "48px", paddingTop: "32px",
          borderTop: "1px solid var(--bone3)",
          fontFamily: "'DM Mono',monospace", fontSize: "10px",
          letterSpacing: ".1em", color: "var(--ash2)",
          textAlign: "center", lineHeight: 2,
          animation: "cs-up .8s .68s both",
          width: "100%",
        }}>
          ELYSIQ · WALLET ANALYZER · POWERED BY CLAUDE FABLE 5<br />
          DATA FROM ELYSIUM EXPLORER · DEXSCREENER<br />
          <Link href="/" style={{ color: "var(--terra)", textDecoration: "none" }}>← Back to ELYSIQ</Link>
          &nbsp;·&nbsp; $ELYSIQ &nbsp;·&nbsp;
          <a href="https://www.elysiq.xyz" style={{ color: "var(--terra)", textDecoration: "none" }}>elysiq.xyz</a><br />
          <span style={{ opacity: .5 }}>&ldquo;The chain never forgets. Neither does Fable 5.&rdquo;</span>
        </div>
      </section>

      {/* Mascot watermark */}
      <div style={{
        position: "fixed", bottom: "32px", right: "40px", zIndex: 50,
        opacity: .12, transition: "opacity .3s",
      }}
        onMouseEnter={e => (e.currentTarget.style.opacity = ".6")}
        onMouseLeave={e => (e.currentTarget.style.opacity = ".12")}
      >
        <Image
          src="/mascot.png"
          width={56}
          height={56}
          alt="ELYSIQ mascot"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes cs-scan {
          0%  { top: -5% }
          100%{ top: 105% }
        }
        @keyframes cs-up {
          from { opacity: 0; transform: translateY(18px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @media (max-width: 768px) {
          .cs-preview-grid { grid-template-columns: 1fr !important }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: .01ms !important }
        }
      `}</style>
    </>
  );
}

// ── CA Bar ───────────────────────────────────────────
function CABar({ ca }: { ca: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(ca).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      onClick={copy}
      style={{
        display: "inline-flex", alignItems: "center", gap: "10px",
        background: "var(--charcoal)", borderRadius: "8px",
        padding: "8px 14px 8px 10px",
        cursor: "none",
        border: "1px solid rgba(255,255,255,.08)",
        transition: "background .15s",
        userSelect: "none",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "#3D3830")}
      onMouseLeave={e => (e.currentTarget.style.background = "var(--charcoal)")}
    >
      <span style={{
        fontFamily: "'DM Mono',monospace", fontSize: "9px",
        letterSpacing: ".1em", fontWeight: 500,
        background: "var(--terra)", color: "#fff",
        padding: "2px 7px", borderRadius: "4px",
        flexShrink: 0,
      }}>CA</span>
      <span style={{
        fontFamily: "'DM Mono',monospace", fontSize: "10px",
        color: "rgba(245,240,232,.7)", letterSpacing: ".04em",
      }}>{ca}</span>
      <span style={{
        fontFamily: "'DM Mono',monospace", fontSize: "9px",
        letterSpacing: ".1em", textTransform: "uppercase",
        color: copied ? "var(--terra3)" : "rgba(245,240,232,.4)",
        transition: "color .2s", flexShrink: 0, marginLeft: "6px",
      }}>{copied ? "Copied ✓" : "Copy"}</span>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────

function PreviewCard({
  children,
  blurPx,
  lockDays,
}: {
  children: React.ReactNode;
  blurPx: number;
  lockDays: string;
}) {
  return (
    <div style={{ background: "var(--bone)", padding: "24px", position: "relative", overflow: "hidden" }}>
      {children}
      {/* Blur overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backdropFilter: `blur(${blurPx}px)`,
        background: "rgba(245,240,232,.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: "18px", display: "block", marginBottom: "6px" }}>⌗</span>
          <span style={{
            fontFamily: "'DM Mono',monospace", fontSize: "9px",
            letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ash)",
          }}>{lockDays}</span>
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{
        fontFamily: "'DM Mono',monospace", fontSize: "9px",
        color: "var(--ash2)", width: "80px", textAlign: "right", letterSpacing: ".06em",
      }}>{label}</span>
      <div style={{ flex: 1, height: "3px", background: "var(--bone3)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "2px" }} />
      </div>
    </div>
  );
}

// ── Shared card micro-styles ──────────────────────────
const pcTag: React.CSSProperties = {
  fontFamily: "'DM Mono',monospace", fontSize: "9px",
  letterSpacing: ".12em", textTransform: "uppercase",
  color: "var(--terra)", marginBottom: "12px",
};
const pcAddr: React.CSSProperties = {
  fontFamily: "'DM Mono',monospace", fontSize: "10px",
  color: "var(--ash)", marginBottom: "16px", wordBreak: "break-all", lineHeight: 1.5,
};
const pcNum: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond',serif",
  fontSize: "36px", fontWeight: 300, color: "var(--nearblk)",
};
const pcNumLabel: React.CSSProperties = {
  fontSize: "11px", color: "var(--ash2)",
};
const pcVerdict: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond',serif",
  fontStyle: "italic", fontSize: "14px",
  color: "var(--ash)", marginTop: "12px", lineHeight: 1.5,
  paddingTop: "12px", borderTop: "1px solid var(--bone3)",
};
