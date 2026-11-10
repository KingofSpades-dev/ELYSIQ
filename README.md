# ELYSIQ — Nietzschean Recovery Intelligence

> *"The chain never forgets. Neither does Fable 5."*

AI-powered crypto wallet forensics and recovery intelligence. Powered by **Anthropic Claude Fable 5**.

**Live:** [elysiq.xyz](https://www.elysiq.xyz)

---

## What is ELYSIQ?

ELYSIQ combines live blockchain data with AI reasoning to help legitimate wallet owners recover dormant assets. Paste an address, describe what you remember — ELYSIQ reads the chain and guides recovery.

**$ELYSIQ CA:** TBA (Elysium mainnet)

---

## Routes

| Route | Description |
|---|---|
| `/` | Main app — chat + wallet scan |
| `/coming-soon` | Wallet Analyzer feature — coming soon |

---

## Stack

- **Framework:** Next.js (App Router)
- **AI:** Anthropic Claude Fable 5 via server-side API proxy
- **Data:** Elysium Explorer · DexScreener
- **Fonts:** Cormorant Garamond · DM Mono · DM Sans
- **Deploy:** Vercel

---

## Features

- AI chat — wallet forensics guided by Claude Fable 5
- Wallet scanner — detect type, chain, risk level, recovery possibility
- **[Coming Soon]** Wallet Analyzer — bot/human detection, PnL analysis, rug exposure, ELYSIQ Trust Score, scam probability

---

## Dev

```bash
npm install
npm run dev
```

Requires `.env.local`:

```
ANTHROPIC_API_KEY=your_key_here
```

---

## License

For wallet owners only. Not financial advice.
