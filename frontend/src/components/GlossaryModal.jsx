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
    const matchesSearch =
      item.en?.toLowerCase().includes(search.toLowerCase()) ||
      item.key?.toLowerCase().includes(search.toLowerCase()) ||
      item.ta?.toLowerCase().includes(search.toLowerCase()) ||
      item.hi?.toLowerCase().includes(search.toLowerCase()) ||
      item.definition?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '950px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={22} color="var(--brand-primary)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '17px' }}>
                STEM Domain Adaptation Glossary Layer
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Curated canonical Indic STEM translations preventing machine translation hallucination ({termsList.length} terms)
              </div>
            </div>
          </div>
          <button className="btn btn-outline" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="chat-input"
              style={{ paddingLeft: '32px', width: '100%' }}
              placeholder="Search STEM terms, Tamil, Hindi, or definitions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', alignItems: 'center' }}>
            <Filter size={14} color="var(--text-muted)" />
            {categories.map((cat) => (
              <button
                key={cat}
                className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {filtered.map((t) => (
              <div
                key={t.key}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--brand-primary)' }}>
                    {t.en}
                  </span>
                  <span className="badge-tag badge-blue" style={{ fontSize: '10px' }}>
                    {t.category}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--vernacular-color)', fontWeight: 600 }}>
                  தமிழ்: {t.ta}
                </div>
                {t.hi && (
                  <div style={{ fontSize: '12px', color: '#86efac' }}>
                    हिन्दी: {t.hi}
                  </div>
                )}

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                  {t.definition}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
