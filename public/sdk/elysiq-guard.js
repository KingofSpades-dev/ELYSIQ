(function () {
  // Guard class definition
  class ElysiqGuardInstance {
    constructor(config) {
      this.gameMint = config.gameMint;
      this.onGuard = config.onGuard || null;
      this.sessionData = null;
      this.injectStyles();
    }

    injectStyles() {
      if (document.getElementById('elysiq-guard-styles')) return;

      const style = document.createElement('style');
      style.id = 'elysiq-guard-styles';
      style.textContent = `
        .vg-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: rgba(26, 24, 20, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #1A1814;
        }
        .vg-modal {
          background: #EDE8DE;
          border: 1px solid #E0D9CE;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
          border-radius: 12px;
          padding: 32px;
          max-width: 480px;
          width: 90%;
          text-align: center;
          animation: vgFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes vgFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .vg-badge {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          border: 3px solid;
        }
        .vg-badge.vg-danger {
          border-color: #8B3A2A;
          background: rgba(139, 58, 42, 0.1);
          color: #8B3A2A;
        }
        .vg-badge.vg-caution {
          border-color: #BA7517;
          background: rgba(186, 117, 23, 0.1);
          color: #BA7517;
        }
        .vg-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #1a1814;
        }
        .vg-msg {
          font-size: 14px;
          line-height: 1.6;
          color: #4A4740;
          margin-bottom: 20px;
        }
        .vg-findings {
          background: #F5F0E8;
          border: 1px solid #E0D9CE;
          border-radius: 6px;
          padding: 16px;
          text-align: left;
          margin-bottom: 24px;
          max-height: 120px;
          overflow-y: auto;
        }
        .vg-findings-title {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8A8880;
          margin-bottom: 6px;
          font-weight: bold;
        }
        .vg-finding-item {
          font-size: 12px;
          color: #4A4740;
          margin: 4px 0;
          display: flex;
          gap: 6px;
        }
        .vg-actions {
          display: flex;
          gap: 12px;
        }
        .vg-btn {
          flex: 1;
          padding: 12px 20px;
          border-radius: 6px;
          border: none;
          font-size: 13px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .vg-btn:active {
          transform: scale(0.98);
        }
        .vg-btn-primary {
          background: #1A1814;
          color: #F5F0E8;
        }
        .vg-btn-primary:hover {
          background: #3A3730;
        }
        .vg-btn-secondary {
          background: #D4633A;
          color: #F5F0E8;
        }
        .vg-btn-secondary:hover {
          background: #B8502C;
        }
      `;
      document.head.appendChild(style);
    }

    async connect(playerWallet) {
      try {
        const url = `/api/gamefi/session?wallet=${encodeURIComponent(playerWallet)}&gameMint=${encodeURIComponent(this.gameMint)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Elysiq Session API error');

        const session = await res.json();
        this.sessionData = session;

        if (this.onGuard) {
          try {
            this.onGuard(session.guardian);
          } catch (e) {
            console.error('Error in onGuard callback:', e);
          }
        }
        return session;
      } catch (err) {
        console.error('Failed to init Elysiq session:', err);
        // Return dummy session as safety net
        return {
          game: { certified: false, trustScore: 0, tier: 'NONE' },
          player: { walletAddress: playerWallet, stachePassTier: 'NONE', perks: { xp_boost_pct: 0, marketplace_fee_discount_pct: 0 } },
          guardian: { level: 'caution', expression: 'SKEPTICAL', message: 'Elysiq offline. Safety unverified.' }
        };
      }
    }

    async check(target, kind = 'wallet') {
      try {
        const url = `/api/gamefi/guard-check`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, kind })
        });
        if (!res.ok) throw new Error('Elysiq Guard Check API error');

        const checkResult = await res.json();
        
        if (this.onGuard) {
          try {
            this.onGuard(checkResult.guardian);
          } catch (e) {
            console.error('Error in onGuard callback:', e);
          }
        }
        return checkResult;
      } catch (err) {
        console.error('Failed to perform Elysiq guard check:', err);
        return {
          target,
          kind,
          level: 'caution',
          findings: ['API unreachable'],
          guardian: { level: 'caution', expression: 'SKEPTICAL', message: 'Elysiq check failed. Proceed with caution.' }
        };
      }
    }

    warn(check) {
      if (check.level === 'safe') return Promise.resolve(true);

      return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'vg-overlay';

        const badgeClass = check.level === 'danger' ? 'vg-danger' : 'vg-caution';
        const badgeIcon = check.level === 'danger' ? '🛡️' : '⚠️';
        const titleText = check.level === 'danger' ? 'Security Warning' : 'Attention Required';
        const primaryBtnText = check.level === 'danger' ? 'Cancel Action' : 'Close';

        let findingsHtml = '';
        if (check.findings && check.findings.length > 0) {
          findingsHtml = `
            <div class="vg-findings">
              <div class="vg-findings-title">Audit Log</div>
              ${check.findings.map(f => `<div class="vg-finding-item"><span>—</span><span>${f}</span></div>`).join('')}
            </div>
          `;
        }

        const allowProceed = check.level === 'caution';

        overlay.innerHTML = `
          <div class="vg-modal">
            <div class="vg-badge ${badgeClass}">${badgeIcon}</div>
            <div class="vg-title">${titleText}</div>
            <div class="vg-msg">${check.guardian.message}</div>
            ${findingsHtml}
            <div class="vg-actions">
              <button class="vg-btn vg-btn-primary" id="vg-btn-cancel">${primaryBtnText}</button>
              ${allowProceed ? `<button class="vg-btn vg-btn-secondary" id="vg-btn-proceed">Proceed Anyway</button>` : ''}
            </div>
          </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#vg-btn-cancel').addEventListener('click', () => {
          document.body.removeChild(overlay);
          resolve(false);
        });

        if (allowProceed) {
          overlay.querySelector('#vg-btn-proceed').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(true);
          });
        }
      });
    }
  }

  // Global namespace exposure
  window.ElysiqGuard = {
    init: function (config) {
      return new ElysiqGuardInstance(config);
    }
  };
})();
