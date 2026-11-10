'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface BurnTx {
  signature?: string;
  tx_signature?: string;
  usdc_spent?: number;
  elysiq_burned?: number;
  elysiq_received?: number;
  amount?: number;
  source_asset?: string;
  timestamp: string;
  type?: string;
  status?: string;
}

export default function BurnDashboard() {
  const [stats, setStats] = useState<{
    total_burned: number;
    treasury_balance: number;
    escrow_balance: number;
    history: BurnTx[];
  } | null>(null);

  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/token/burn');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch burn stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="burn-body">
      {/* Top Navigation */}
      <nav id="nav" className="showcase-nav">
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
        <span className="nav-pill">Burn Dashboard</span>
        <Link href="/" className="nav-cta" style={{ textDecoration: "none", color: "#fff" }}>
          Back to Terminal
        </Link>
      </nav>

      <main className="burn-container">
        <div className="burn-top-row">
          <header className="burn-header">
            <div className="burn-eyebrow">On-Chain Scarcity Engine</div>
            <h1>
              Token Buyback & <br />
              <span className="italic-terra">Deflationary Burn.</span>
            </h1>
            <p className="burn-sub">
              Fees from deep scans and certifications are swapped on Elysium and burned, permanently reducing $ELYSIQ supply.
            </p>
          </header>

          {loading ? (
            <div className="burn-loading">Loading On-Chain Stats...</div>
          ) : (
            <div className="burn-grid">
              {/* Stat Card 1 */}
              <div className="stat-card">
                <div className="card-label">Total $ELYSIQ Burned</div>
                <div className="card-value">
                  {stats?.total_burned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="card-desc">Permanently removed from circulating supply</div>
              </div>

              {/* Stat Card 2 */}
              <div className="stat-card">
                <div className="card-label">Treasury Balance</div>
                <div className="card-value">
                  ${(stats?.treasury_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="card-desc">USDC accumulated from scanning fees</div>
              </div>

              {/* Stat Card 3 */}
              <div className="stat-card">
                <div className="card-label">Escrow Balance</div>
                <div className="card-value">
                  {(stats?.escrow_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="card-desc">Tokens purchased waiting to be burned</div>
              </div>
            </div>
          )}
        </div>

        <section className="history-section">
          <h2 className="history-title">Transaction Log</h2>
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Signature</th>
                  <th>Amount Spent</th>
                  <th>$ELYSIQ Burned</th>
                  <th>Type</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {stats?.history && stats.history.length > 0 ? (
                  stats.history.map((tx, idx) => {
                    const sig = tx.tx_signature || tx.signature || '';
                    const elysiqBurned = tx.elysiq_received !== undefined ? tx.elysiq_received : (tx.elysiq_burned || 0);
                    
                    let spentDisplay = '-';
                    if (tx.source_asset && tx.amount !== undefined) {
                      if (tx.source_asset === 'ELYSIQ') {
                        spentDisplay = '-';
                      } else {
                        spentDisplay = `${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${tx.source_asset}`;
                      }
                    } else if (tx.usdc_spent !== undefined && tx.usdc_spent > 0) {
                      spentDisplay = `${tx.usdc_spent.toFixed(2)} USDC`;
                    }

                    let typeDisplay = 'Direct Burn';
                    if (tx.type === 'cron_usdc_buyback_burn') {
                      typeDisplay = 'USDC Buyback';
                    } else if (tx.type === 'cron_sol_buyback_burn') {
                      typeDisplay = 'SOL Buyback';
                    } else if (tx.type === 'cron_elysiq_burn_only') {
                      typeDisplay = 'Direct Burn';
                    } else if (tx.type === 'buyback_only') {
                      typeDisplay = 'Buyback';
                    } else if (tx.type === 'instant_burn') {
                      typeDisplay = 'Instant Burn';
                    } else if (tx.type === 'burn_only') {
                      typeDisplay = 'Direct Burn';
                    }

                    return (
                      <tr key={idx}>
                        <td className="signature-cell">
                          {sig ? (
                            <a
                              href={`${process.env.NEXT_PUBLIC_ELYSIUM_EXPLORER_URL || ''}/tx/${sig}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="explorer-link"
                            >
                              {sig.slice(0, 12)}...{sig.slice(-12)}
                            </a>
                          ) : (
                            <span style={{ color: 'var(--ink3)' }}>N/A (Failed)</span>
                          )}
                        </td>
                        <td>{spentDisplay}</td>
                        <td className="burn-amt">
                          {elysiqBurned > 0 ? `-${elysiqBurned.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '0'}
                        </td>
                        <td>
                          <span className="type-badge" style={{ fontFamily: 'var(--mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink2)' }}>
                            {typeDisplay}
                          </span>
                        </td>
                        <td>{new Date(tx.timestamp).toLocaleString()}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                      No burn transactions recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      <footer className="showcase-footer">
        <div className="foot-mark" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Image
            src="/mascot.png"
            width={40}
            height={40}
            style={{
              imageRendering: 'pixelated',
              borderRadius: '6px',
            }}
            alt="ELYSIQ mascot"
          />
          ELYSIQ
        </div>
        <div className="foot-tag">Those who command memory, command the future.</div>
        <div className="foot-meta">
          PERSISTENT MEMORY FOR CRYPTO AGENTS · CLAUDE OPUS 4.8 · ERC-8004 · ELYSIUM
          <br />
          elysiq.xyz · $ELYSIQ
        </div>
      </footer>

      <style jsx global>{`
        /* Global variables matching original styles */
        :root {
          --bone: #F5F0E8;
          --bone2: #EDE8DE;
          --bone3: #E0D9CE;
          --ink: #1A1814;
          --ink2: #D4633A;
          --ink3: #8A8880;
          --terra: #D4633A;
          --terra2: #D4633A;
          --terra3: #F0A882;
          --terra4: #FBF0EA;
          --sans: 'DM Sans', sans-serif;
          --serif: 'Cormorant Garamond', Georgia, serif;
          --mono: 'DM Mono', monospace;
        }

        .burn-body {
          font-family: var(--sans);
          background-color: var(--bone);
          color: var(--ink);
          min-height: 100vh;
          overflow-x: hidden;
          line-height: 1.5;
        }
        .burn-body, .burn-body * {
          cursor: default !important;
        }
        .burn-body a, .burn-body button, .burn-body input, .burn-body a *, .burn-body button *, .burn-body input * {
          cursor: pointer !important;
        }

      `}</style>

      <style jsx>{`
        .showcase-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 40px;
          backdrop-filter: blur(14px);
          background: rgba(245,240,232, 0.6);
          border-bottom: 1px solid var(--bone3);
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--serif);
          font-size: 22px;
          font-weight: 600;
          color: var(--ink);
          text-decoration: none;
        }

        .nav-logo-type {
          font-family: var(--serif);
          font-weight: 600;
          font-size: 22px;
          color: var(--ink);
        }

        .nav-pill {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--terra);
          border: 1px solid var(--terra3);
          padding: 6px 14px;
          border-radius: 20px;
        }

        .nav-cta {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
          background: var(--ink);
          color: var(--bone) !important;
          padding: 8px 18px;
          border-radius: 6px;
          transition: .2s;
        }

        .nav-cta:hover {
          background: var(--terra);
          transform: translateY(-1px);
        }

        .burn-container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 140px 40px 40px;
        }

        .burn-top-row {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 40px;
          margin-bottom: 60px;
        }

        .burn-header {
          width: 100%;
          text-align: left;
          margin-bottom: 0;
        }

        .burn-eyebrow {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--terra);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .burn-eyebrow::before {
          content: "";
          width: 28px;
          height: 1px;
          background: var(--terra);
        }

        .burn-header h1 {
          font-family: var(--serif);
          font-weight: 300;
          font-size: clamp(36px, 5.5vw, 68px);
          line-height: 1.05;
          letter-spacing: -0.02em;
          margin-bottom: 22px;
          color: var(--ink);
        }

        .italic-terra {
          font-style: italic;
          color: var(--terra);
        }

        .burn-sub {
          font-family: var(--serif);
          font-size: clamp(16px, 1.8vw, 22px);
          font-weight: 300;
          color: var(--ink2);
          max-width: 800px;
          line-height: 1.5;
        }

        .burn-loading {
          font-family: var(--mono);
          font-size: 14px;
          letter-spacing: 0.1em;
          color: var(--ink3);
          padding: 60px 0;
          text-align: center;
          width: 100%;
        }

        .burn-grid {
          width: 100%;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          margin-bottom: 0;
          gap: 24px;
        }

        .burn-grid .stat-card {
          flex: 1;
          min-width: 250px;
          justify-content: center;
        }

        @media (max-width: 900px) {
          .burn-grid {
            flex-direction: column;
          }
        }

        .stat-card {
          background: var(--bone2);
          border: 1px solid var(--bone3);
          border-radius: 18px;
          padding: 36px 30px;
          box-shadow: 0 10px 30px rgba(26,24,20, 0.03);
          display: flex;
          flex-direction: column;
        }

        .card-label {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink3);
          margin-bottom: 16px;
        }

        .card-value {
          font-family: var(--serif);
          font-size: 40px;
          font-weight: 600;
          color: var(--ink);
          line-height: 1.1;
          margin-bottom: 12px;
        }

        .card-desc {
          font-size: 13px;
          color: var(--ink2);
          line-height: 1.5;
        }

        .crank-card {
          border-color: var(--terra3);
          background: var(--terra4);
        }

        .crank-desc {
          font-size: 12.5px;
          color: var(--ink2);
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .crank-input-group {
          display: flex;
          border: 1px solid var(--bone3);
          border-radius: 6px;
          overflow: hidden;
          background: var(--bone);
        }

        .input-prefix {
          font-family: var(--mono);
          font-size: 10px;
          background: var(--bone2);
          color: var(--ink2);
          padding: 0 12px;
          display: flex;
          align-items: center;
          border-right: 1px solid var(--bone3);
        }

        .crank-input {
          flex: 1;
          border: none;
          background: transparent;
          padding: 10px;
          outline: none;
          font-family: var(--mono);
          font-size: 13px;
          color: var(--ink);
        }

        .crank-btn {
          background: var(--ink);
          color: var(--bone);
          border: none;
          padding: 0 20px;
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s;
        }

        .crank-btn:hover {
          background: var(--terra);
        }

        .crank-btn:disabled {
          background: var(--ink3);
          cursor: not-allowed;
        }

        .crank-message {
          margin-top: 14px;
          font-size: 12px;
          font-family: var(--mono);
          color: var(--terra2);
        }

        .history-section {
          background: var(--bone2);
          border: 1px solid var(--bone3);
          border-radius: 18px;
          padding: 36px 30px;
        }

        .history-title {
          font-family: var(--serif);
          font-size: 24px;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 24px;
        }

        .history-table-container {
          overflow-x: auto;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 14px;
        }

        .history-table th {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink3);
          padding: 12px 16px;
          border-bottom: 1px solid var(--bone3);
        }

        .history-table td {
          padding: 16px;
          border-bottom: 1px solid rgba(26,24,20, 0.05);
          color: var(--ink);
        }

        .signature-cell {
          font-family: var(--mono);
          font-size: 12.5px;
        }

        .explorer-link {
          color: var(--terra);
          text-decoration: none;
        }

        .explorer-link:hover {
          text-decoration: underline;
        }

        .burn-amt {
          color: var(--terra);
          font-weight: 600;
          font-family: var(--mono);
        }

        .showcase-footer {
          background: var(--ink);
          margin-top: 90px;
          padding: 70px 40px 40px;
          text-align: left;
          color: var(--bone);
        }

        .showcase-footer .foot-mark,
        .showcase-footer .foot-tag,
        .showcase-footer .foot-meta {
          max-width: 1100px;
          margin-left: auto;
          margin-right: auto;
        }

        .foot-mark {
          font-family: var(--serif);
          font-size: 40px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .foot-tag {
          font-family: var(--serif);
          font-style: italic;
          font-size: 20px;
          color: var(--terra);
          margin-bottom: 24px;
        }

        .foot-meta {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.08em;
          color: rgba(245,240,232, 0.35);
          line-height: 2;
        }
      `}</style>
    </div>
  );
}
