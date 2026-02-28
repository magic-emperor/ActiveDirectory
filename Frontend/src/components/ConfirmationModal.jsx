import React, { useState } from 'react';
import { CheckCircle, XCircle, Edit3, AlertTriangle, Info, Loader, Shield } from 'lucide-react';

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    animation: 'fadeIn 0.15s ease',
  },
  modal: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '620px',
    maxHeight: '88vh',
    overflowY: 'auto',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
  },
  header: {
    padding: '20px 24px 0',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '16px',
  },
  headerIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'rgba(61, 107, 196, 0.15)',
    border: '1px solid var(--border-focus)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '3px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  body: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  summaryBox: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '14px 16px',
    fontSize: '14px',
    lineHeight: '1.65',
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  detailList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    padding: '6px 12px',
    background: 'var(--bg-elevated)',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '13px',
  },
  detailDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--accent)',
    flexShrink: 0,
    marginTop: '2px',
  },
  warningList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  warningItem: {
    display: 'flex',
    gap: '8px',
    padding: '8px 12px',
    background: 'rgba(196, 122, 26, 0.08)',
    border: '1px solid var(--border-warn)',
    borderRadius: '8px',
    fontSize: '13px',
    color: 'var(--text-warn)',
  },
  actions: {
    padding: '0 24px 24px',
    display: 'flex',
    gap: '10px',
    borderTop: '1px solid var(--border)',
    paddingTop: '16px',
  },
  btn: {
    base: {
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      padding: '10px 18px',
      borderRadius: '9px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 120ms ease',
      flex: 1,
      justifyContent: 'center',
    },
    approve: {
      background: 'var(--accent)',
      color: '#fff',
      border: '1px solid var(--accent)',
    },
    edit: {
      background: 'var(--bg-elevated)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
    },
    reject: {
      background: 'rgba(196, 75, 61, 0.1)',
      color: 'var(--text-error)',
      border: '1px solid var(--border-error)',
    },
  },
};

export default function ConfirmationModal({ analysis, onApprove, onEdit, onReject, loading }) {
  if (!analysis) return null;

  const { summary, details, warnings, confirmation_prompt } = analysis.analysis || analysis;

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerIcon}>
            <Shield size={20} color="var(--text-accent)" />
          </div>
          <div style={s.headerText}>
            <div style={s.title}>Review Before Creating</div>
            <div style={s.subtitle}>
              {confirmation_prompt || 'Review the details below and confirm to create this user in Active Directory.'}
            </div>
          </div>
        </div>

        <div style={s.body}>
          {/* AI Summary */}
          {summary && (
            <div style={s.section}>
              <div style={s.sectionLabel}>Summary</div>
              <div style={s.summaryBox}>{summary}</div>
            </div>
          )}

          {/* Details */}
          {details?.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionLabel}>What will be created</div>
              <div style={s.detailList}>
                {details.map((d, i) => (
                  <div key={i} style={s.detailItem}>
                    <div style={s.detailDot} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings?.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionLabel}>⚠ Warnings</div>
              <div style={s.warningList}>
                {warnings.map((w, i) => (
                  <div key={i} style={s.warningItem}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                    {w}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={s.actions}>
          <button
            style={{ ...s.btn.base, ...s.btn.reject }}
            onClick={onReject}
            disabled={loading}
          >
            <XCircle size={15} />
            Reject
          </button>
          <button
            style={{ ...s.btn.base, ...s.btn.edit }}
            onClick={onEdit}
            disabled={loading}
          >
            <Edit3 size={15} />
            Edit
          </button>
          <button
            style={{ ...s.btn.base, ...s.btn.approve }}
            onClick={onApprove}
            disabled={loading}
          >
            {loading
              ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />
              : <CheckCircle size={15} />
            }
            {loading ? 'Creating...' : 'Approve & Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
