/**
 * ClassBridge — Comprehensive Academic Study Guide PDF Exporter
 * 
 * Supports exporting the entire study guide with ALL sections:
 * 1. Executive Overview (Bilingual English + Vernacular)
 * 2. Concept Map & Knowledge Architecture (Nodes, Edges & SVG Diagrams)
 * 3. Key Technical & Scientific Definitions
 * 4. Core Mathematical Formulas & Equations
 * 5. Key Lecture Takeaways & Timestamps
 * 6. Interactive Self-Test Flashcards
 * 
 * Tries the backend PDF endpoint first; if unavailable, uses the browser's
 * high-fidelity printable document engine with full Unicode Indic typography.
 */

const LANGUAGE_META = {
  ta: { name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  ml: { name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
  hi: { name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  en: { name: 'English', native: 'English', flag: '🇬🇧' },
  es: { name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', native: 'Français', flag: '🇫🇷' },
  de: { name: 'German', native: 'Deutsch', flag: '🇩🇪' },
};

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

export async function exportStudyGuideAsPdf(guide, targetLang = 'ta', segments = [], apiBaseUrl = '') {
  if (!guide) {
    alert("No study guide available to export. Please generate a study guide first.");
    return false;
  }

  const safeTitle = (guide.title || 'Study_Guide').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `ClassBridge_${safeTitle}_${targetLang.toUpperCase()}.pdf`;

  // 1. First attempt backend PDF generation if endpoint is available
  if (apiBaseUrl) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/study-guide/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_lang: targetLang,
          segments: segments || [],
          guide: guide
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return true;
      }
    } catch (err) {
      console.info("Backend PDF endpoint unavailable, using high-fidelity browser PDF renderer...", err);
    }
  }

  // 2. High-fidelity browser printable PDF renderer covering ALL options/tabs
  return printStudyGuideAsPdfDocument(guide, targetLang);
}

function printStudyGuideAsPdfDocument(guide, targetLang) {
  const printWindow = window.open('', '_blank', 'width=1020,height=900');
  if (!printWindow) {
    alert("Please allow popups for this site to export the Study Guide PDF.");
    return false;
  }

  const langMeta = LANGUAGE_META[targetLang] || { name: guide.target_language || 'Target Language', native: guide.native_language || '' };
  const dateFormatted = guide.date || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const segmentCount = guide.segment_count || 0;

  // 1. Overview HTML
  const overviewEn = guide.overview?.en || "No English overview available.";
  const overviewVernacular = guide.overview?.vernacular || "";

  // 2. Concept Map & Visuals HTML
  const diagram = guide.diagram || {};
  const nodes = diagram.nodes || [];
  const edges = diagram.edges || [];
  const visuals = guide.visuals || {};

  // Build SVG visuals depending on detected domain
  let visualDiagramHtml = '';
  if (visuals.thermoCycle) {
    visualDiagramHtml = `
      <div class="visual-card thermo">
        <div class="visual-title">First Law Heat Engine Cycle</div>
        <svg viewBox="0 0 320 170" class="svg-diagram">
          <circle cx="80" cy="85" r="42" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="4,4" />
          <text x="56" y="88" fill="#1e3a8a" font-size="11" font-weight="bold">ΔU = Q - W</text>
          <rect x="15" y="15" width="75" height="40" rx="6" fill="#fee2e2" stroke="#ef4444" stroke-width="1.5" />
          <text x="24" y="38" fill="#b91c1c" font-size="11" font-weight="bold">Heat (Q_in)</text>
          <rect x="230" y="65" width="75" height="40" rx="6" fill="#dcfce7" stroke="#22c55e" stroke-width="1.5" />
          <text x="242" y="88" fill="#15803d" font-size="11" font-weight="bold">Work (W)</text>
          <rect x="15" y="115" width="75" height="40" rx="6" fill="#e0f2fe" stroke="#0ea5e9" stroke-width="1.5" />
          <text x="22" y="138" fill="#0369a1" font-size="11" font-weight="bold">Cold Sink</text>
          <line x1="90" y1="35" x2="120" y2="60" stroke="#ef4444" stroke-width="2" />
          <line x1="122" y1="85" x2="230" y2="85" stroke="#22c55e" stroke-width="2" />
          <line x1="120" y1="110" x2="90" y2="135" stroke="#0ea5e9" stroke-width="2" />
        </svg>
        <div class="visual-caption">${escapeHtml(visuals.thermoCycle.caption)}</div>
      </div>
    `;
  } else if (visuals.photosynthesis) {
    visualDiagramHtml = `
      <div class="visual-card bio">
        <div class="visual-title">Dual-Phase Photosynthetic Pathway</div>
        <svg viewBox="0 0 320 170" class="svg-diagram">
          <rect x="20" y="25" width="125" height="95" rx="8" fill="#fef9c3" stroke="#eab308" stroke-width="1.5" />
          <text x="32" y="48" fill="#854d0e" font-size="11" font-weight="bold">Light Reactions</text>
          <text x="32" y="68" fill="#475569" font-size="10">• Thylakoid Membrane</text>
          <text x="32" y="85" fill="#475569" font-size="10">• H₂O ➔ O₂ (Photolysis)</text>
          <text x="32" y="103" fill="#15803d" font-size="10" font-weight="bold">Yields ATP & NADPH</text>
          <rect x="175" y="25" width="125" height="95" rx="8" fill="#dcfce7" stroke="#22c55e" stroke-width="1.5" />
          <text x="187" y="48" fill="#166534" font-size="11" font-weight="bold">Calvin Cycle</text>
          <text x="187" y="68" fill="#475569" font-size="10">• Chloroplast Stroma</text>
          <text x="187" y="85" fill="#475569" font-size="10">• CO₂ Fixation (RuBisCO)</text>
          <text x="187" y="103" fill="#854d0e" font-size="10" font-weight="bold">Produces Glucose</text>
          <line x1="145" y1="55" x2="175" y2="55" stroke="#0284c7" stroke-width="2" stroke-dasharray="3,3" />
          <line x1="175" y1="85" x2="145" y2="85" stroke="#64748b" stroke-width="2" stroke-dasharray="3,3" />
          <text x="75" y="145" fill="#475569" font-size="10">6CO₂ + 6H₂O + Light ➔ C₆H₁₂O₆ + 6O₂</text>
        </svg>
        <div class="visual-caption">${escapeHtml(visuals.photosynthesis.caption)}</div>
      </div>
    `;
  } else if (visuals.vectorTransform) {
    visualDiagramHtml = `
      <div class="visual-card math">
        <div class="visual-title">Eigenvector Linear Scaling</div>
        <svg viewBox="0 0 320 170" class="svg-diagram">
          <line x1="30" y1="140" x2="290" y2="140" stroke="#cbd5e1" stroke-width="1.5" />
          <line x1="160" y1="20" x2="160" y2="150" stroke="#cbd5e1" stroke-width="1.5" />
          <line x1="160" y1="140" x2="210" y2="90" stroke="#0284c7" stroke-width="3" />
          <text x="215" y="92" fill="#0369a1" font-size="11" font-weight="bold">v</text>
          <line x1="160" y1="140" x2="260" y2="40" stroke="#9333ea" stroke-width="3" stroke-dasharray="4,4" />
          <text x="265" y="42" fill="#7e22ce" font-size="11" font-weight="bold">Av = λv</text>
          <text x="40" y="45" fill="#b45309" font-size="11" font-weight="bold">det(A - λI) = 0</text>
          <text x="40" y="65" fill="#64748b" font-size="10">Direction invariant, scaled by eigenvalue λ</text>
        </svg>
        <div class="visual-caption">${escapeHtml(visuals.vectorTransform.caption)}</div>
      </div>
    `;
  } else if (visuals.lossCurve || visuals.network) {
    visualDiagramHtml = `
      <div class="visual-card ml">
        <div class="visual-title">Convergence Profile & Neural Flow</div>
        <svg viewBox="0 0 320 170" class="svg-diagram">
          <line x1="30" y1="140" x2="290" y2="140" stroke="#cbd5e1" stroke-width="1.5" />
          <line x1="30" y1="20" x2="30" y2="140" stroke="#cbd5e1" stroke-width="1.5" />
          <path d="M 35 30 Q 80 120 280 130" fill="none" stroke="#2563eb" stroke-width="2.5" />
          <circle cx="280" cy="130" r="4" fill="#16a34a" />
          <text x="40" y="35" fill="#dc2626" font-size="10">High Loss</text>
          <text x="210" y="125" fill="#16a34a" font-size="10" font-weight="bold">Minimum J(θ)</text>
          <text x="130" y="155" fill="#64748b" font-size="10">Iterations / Epochs ➔</text>
        </svg>
        <div class="visual-caption">${escapeHtml(visuals.lossCurve?.caption || visuals.network?.caption || 'Iterative loss minimization')}</div>
      </div>
    `;
  } else {
    visualDiagramHtml = `
      <div class="visual-card general">
        <div class="visual-title">Concept Progression Hierarchy</div>
        <div class="progression-row">
          ${nodes.slice(0, 4).map((n, i) => `
            <div class="node-box">
              <div class="node-box-title">${escapeHtml(n.label)}</div>
              <div class="node-box-detail">${escapeHtml(n.detail || 'Core Principle')}</div>
            </div>
            ${i < Math.min(nodes.length - 1, 3) ? '<span class="arrow">➔</span>' : ''}
          `).join('')}
        </div>
        <div class="visual-caption">${escapeHtml(visuals.conceptFlow?.caption || 'Sequential progression and hierarchy of core lecture principles.')}</div>
      </div>
    `;
  }

  // Equation card HTML
  let equationHtml = '';
  if (visuals.equation) {
    equationHtml = `
      <div class="equation-card">
        <div class="eq-title">${escapeHtml(visuals.equation.title || guide.formulas?.[0]?.name || "Governing Mathematical Law")}</div>
        <div class="eq-formula">${escapeHtml(visuals.equation.latex || '')}</div>
        <div class="eq-caption">${escapeHtml(visuals.equation.caption || '')}</div>
      </div>
    `;
  }

  // Nodes list HTML
  const nodesHtml = nodes.map(n => `
    <div class="concept-node-item">
      <span class="node-badge">📌 ${escapeHtml(n.label)}</span>
      <span class="node-type">${escapeHtml(n.detail || 'Principle')}</span>
    </div>
  `).join('');

  // 3. Definitions HTML
  const defsHtml = (guide.definitions || []).map((d, i) => `
    <tr>
      <td class="td-term">
        <b>${escapeHtml(d.term)}</b>
        ${d.vernacular_term ? `<div class="td-vernacular">${escapeHtml(d.vernacular_term)}</div>` : ''}
      </td>
      <td class="td-cat"><span class="cat-pill">${escapeHtml(d.category || 'STEM')}</span></td>
      <td class="td-def">${escapeHtml(d.definition)}</td>
    </tr>
  `).join('');

  // 4. Formulas HTML
  const formulasHtml = (guide.formulas || []).map(f => `
    <div class="formula-block">
      <div class="f-header">
        <span class="f-name">📐 ${escapeHtml(f.name)}</span>
      </div>
      <div class="f-latex">${escapeHtml(f.latex)}</div>
      <div class="f-desc"><b>Significance:</b> ${escapeHtml(f.description)}</div>
      ${f.variables ? `<div class="f-vars"><b>Variables:</b> ${escapeHtml(f.variables)}</div>` : ''}
    </div>
  `).join('');

  // 5. Takeaways HTML
  const takeawaysHtml = (guide.takeaways || []).map(t => `
    <div class="takeaway-row">
      <div class="takeaway-badge">⏱️ ${escapeHtml(t.timestamp || '00:00')}</div>
      <div class="takeaway-text">
        <div class="takeaway-en">${escapeHtml(t.point)}</div>
        ${t.vernacular_point ? `<div class="takeaway-vernacular">➔ ${escapeHtml(t.vernacular_point)}</div>` : ''}
      </div>
    </div>
  `).join('');

  // 6. Flashcards HTML
  const flashcardsHtml = (guide.flashcards || []).map((fc, i) => `
    <div class="flashcard-box">
      <div class="fc-head">
        <span class="fc-id">Card #${fc.id || (i + 1)}</span>
        <span class="fc-cat">${escapeHtml(fc.category || 'Review')}</span>
      </div>
      <div class="fc-question">
        <b>Question:</b> ${escapeHtml(fc.front)}
        ${fc.vernacular_front ? `<div class="fc-vq">${escapeHtml(fc.vernacular_front)}</div>` : ''}
      </div>
      <div class="fc-answer">
        <b>Answer:</b> ${escapeHtml(fc.back)}
      </div>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>ClassBridge Study Guide — ${escapeHtml(guide.title || 'Lecture')}</title>
      <style>
        @page {
          size: A4;
          margin: 12mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Tamil", "Noto Sans Malayalam", "Noto Sans Devanagari", "Nirmala UI", sans-serif;
          color: #0f172a;
          background: #ffffff;
          line-height: 1.5;
          padding: 24px;
        }
        
        .print-banner {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 10px 16px;
          margin-bottom: 20px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          color: #1e40af;
        }
        .btn-print {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 7px 18px;
          border-radius: 5px;
          font-weight: 700;
          cursor: pointer;
          font-size: 13px;
        }

        .header {
          border-bottom: 2.5px solid #1e3a8a;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .doc-title {
          font-size: 24px;
          font-weight: 800;
          color: #1e3a8a;
          margin-bottom: 6px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 10px;
          background: #f8fafc;
          padding: 10px 14px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-size: 11.5px;
          color: #475569;
        }
        .meta-grid b {
          color: #0f172a;
        }

        .section {
          margin-bottom: 24px;
          page-break-inside: auto;
        }
        .section-title {
          font-size: 15px;
          font-weight: 800;
          color: #1e3a8a;
          border-left: 4px solid #0284c7;
          padding-left: 10px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        /* 1. Overview */
        .overview-box {
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 8px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ov-en {
          font-size: 13px;
          color: #14532d;
          line-height: 1.6;
        }
        .ov-vernacular {
          font-size: 13px;
          color: #166534;
          background: rgba(255, 255, 255, 0.7);
          padding: 10px 12px;
          border-radius: 6px;
          border-left: 3px solid #22c55e;
          line-height: 1.6;
        }

        /* 2. Concept Map & Visuals */
        .visual-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }
        .visual-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 14px;
          background: #f8fafc;
          page-break-inside: avoid;
        }
        .visual-title {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .svg-diagram {
          width: 100%;
          max-height: 180px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        .visual-caption {
          font-size: 11px;
          color: #64748b;
          font-style: italic;
        }
        .equation-card {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 14px;
          text-align: center;
          margin-bottom: 14px;
          page-break-inside: avoid;
        }
        .eq-title {
          font-size: 12px;
          font-weight: 700;
          color: #92400e;
          margin-bottom: 6px;
        }
        .eq-formula {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 20px;
          font-weight: 700;
          color: #b45309;
          padding: 8px 0;
        }
        .eq-caption {
          font-size: 11px;
          color: #78350f;
        }
        .nodes-flow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          background: #f1f5f9;
          padding: 12px;
          border-radius: 8px;
        }
        .concept-node-item {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 11.5px;
        }
        .node-badge {
          font-weight: 700;
          color: #1e3a8a;
        }
        .node-type {
          font-size: 10px;
          color: #64748b;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .progression-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 0;
        }
        .node-box {
          border: 1px solid #0284c7;
          background: #f0f9ff;
          padding: 8px 12px;
          border-radius: 6px;
          text-align: center;
        }
        .node-box-title {
          font-size: 11px;
          font-weight: 700;
          color: #0369a1;
        }
        .node-box-detail {
          font-size: 9.5px;
          color: #64748b;
        }
        .arrow {
          font-size: 16px;
          color: #f59e0b;
        }

        /* 3. Definitions */
        .def-table {
          width: 100%;
          border-collapse: collapse;
          page-break-inside: auto;
          font-size: 12px;
        }
        .def-table th {
          background: #1e3a8a;
          color: #ffffff;
          text-align: left;
          padding: 8px 10px;
          font-size: 11px;
        }
        .def-table td {
          border: 1px solid #e2e8f0;
          padding: 8px 10px;
          vertical-align: top;
        }
        .def-table tr:nth-child(even) {
          background: #f8fafc;
        }
        .td-term {
          width: 25%;
          color: #0f172a;
        }
        .td-vernacular {
          color: #0284c7;
          font-size: 11px;
          margin-top: 2px;
        }
        .td-cat {
          width: 15%;
        }
        .cat-pill {
          background: #e0f2fe;
          color: #0369a1;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        }
        .td-def {
          width: 60%;
          color: #334155;
          line-height: 1.5;
        }

        /* 4. Formulas */
        .formula-block {
          background: #f8fafc;
          border: 1px solid #93c5fd;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 10px;
          page-break-inside: avoid;
        }
        .f-name {
          font-size: 12.5px;
          font-weight: 700;
          color: #1e3a8a;
        }
        .f-latex {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          background: #ffffff;
          border: 1px dashed #cbd5e1;
          padding: 6px 10px;
          border-radius: 4px;
          margin: 6px 0;
        }
        .f-desc {
          font-size: 11.5px;
          color: #334155;
        }
        .f-vars {
          font-size: 10.5px;
          color: #64748b;
          font-style: italic;
          margin-top: 3px;
        }

        /* 5. Takeaways */
        .takeaway-row {
          display: flex;
          gap: 12px;
          padding: 8px 10px;
          border-bottom: 1px solid #f1f5f9;
          page-break-inside: avoid;
        }
        .takeaway-badge {
          font-size: 11px;
          font-weight: 700;
          color: #0284c7;
          background: #e0f2fe;
          padding: 3px 8px;
          border-radius: 4px;
          white-space: nowrap;
          height: fit-content;
        }
        .takeaway-text {
          flex: 1;
        }
        .takeaway-en {
          font-size: 12.5px;
          color: #0f172a;
          font-weight: 500;
        }
        .takeaway-vernacular {
          font-size: 11.5px;
          color: #0369a1;
          margin-top: 2px;
        }

        /* 6. Flashcards */
        .flashcards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
        }
        .flashcard-box {
          border: 1px solid #bfdbfe;
          background: #ffffff;
          border-radius: 8px;
          padding: 12px;
          page-break-inside: avoid;
        }
        .fc-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .fc-id {
          font-size: 11px;
          font-weight: 800;
          color: #1e40af;
        }
        .fc-cat {
          font-size: 10px;
          background: #eff6ff;
          color: #2563eb;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .fc-question {
          font-size: 12px;
          color: #1e293b;
          margin-bottom: 6px;
        }
        .fc-vq {
          font-size: 11px;
          color: #0284c7;
          margin-top: 2px;
        }
        .fc-answer {
          font-size: 11.5px;
          color: #15803d;
          background: #f0fdf4;
          padding: 6px 8px;
          border-radius: 4px;
          border-left: 2px solid #22c55e;
        }

        .footer {
          margin-top: 30px;
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          font-size: 10.5px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }

        @media print {
          .print-banner {
            display: none !important;
          }
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-banner">
        <span>📄 Complete Study Guide Ready — Click <b>Save as PDF</b> to download all sections.</span>
        <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
      </div>

      <div class="header">
        <div class="doc-title">🎓 ${escapeHtml(guide.title || 'STEM Lecture Study Guide')}</div>
        <div class="meta-grid">
          <div><b>Session Date:</b> ${escapeHtml(dateFormatted)}</div>
          <div><b>Target Language:</b> ${escapeHtml(langMeta.name)} (${escapeHtml(langMeta.native)})</div>
          <div><b>Segments Analyzed:</b> ${segmentCount}</div>
          <div><b>Architecture:</b> Grounded Gemini AI</div>
        </div>
      </div>

      <!-- 1. Executive Overview -->
      <div class="section">
        <div class="section-title">1. Executive Overview</div>
        <div class="overview-box">
          <div class="ov-en"><b>Summary:</b> ${escapeHtml(overviewEn)}</div>
          ${overviewVernacular ? `<div class="ov-vernacular"><b>Vernacular Translation (${escapeHtml(langMeta.name)}):</b> ${escapeHtml(overviewVernacular)}</div>` : ''}
        </div>
      </div>

      <!-- 2. Concept Map & Visuals -->
      <div class="section">
        <div class="section-title">2. Concept Map & Knowledge Architecture</div>
        <div class="visual-container">
          ${visualDiagramHtml}
        </div>
        ${equationHtml}
        ${nodes.length > 0 ? `
          <div style="font-size: 12px; font-weight: 700; color: #1e3a8a; margin-bottom: 6px;">Knowledge Graph Concepts:</div>
          <div class="nodes-flow">
            ${nodesHtml}
          </div>
        ` : ''}
      </div>

      <!-- 3. Key Definitions -->
      ${(guide.definitions && guide.definitions.length > 0) ? `
        <div class="section">
          <div class="section-title">3. Key Scientific & Technical Definitions (${guide.definitions.length})</div>
          <table class="def-table">
            <thead>
              <tr>
                <th>STEM Term & Vernacular</th>
                <th>Category</th>
                <th>Formal Definition</th>
              </tr>
            </thead>
            <tbody>
              ${defsHtml}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- 4. Mathematical Formulas -->
      ${(guide.formulas && guide.formulas.length > 0) ? `
        <div class="section">
          <div class="section-title">4. Core Mathematical Formulas & Equations (${guide.formulas.length})</div>
          <div>
            ${formulasHtml}
          </div>
        </div>
      ` : ''}

      <!-- 5. Key Takeaways -->
      ${(guide.takeaways && guide.takeaways.length > 0) ? `
        <div class="section">
          <div class="section-title">5. Key Lecture Takeaways & Timestamps (${guide.takeaways.length})</div>
          <div>
            ${takeawaysHtml}
          </div>
        </div>
      ` : ''}

      <!-- 6. Review Flashcards -->
      ${(guide.flashcards && guide.flashcards.length > 0) ? `
        <div class="section">
          <div class="section-title">6. Interactive Self-Test Flashcards (${guide.flashcards.length})</div>
          <div class="flashcards-grid">
            ${flashcardsHtml}
          </div>
        </div>
      ` : ''}

      <div class="footer">
        <span>ClassBridge — Real-Time Vernacular Lecture Companion</span>
        <span>TENSORA 2026 | Problem EDU-02</span>
      </div>

      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 350);
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
