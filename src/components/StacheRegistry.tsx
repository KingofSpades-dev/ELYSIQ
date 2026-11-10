'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const DEFAULT_ROWS: any[] = [];

function scoreColor(s: number | null) {
  if (s === null) return '#8A8880';
  if (s >= 80) return '#4A7C59';
  if (s >= 60) return '#BA7517';
  return '#8B3A2A';
}

function truncateAddress(addr: string) {
  if (!addr) return '';
  if (addr.includes('...')) return addr; // fallback
  if (addr.length <= 12) return addr;
  return `${addr.substring(0, 4)}...${addr.substring(addr.length - 4)}`;
}

export default function StacheRegistry({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [rows, setRows] = useState<any[]>(DEFAULT_ROWS);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/stache/registry')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map((item: any) => ({
            project: item.project || item.projectName,
            status: item.status,
            score: item.trustScore !== undefined ? item.trustScore : item.score,
            date: item.date,
            ca: item.contractAddress || item.ca,
            onChainVerified: item.onChainVerified,
          }));
          setRows(mapped);
        }
      })
      .catch((err) => console.error('Error fetching registry data:', err))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const handleCopy = (address: string, index: number) => {
    navigator.clipboard.writeText(address);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const getStatusClass = (status: string) => {
    if (status === 'Certified') return 'cert';
    if (status === 'Revoked') return 'revoked';
    return 'pend';
  };

  return (
    <section className="registry" id="registry">
      <div className="section-label">The Registry</div>
      <p className="registry-note">Every certified project. Public. Permanent.</p>
      {loading && (
        <p className="loading-text">
          Loading registry database...
        </p>
      )}
      
      <div className="registry-table-wrapper">
        <table className="registry-table">
          <thead>
            <tr className="registry-head">
              <th>Project</th>
              <th>Status</th>
              <th>Trust Score</th>
              <th className="col-date">Date</th>
              <th className="col-contract">Contract</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.project + '-' + i} className="registry-row" data-magnetic>
                <td className="r-project">
                  <div className="project-cell-content">
                    <span>{r.project}</span>
                  </div>
                </td>
                <td>
                  <span className={`r-status ${getStatusClass(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td>
                  <span className="r-score" style={{ color: scoreColor(r.score) }}>
                    {r.score !== null && r.score !== undefined ? (
                      <>
                        {r.score}
                        <span className="r-score-max">/100</span>
                      </>
                    ) : (
                      <span className="r-score-pending">Pending</span>
                    )}
                  </span>
                </td>
                <td className="r-date col-date">{r.date}</td>
                <td className="col-contract">
                  <span className="r-ca">
                    <a
                      href={`${process.env.NEXT_PUBLIC_ELYSIUM_EXPLORER_URL || 'https://elysium.kinetiq.xyz/explorer'}/address/${r.ca}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ca-link"
                      title="View on Elysium Explorer"
                    >
                      {truncateAddress(r.ca)}
                    </a>
                    <button
                      className="copy-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(r.ca, i);
                      }}
                      title="Copy Address"
                    >
                      {copiedIndex === i ? 'Copied!' : '📋'}
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .registry { padding: 100px 40px; max-width: 1000px; margin: 0 auto; }
        .section-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8A8880;
          margin-bottom: 12px;
          text-align: center;
        }
        .registry-note {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 16px;
          color: #8A8880;
          text-align: center;
          margin-bottom: 40px;
        }
        .loading-text {
          text-align: center;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #8A8880;
          margin: 20px 0;
        }
        .registry-table-wrapper {
          border: 1px solid #E0D9CE;
          border-radius: 8px;
          overflow: hidden;
          background: #F5F0E8;
        }
        .registry-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        
        th, td {
          padding: 18px 20px;
          vertical-align: middle;
        }
        
        th {
          background: #EDE8DE;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #8A8880;
          font-weight: normal;
          border-bottom: 1px solid #E0D9CE;
        }
        
        /* Column Alignments */
        th:nth-child(1), td:nth-child(1) { text-align: left; }
        th:nth-child(2), td:nth-child(2) { text-align: center; }
        th:nth-child(3), td:nth-child(3) { text-align: center; }
        th:nth-child(4), td:nth-child(4) { text-align: center; }
        th:nth-child(5), td:nth-child(5) { text-align: right; }

        .registry-row {
          border-top: 1px solid #E0D9CE;
          transition: background 0.15s;
          cursor: none;
        }
        .registry-row:hover { background: #EDE8DE; }
        
        .r-project {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          color: #1A1814;
          font-weight: 500;
        }
        .project-cell-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .core-badge {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(135deg, #8b5cf6, #3b82f6);
          color: white;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 6px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }
        
        .r-status {
          display: inline-block;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          padding: 3px 10px;
          border-radius: 12px;
          width: fit-content;
          text-align: center;
        }
        .r-status.cert { color: #4A7C59; background: rgba(74,124,89,.1); }
        .r-status.pend { color: #BA7517; background: rgba(186,117,23,.1); }
        .r-status.revoked { color: #8B3A2A; background: rgba(139,58,42,.1); }
        
        .r-score {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
        }
        .r-score-max { font-size: 11px; color: #8A8880; }
        .r-score-pending {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.04em;
          color: #8A8880;
          background: #EDE8DE;
          padding: 2px 8px;
          border-radius: 4px;
        }
        
        .r-date {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #8A8880;
        }
        
        .r-ca {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
        }
        .ca-link {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #D4633A;
          text-decoration: none;
          border-bottom: 1px dashed rgba(212,99,58, 0.4);
          transition: border-color 0.15s, color 0.15s;
          cursor: none;
        }
        .ca-link:hover {
          border-bottom-color: #D4633A;
          color: #D4633A;
        }
        .copy-btn {
          background: none;
          border: none;
          font-size: 10px;
          color: #8A8880;
          cursor: none;
          padding: 2px 6px;
          border-radius: 4px;
          transition: background 0.15s, color 0.15s;
        }
        .copy-btn:hover {
          background: #E0D9CE;
          color: #1A1814;
        }

        /* Responsive Mobile Layout */
        @media (max-width: 768px) {
          th, td {
            padding: 14px 16px;
          }
          .col-date, .col-contract {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}
