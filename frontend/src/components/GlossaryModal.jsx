import React, { useState } from 'react';
import { X, Search, Filter, BookOpen } from 'lucide-react';

export default function GlossaryModal({ glossary, isOpen, onClose }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  if (!isOpen) return null;

  const termsList = Object.entries(glossary || {}).map(([key, val]) => ({
    key,
    ...val,
  }));

  const categories = ['All', ...new Set(termsList.map((t) => t.category).filter(Boolean))];

  const filtered = termsList.filter((item) => {
    const s = search.toLowerCase();
    const matchesSearch =
      item.en?.toLowerCase().includes(s) ||
      item.key?.toLowerCase().includes(s) ||
      item.ta?.toLowerCase().includes(s) ||
      item.ml?.toLowerCase().includes(s) ||
      item.hi?.toLowerCase().includes(s) ||
      item.definition?.toLowerCase().includes(s);

    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '980px' }}>
        {/* Header */}
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOpen size={18} color="var(--accent-cyan)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em', color: 'var(--text-main)' }}>
                STEM Domain Adaptation Glossary Layer
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Canonical STEM definitions in Tamil, Malayalam, and Hindi ({termsList.length} terms)
              </div>
            </div>
          </div>
          <button className="btn-minimal" onClick={onClose} style={{ padding: '6px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
            background: 'rgba(10, 14, 24, 0.4)',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="chat-input-field"
              style={{ paddingLeft: '34px', width: '100%', height: '36px' }}
              placeholder="Search STEM terms, Tamil, Malayalam, Hindi, or definitions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', alignItems: 'center' }}>
            <Filter size={13} color="var(--text-dim)" />
            {categories.map((cat) => (
              <button
                key={cat}
                className={`chip-btn ${selectedCategory === cat ? 'active' : ''}`}
                style={{
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  background: selectedCategory === cat ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  borderColor: selectedCategory === cat ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  color: selectedCategory === cat ? 'var(--accent-cyan)' : 'var(--text-muted)',
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Terms Grid */}
        <div className="modal-scroll" style={{ maxHeight: '60vh', padding: '16px 20px' }}>
          {filtered.length === 0 ? (
            <div className="empty-box">
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                No STEM terms found matching "{search}".
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '12px' }}>
              {filtered.map((t) => (
                <div
                  key={t.key}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--accent-cyan)' }}>
                      {t.en}
                    </span>
                    <span className="brand-tag" style={{ fontSize: '10px' }}>
                      {t.category || 'STEM'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px' }}>
                    {t.ta && (
                      <div style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                        <span style={{ opacity: 0.7, fontSize: '11px' }}>தமிழ்:</span> {t.ta}
                      </div>
                    )}
                    {t.ml && (
                      <div style={{ color: '#6ee7b7', fontWeight: 600 }}>
                        <span style={{ opacity: 0.7, fontSize: '11px' }}>മലയാളം:</span> {t.ml}
                      </div>
                    )}
                    {t.hi && (
                      <div style={{ color: '#93c5fd', fontWeight: 600 }}>
                        <span style={{ opacity: 0.7, fontSize: '11px' }}>हिन्दी:</span> {t.hi}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.45', marginTop: '2px', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
                    {t.definition}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
