import React, { useState } from 'react';
import { Users, Download, X, Hash, Globe, CheckCircle2, Search, FileSpreadsheet } from 'lucide-react';

const LANG_MAP = {
  ta: { name: 'Tamil', flag: '🇮🇳' },
  ml: { name: 'Malayalam', flag: '🇮🇳' },
  hi: { name: 'Hindi', flag: '🇮🇳' },
  en: { name: 'English', flag: '🇬🇧' },
};

export default function AttendanceRosterModal({
  isOpen,
  onClose,
  roster = [],
  roomCode = 'EDU-02',
  studentCount = 0,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredRoster = roster.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.roll_no && s.roll_no.toLowerCase().includes(q))
    );
  });

  const handleExportCsv = () => {
    if (!roster || roster.length === 0) {
      alert("No students currently in the attendance roster to export.");
      return;
    }

    const headers = ["Roll Number", "Full Name", "Subtitle Language", "Joined At", "Status"];
    const rows = roster.map((s) => {
      const dateStr = s.joined_at ? new Date(s.joined_at * 1000).toLocaleTimeString() : 'Active';
      const langName = (LANG_MAP[s.target_lang] && LANG_MAP[s.target_lang].name) || s.target_lang || 'English';
      return [
        `"${(s.roll_no || '').replace(/"/g, '""')}"`,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${langName}"`,
        `"${dateStr}"`,
        `"${s.status || 'online'}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateTag = new Date().toISOString().slice(0, 10);
    link.download = `Class_Attendance_${roomCode}_${dateTag}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Language distribution stats
  const langCounts = roster.reduce((acc, s) => {
    const l = s.target_lang || 'en';
    acc[l] = (acc[l] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card attendance-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '100%' }}
      >
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: 'rgba(52, 168, 83, 0.15)',
                border: '1px solid rgba(52, 168, 83, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} color="var(--google-green)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Class Attendance Roster
                <span className="google-tag-pill" style={{ fontSize: '11px', padding: '1px 8px' }}>
                  Room {roomCode}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {roster.length} {roster.length === 1 ? 'student' : 'students'} registered with Name & Roll Number
              </div>
            </div>
          </div>
          <button className="btn-minimal" onClick={onClose} style={{ padding: '6px' }} title="Close">
            <X size={17} />
          </button>
        </div>

        <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary Chips & Language breakdown */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(langCounts).map(([code, count]) => {
                const meta = LANG_MAP[code] || { name: code, flag: '🌐' };
                return (
                  <span
                    key={code}
                    style={{
                      fontSize: '11.5px',
                      padding: '3px 10px',
                      borderRadius: '14px',
                      background: 'rgba(66, 133, 244, 0.1)',
                      border: '1px solid rgba(66, 133, 244, 0.25)',
                      color: '#8ab4f8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontWeight: 600,
                    }}
                  >
                    <span>{meta.flag}</span>
                    <span>{meta.name}: <b>{count}</b></span>
                  </span>
                );
              })}
            </div>

            <button
              type="button"
              className="google-pill-btn secondary"
              onClick={handleExportCsv}
              disabled={roster.length === 0}
              style={{
                fontSize: '12px',
                padding: '5px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Download attendance as CSV spreadsheet"
            >
              <FileSpreadsheet size={14} color="var(--google-green)" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Search Filter */}
          {roster.length > 3 && (
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search by student name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '12.5px',
                }}
              />
            </div>
          )}

          {/* Roster Table */}
          <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '12px', background: 'var(--bg-card)' }}>
            {filteredRoster.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Users size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {searchTerm ? 'No matching students found' : 'No students joined yet'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                  Share the student link to invite students to room {roomCode}.
                </div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '10px 14px' }}>Roll No</th>
                    <th style={{ padding: '10px 14px' }}>Student Name</th>
                    <th style={{ padding: '10px 14px' }}>Subtitle Language</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.map((s, idx) => {
                    const lang = LANG_MAP[s.target_lang] || { name: s.target_lang || 'English', flag: '🌐' };
                    return (
                      <tr
                        key={s.id || s.roll_no || idx}
                        style={{
                          borderBottom: idx === filteredRoster.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: 'var(--google-blue)',
                              background: 'rgba(66, 133, 244, 0.12)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {s.roll_no || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {s.name || 'Anonymous Student'}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--google-green)',
                              background: 'rgba(52, 168, 83, 0.15)',
                              padding: '2px 8px',
                              borderRadius: '10px',
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--google-green)' }} />
                            Live
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
