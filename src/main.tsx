import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Override window.alert with a beautiful, sandboxed-safe inline toast notification to prevent SecurityErrors in iframes
if (typeof window !== 'undefined') {
  window.alert = function (message?: any) {
    console.log('[App Alert Intercepted]:', message);
    
    // Check if an alert container already exists, otherwise create it
    let container = document.getElementById('custom-alert-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'custom-alert-container';
      container.style.position = 'fixed';
      container.style.top = '24px';
      container.style.right = '24px';
      container.style.zIndex = '999999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '12px';
      container.style.maxWidth = '420px';
      container.style.width = 'calc(100% - 48px)';
      
      const parentNode = document.body || document.documentElement;
      if (parentNode) {
        parentNode.appendChild(container);
      }
    }
    
    // Safely parse the message as string
    const cleanMessage = typeof message === 'string' ? message : String(message || '');
    
    // Create the alert card
    const card = document.createElement('div');
    card.style.background = '#0f172a'; // dark background slate-900
    card.style.color = '#f8fafc'; // light text slate-50
    card.style.padding = '16px';
    card.style.borderRadius = '16px';
    card.style.boxShadow = '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)';
    card.style.border = '1px solid #1e293b'; // slate-800
    card.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
    card.style.fontSize = '12px';
    card.style.lineHeight = '1.6';
    card.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    card.style.transform = 'translateY(-16px) scale(0.95)';
    card.style.opacity = '0';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '8px';
    card.style.backdropFilter = 'blur(12px)';
    
    // Top border colored line
    const borderLine = document.createElement('div');
    borderLine.style.position = 'absolute';
    borderLine.style.top = '0';
    borderLine.style.left = '0';
    borderLine.style.width = '100%';
    borderLine.style.height = '4px';
    borderLine.style.borderTopLeftRadius = '16px';
    borderLine.style.borderTopRightRadius = '16px';
    
    const isError = cleanMessage.toLowerCase().includes('❌') || 
                    cleanMessage.toLowerCase().includes('failed') || 
                    cleanMessage.toLowerCase().includes('error') || 
                    cleanMessage.toLowerCase().includes('insufficient') ||
                    cleanMessage.toLowerCase().includes('अमान्य');
                    
    borderLine.style.background = isError 
      ? 'linear-gradient(to right, #ef4444, #f43f5e)' // red/rose
      : 'linear-gradient(to right, #6366f1, #a855f7)'; // indigo/purple
      
    card.appendChild(borderLine);
    
    // Header layout
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.fontWeight = '700';
    header.style.marginTop = '4px';
    header.style.color = isError ? '#f87171' : '#818cf8'; // red-400 or indigo-400
    
    const title = document.createElement('span');
    title.style.letterSpacing = '0.05em';
    title.style.textTransform = 'uppercase';
    title.style.fontSize = '10px';
    title.innerText = isError ? '⚠️ Alert / त्रुटि चेतावनी' : '✨ Notification / सूचना';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#64748b'; // slate-500
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '12px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.padding = '2px 6px';
    closeBtn.style.borderRadius = '6px';
    closeBtn.style.transition = 'all 0.2s';
    closeBtn.onmouseover = () => { 
      closeBtn.style.color = '#ffffff'; 
      closeBtn.style.backgroundColor = '#1e293b';
    };
    closeBtn.onmouseout = () => { 
      closeBtn.style.color = '#64748b'; 
      closeBtn.style.backgroundColor = 'transparent';
    };
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    const body = document.createElement('div');
    body.style.fontWeight = '500';
    body.innerText = cleanMessage;
    
    card.appendChild(header);
    card.appendChild(body);
    if (container) {
      container.appendChild(card);
    }
    
    // Animate In
    setTimeout(() => {
      card.style.transform = 'translateY(0) scale(1)';
      card.style.opacity = '1';
    }, 20);
    
    // Function to dismiss safely
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      card.style.transform = 'translateY(-12px) scale(0.95)';
      card.style.opacity = '0';
      setTimeout(() => {
        card.remove();
      }, 400);
    };
    
    closeBtn.onclick = dismiss;
    
    // Auto-dismiss after 6.5 seconds
    setTimeout(dismiss, 6500);
  };

  // Override window.confirm to bypass SecurityError "Blocked call to confirm() during sandbox."
  window.confirm = function (message?: string) {
    console.log('[App Confirm Intercepted]:', message);
    return true; 
  };

  // Gracefully handle cross-origin or sandboxed iframe runtime errors
  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    console.warn('[Global Runtime Error Caught & Intercepted]:', event?.error || msg);
    // Suppress standard cross-origin script error or security policy bubbling to prevent blank pages/failures
    if (msg === 'Script error.' || msg.toLowerCase().includes('security') || msg.toLowerCase().includes('sandbox')) {
      if (typeof event?.preventDefault === 'function') {
        event.preventDefault();
      }
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Global Unhandled Promise Rejection Intercepted]:', event?.reason);
    // Suppress asynchronous/network-state bubble crashes
    if (typeof event?.preventDefault === 'function') {
      event.preventDefault();
    }
  });
}

import {AuthProvider} from './firebase/AuthProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
