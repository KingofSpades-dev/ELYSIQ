(function() {
  console.log('[AI Companion Embed] Initializing widget...');
  
  const scriptTag = document.currentScript;
  let iframeUrl = '/widget/index.html'; // Default if unknown
  if (scriptTag && scriptTag.src) {
    const url = new URL(scriptTag.src);
    // If the script is loaded from /widget/embed.js, basePath will be /widget
    const basePath = url.pathname.replace('/embed.js', '');
    iframeUrl = `${url.origin}${basePath}/index.html`;
  }

  // --- 1. CREATE FAB (Floating Action Button) ---
  const fab = document.createElement('button');
  fab.innerHTML = '<span style="font-size: 20px;">💬</span> <span style="font-weight: 600; font-family: sans-serif; font-size: 14px;">Chat ELYSIQ</span>';
  fab.style.display = 'flex';
  fab.style.alignItems = 'center';
  fab.style.justifyContent = 'center';
  fab.style.gap = '8px';
  fab.style.position = 'fixed';
  fab.style.bottom = '20px';
  fab.style.right = '20px';
  fab.style.padding = '0 20px';
  fab.style.height = '50px';
  fab.style.borderRadius = '25px';
  fab.style.background = '#D4633A'; // Elysiq Terra
  fab.style.color = '#fff';
  fab.style.border = 'none';
  fab.style.boxShadow = '0 4px 15px rgba(212,99,58, 0.4)';
  fab.style.cursor = 'pointer';
  fab.style.zIndex = '999999';
  fab.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

  fab.onmouseenter = () => { fab.style.transform = 'scale(1.1)'; };
  fab.onmouseleave = () => { fab.style.transform = 'scale(1)'; };

  document.body.appendChild(fab);

  // --- 2. CREATE IFRAME ---
  const iframe = document.createElement('iframe');
  iframe.src = iframeUrl;
  iframe.style.position = 'fixed';
  iframe.style.bottom = '90px'; // Above the FAB
  iframe.style.right = '20px';
  iframe.style.width = '350px';
  iframe.style.height = '500px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '12px';
  iframe.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
  iframe.style.zIndex = '999998';
  iframe.style.overflow = 'hidden';
  iframe.style.background = 'transparent';
  iframe.allow = "microphone; camera";
  
  // Hide by default with an animation state
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.transform = 'translateY(20px) scale(0.95)';
  iframe.style.transformOrigin = 'bottom right';
  iframe.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  
  document.body.appendChild(iframe);

  // --- 3. TOGGLE LOGIC ---
  let isOpen = false;

  fab.onclick = () => {
    isOpen = !isOpen;
    if (isOpen) {
      iframe.style.opacity = '1';
      iframe.style.pointerEvents = 'auto';
      iframe.style.transform = 'translateY(0) scale(1)';
      fab.innerHTML = '<span style="font-size: 20px;">✖</span> <span style="font-weight: 600; font-family: sans-serif; font-size: 14px;">Close</span>'; // Close icon
      fab.style.background = '#1A1814'; // Nearblk when open
    } else {
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.transform = 'translateY(20px) scale(0.95)';
      fab.innerHTML = '<span style="font-size: 20px;">💬</span> <span style="font-weight: 600; font-family: sans-serif; font-size: 14px;">Chat ELYSIQ</span>'; // Chat icon
      fab.style.background = '#D4633A'; // Terra when closed
    }
  };
  
  // --- 4. EXPOSE API TO PARENT WINDOW ---
  window.Elysiq = {
    setWallet: function(address) {
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'SET_WALLET', wallet: address }, '*');
      }
    }
  };

  console.log('[AI Companion Embed] Widget injected successfully.');
})();
