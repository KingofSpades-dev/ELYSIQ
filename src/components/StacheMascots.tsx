'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface Mascot {
  name: string;
  emoji: string;
  color: string;
  imageUrl?: string;
}

const DEFAULT_MASCOTS: Mascot[] = [];

function getMascotDetails(projectName: string) {
  const name = projectName.toLowerCase();

  if (name.includes('elysiq')) return { emoji: '👧', color: '#BA7517', imageUrl: '/images/stache/elysiq.png' };
  if (name.includes('kintara')) return { emoji: '👾', color: '#E258A3', imageUrl: '/images/stache/kintara.png' };
  if (name.includes('burnie')) return { emoji: '👴', color: '#8A8880', imageUrl: '/images/stache/burnie.png' };
  if (name.includes('vox')) return { emoji: '📦', color: '#BA7517', imageUrl: '/images/stache/vox.png' };
  if (name.includes('jotchua')) return { emoji: '🐕', color: '#D4633A', imageUrl: '/images/stache/jotchua.png' };

  if (name.includes('penguin')) return { emoji: '🐧', color: '#D4633A' };
  if (name.includes('dog') || name.includes('shiba') || name.includes('pup')) return { emoji: '🐕', color: '#D4633A' };
  if (name.includes('frog') || name.includes('pepe')) return { emoji: '🐸', color: '#4A7C59' };
  if (name.includes('cat') || name.includes('kitty')) return { emoji: '🐈', color: '#BA7517' };
  if (name.includes('wizard') || name.includes('mage')) return { emoji: '🧙', color: '#533AB7' };
  if (name.includes('seal')) return { emoji: '🦭', color: '#8A8880' };
  if (name.includes('robot') || name.includes('bot') || name.includes('ai')) return { emoji: '🤖', color: '#185FA5' };

  // Deterministic fallbacks
  const emojis = ['🪙', '🚀', '🔥', '💎', '🦖', '🦁', '🦊', '🦄', '🐼', '🐨'];
  const colors = ['#D4633A', '#4A7C59', '#BA7517', '#533AB7', '#8A8880', '#185FA5', '#C53030', '#2B6CB0', '#2F855A', '#B7791F'];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const emojiIndex = Math.abs(hash) % emojis.length;
  const colorIndex = Math.abs(hash) % colors.length;

  return {
    emoji: emojis[emojiIndex],
    color: colors[colorIndex],
  };
}

function transformMascotUrl(url: string | undefined): string | undefined {
  if (!url) return url;

  const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(driveRegex);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }

  const driveOpenRegex = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const matchOpen = url.match(driveOpenRegex);
  if (matchOpen && matchOpen[1]) {
    return `https://drive.google.com/uc?export=download&id=${matchOpen[1]}`;
  }

  return url;
}

/**
 * Mascot tiles. Each renders an emoji placeholder or a circular avatar image with a stache overlay.
 */
function MascotTile({ m, i }: { m: Mascot; i: number }) {
  const [hover, setHover] = useState(false);
  const displayUrl = transformMascotUrl(m.imageUrl);
  return (
    <motion.div
      className="mascot-tile"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: i * 0.05 }}
      whileHover={{ rotate: [-1, 1.5, -1], transition: { duration: 0.4 } }}
      data-magnetic
    >
      <div className="mascot-face">
        {displayUrl ? (
          <div className="mascot-avatar-container">
            <img src={displayUrl} alt={m.name} className="mascot-avatar-img" />
          </div>
        ) : (
          <span className="mascot-emoji">{m.emoji}</span>
        )}
        {/* stache overlay */}
        <motion.svg
          className="mascot-stache"
          width="76" height="44" viewBox="0 0 120 70"
          animate={hover ? { rotate: [0, -4, 4, 0], y: [0, -2, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <path
            d="M60 40 C46 22, 28 22, 12 32 C4 36, 0 44, 8 48 C20 44, 32 40, 42 48 C50 54, 56 48, 60 44 C64 48, 70 54, 78 48 C88 40, 100 44, 112 48 C120 44, 116 36, 108 32 C92 22, 74 22, 60 40 Z"
            fill="#1A1814"
          />
        </motion.svg>
      </div>
      <div className="mascot-name">{m.name}</div>
      <div className="mascot-badge">STACHE CERTIFIED</div>
      <style jsx>{`
        .mascot-tile {
          background: #F5F0E8;
          border: 1px solid #E0D9CE;
          border-radius: 10px;
          padding: 28px 20px;
          text-align: center;
          cursor: none;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .mascot-tile:hover {
          box-shadow: 0 12px 32px rgba(26,24,20,.1);
          border-color: #F0A882;
        }
        .mascot-face {
          position: relative;
          width: 180px;
          height: 120px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mascot-avatar-container {
          position: relative;
          z-index: 1;
          width: 110px;
          height: 110px;
          border-radius: 50%;
          border: 3px solid #D4633A;
          overflow: hidden;
          background: #FFF;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.2s, transform 0.2s;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .mascot-tile:hover .mascot-avatar-container {
          border-color: #F0A882;
          transform: scale(1.05);
        }
        .mascot-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .mascot-emoji { font-size: 80px; line-height: 1; }
        .mascot-face :global(.mascot-stache) {
          position: absolute;
          bottom: -16px;
          
          z-index: 2;
          pointer-events: none;
        }
        .mascot-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          color: #1A1814;
          margin-bottom: 6px;
        }
        .mascot-badge {
          font-family: 'DM Mono', monospace;
          font-size: 8px;
          letter-spacing: 0.14em;
          color: #D4633A;
          padding: 3px 8px;
          background: #FBF0EA;
          border-radius: 12px;
          display: inline-block;
        }
      `}</style>
    </motion.div>
  );
}

export default function StacheMascots({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [mascots, setMascots] = useState<Mascot[]>(DEFAULT_MASCOTS);

  useEffect(() => {
    let active = true;
    async function fetchCertifiedMascots() {
      try {
        const res = await fetch('/api/stache/registry');
        if (!res.ok) throw new Error('Failed to fetch registry for mascots');
        const data = await res.json();
        if (!Array.isArray(data)) return;

        // Filter and map certified projects
        const certifiedMascots = data
          .filter((p: any) => p.status === 'Certified')
          .map((p: any) => {
            const details = getMascotDetails(p.project);
            return {
              name: p.project,
              emoji: details.emoji,
              color: details.color,
              imageUrl: p.mascotUrl || details.imageUrl,
            };
          });

        // Deduplicate by case-insensitive name
        const uniqueMascots: Mascot[] = [];
        const seenNames = new Set<string>();
        for (const m of certifiedMascots) {
          const lowerName = m.name.toLowerCase();
          if (!seenNames.has(lowerName)) {
            seenNames.add(lowerName);
            uniqueMascots.push(m);
          }
        }

        if (active) {
          setMascots(uniqueMascots);
        }
      } catch (err) {
        console.error('Error fetching certified mascots:', err);
      }
    }

    fetchCertifiedMascots();
    return () => {
      active = false;
    };
  }, [refreshTrigger]);

  return (
    <section className="mascots">
      <div className="section-label">Stache Certified Mascots</div>
      <p className="mascots-note">A preview. The first projects to wear the stache.</p>
      <div className="mascots-grid">
        {mascots.map((m, i) => <MascotTile key={`${m.name}-${i}`} m={m} i={i} />)}
      </div>
      <style jsx>{`
        .mascots { padding: 100px 40px; max-width: 1100px; margin: 0 auto; }
        .section-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8A8880;
          margin-bottom: 12px;
          text-align: center;
        }
        .mascots-note {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 16px;
          color: #8A8880;
          text-align: center;
          margin-bottom: 48px;
        }
        .mascots-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }
        @media (max-width: 900px) { .mascots-grid { grid-template-columns: repeat(3,1fr); } }
        @media (max-width: 600px) { .mascots-grid { grid-template-columns: repeat(2,1fr); } }
      `}</style>
    </section>
  );
}
