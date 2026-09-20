import React from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

export default function ErrorBanner({ message, type = 'warning', onDismiss }) {
  if (!message) return null;

  const isWarning = type === 'warning';
  const isError = type === 'error';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderRadius: '8px',
        marginBottom: '14px',
        fontSize: '13px',
        backgroundColor: isError
          ? 'rgba(239, 68, 68, 0.15)'
          : isWarning
          ? 'rgba(245, 158, 11, 0.15)'
          : 'rgba(56, 189, 248, 0.15)',
        border: `1px solid ${
          isError
            ? 'rgba(239, 68, 68, 0.3)'
            : isWarning
            ? 'rgba(245, 158, 11, 0.3)'
            : 'rgba(56, 189, 248, 0.3)'
        }`,
        color: isError ? '#fca5a5' : isWarning ? '#fde68a' : '#bae6fd',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isError || isWarning ? <AlertTriangle size={16} /> : <Info size={16} />}
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
