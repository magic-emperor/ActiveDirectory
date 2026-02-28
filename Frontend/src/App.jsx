import React, { useState, useEffect } from 'react';
import { MessageSquare, FormInput, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import FormInterface from './components/FormInterface';
import { adApi } from './services/api';

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: '56px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    flexShrink: 0,
    gap: '16px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    letterSpacing: '0.5px',
  },
  logoIcon: {
    width: '28px',
    height: '28px',
    background: 'var(--accent)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  separator: {
    width: '1px',
    height: '20px',
    background: 'var(--border)',
  },
  domainBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusDot: (connected) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: connected ? 'var(--text-success)' : 'var(--text-error)',
    padding: '4px 10px',
    borderRadius: '20px',
    background: connected ? 'rgba(30, 100, 60, 0.15)' : 'rgba(100, 30, 30, 0.15)',
    border: `1px solid ${connected ? 'var(--border-success)' : 'var(--border-error)'}`,
  }),
  dryRunBadge: {
    padding: '3px 10px',
    borderRadius: '20px',
    background: 'rgba(196, 122, 26, 0.12)',
    border: '1px solid var(--border-warn)',
    fontSize: '11px',
    color: 'var(--text-warn)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontFamily: 'var(--font-mono)',
  },
  toggleGroup: {
    display: 'flex',
    background: 'var(--bg-elevated)',
    borderRadius: '8px',
    padding: '3px',
    border: '1px solid var(--border)',
  },
  toggleBtn: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 14px',
    borderRadius: '6px',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 500,
    border: 'none',
    transition: 'all 120ms ease',
    cursor: 'pointer',
  }),
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
};

export default function App() {
  const [view, setView] = useState('chat'); // 'chat' | 'form'
  const [adStatus, setAdStatus] = useState(null);
  const [adConfig, setAdConfig] = useState(null);

  useEffect(() => {
    // Fetch AD connection status and config on load
    Promise.all([adApi.getStatus(), adApi.getConfig()])
      .then(([status, config]) => {
        setAdStatus(status);
        setAdConfig(config);
      })
      .catch(() => {
        setAdStatus({ connected: false, message: 'Cannot reach backend' });
      });
  }, []);

  const isConnected = adStatus?.connected;
  const isDryRun = adStatus?.dry_run || adConfig?.dry_run;
  const domain = adConfig?.domain || 'company.com';

  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>
              <span style={{ color: '#fff', fontWeight: 700 }}>AD</span>
            </div>
            <span>User Creator</span>
          </div>
          <div style={styles.separator} />
          <div style={styles.domainBadge}>{domain}</div>
        </div>

        <div style={styles.toggleGroup}>
          <button
            style={styles.toggleBtn(view === 'chat')}
            onClick={() => setView('chat')}
          >
            <MessageSquare size={14} />
            Chat
          </button>
          <button
            style={styles.toggleBtn(view === 'form')}
            onClick={() => setView('form')}
          >
            <FormInput size={14} />
            Form
          </button>
        </div>

        <div style={styles.headerRight}>
          {isDryRun && (
            <div style={styles.dryRunBadge}>
              <AlertTriangle size={10} />
              DRY RUN
            </div>
          )}
          {adStatus && (
            <div style={styles.statusDot(isConnected)}>
              {isConnected
                ? <><Wifi size={12} /> Connected</>
                : <><WifiOff size={12} /> Disconnected</>
              }
            </div>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={styles.content}>
        {view === 'chat'
          ? <ChatInterface onSwitchToForm={() => setView('form')} />
          : <FormInterface onSwitchToChat={() => setView('chat')} />
        }
      </main>
    </div>
  );
}
