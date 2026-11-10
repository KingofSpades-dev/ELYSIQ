'use client';

import { useState } from 'react';
import { CompanionAppearance } from '@/lib/soul/types';
import {
  COSMETIC_COLORS,
  COSMETIC_ACCESSORIES,
  COSMETIC_BACKGROUNDS,
  COSMETIC_FLAVORS
} from '@/lib/companion/cosmetics';

interface CompanionCustomizerProps {
  wallet: string | null;
  appearance: CompanionAppearance;
  onChangeAppearance: (app: CompanionAppearance) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  tier: number;
}

export default function CompanionCustomizer({
  wallet,
  appearance,
  onChangeAppearance,
  onSave,
  saving,
  tier
}: CompanionCustomizerProps) {
  const [isLocked, setIsLocked] = useState(true);
  const [nameError, setNameError] = useState('');

  if (!wallet) {
    return (
      <div className="customizer-locked-card">
        <div className="lock-icon">🔒</div>
        <h3>Companion Soul Locked</h3>
        <p>Connect your wallet to unlock customization. Personalized body colors, accessories, backgrounds, and voice styles require a verified connection.</p>
        <style jsx>{`
          .customizer-locked-card {
            background: rgba(26,24,20, 0.03);
            border: 1px dashed var(--bone3);
            border-radius: 18px;
            padding: 40px 24px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 380px;
          }
          .lock-icon {
            font-size: 38px;
            margin-bottom: 16px;
          }
          h3 {
            font-family: var(--serif);
            font-size: 22px;
            margin-bottom: 8px;
            color: var(--ink);
          }
          p {
            font-size: 13.5px;
            color: var(--ink3);
            max-width: 320px;
            line-height: 1.6;
          }
        `}</style>
      </div>
    );
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const val = e.target.value;
    if (val.length > 20) {
      setNameError('Name cannot exceed 20 characters.');
      return;
    }
    setNameError('');
    onChangeAppearance({ ...appearance, name: val });
  };

  const selectColor = (colorId: string, itemTier: number) => {
    if (isLocked || itemTier > tier) return;
    onChangeAppearance({ ...appearance, bodyVariant: colorId });
  };

  const toggleAccessory = (accId: string, itemTier: number) => {
    if (isLocked || itemTier > tier) return;

    let updated = [...appearance.accessories];
    if (accId === 'none') {
      updated = [];
    } else {
      // Remove none if equipping something
      updated = updated.filter(a => a !== 'none');
      if (updated.includes(accId)) {
        updated = updated.filter(a => a !== accId);
      } else {
        const item = COSMETIC_ACCESSORIES[accId];
        if (item) {
          const isHead = item.socket === 'head';
          const isBody = item.socket === 'neck' || item.socket === 'face';

          if (isHead) {
            updated = updated.filter(
              (id) => COSMETIC_ACCESSORIES[id]?.socket !== 'head'
            );
          } else if (isBody) {
            updated = updated.filter(
              (id) =>
                COSMETIC_ACCESSORIES[id]?.socket !== 'neck' &&
                COSMETIC_ACCESSORIES[id]?.socket !== 'face'
            );
          }
        }
        updated.push(accId);
      }
    }
    onChangeAppearance({ ...appearance, accessories: updated });
  };

  const selectBackground = (bgId: string, itemTier: number) => {
    if (isLocked || itemTier > tier) return;
    onChangeAppearance({ ...appearance, background: bgId });
  };

  const selectFlavor = (flavorId: string, itemTier: number) => {
    if (isLocked || itemTier > tier) return;
    onChangeAppearance({ ...appearance, personalityFlavor: flavorId });
  };

  const selectMood = (mood: string) => {
    if (isLocked) return;
    onChangeAppearance({ ...appearance, defaultMood: mood });
  };

  const handleShare = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('Could not find 3D canvas to export.');
      return;
    }
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${appearance.name || 'my-elysiq'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to generate image. Please try again.');
    }
  };

  const tierName = ['Free / Guest', 'Bronze Holder', 'Gold Holder', 'Legendary Sovereign'][tier] || 'Guest';

  const getLockTooltip = (itemTier: number) => {
    const amount = itemTier === 1 ? '1,000' : itemTier === 2 ? '5,000' : '25,000';
    return `Hold ${amount} $ELYSIQ`;
  };

  return (
    <div className="customizer-panel">
      {/* Tier Header */}
      <div className="customizer-header">
        <div>
          <h4>Personalize Companion</h4>
          <span className="tier-badge">∴ {tierName}</span>

        </div>
        <button className="share-btn" onClick={handleShare} title="Export current 3D frame as image">
          📸 Share
        </button>
      </div>

      {/* Fields */}
      <div className="customizer-scroll">
        {/* Name */}
        <div className="customizer-section">
          <label className="section-label">Companion Identity Name</label>
          <input
            type="text"
            className="name-input"
            placeholder="Name your Nietzschean..."
            value={appearance.name || ''}
            onChange={handleNameChange}
            disabled={isLocked}
          />
          {nameError && <div className="error-text">{nameError}</div>}
        </div>

        {/* Body Color hidden per request */}
        {/* <div className="customizer-section">
          <label className="section-label">Body Patina (Color)</label>
          <div className="color-grid">
            {Object.values(COSMETIC_COLORS).map((c) => {
              const locked = c.tier > tier;
              const active = appearance.bodyVariant === c.id;
              return (
                <button
                  key={c.id}
                  className={`color-bubble ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => selectColor(c.id, c.tier)}
                  title={`${c.name} ${locked ? `(Requires Tier ${c.tier})` : ''}`}
                >
                  {locked && <span className="lock-indicator">🔒</span>}
                  {active && <span className="active-dot">✓</span>}
                </button>
              );
            })}
          </div>
        </div> */}

        {/* Headwear */}
        <div className="customizer-section">
          <label className="section-label">Headwear</label>
          <div className="accessory-grid">
            {/* None Option for Headwear */}
            <button
              className={`accessory-btn ${!appearance.accessories.some(
                (a) => COSMETIC_ACCESSORIES[a]?.socket === 'head'
              )
                ? 'active'
                : ''
                }`}
              onClick={() => {
                if (isLocked) return;
                const updated = appearance.accessories.filter(
                  (a) => COSMETIC_ACCESSORIES[a]?.socket !== 'head'
                );
                onChangeAppearance({ ...appearance, accessories: updated });
              }}
            >
              <span className="acc-name">None</span>
              <span className="equipped-tag">—</span>
            </button>

            {Object.values(COSMETIC_ACCESSORIES)
              .filter((acc) => acc.socket === 'head')
              .map((acc) => {
                const locked = acc.tier > tier;
                const active = appearance.accessories.includes(acc.id);
                return (
                  <div key={acc.id} className="tooltip-wrapper" data-tooltip={locked ? getLockTooltip(acc.tier) : undefined}>
                    <button
                      className={`accessory-btn ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
                      onClick={() => toggleAccessory(acc.id, acc.tier)}
                      disabled={locked}
                    >
                      <span className="acc-name">{acc.name}</span>
                      {locked ? (
                        <span className="tier-tag">T{acc.tier} 🔒</span>
                      ) : active ? (
                        <span className="equipped-tag">Equipped</span>
                      ) : (
                        <span className="tier-tag">T{acc.tier}</span>
                      )}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Face & Body Accessories */}
        <div className="customizer-section">
          <label className="section-label">Face & Body Accessories</label>
          <div className="accessory-grid">
            {/* None Option for Face & Body */}
            <button
              className={`accessory-btn ${!appearance.accessories.some(
                (a) =>
                  COSMETIC_ACCESSORIES[a]?.socket === 'neck' ||
                  COSMETIC_ACCESSORIES[a]?.socket === 'face'
              )
                ? 'active'
                : ''
                }`}
              onClick={() => {
                if (isLocked) return;
                const updated = appearance.accessories.filter(
                  (a) =>
                    COSMETIC_ACCESSORIES[a]?.socket !== 'neck' &&
                    COSMETIC_ACCESSORIES[a]?.socket !== 'face'
                );
                onChangeAppearance({ ...appearance, accessories: updated });
              }}
            >
              <span className="acc-name">None</span>
              <span className="equipped-tag">—</span>
            </button>

            {Object.values(COSMETIC_ACCESSORIES)
              .filter((acc) => acc.socket === 'neck' || acc.socket === 'face')
              .map((acc) => {
                const locked = acc.tier > tier;
                const active = appearance.accessories.includes(acc.id);
                return (
                  <div key={acc.id} className="tooltip-wrapper" data-tooltip={locked ? getLockTooltip(acc.tier) : undefined}>
                    <button
                      className={`accessory-btn ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
                      onClick={() => toggleAccessory(acc.id, acc.tier)}
                      disabled={locked}
                    >
                      <span className="acc-name">{acc.name}</span>
                      {locked ? (
                        <span className="tier-tag">T{acc.tier} 🔒</span>
                      ) : active ? (
                        <span className="equipped-tag">Equipped</span>
                      ) : (
                        <span className="tier-tag">T{acc.tier}</span>
                      )}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Background Environments */}
        <div className="customizer-section">
          <label className="section-label">Pedestal Studio Atmosphere</label>
          <div className="atmosphere-grid">
            {Object.values(COSMETIC_BACKGROUNDS).map((bg) => {
              const locked = bg.tier > tier;
              const active = appearance.background === bg.id;
              return (
                <div key={bg.id} className="tooltip-wrapper" data-tooltip={locked ? getLockTooltip(bg.tier) : undefined}>
                  <button
                    className={`atmosphere-btn ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
                    onClick={() => selectBackground(bg.id, bg.tier)}
                    disabled={locked}
                  >
                    <span className="acc-name">{bg.name}</span>
                    {locked ? (
                      <span className="tier-tag">T{bg.tier} 🔒</span>
                    ) : active ? (
                      <span className="equipped-tag">Active</span>
                    ) : (
                      <span className="tier-tag">T{bg.tier}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Personality Flavor */}
        <div className="customizer-section">
          <label className="section-label">Nietzschean Voice Flavor</label>
          <div className="flavor-list">
            {Object.values(COSMETIC_FLAVORS).map((f) => {
              const locked = f.tier > tier;
              const active = appearance.personalityFlavor === f.id;
              return (
                <div key={f.id} className="tooltip-wrapper" data-tooltip={locked ? getLockTooltip(f.tier) : undefined}>
                  <button
                    className={`flavor-row ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
                    onClick={() => selectFlavor(f.id, f.tier)}
                    disabled={locked}
                  >
                    <div className="flavor-info">
                      <span className="flavor-name">{f.name}</span>
                      <span className="flavor-desc">
                        {f.id === 'standard' && 'Classic balance of dry and philosophical.'}
                        {f.id === 'dry' && 'Extremely minimalist. Minimum words.'}
                        {f.id === 'protective' && 'Alert, protective and risk-averse.'}
                        {f.id === 'talkative' && 'More descriptive and analytical.'}
                      </span>
                    </div>
                    {locked ? (
                      <span className="lock-indicator">T{f.tier} 🔒</span>
                    ) : (
                      active && <span className="equipped-indicator">✓</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Default Mood */}
        {/* <div className="customizer-section">
          <label className="section-label">Resting Vibe (Mood)</label>
          <div className="mood-grid">
            {['NEUTRAL', 'ALERT', 'SKEPTICAL', 'SATISFIED', 'THINKING'].map((m) => {
              const active = appearance.defaultMood === m;
              return (
                <button
                  key={m}
                  className={`mood-tag-btn ${active ? 'active' : ''}`}
                  onClick={() => selectMood(m)}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div> */}
      </div>

      {/* Save Action */}
      <div className="customizer-actions">
        {isLocked ? (
          <button className="save-btn btn-primary" onClick={() => setIsLocked(false)}>
            <span>Edit Appearance</span>
          </button>
        ) : (
          <button
            className="save-btn btn-primary"
            onClick={async () => {
              await onSave();
              setIsLocked(true);
            }}
            disabled={saving}
          >
            <span>{saving ? 'Syncing...' : 'Save Appearance ∴'}</span>
          </button>
        )}
      </div>

      <style jsx>{`
        .customizer-panel {
          background: #EDE8DE;
          border: 1px solid var(--bone3);
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          height: 520px;
          box-shadow: 0 16px 40px rgba(26,24,20, 0.05);
          overflow: hidden;
        }

        .customizer-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--bone3);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        h4 {
          font-family: var(--serif);
          font-size: 17px;
          font-weight: 600;
          color: var(--ink);
          margin: 0;
        }

        .tier-badge {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--terra);
          display: block;
          margin-top: 2px;
        }

        .wallet-address-sub {
          font-family: var(--mono);
          font-size: 9.5px;
          color: var(--ink3);
          display: block;
          margin-top: 3px;
          opacity: 0.75;
        }

        .share-btn {
          font-family: var(--mono);
          font-size: 10px;
          background: rgba(26,24,20, 0.05);
          color: var(--ink);
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: 0.2s;
        }
        .share-btn:hover {
          background: var(--terra);
          color: #fff;
        }

        .customizer-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .customizer-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .section-label {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink3);
        }

        .name-input {
          background: var(--bone2);
          border: 1px solid var(--bone3);
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 13px;
          color: var(--ink);
          outline: none;
          font-family: var(--sans);
          transition: 0.2s;
        }
        .name-input:focus {
          border-color: var(--terra);
        }

        .error-text {
          font-family: var(--mono);
          font-size: 9.5px;
          color: var(--terra);
          margin-top: 2px;
        }

        .color-grid {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .color-bubble {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          position: relative;
          display: grid;
          place-items: center;
          transition: transform 0.2s, border-color 0.2s;
        }
        .color-bubble.active {
          border-color: var(--ink);
          transform: scale(1.1);
        }
        .color-bubble.locked {
          opacity: 0.55;
        }
        .lock-indicator {
          font-size: 11px;
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.6);
        }
        .active-dot {
          font-size: 10px;
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.6);
          font-weight: bold;
        }

        .accessory-grid, .atmosphere-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .tooltip-wrapper {
          position: relative;
          display: block;
          width: 100%;
        }

        .tooltip-wrapper[data-tooltip]:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          background: var(--ink);
          color: var(--bone);
          padding: 6px 10px;
          border-radius: 6px;
          font-family: var(--mono);
          font-size: 10px;
          white-space: nowrap;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(26,24,20, 0.15);
          pointer-events: none;
          opacity: 0;
          animation: tooltipFadeIn 0.2s forwards;
          border: 1px solid var(--bone3);
        }

        .tooltip-wrapper[data-tooltip]:hover::before {
          content: '';
          position: absolute;
          bottom: 110%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 6px;
          border-style: solid;
          border-color: var(--ink) transparent transparent transparent;
          z-index: 1000;
          pointer-events: none;
          opacity: 0;
          animation: tooltipFadeIn 0.2s forwards;
        }

        @keyframes tooltipFadeIn {
          to {
            opacity: 1;
            bottom: 115%;
          }
        }

        .accessory-btn, .atmosphere-btn {
          background: var(--bone2);
          border: 1px solid var(--bone3);
          border-radius: 6px;
          padding: 10px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: 0.2s;
          width: 100%;
        }
        .accessory-btn:hover:not(:disabled), .atmosphere-btn:hover:not(:disabled) {
          border-color: var(--terra3);
        }
        .accessory-btn.active, .atmosphere-btn.active {
          background: var(--ink);
          border-color: var(--ink);
          color: var(--bone);
        }
        .accessory-btn.locked, .atmosphere-btn.locked {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .acc-name {
          font-size: 12px;
          font-weight: 500;
        }

        .tier-tag {
          font-family: var(--mono);
          font-size: 9px;
          color: var(--ink3);
          text-transform: uppercase;
        }
        .accessory-btn.active .tier-tag, .atmosphere-btn.active .tier-tag {
          color: var(--terra3);
        }

        .equipped-tag {
          font-family: var(--mono);
          font-size: 9px;
          color: var(--terra3);
          text-transform: uppercase;
        }

        .flavor-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .flavor-row {
          background: var(--bone2);
          border: 1px solid var(--bone3);
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          text-align: left;
          transition: 0.2s;
          width: 100%;
        }
        .flavor-row.active {
          background: var(--ink);
          border-color: var(--ink);
          color: var(--bone);
        }
        .flavor-row.locked {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .flavor-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-width: 85%;
        }

        .flavor-name {
          font-size: 13px;
          font-weight: 600;
        }

        .flavor-desc {
          font-size: 11px;
          color: var(--ink3);
        }
        .flavor-row.active .flavor-desc {
          color: var(--bone3);
        }

        .equipped-indicator {
          font-size: 14px;
          color: var(--terra);
          font-weight: bold;
        }

        .mood-grid {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .mood-tag-btn {
          font-family: var(--mono);
          font-size: 9.5px;
          background: var(--bone2);
          border: 1px solid var(--bone3);
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: 0.2s;
        }
        .mood-tag-btn.active {
          background: var(--terra);
          border-color: var(--terra);
          color: #fff;
        }

        .customizer-actions {
          padding: 16px 20px;
          border-top: 1px solid var(--bone3);
        }

        .save-btn {
          width: 100%;
          border: none;
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          justify-content: center;
          background: var(--terra);
          color: #fff;
          font-family: var(--mono);
          font-size: 13px;
          font-weight: 600;
          transition: opacity 0.2s;
        }
        .save-btn:hover:not(:disabled) {
          opacity: 0.9;
        }
        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
