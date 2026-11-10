'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const QUOTES = [
  { text: 'He who has a why to live can bear almost any how.', src: 'Nietzsche' },
  { text: 'That which does not kill me makes me stronger.', src: 'Nietzsche' },
  { text: 'You must have chaos within you to give birth to a dancing star.', src: 'Nietzsche' },
  { text: 'The chain never forgets.', src: 'ELYSIQ' },
];

/**
 * NietzscheMode — secret mode.
 * Triggered by:
 *   - double-click on the floating stache (dispatches 'nietzsche-mode-toggle')
 *   - Konami code → also summons Elysiq wearing a mustache
 */
export default function NietzscheMode() {
  const [active, setActive] = useState(false);
  const [quote, setQuote] = useState(QUOTES[0]);
  const [elysiq, setElysiq] = useState(false);

  useEffect(() => {
    const toggle = () => {
      setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
      setActive((a) => !a);
    };
    window.addEventListener('nietzsche-mode-toggle', toggle);

    // Konami code
    const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let idx = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === seq[idx]) {
        idx++;
        if (idx === seq.length) {
          setElysiq(true);
          idx = 0;
          setTimeout(() => setElysiq(false), 6000);
        }
      } else {
        idx = 0;
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('nietzsche-mode-toggle', toggle);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            className="nietzsche-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(false)}
          >
            <motion.div
              className="nietzsche-quote"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <svg width="80" height="48" viewBox="0 0 120 70" className="dramatic-stache">
                {/* dramatic eyebrows */}
                <rect x="20" y="2" width="28" height="6" rx="3" fill="#F5F0E8" transform="rotate(-8 34 5)" />
                <rect x="72" y="2" width="28" height="6" rx="3" fill="#F5F0E8" transform="rotate(8 86 5)" />
                <path d="M60 40 C46 22, 28 22, 12 32 C4 36, 0 44, 8 48 C20 44, 32 40, 42 48 C50 54, 56 48, 60 44 C64 48, 70 54, 78 48 C88 40, 100 44, 112 48 C120 44, 116 36, 108 32 C92 22, 74 22, 60 40 Z" fill="#F5F0E8" />
              </svg>
              <p className="quote-text">"{quote.text}"</p>
              <cite className="quote-src">— {quote.src}</cite>
              <p className="quote-hint">click anywhere to exit</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {elysiq && (
          <motion.div
            className="elysiq-summon"
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
          >
            <div className="elysiq-bubble">a wild ELYSIQ appears, wearing the stache ∴</div>
            <div className="elysiq-face">
              <span style={{ fontSize: 80 }}>🧑‍🦰</span>
              <svg width="56" height="34" viewBox="0 0 120 70" className="elysiq-stache">
                <path d="M60 40 C46 22, 28 22, 12 32 C4 36, 0 44, 8 48 C20 44, 32 40, 42 48 C50 54, 56 48, 60 44 C64 48, 70 54, 78 48 C88 40, 100 44, 112 48 C120 44, 116 36, 108 32 C92 22, 74 22, 60 40 Z" fill="#1A1814" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .nietzsche-overlay {
          position: fixed;
          inset: 0;
          z-index: 99998;
          background: rgba(20, 16, 12, 0.96);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: none;
        }
        .nietzsche-quote { text-align: center; max-width: 600px; padding: 40px; }
        .dramatic-stache { margin-bottom: 32px; }
        .quote-text {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: clamp(28px, 4vw, 44px);
          color: #F5F0E8;
          line-height: 1.4;
          margin-bottom: 20px;
        }
        .quote-src {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.14em;
          color: #D4633A;
        }
        .quote-hint {
          margin-top: 40px;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          color: rgba(245,240,232,.3);
        }
        .elysiq-summon {
          position: fixed;
          bottom: 40px;
          right: 40px;
          z-index: 99997;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }
        .elysiq-bubble {
          background: #1A1814;
          color: #F5F0E8;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          padding: 10px 16px;
          border-radius: 12px;
        }
        .elysiq-face { position: relative; }
        .elysiq-stache { position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%); }
      `}</style>
    </>
  );
}
