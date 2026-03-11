'use client'

import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    // Redirect to the PWA
    window.location.href = '/trip/'
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '1rem',
      padding: '1rem',
      background: '#0a0a0a',
      color: '#ec4899',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #ec4899',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p>Loading Rome Trip PWA...</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
