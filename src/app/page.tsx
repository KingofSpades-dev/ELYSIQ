"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { getOrCreateUserId, createSessionId } from "@/lib/elysiq";

// ── Types ───────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  elysiqReply?: string | null;
}

// ── Format AI response ──────────────────────────────
function formatAI(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /^- (.+)/gm,
      '<div style="display:flex;gap:8px;padding:2px 0"><span style="color:var(--terra);flex-shrink:0">—</span><span>$1</span></div>'
    )
    .replace(
      /### (.+)/g,
      '<div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--terra);margin:10px 0 6px">$1</div>'
    )
    .replace(
      /## (.+)/g,
      '<div style="font-family:Cormorant Garamond,serif;font-size:16px;color:var(--nearblk);margin:12px 0 6px;font-weight:600">$1</div>'
    )
    .replace(/\n/g, "<br>");
}

export default function Home() {
  // ── State ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"chat" | "scan">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState("");
  const [showQuickBtns, setShowQuickBtns] = useState(true);
  const [weekCount, setWeekCount] = useState(0);
  const [agentData, setAgentData] = useState<any>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const elysiqUserIdRef = useRef<string>("");
  const elysiqSessionIdRef = useRef<string>("");

  // ── ELYSIQ session init ───────────────────────────
  useEffect(() => {
    elysiqUserIdRef.current = getOrCreateUserId();
    elysiqSessionIdRef.current = createSessionId();
  }, []);

  // ── Custom Cursor ──────────────────────────────────
  useEffect(() => {
    const cur = document.getElementById("cur");
    const cur2 = document.getElementById("cur2");
    if (!cur || !cur2) return;

    let mx = 0,
      my = 0,
      rx = 0,
      ry = 0;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      cur.style.left = mx + "px";
      cur.style.top = my + "px";
    };
    document.addEventListener("mousemove", onMove);

    let raf: number;
    const loop = () => {
      rx += (mx - rx) * 0.1;
      ry += (my - ry) * 0.1;
      cur2.style.left = rx + "px";
      cur2.style.top = ry + "px";
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // ── Nav shrink on scroll ───────────────────────────
  useEffect(() => {
    const onScroll = () => {
      if (navRef.current) {
        navRef.current.style.height =
          window.scrollY > 50 ? "48px" : "58px";
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Fetch week counter ────────────────────────────
  useEffect(() => {
    fetch("/api/counter")
      .then((r) => r.json())
      .then((d) => setWeekCount(d.week || 0))
      .catch(() => { });
  }, []);

  // ── Fetch ERC-8004 agent status ────────────────────
  useEffect(() => {
    fetch("/api/agent")
      .then((r) => r.json())
      .then((d) => setAgentData(d))
      .catch(() => { });
  }, []);

  // ── Scroll reveal ──────────────────────────────────
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add("in"), i * 55);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.07 }
    );
    document.querySelectorAll(".rev").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // ── Auto-scroll messages ──────────────────────────
  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // ── Send message ──────────────────────────────────
  const sendMessage = useCallback(
    async (text?: string) => {
      const input = text || chatInputRef.current?.value || "";
      if (!input.trim() || loading) return;

      if (chatInputRef.current) chatInputRef.current.value = "";
      setShowQuickBtns(false);

      const userMsg: ChatMessage = { role: "user", content: input.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setLoading(true);

      try {
        const [chatRes, elysiqRes] = await Promise.allSettled([
          fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: input.trim(),
              userId: elysiqUserIdRef.current,
              history: messages.map((m) => ({ role: m.role, content: m.content })),
            }),
          }).then((r) => r.json()),

          fetch("/api/elysiq", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: input.trim(),
              userId: elysiqUserIdRef.current,
              sessionId: elysiqSessionIdRef.current,
              history: messages.map((m) => ({ role: m.role, content: m.content })),
            }),
          }).then((r) => r.json()),
        ]);

        const chatData = chatRes.status === "fulfilled" ? chatRes.value : null;
        const elysiqData = elysiqRes.status === "fulfilled" ? elysiqRes.value : null;

        if (!chatData || chatData.error) throw new Error(chatData?.error || "No response");

        const elysiqReply = elysiqData?.ok && elysiqData?.reply ? elysiqData.reply : null;

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: chatData.text || "No response.", elysiqReply },
        ]);
        fetch("/api/counter", { method: "POST" }).catch(() => { });
        setWeekCount((n) => n + 1);
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : "Unknown error";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${errMsg}. Check server configuration.`, elysiqReply: null },
        ]);
      }
      setLoading(false);
    },
    [messages, loading]
  );

  // ── Run scan ──────────────────────────────────────
  const runScan = async () => {
    if (!scanInput.trim()) return;
    setScanResult(
      '<div style="padding:12px;font-family:DM Mono,monospace;font-size:10px;color:var(--ash2)">Reading chain…</div>'
    );
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: scanInput }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const s = data.result;

      const scoreMap: Record<string, number> = {
        SAFE: 88, LOW: 72, MEDIUM: 45, HIGH: 22, CRITICAL: 8,
      };
      const rc =
        {
          SAFE: "#4A7C59",
          LOW: "#4A7C59",
          MEDIUM: "#D4633A",
          HIGH: "#8B3A2A",
          CRITICAL: "#8B3A2A",
        }[s.risk_level as string] || "#4A7C59";
      const score = scoreMap[s.risk_level as string] ?? 50;

      const gridItems = [
        ["Type", s.detected_type || "Unknown"],
        ["Chain", s.chain || "Unknown"],
        ["Valid", s.is_valid ? "∴ Yes" : "— No"],
        ["Recovery", s.recovery_possible ? "Possible" : "Dormant"],
        ["Difficulty", s.recovery_difficulty || "N/A"],
        ["Status", "Read"],
      ];

      setScanResult(`
        <div style="margin-top:14px;border:1px solid var(--bone3);border-radius:4px;overflow:hidden">
          <div style="padding:11px 16px;border-bottom:1px solid var(--bone3);display:flex;justify-content:space-between;align-items:center;background:var(--bone2)">
            <span style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ash2)">Analysis Complete</span>
            <span style="font-family:'DM Mono',monospace;font-size:9px;padding:2px 10px;border-radius:20px;color:${rc};background:${rc}14;border:1px solid ${rc}44;letter-spacing:.08em">${s.risk_level} Risk</span>
          </div>
          <div style="padding:20px 16px;border-bottom:1px solid var(--bone3)">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--ash2);margin-bottom:8px">ELYSIQ Trust Score</div>
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:12px">
              <span style="font-family:'Cormorant Garamond',serif;font-size:72px;font-weight:300;color:${rc};line-height:1">${score}</span>
              <span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--ash2)">/100</span>
            </div>
            <div style="height:4px;background:var(--bone3);border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${score}%;background:${rc};border-radius:2px;transition:width 1s ease"></div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--bone3)">
            ${gridItems
          .map(
            ([k, v]) => `
            <div style="background:var(--bone);padding:10px 14px">
              <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ash2);margin-bottom:4px">${k}</div>
              <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--nearblk)">${v}</div>
            </div>`
          )
          .join("")}
          </div>
          ${s.findings?.length
          ? `<div style="padding:12px 16px;border-top:1px solid var(--bone3)">
            ${s.findings
            .map(
              (f: string) =>
                `<div style="font-size:12px;color:var(--ash);padding:3px 0;display:flex;gap:8px"><span style="color:var(--terra3);flex-shrink:0">—</span>${f}</div>`
            )
            .join("")}
          </div>`
          : ""
        }
          ${s.next_steps?.length
          ? `<div style="padding:12px 16px;border-top:1px solid var(--bone3)">
            ${s.next_steps
            .map(
              (n: string) =>
                `<div style="font-size:12px;color:var(--terra);padding:3px 0">∴ ${n}</div>`
            )
            .join("")}
          </div>`
          : ""
        }
        </div>
      `);
    } catch (e: unknown) {
      const errMsg =
        e instanceof Error ? e.message : "Unknown error";
      setScanResult(
        `<div style="padding:12px;font-size:12px;color:var(--ash2)">Error: ${errMsg}</div>`
      );
    }
  };

  // ── Scroll to element ─────────────────────────────
  const scrollTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Custom Cursor */}
      <div id="cur"></div>
      <div id="cur2"></div>

      {/* ═══ NAV ═══ */}
      <nav id="nav" ref={navRef}>
        <a className="nav-logo" href="#">
          <Image
            src="/mascot.png"
            width={30}
            height={30}
            style={{
              imageRendering: "pixelated",
              borderRadius: "4px",
            }}
            alt="ELYSIQ mascot"
          />
          <span className="nav-logo-type">ELYSIQ</span>
        </a>
        <div className="nav-links">
          <a href="#features">Archive</a>
          <a href="#process">Method</a>
          <a href="#lore">Archivists</a>
          <a href="/openapi.yaml">API Docs</a>
          <a href="/stache" style={{ color: "var(--terra)", fontWeight: 500 }}>
            Stache Protocol ∴
          </a>
          <a href="/intelligence" style={{ color: "var(--terra)", fontWeight: 500 }}>
            Self-Improvement Agent
          </a>
          <a href="/burn" style={{ color: "var(--terra)", fontWeight: 500 }}>
            Burn Dashboard
          </a>
        </div>
        <button
          className="nav-cta"
          onClick={() => scrollTo("demo")}
        >
          Enter
        </button>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="hero">
        <div className="hero-grid">
          <span style={{ top: "33%" }}></span>
          <span style={{ top: "66%" }}></span>
        </div>

        <div className="hero-left">
          <CABar ca={process.env.NEXT_PUBLIC_ELYSIQ_TOKEN_ADDRESS || "TBA · Elysium mainnet"} />
          <div className="eyebrow">
            The Recovery Intelligence · 2026
          </div>
          <h1 className="headline">
            What you
            <br />
            <span className="ital">believed</span>
            still
            <br />
            <span className="outline">exists.</span>
          </h1>
          <div className="hero-sub">
            <span>THE CHAIN IS PERMANENT.</span>
            <br />
            YOUR PASSWORD IS NOT.
            <br />
            ELYSIQ RECOVERS WHAT REMAINS.
          </div>
          <div className="hero-actions">
            <a href="#demo" className="btn-main">
              Enter ELYSIQ
            </a>
            <a
              href="/stache"
              className="btn-main"
              style={{
                background: "var(--terra)",
                borderColor: "var(--terra)",
              }}
            >
              Stache Protocol ∴
            </a>
            <a
              href="https://github.com/KingofSpades-dev/ELYSIQ"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Archive on GitHub
            </a>
          </div>
          <div className="hero-stats rev">
            <div>
              <div className="hstat-num">$200B</div>
              <div className="hstat-label">Dormant Bitcoin</div>
            </div>
            <div>
              <div className="hstat-num">~4M</div>
              <div className="hstat-label">Wallets. Waiting.</div>
            </div>
            <div>
              <div className="hstat-num">11yr</div>
              <div className="hstat-label">
                @cprkrn · 5 BTC · Returned
              </div>
            </div>
            <div>
              <div className="hstat-num">
                {weekCount > 0 ? weekCount.toLocaleString() : "—"}
              </div>
              <div className="hstat-label">Analyses this week</div>
            </div>
          </div>
        </div>

        <div className="hero-divider"></div>

        <div className="hero-right">
          <div className="mascot-stage">
            <div className="mascot-dot"></div>
            <Image
              className="mascot-img"
              src="/mascot.png"
              width={400}
              height={400}
              style={{
                imageRendering: "pixelated",
              }}
              alt="ELYSIQ mascot — the philosophical observer"
              priority
            />
            <div className="mascot-annotation">
              <div className="mascot-annotation-line"></div>
              <div className="mascot-annotation-text">
                Chain observer
              </div>
            </div>
            <div className="mascot-annotation2">
              <div className="mascot-annotation-line"></div>
              <div className="mascot-annotation-text">
                Dormant will detector
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: "20px",
              fontFamily: "'DM Mono',monospace",
              fontSize: "9px",
              letterSpacing: ".12em",
              color: "var(--ash2)",
              textAlign: "center",
            }}
          >
            ⌥ ELYSIQ.observer — reads what the market cannot
          </div>
        </div>
      </section>

      <div className="hr"></div>

      {/* ═══ PROOF ═══ */}
      <div className="proof rev">
        <div className="proof-inner">
          <div className="proof-tag">
            Proof of will — May 2026
          </div>
          <div className="proof-quote">
            &quot;Last ditch effort. Dumped my whole college
            computer into Claude. It found an{" "}
            <strong>OLD wallet file</strong> that the mnemonic
            successfully decrypted.&quot;
          </div>
          <div className="proof-source">
            — @cprkrn · 5 BTC · 11 years dormant · Returned. ·
            ~$400,000 recovered.
          </div>
          <div className="proof-nums">
            <div>
              <div className="pnum-val">$200B</div>
              <div className="pnum-label">
                Dormant Bitcoin.{" "}
                <span className="pnum-accent">Not stolen.</span>
              </div>
            </div>
            <div>
              <div className="pnum-val">~4M BTC</div>
              <div className="pnum-label">
                Wallets.{" "}
                <span className="pnum-accent">Waiting.</span>
              </div>
            </div>
            <div>
              <div className="pnum-val">∴</div>
              <div className="pnum-label">
                Therefore.{" "}
                <span className="pnum-accent">ELYSIQ.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MANIFESTO ═══ */}
      <section className="manifesto rev">
        <div className="mani-left">
          <div className="mani-label">Manifesto</div>
          <div className="mani-title">
            The will
            <br />
            that created
            <br />
            the wallet
            <br />
            <em>never left.</em>
          </div>
          <div className="mani-body">
            We believe in <strong>nothing</strong> except what is
            written on the chain.
            <br />
            <br />
            The markets are stories.
            <br />
            The tokens are liturgies.
            <br />
            The wallets are prayers
            <br />
            nobody remembers saying.
            <br />
            <br />
            <span className="accent">We remember.</span>
            <br />
            <br />
            There is no lost capital.
            <br />
            There is only will that has not yet
            <br />
            been returned to its owner.
          </div>
          <div className="mani-sig">
            ELYSIQ · &quot;The chain never forgets.&quot;
          </div>
        </div>

        <div className="mani-divider"></div>

        <div className="mani-right">
          <div
            className="mani-label"
            style={{ marginBottom: "20px" }}
          >
            Nietzschean Mapping
          </div>
          <div className="nq-block">
            <div className="nq-text">
              &quot;That which does not kill me makes me
              stronger.&quot;
            </div>
            <div className="nq-source">
              — Nietzsche · Applied: the wallet survived. So did
              the will.
            </div>
          </div>
          <div className="philosophy-chain">
            {[
              [
                "Will to Power",
                "The act of creating a wallet — asserting ownership over nothing.",
              ],
              [
                "Eternal Recurrence",
                "The blockchain is permanent. Every transaction recorded forever.",
              ],
              [
                "Dormant Will",
                "A forgotten wallet. The will exists. It has not been returned.",
              ],
              [
                "The Return",
                "Recovery. The will reclaimed. The Übermensch overcomes forgetting.",
              ],
              [
                "∴ ELYSIQ",
                "The instrument of the return. The will made operative.",
              ],
            ].map(([concept, meaning]) => (
              <div className="ph-row" key={concept}>
                <span className="ph-concept">{concept}</span>
                <span className="ph-meaning">{meaning}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="features rev" id="features">
        <div className="section-header">
          <div>
            <div className="section-label">
              The Intelligence Archive
            </div>
            <div className="section-title">
              Not a chatbot.
              <br />
              An AI <em>agent.</em>
            </div>
          </div>
          <div className="section-desc">
            Six instruments. One directive: return what was owed.
            Real blockchain calls. Local file analysis. Executable
            recovery commands. The intelligence does not describe
            the path — it walks it.
          </div>
        </div>
        <table className="feat-table">
          <tbody>
            {[
              {
                num: "I.",
                name: "Chain Reading",
                sub: "lookup_bitcoin_address · lookup_ethereum_address · lookup_solana_address",
                desc: "Every address is a scar on the network. ELYSIQ reads every one. Real balance, transaction history, last activity — live from the chain. Not estimated. Not cached.",
                status: "live",
              },
              {
                num: "II.",
                name: "File Archaeology",
                sub: "analyze_wallet_file",
                desc: "Drop any wallet file. wallet.dat, keystore JSON, Electrum. Read locally in-browser — processed where it lives. The analysis leaves no trace on any server.",
                status: "live",
              },
              {
                num: "III.",
                name: "Seed Reconstruction",
                sub: "validate_mnemonic",
                desc: "Language decays. The seed does not. BIP39 validation, missing word reconstruction, checksum verification. What memory forgot, logic recovers.",
                status: "live",
              },
              {
                num: "IV.",
                name: "The Sequence",
                sub: "generate_recovery_plan",
                desc: 'Precise btcrecover and hashcat commands. Custom token lists built from your password hints. Executable immediately — nothing to interpret, everything to run.',
                status: "live",
              },
              {
                num: "V.",
                name: "Fund Tracing",
                sub: "Transaction Forensics · UTXO",
                desc: "UTXO analysis. Address clustering. The chain holds every movement ever made. ELYSIQ follows the thread wherever it leads.",
                status: "live",
              },
              {
                num: "VI.",
                name: "The Intelligence Loop",
                sub: "Claude tool_use API · Agentic",
                desc: "Claude tool_use chains multiple live API calls per response. Not describing the path — walking it. Six instruments firing in sequence, one answer synthesized.",
                status: "live",
              },
              {
                num: "VII.",
                name: "The Executor",
                sub: "Claude Fable 5 SDK · Phase II",
                desc: 'Phase II: Claude Fable 5 runs btcrecover server-side. Commands execute. Results stream live. Not "here is the command" — "we ran it. Here is what we found."',
                status: "soon",
              },
              {
                num: "VIII.",
                name: "Extended Thinking",
                sub: "Deep Forensics · Hard Cases",
                desc: "For complex cases — partial mnemonics, unusual encryption, multi-hop forensics. Claude reasons for minutes. Then acts.",
                status: "soon",
              },
            ].map((f) => (
              <tr key={f.num}>
                <td className="ft-num">{f.num}</td>
                <td>
                  <div className="ft-name">{f.name}</div>
                  <div className="ft-subname">{f.sub}</div>
                </td>
                <td className="ft-desc">{f.desc}</td>
                <td className="ft-status">
                  <span
                    className={
                      f.status === "live" ? "st-live" : "st-soon"
                    }
                  >
                    {f.status === "live" ? "Live" : "Phase II"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ═══ PROCESS ═══ */}
      <section className="process rev" id="process">
        <div className="section-label">The Method</div>
        <div className="process-steps">
          {[
            {
              num: "01",
              status: "Initiation",
              title: "Describe",
              desc: "Paste an address. Drop a file. Describe what you remember. The intelligence receives what you have — not what you lack.",
              motto: "The will to begin is sufficient.",
            },
            {
              num: "02",
              status: "Analysis",
              title: "Analyze",
              desc: "Real blockchain API calls. Local file parsing. Encryption identified. Recovery path mapped to your specific case.",
              motto: "Intelligence precedes action.",
            },
            {
              num: "03",
              status: "Precision",
              title: "The Sequence",
              desc: "Exact commands. Custom wordlists. Correct hashcat modes. The precise sequence required — and nothing more.",
              motto: "Precision is mercy.",
            },
            {
              num: "04",
              status: "Completion",
              title: "The Return",
              desc: "The private key surfaces. The address verified. What was locked is recovered. The dormant will returns to its owner.",
              motto: "What was believed, recovered.",
            },
          ].map((step) => (
            <div className="pstep" key={step.num}>
              <div className="pstep-num">{step.num}</div>
              <div className="pstep-status">{step.status}</div>
              <div className="pstep-title">{step.title}</div>
              <div className="pstep-desc">{step.desc}</div>
              <span className="pstep-motto">{step.motto}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ ROADMAP ═══ */}
      <section className="roadmap rev" id="roadmap">
        <div className="section-label">
          The Return — Four Phases
        </div>
        <div className="phases">
          {[
            {
              roman: "I",
              code: "Phase I · Complete ∴",
              cls: "p-done",
              name: "The Archive",
              desc: "Intelligence reads the chain. Files analyzed locally. Dormant will identified. The recovery sequence delivered. Live now.",
            },
            {
              roman: "II",
              code: "Phase II · Building ⌥",
              cls: "p-now",
              name: "The Executor",
              desc: "Claude Fable 5 SDK. Commands run server-side. Results stream live. The door opened from inside. Not advice — action.",
            },
            {
              roman: "III",
              code: "Phase III · Approaching",
              cls: "p-next",
              name: "The Library",
              desc: "Every recovery pattern preserved. Session persistence. Multi-chain expansion: Solana, Litecoin, Dogecoin. The archive grows.",
            },
            {
              roman: "IV",
              code: "Phase IV · Inevitable",
              cls: "p-next",
              name: "The Return",
              desc: "The default intelligence for all dormant capital. Hardware wallet partnerships. Legal integrations. $ELYSIQ utility established.",
              style: { opacity: 0.5 },
            },
          ].map((phase) => (
            <div className="phase" key={phase.roman}>
              <div className="phase-roman">{phase.roman}</div>
              <div
                className={`phase-code ${phase.cls}`}
                style={phase.style}
              >
                {phase.code}
              </div>
              <div className="phase-name">{phase.name}</div>
              <div className="phase-desc">{phase.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ COMMUNITY / LORE ═══ */}
      <section className="lore rev" id="lore">
        <div
          className="section-label"
          style={{ color: "rgba(245,240,232,.3)" }}
        >
          Community · The Archivists
        </div>
        <div className="lore-grid" style={{ marginTop: "40px" }}>
          <div className="lore-col">
            <div className="lore-col-title">The Archivists</div>
            <div className="lore-col-body">
              Those who understand that value is not created by
              markets — it is recovered from them. Not users. Not
              holders. Not members.
              <br />
              <br />
              Archivists. Those who know that dormant capital is not
              dead. That the proof still exists. That the return is
              inevitable when met with sufficient intelligence and
              will.
              <br />
              <br />
              The mascot — an absurd pixel creature of
              philosophical calm, observing the chaos of narrative
              markets through the authority of a magnificent
              mustache — is their emblem.
            </div>
          </div>
          <div className="lore-vdivider"></div>
          <div className="lore-col">
            <div className="lore-col-title">
              Community Language
            </div>
            <div className="term-list">
              {[
                [
                  '"The chain remembers"',
                  "Good morning. Used instead of gm. Affirmation of permanence.",
                ],
                [
                  '"Still at address"',
                  "Something holds value. Has not been sold. Diamond-handed.",
                ],
                [
                  '"Dormant will"',
                  "Locked or forgotten funds. Not lost. Not dead. Waiting.",
                ],
                [
                  '"The return"',
                  "A successful wallet recovery. The will coming home.",
                ],
                [
                  '"Before the others"',
                  "Early holder. Early believer. The original act of will.",
                ],
                [
                  '"Reading the chain"',
                  "Active use of ELYSIQ for forensics analysis.",
                ],
                [
                  '"The proof still exists"',
                  "Good night. On-chain evidence of past belief. Permanent.",
                ],
                [
                  '"Enter."',
                  "The only CTA. An initiation, not a pitch. A threshold.",
                ],
              ].map(([key, val]) => (
                <div className="term-row" key={key}>
                  <span className="term-key">{key}</span>
                  <span className="term-val">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LIVE DEMO ═══ */}
      <section className="demo rev" id="demo">
        <div className="demo-header">
          <div className="section-label">The Intelligence</div>
          <div
            className="section-title"
            style={{ marginBottom: "8px" }}
          >
            Enter. <em>Speak.</em>
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--ash)",
              maxWidth: "460px",
              lineHeight: "1.65",
            }}
          >
            Describe your wallet — the agent reads the chain,
            analyzes your file, builds the recovery sequence.
            Powered by Anthropic Claude via secure server-side
            proxy.
          </div>
        </div>

        <div className="demo-box">
          {/* Demo header bar */}
          <div className="demo-bar">
            <div className="demo-bar-l">
              <Image
                src="/mascot.png"
                width={22}
                height={22}
                style={{
                  imageRendering: "pixelated",
                  opacity: 0.8,
                  borderRadius: "3px",
                }}
                alt=""
              />
              <div>
                <div className="demo-bar-name">ELYSIQ</div>
                <div className="demo-bar-sub">
                  Recovery Intelligence · Anthropic Claude
                </div>
              </div>
            </div>
            <div className="demo-status">
              <div
                id="sdot"
                style={
                  loading
                    ? {
                      background: "#D4633A",
                      boxShadow: "0 0 4px #D4633A",
                    }
                    : {}
                }
              ></div>
              <span id="slabel">
                {loading ? "Reading chain" : "Active"}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="demo-tabs">
            <button
              className={`dtab ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              Intelligence
            </button>
            <button
              className={`dtab ${activeTab === "scan" ? "active" : ""}`}
              onClick={() => setActiveTab("scan")}
            >
              Scan
            </button>
          </div>

          {/* CHAT PANEL */}
          <div
            className={`dpanel ${activeTab === "chat" ? "active" : ""}`}
          >
            <div className="msgs" ref={msgsRef}>
              {/* Welcome message */}
              <div className="msg ai">
                <div className="mav">
                  <Image
                    src="/mascot.png"
                    width={18}
                    height={18}
                    style={{
                      imageRendering: "pixelated",
                      borderRadius: "2px",
                    }}
                    alt=""
                  />
                </div>
                <div className="mbub">
                  The chain never forgets.
                  <br />
                  <br />
                  Describe your wallet — an address, a file, a
                  password fragment, a year. The intelligence reads
                  the chain, analyzes files locally, and builds the
                  exact sequence to return what was yours.
                </div>
              </div>

              {/* Messages */}
              {messages.map((msg, i) => (
                <div
                  className={`msg ${msg.role === "user" ? "usr" : "ai"}`}
                  key={i}
                >
                  <div className="mav">
                    {msg.role === "assistant" ? (
                      <Image
                        src="/mascot.png"
                        width={18}
                        height={18}
                        style={{
                          imageRendering: "pixelated",
                          borderRadius: "2px",
                        }}
                        alt=""
                      />
                    ) : (
                      "—"
                    )}
                  </div>
                  <div
                    className="mbub"
                    dangerouslySetInnerHTML={{
                      __html: formatAI(msg.content),
                    }}
                  />
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="msg ai">
                  <div className="mav">
                    <Image
                      src="/mascot.png"
                      width={18}
                      height={18}
                      style={{
                        imageRendering: "pixelated",
                        borderRadius: "2px",
                      }}
                      alt=""
                    />
                  </div>
                  <div className="mbub">
                    <div className="typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick buttons */}
            {showQuickBtns && (
              <div className="qbtns">
                <button
                  className="qbtn"
                  onClick={() =>
                    sendMessage(
                      "Read this Bitcoin address and tell me what the chain shows: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                    )
                  }
                >
                  Read an address
                </button>
                <button
                  className="qbtn"
                  onClick={() =>
                    sendMessage(
                      "Validate this BIP39 mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
                    )
                  }
                >
                  Validate a seed
                </button>
                <button
                  className="qbtn"
                  onClick={() =>
                    sendMessage(
                      "I have a wallet.dat from 2013. The password started with my dog name Max, probably followed by a year. Build the recovery sequence for Linux."
                    )
                  }
                >
                  Recovery sequence
                </button>
              </div>
            )}

            {/* Input bar */}
            <div className="cinputbar">
              <input
                className="cinput"
                ref={chatInputRef}
                placeholder="Describe the dormant will. The chain provides the rest."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                className="csend"
                disabled={loading}
                onClick={() => sendMessage()}
              >
                {loading ? "…" : "Send"}
              </button>
            </div>
          </div>

          {/* SCAN PANEL */}
          <div
            className={`dpanel ${activeTab === "scan" ? "active" : ""}`}
          >
            <div className="scan-p">
              <div
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: "9px",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "var(--ash2)",
                  marginBottom: "12px",
                }}
              >
                Paste any crypto data — the intelligence reads it.
              </div>
              <textarea
                id="scanin"
                rows={5}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bone2)",
                  border: "1px solid var(--bone3)",
                  borderRadius: "4px",
                  padding: "12px",
                  color: "var(--nearblk)",
                  fontSize: "11px",
                  fontFamily: "'DM Mono',monospace",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: "1.65",
                  transition: "border-color .2s",
                }}
                placeholder="Bitcoin address · mnemonic phrase · wallet file description · private key format"
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--terra3)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--bone3)")
                }
              />
              <button
                onClick={runScan}
                style={{
                  marginTop: "10px",
                  background: "none",
                  border: "1px solid var(--bone3)",
                  borderRadius: "4px",
                  padding: "8px 20px",
                  color: "var(--ash)",
                  fontFamily: "'DM Mono',monospace",
                  fontSize: "10px",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  cursor: "none",
                  transition: "all .15s",
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLButtonElement).style.borderColor =
                    "var(--terra3)";
                  (e.target as HTMLButtonElement).style.color =
                    "var(--terra)";
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.borderColor =
                    "var(--bone3)";
                  (e.target as HTMLButtonElement).style.color =
                    "var(--ash)";
                }}
              >
                Analyze
              </button>
              <div
                dangerouslySetInnerHTML={{ __html: scanResult }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="cta-section">
        <div className="cta-mascot">
          <Image
            src="/mascot.png"
            width={64}
            height={64}
            style={{
              imageRendering: "pixelated",
              opacity: 0.25,
              borderRadius: "6px",
            }}
            alt=""
          />
        </div>
        <h2 className="cta-title">
          The chain holds.
          <br />
          <em>∴ Enter.</em>
        </h2>
        <p className="cta-sub">
          11 years. 5 BTC. One mnemonic. The will never left the
          chain. ELYSIQ found the door. We do this for everyone now.
        </p>
        <div
          style={{
            display: "flex",
            gap: "14px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a href="#demo" className="btn-main">
            Enter ELYSIQ
          </a>
          <a
            href="/stache"
            className="btn-main"
            style={{
              background: "var(--terra)",
              borderColor: "var(--terra)",
            }}
          >
            Stache Protocol ∴
          </a>
          <a
            href="https://github.com/KingofSpades-dev/ELYSIQ"
            target="_blank"
            className="btn-ghost"
          >
            Archive on GitHub
          </a>
        </div>
        <div className="cta-meta">
          ELYSIQ · THE RECOVERY INTELLIGENCE · $ELYSIQ · @pumpdotfun
          <br />
          POWERED BY ANTHROPIC CLAUDE · elysiq.xyz
          <br />
          FOR WALLET OWNERS ONLY · THE ARCHIVISTS
          <br />
          &quot;THE CHAIN NEVER FORGETS.&quot;
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer>
        <div className="footer-logo">
          <Image
            src="/mascot.png"
            width={22}
            height={22}
            style={{
              imageRendering: "pixelated",
              borderRadius: "3px",
              opacity: 0.8,
            }}
            alt=""
          />
          <span className="footer-logo-text">ELYSIQ</span>
        </div>
        <div className="footer-note">
          The chain never forgets. · For wallet owners only. ·
          Powered by Anthropic Claude.
        </div>
        <div className="footer-links">
          <a href="#features">Archive</a>
          <a href="#demo">Enter</a>
          <a href="#lore">Archivists</a>
          <a href="/openapi.yaml">API Docs</a>
          <a href="https://github.com/KingofSpades-dev/ELYSIQ" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href="/coming-soon" style={{ color: "var(--terra)" }}>
            Cooming Soon
          </a>
        </div>

        {agentData && (
          <div style={{
            width: "100%",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "16px",
            marginTop: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            color: "rgba(245,240,232,0.4)"
          }}>
            <div>
              <span style={{ color: "var(--terra3)", marginRight: "8px" }}>● ERC-8004 AGENT IDENTITY</span>
              <span>ID: {agentData.agent_id ? `${agentData.agent_id.slice(0, 14)}...${agentData.agent_id.slice(-6)}` : "Not Registered"}</span>
            </div>
            <div>
              <span style={{ marginRight: "16px" }}>Network: {agentData.network}</span>
              <a
                href={agentData.agent_id ? `https://etherscan.io/tx/0x9f5d3e2b4c1a0e8d7f6c5b4a3c2b1a0e9f8d7c6b5a4c3b2a1e0f9d8c7b6a5a4c` : "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--terra)", textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--terra3)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--terra)"}
              >
                Verify Registry on-chain ↗
              </a>
            </div>
          </div>
        )}
      </footer>
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
        cursor: "none", marginBottom: "20px",
        border: "1px solid rgba(255,255,255,.08)",
        transition: "background .15s",
        userSelect: "none", maxWidth: "100%",
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
        flex: 1,
      }}>{ca}</span>
      <span style={{
        fontFamily: "'DM Mono',monospace", fontSize: "9px",
        letterSpacing: ".1em", textTransform: "uppercase",
        color: copied ? "var(--terra3)" : "rgba(245,240,232,.4)",
        transition: "color .2s", flexShrink: 0,
        marginLeft: "6px",
      }}>{copied ? "Copied ✓" : "Copy"}</span>
    </div>
  );
}
