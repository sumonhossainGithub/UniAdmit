'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // If returning from OAuth with access_token or error in hash
    if (typeof window !== 'undefined' && window.location.hash && (window.location.hash.includes('access_token=') || window.location.hash.includes('error='))) {
      window.location.replace('/auth-callback.html' + window.location.hash);
      return;
    }
    // Otherwise redirect to login page
    window.location.replace('/login.html');
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#0f172a',
      background: '#f8fafc'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#0a2647',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Loading UniAdmit...</p>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    </div>
  );
}
