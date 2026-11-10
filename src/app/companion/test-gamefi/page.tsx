'use client';

import { useState } from 'react';
import InGameGuardian from '@/components/companion/InGameGuardian';
import { GuardianState } from '@/lib/gamefi/types';
import Link from 'next/link';

export default function TestGameFiPage() {
  const [guardianState, setGuardianState] = useState<GuardianState | null>({
    level: 'safe',
    expression: 'NEUTRAL',
    message: 'Welcome to the GameFi Security Layer test suite. Click a state below to update the Guardian.'
  });

  const testStates: { name: string; state: GuardianState }[] = [
    {
      name: 'Safe / Satisfied (Legendary Tier)',
      state: {
        level: 'safe',
        expression: 'SATISFIED',
        message: 'Legendary Pass detected. Security clear. Enjoy your 30% XP boost!'
      }
    },
    {
      name: 'Safe / Neutral (Bronze Tier)',
      state: {
        level: 'safe',
        expression: 'NEUTRAL',
        message: 'Stache Pass detected. Security check completed successfully.'
      }
    },
    {
      name: 'Caution / Thinking (Unverified Player)',
      state: {
        level: 'caution',
        expression: 'THINKING',
        message: 'Game certified, but you are unverified. Bind a Stache Pass to unlock full perks.'
      }
    },
    {
      name: 'Caution / Skeptical (Uncertified Game)',
      state: {
        level: 'caution',
        expression: 'SKEPTICAL',
        message: 'Uncertified game token. The stache is observing this environment closely.'
      }
    },
    {
      name: 'Danger / Alert (Low Trust Score Game)',
      state: {
        level: 'danger',
        expression: 'ALERT',
        message: 'Critical warning! This game failed audits. Do not approve transactions here.'
      }
    },
    {
      name: 'Danger / Threat (Suspicious Counterparty)',
      state: {
        level: 'danger',
        expression: 'THREAT',
        message: 'Stop! This wallet matches 3 prior rugs. Do not send funds.'
      }
    },
    {
      name: 'Scanning State',
      state: {
        level: 'safe',
        expression: 'SCANNING',
        message: 'ELYSIQ is inspecting the transaction pipeline...'
      }
    }
  ];

  return (
    <div className="test-page">
      <nav className="test-nav">
        <Link href="/companion" className="back-link">
          ← Back to Companion
        </Link>
        <span className="nav-title">ELYSIQ In-Game Guardian Test Suite</span>
      </nav>

      <main className="test-content">
        <div className="control-panel">
          <h2>Test Scenarios</h2>
          <p>Click any scenario to dynamically update the 3D Guardian overlay and its response posture.</p>
          
          <div className="btn-group">
            {testStates.map((ts, idx) => (
              <button
                key={idx}
                onClick={() => setGuardianState(ts.state)}
                className={`state-btn level-${ts.state.level} ${guardianState?.expression === ts.state.expression ? 'active' : ''}`}
              >
                {ts.name}
              </button>
            ))}
          </div>

          <div className="info-card">
            <h3>Current State Debug</h3>
            <pre>{JSON.stringify(guardianState, null, 2)}</pre>
          </div>
        </div>
      </main>

      {/* Render the actual overlay component */}
      {guardianState && (
        <InGameGuardian
          guardian={guardianState}
          onClose={() => setGuardianState(null)}
        />
      )}

      <style jsx>{`
        .test-page {
          min-height: 100vh;
          background: #F5F0E8;
          color: #1A1814;
          font-family: 'DM Sans', sans-serif;
          padding: 80px 40px 40px;
        }
        .test-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: rgba(245,240,232, 0.85);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #E0D9CE;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          z-index: 100;
        }
        .back-link {
          color: #D4633A;
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
        }
        .nav-title {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #8A8880;
        }
        .test-content {
          max-width: 800px;
          margin: 0 auto;
        }
        .control-panel {
          background: #EDE8DE;
          border: 1px solid #E0D9CE;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
        }
        h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 300;
          margin-bottom: 8px;
        }
        p {
          color: #D4633A;
          font-size: 14px;
          margin-bottom: 30px;
        }
        .btn-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 40px;
        }
        .state-btn {
          width: 100%;
          text-align: left;
          padding: 16px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
          border: 1px solid #E0D9CE;
          background: #F5F0E8;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .state-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .state-btn.active {
          border-color: #1A1814;
          background: #1A1814;
          color: #F5F0E8;
        }
        .state-btn.level-danger:not(.active) {
          border-left: 4px solid #D4633A;
        }
        .state-btn.level-caution:not(.active) {
          border-left: 4px solid #C9A84C;
        }
        .state-btn.level-safe:not(.active) {
          border-left: 4px solid #4A7C59;
        }
        .info-card {
          background: #F5F0E8;
          border: 1px solid #E0D9CE;
          border-radius: 8px;
          padding: 20px;
        }
        .info-card h3 {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #8A8880;
          margin-bottom: 12px;
        }
        pre {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          margin: 0;
          color: #D4633A;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
