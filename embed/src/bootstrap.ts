import { VideoRenderer } from './engine/VideoRenderer';
import { ChatOverlay } from './ui/ChatOverlay';

export function bootstrap(containerId: string) {
  console.log('[AI Companion] Bootstrapping MVP...');

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container #${containerId} not found!`);
    return;
  }

  // Clear existing content just in case
  container.innerHTML = '';

  // Initialize Video Renderer with the idle animation MP4
  const videoSrc = './idle.mp4';
  const videoRenderer = new VideoRenderer(container, videoSrc);
  
  // Try to play immediately
  videoRenderer.play();

  // Initialize Chat Overlay (if it exists)
  let chatOverlayInstance: ChatOverlay | null = null;
  try {
    chatOverlayInstance = new ChatOverlay(container);
    console.log('[AI Companion] Chat overlay initialized.');
  } catch (e) {
    console.warn('[AI Companion] Could not initialize ChatOverlay:', e);
  }
  
  // Listen for messages from the parent window (Elysiq website)
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_WALLET') {
      console.log('[AI Companion] Received wallet address from parent:', event.data.wallet);
      if (chatOverlayInstance) {
        chatOverlayInstance.setWallet(event.data.wallet);
      }
    }
  });

  console.log('[AI Companion] Bootstrap complete.');
}
