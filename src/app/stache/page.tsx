'use client';

import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import StacheCursor from '@/components/StacheCursor';
import FloatingStache3D from '@/components/FloatingStache3D';
import StacheHero from '@/components/StacheHero';
import StacheMeaning from '@/components/StacheMeaning';
import StacheTimeline from '@/components/StacheTimeline';
import StacheMascots from '@/components/StacheMascots';
import StachePass from '@/components/StachePass';
import StacheRegistry from '@/components/StacheRegistry';
import RevenueSharing from '@/components/RevenueSharing';
import NietzscheMode from '@/components/NietzscheMode';
import { ScanResult } from '@/lib/stache/types';
import Link from 'next/link';

export default function StachePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form fields
  const [projectName, setProjectName] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [mascotFile, setMascotFile] = useState<File | null>(null);
  const [contactEmail, setContactEmail] = useState('');

  // Scan states
  const [scanStatus, setScanStatus] = useState<'idle' | 'submitting' | 'scanning' | 'done' | 'error'>('idle');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState('');

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !contractAddress) return;

    if (mascotFile && mascotFile.size > 2 * 1024 * 1024) {
      setScanError('Mascot image must be less than 2MB');
      setScanStatus('error');
      return;
    }

    setScanStatus('submitting');
    setScanError('');

    try {
      // Step 1: Submit Application using FormData for file upload
      const formData = new FormData();
      formData.append('projectName', projectName);
      formData.append('twitterHandle', twitterHandle || '');
      formData.append('contractAddress', contractAddress);
      formData.append('contactEmail', contactEmail || '');
      if (mascotFile) {
        formData.append('mascotImage', mascotFile);
      }

      const applyRes = await fetch('/api/stache/apply', {
        method: 'POST',
        body: formData,
      });

      if (!applyRes.ok) {
        throw new Error('Failed to submit certification application.');
      }

      // Step 2: Trigger AI Scan
      setScanStatus('scanning');
      const scanRes = await fetch('/api/stache/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress }),
      });

      if (!scanRes.ok) {
        throw new Error('Failed to complete blockchain audit scan.');
      }

      const result: ScanResult = await scanRes.json();
      setScanResult(result);
      setScanStatus('done');
      setRefreshTrigger((prev) => prev + 1); // trigger registry update
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || 'An unexpected error occurred.');
      setScanStatus('error');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Reset form states
    setProjectName('');
    setTwitterHandle('');
    setContractAddress('');
    setMascotFile(null);
    setContactEmail('');
    setScanStatus('idle');
    setScanResult(null);
    setScanError('');
  };

  return (
    <main className="stache-root">
      <StacheCursor />
      <FloatingStache3D />
      <NietzscheMode />

      {/* Floating Scanner Button */}
      <Link href="/stache/scanner" className="floating-scanner-btn" data-magnetic>
        Scanner CA ∴
      </Link>

      <StacheHero onApplyClick={() => setIsModalOpen(true)} />
      <StacheMeaning />
      <StacheTimeline />
      <StacheMascots refreshTrigger={refreshTrigger} />
      <StachePass />
      <StacheRegistry refreshTrigger={refreshTrigger} />
      <RevenueSharing />

      {/* Audit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>✕</button>

            {scanStatus === 'idle' && (
              <form onSubmit={handleSubmit} className="audit-form">
                <h3 className="modal-title">Apply for Stache Certification</h3>
                <p className="modal-subtitle">Submit your project details to deploy a ELYSIQ AI scanner instance.</p>

                <div className="form-group">
                  <label htmlFor="projectName">Project Name *</label>
                  <input
                    type="text"
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    placeholder="e.g. PenguinDAO"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contractAddress">Contract Address *</label>
                  <input
                    type="text"
                    id="contractAddress"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    required
                    placeholder="e.g. token address (0x...)"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="twitterHandle">Twitter Handle</label>
                  <input
                    type="text"
                    id="twitterHandle"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value)}
                    placeholder="e.g. @PenguinDAO"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="mascotFile">Upload Mascot</label>
                  <input
                    type="file"
                    id="mascotFile"
                    accept="image/*"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const selectedFile = files[0];
                        if (selectedFile.size > 2 * 1024 * 1024) {
                          alert('Mascot image must be less than 2MB');
                          e.target.value = ''; // clear input
                          setMascotFile(null);
                          return;
                        }
                        setMascotFile(selectedFile);
                      } else {
                        setMascotFile(null);
                      }
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#8A8880', display: 'block', marginTop: '4px' }}>
                    Max size: 2MB (SVG, PNG, or JPG)
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="contactEmail">Contact Email</label>
                  <input
                    type="email"
                    id="contactEmail"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="e.g. core@penguindao.com"
                  />
                </div>

                <button type="submit" className="submit-btn" data-magnetic>
                  Initiate AI Security Audit
                </button>
              </form>
            )}

            {(scanStatus === 'submitting' || scanStatus === 'scanning') && (
              <div className="loading-state">
                <div className="scan-radar">
                  <div className="pulse-circle"></div>
                </div>
                <h4 className="loading-title">
                  {scanStatus === 'submitting' ? 'Queueing Application...' : 'Running Forensic Audit Scan...'}
                </h4>
                <p className="loading-desc">
                  {scanStatus === 'submitting'
                    ? 'Writing metadata to registry store.'
                    : 'Calling Claude Fable 5 AI to analyze contract code, deployer history, and holder distribution structures.'}
                </p>
                <div className="loading-bar">
                  <div className="loading-bar-progress"></div>
                </div>
              </div>
            )}

            {scanStatus === 'done' && scanResult && (
              <div className="result-state">
                <div className="result-header">
                  <div className={`result-badge ${scanResult.passed ? 'pass' : 'fail'}`}>
                    <span className="result-score-val">{scanResult.trustScore}</span>
                    <span className="result-score-max">/100</span>
                  </div>
                  <h3 className="result-title">
                    {scanResult.passed ? 'Audit Passed' : 'Audit Terminated'}
                  </h3>
                  <p className="result-subtitle">
                    Risk Assessment Verdict: <strong className={`risk-${scanResult.riskLevel.toLowerCase()}`}>{scanResult.riskLevel}</strong>
                  </p>
                </div>

                <div className="findings-box">
                  <h4 className="findings-title">Key Audit Findings:</h4>
                  <ul className="findings-list">
                    {scanResult.findings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                {scanResult.passed ? (
                  <p className="pass-text">
                    🎉 Congratulate your team. Your project has been registered as <strong>Certified</strong>. You may now wear the Mustache.
                  </p>
                ) : (
                  <p className="fail-text">
                    ⚠️ The audit flagged safety concerns. The application is pending manual remediation.
                  </p>
                )}

                <button onClick={handleCloseModal} className="close-btn" data-magnetic>
                  Return to Registry
                </button>
              </div>
            )}

            {scanStatus === 'error' && (
              <div className="error-state">
                <div className="error-icon">⚠️</div>
                <h3 className="error-title">Audit Terminated Prematurely</h3>
                <p className="error-desc">{scanError}</p>
                <button onClick={() => setScanStatus('idle')} className="retry-btn">
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="stache-footer">
        <div className="footer-inner">
          <span className="footer-mark">∴ ELYSIQ</span>
          <span className="footer-tag">The mustache means something.</span>
          <span className="footer-links">Powered by Claude Fable 5 · Elysium · ERC-8004</span>
          <span className="footer-url">elysiq.xyz/stache</span>
        </div>
      </footer>

      <style jsx global>{`
        .stache-root{background:#F5F0E8;color:#1A1814;cursor:none;overflow-x:hidden;font-family:'DM Sans',sans-serif}
        .stache-root, .stache-root * { cursor: none !important; }

        .floating-scanner-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #D4633A;
          color: #F5F0E8;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 8px 16px;
          border-radius: 20px;
          z-index: 99999;
          text-decoration: none;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(212,99,58, 0.2);
          transition: background 0.15s, transform 0.15s;
          cursor: none !important;
        }
        .floating-scanner-btn:hover {
          background: #D4633A;
          transform: scale(1.05);
        }
        .stache-footer{background:#1A1814;padding:40px;margin-top:80px}
        .footer-inner{display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center}
        .footer-mark{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#F5F0E8}
        .footer-tag{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:18px;color:#D4633A}
        .footer-links,.footer-url{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.08em;color:rgba(245,240,232,.4)}

        /* Modal styling */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(26,24,20, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: none;
        }
        .modal-content {
          background: #EDE8DE;
          border: 1px solid #E0D9CE;
          padding: 40px;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 24px 60px rgba(26,24,20, 0.3);
          position: relative;
          cursor: none;
        }
        .modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: none;
          border: none;
          font-size: 20px;
          color: #8A8880;
          cursor: none;
          transition: color 0.15s;
        }
        .modal-close:hover { color: #1A1814; }
        
        .modal-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          color: #1A1814;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .modal-subtitle {
          font-size: 13px;
          color: #8A8880;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .audit-form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #D4633A;
        }
        .form-group input {
          background: #F5F0E8;
          border: 1px solid #E0D9CE;
          border-radius: 4px;
          padding: 10px 14px;
          font-size: 14px;
          color: #1A1814;
          outline: none;
          transition: border-color 0.15s;
          cursor: none;
        }
        .form-group input:focus { border-color: #D4633A; }
        .form-group input[type="file"] {
          padding: 8px 12px;
        }
        .form-group input[type="file"]::file-selector-button {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: #1A1814;
          color: #F5F0E8;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: none;
          transition: background 0.15s;
          margin-right: 12px;
        }
        .form-group input[type="file"]::file-selector-button:hover {
          background: #D4633A;
        }
        
        .submit-btn, .close-btn, .retry-btn {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 14px;
          background: #1A1814;
          color: #F5F0E8;
          border: none;
          border-radius: 4px;
          margin-top: 10px;
          cursor: none;
          transition: background 0.15s;
        }
        .submit-btn:hover, .close-btn:hover, .retry-btn:hover { background: #D4633A; }

        /* Loader */
        .loading-state { text-align: center; padding: 20px 0; }
        .scan-radar {
          width: 80px; height: 80px;
          border: 2px solid #D4633A;
          border-radius: 50%;
          margin: 0 auto 24px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pulse-circle {
          width: 20px; height: 20px;
          background: #D4633A;
          border-radius: 50%;
          animation: pulse 1.5s infinite ease-in-out;
        }
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          50% { transform: scale(2.2); opacity: 0.2; }
          100% { transform: scale(0.8); opacity: 0.8; }
        }
        .loading-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          color: #1A1814;
          margin-bottom: 8px;
        }
        .loading-desc { font-size: 13px; color: #8A8880; line-height: 1.6; margin-bottom: 24px; }
        
        .loading-bar {
          height: 4px; width: 100%;
          background: #E0D9CE;
          border-radius: 2px;
          overflow: hidden;
        }
        .loading-bar-progress {
          height: 100%; width: 50%;
          background: #D4633A;
          border-radius: 2px;
          animation: loading 2s infinite linear;
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        /* Results */
        .result-state { text-align: center; }
        .result-header { margin-bottom: 24px; }
        .result-badge {
          width: 90px; height: 90px;
          border-radius: 50%;
          margin: 0 auto 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 3px solid;
        }
        .result-badge.pass { border-color: #4A7C59; background: rgba(74, 124, 89, 0.1); color: #4A7C59; }
        .result-badge.fail { border-color: #8B3A2A; background: rgba(139, 58, 42, 0.1); color: #8B3A2A; }
        .result-score-val { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 600; line-height: 1; }
        .result-score-max { font-size: 11px; opacity: 0.7; }
        .result-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #1A1814; margin-bottom: 4px; }
        .result-subtitle { font-size: 13px; color: #8A8880; }
        .risk-safe, .risk-low { color: #4A7C59; font-weight: bold; }
        .risk-medium { color: #BA7517; font-weight: bold; }
        .risk-high, .risk-critical { color: #8B3A2A; font-weight: bold; }

        .findings-box {
          background: #F5F0E8;
          border: 1px solid #E0D9CE;
          border-radius: 6px;
          padding: 18px;
          text-align: left;
          margin-bottom: 20px;
          max-height: 200px;
          overflow-y: auto;
        }
        .findings-title { font-size: 12px; font-family: 'DM Mono', monospace; text-transform: uppercase; color: #D4633A; margin-bottom: 8px; }
        .findings-list { list-style: circle; padding-left: 20px; font-size: 13px; color: #D4633A; display: flex; flex-direction: column; gap: 6px; }
        .pass-text, .fail-text { font-size: 13px; line-height: 1.6; margin-bottom: 20px; }
        
        /* Error */
        .error-state { text-align: center; padding: 20px 0; }
        .error-icon { font-size: 48px; margin-bottom: 16px; }
        .error-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; color: #8B3A2A; margin-bottom: 8px; }
        .error-desc { font-size: 13px; color: #8A8880; margin-bottom: 24px; }
      `}</style>
    </main>
  );
}
