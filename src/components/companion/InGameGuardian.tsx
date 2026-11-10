'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import ElysiqCharacter from './ElysiqCharacter';
import { GuardianState } from '@/lib/gamefi/types';

interface InGameGuardianProps {
  guardian: GuardianState | null;
  onClose?: () => void;
}

export default function InGameGuardian({ guardian, onClose }: InGameGuardianProps) {
  if (!guardian) return null;

  const levelColor = {
    safe: '#4A7C59',
    caution: '#C9A84C',
    danger: '#D4633A',
  }[guardian.level] || '#1A1814';

  const levelText = {
    safe: 'Safe',
    caution: 'Caution',
    danger: 'Danger',
  }[guardian.level] || 'Observing';

  return (
    <div className={`ig-container ig-theme-${guardian.level}`}>
      <div className="ig-bubble">
        <div className="ig-header">
          <span className="ig-badge" style={{ backgroundColor: `${levelColor}22`, color: levelColor, borderColor: `${levelColor}44` }}>
            ∴ {levelText}
          </span>
          {onClose && (
            <button className="ig-close-btn" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
        <p className="ig-text">{guardian.message}</p>
        <div className="ig-arrow" style={{ borderLeftColor: levelColor }} />
      </div>

      <div className="ig-mascot-card">
        <div className="ig-canvas-wrapper">
          <Canvas
            shadows="percentage"
            camera={{ position: [0, 0.4, 4.0], fov: 40 }}
            gl={{ powerPreference: 'high-performance', antialias: true }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 8, 5]} intensity={1.0} castShadow />
            <directionalLight position={[-5, 3, -2]} intensity={0.3} />
            
            <Suspense fallback={null}>
              <ElysiqCharacter expression={guardian.expression} />
              
              {/* Mini Pedestal */}
              <mesh position={[0, -1.35, 0]} receiveShadow>
                <cylinderGeometry args={[1.2, 1.25, 0.2, 16]} />
                <meshStandardMaterial color="#D9D5CF" roughness={0.7} />
              </mesh>
            </Suspense>
            
            <ContactShadows
              position={[0, -1.45, 0]}
              opacity={0.4}
              scale={3}
              blur={1.8}
              far={1.5}
              resolution={64}
            />
          </Canvas>
        </div>
      </div>

      <style jsx>{`
        .ig-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 99999;
          display: flex;
          align-items: flex-end;
          gap: 16px;
          font-family: 'DM Sans', sans-serif;
          pointer-events: auto;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideIn {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .ig-bubble {
          background: #EDE8DE;
          border: 1px solid #E0D9CE;
          border-radius: 12px;
          padding: 16px;
          max-width: 240px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
          position: relative;
          margin-bottom: 20px;
        }

        .ig-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .ig-badge {
          font-family: 'DM Mono', monospace;
          font-size: 8px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid;
        }

        .ig-close-btn {
          background: none;
          border: none;
          color: #8A8880;
          font-size: 11px;
          cursor: pointer;
          transition: color 0.1s;
        }

        .ig-close-btn:hover {
          color: #1A1814;
        }

        .ig-text {
          font-size: 12px;
          line-height: 1.5;
          color: #D4633A;
          margin: 0;
        }

        .ig-arrow {
          position: absolute;
          bottom: 12px;
          right: -8px;
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          border-left: 8px solid;
        }

        .ig-mascot-card {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background: radial-gradient(circle, #EDE8DE, #D9D5CF);
          border: 1px solid #E0D9CE;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          position: relative;
        }

        .ig-canvas-wrapper {
          width: 100%;
          height: 100%;
          cursor: grab;
        }

        /* Themes */
        .ig-theme-danger .ig-bubble {
          border-color: #8B3A2A;
          box-shadow: 0 10px 30px rgba(139, 58, 42, 0.2);
        }

        .ig-theme-caution .ig-bubble {
          border-color: #BA7517;
          box-shadow: 0 10px 30px rgba(186, 117, 23, 0.15);
        }
      `}</style>
    </div>
  );
}
