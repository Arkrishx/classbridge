import React from 'react';
import { Clock3, X, RotateCcw } from 'lucide-react';

export default function LectureHistoryModal({ isOpen = false, history = [], onClose, onRestore }) {
  if (!isOpen || !history.length) return null;

  const handleClose = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <Clock3 size={17} color="var(--accent-cyan)" /> Lecture History
          </div>
          <button className="btn-minimal" onClick={handleClose} title="Close lecture history" aria-label="Close lecture history" type="button"><X size={16} /></button>
        </div>
        <div className="modal-scroll" style={{ padding: '16px' }}>
          {history.map((entry) => (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '13px' }}>{entry.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>{entry.date} • {entry.segments.length} segments • {entry.sourceLang.toUpperCase()} → {entry.targetLang.toUpperCase()}</div>
              </div>
              <button className="google-pill-btn secondary" onClick={() => onRestore(entry)} type="button" title="Restore lecture transcript">
                <RotateCcw size={13} /> Restore
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}