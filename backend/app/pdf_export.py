import io
import logging
from typing import Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas

logger = logging.getLogger("classbridge.pdf_export")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header rule & title
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, letter[1] - 40, letter[0] - 54, letter[1] - 40)
        self.drawString(54, letter[1] - 35, "ClassBridge — Real-Time Vernacular Lecture Companion")
        
        # Footer
        self.line(54, 45, letter[0] - 54, 45)
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 32, page_text)
        self.drawString(54, 32, "TENSORA 2026 | Problem EDU-02 | Grounded AI Synthesis")
        self.restoreState()


class PDFExportService:
    """
    Generates structured, professional academic PDF study guides
    from synthesized lecture notes.
    """

    def generate_pdf(self, guide_data: Dict[str, Any]) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = getSampleStyleSheet()
        
        # Custom palette
        primary = colors.HexColor("#1e3a8a")     # Deep blue
        secondary = colors.HexColor("#0284c7")   # Sky blue
        accent = colors.HexColor("#0f766e")      # Teal
        dark_text = colors.HexColor("#0f172a")   # Slate 900
        muted_text = colors.HexColor("#475569")  # Slate 600
        card_bg = colors.HexColor("#f8fafc")     # Slate 50
        border_col = colors.HexColor("#e2e8f0")

        # Custom paragraph styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=primary,
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=muted_text,
            spaceAfter=14
        )
        h2_style = ParagraphStyle(
            "SectionH2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=primary,
            spaceBefore=12,
            spaceAfter=8,
            keepWithNext=True
        )
        body_style = ParagraphStyle(
            "DocBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=dark_text,
            spaceAfter=6
        )
        code_formula_style = ParagraphStyle(
            "FormulaBox",
            parent=styles["Normal"],
            fontName="Courier-Bold",
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#1e293b")
        )

        story = []

        # Header Title
        title_text = guide_data.get("title", "STEM Lecture Study Guide")
        story.append(Paragraph(f"🎓 {title_text}", title_style))

        date_str = guide_data.get("date", "Session Notes")
        target_lang = guide_data.get("target_language", "Tamil")
        native_lang = guide_data.get("native_language", "தமிழ்")
        seg_count = guide_data.get("segment_count", 0)
        
        meta_str = f"<b>Date:</b> {date_str} &nbsp;|&nbsp; <b>Target Language:</b> {target_lang} ({native_lang}) &nbsp;|&nbsp; <b>Segments Analyzed:</b> {seg_count}"
        story.append(Paragraph(meta_str, subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1, color=primary, spaceBefore=0, spaceAfter=14))

        # 1. Executive Overview
        story.append(Paragraph("1. Executive Overview", h2_style))
        overview = guide_data.get("overview", {})
        en_overview = overview.get("en", "No overview provided.")
        vernacular_overview = overview.get("vernacular", "")

        overview_data = [
            [Paragraph(f"<b>Summary:</b> {en_overview}", body_style)],
            [Paragraph(f"<b>Vernacular Translation:</b> {vernacular_overview}", body_style)]
        ]
        t_overview = Table(overview_data, colWidths=[letter[0] - 108])
        t_overview.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#86efac")),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(t_overview)
        story.append(Spacer(1, 14))

        # 2. Conceptual Architecture & Knowledge Map
        diagram = guide_data.get("diagram", {})
        nodes = diagram.get("nodes", [])
        visuals = guide_data.get("visuals", {})

        if nodes or visuals:
            story.append(Paragraph("2. Conceptual Architecture & Knowledge Map", h2_style))
            diag_title = diagram.get("title", f"{title_text} Concept Hierarchy")
            diag_src = diagram.get("source", "Grounded AI Concept Graph")
            story.append(Paragraph(f"<b>Architecture:</b> {diag_title} &nbsp;|&nbsp; <i>{diag_src}</i>", body_style))

            if nodes:
                node_rows = [
                    [
                        Paragraph("<b>Node ID</b>", ParagraphStyle("HdrNId", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white)),
                        Paragraph("<b>Concept Principle</b>", ParagraphStyle("HdrNLbl", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white)),
                        Paragraph("<b>Classification / Detail</b>", ParagraphStyle("HdrNDet", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white)),
                        Paragraph("<b>Relationship Flow</b>", ParagraphStyle("HdrNRel", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white))
                    ]
                ]
                edges = diagram.get("edges", [])
                for n in nodes:
                    nid = n.get("id", "")
                    nlabel = n.get("label", "")
                    ndetail = n.get("detail", "")

                    connected = []
                    for e in edges:
                        if e.get("from") == nid:
                            target_node = next((x for x in nodes if x.get("id") == e.get("to")), None)
                            t_label = target_node.get("label") if target_node else e.get("to")
                            connected.append(f"➔ {t_label}")
                        elif e.get("to") == nid:
                            source_node = next((x for x in nodes if x.get("id") == e.get("from")), None)
                            s_label = source_node.get("label") if source_node else e.get("from")
                            connected.append(f"⬅ {s_label}")

                    rel_str = ", ".join(connected) if connected else "Core Anchor"

                    node_rows.append([
                        Paragraph(f"<b>{nid}</b>", ParagraphStyle("NIdCell", fontName="Helvetica", fontSize=8, textColor=muted_text)),
                        Paragraph(f"<b>{nlabel}</b>", ParagraphStyle("NLblCell", fontName="Helvetica-Bold", fontSize=9, textColor=primary)),
                        Paragraph(ndetail, body_style),
                        Paragraph(rel_str, ParagraphStyle("NRelCell", fontName="Helvetica-Oblique", fontSize=8, textColor=accent))
                    ])

                t_nodes = Table(node_rows, colWidths=[80, 140, 140, letter[0] - 108 - 360])
                t_nodes.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), secondary),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.5, border_col),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, card_bg]),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ]))
                story.append(t_nodes)
                story.append(Spacer(1, 8))

            # Visual diagram model summaries
            for vkey, vval in visuals.items():
                if vkey != "equation" and isinstance(vval, dict) and "caption" in vval:
                    cap_text = vval["caption"]
                    vname = {
                        "thermoCycle": "Thermodynamic Energy Balance",
                        "photosynthesis": "Dual-Phase Photosynthetic Pathway",
                        "cellularRespiration": "Cellular Respiration Metabolic Flow",
                        "vectorTransform": "Eigenvector Linear Scaling",
                        "lossCurve": "Convergence Optimization Profile",
                        "network": "Neural Error Propagation",
                        "conceptFlow": "Concept Progression Pipeline"
                    }.get(vkey, vkey.capitalize())
                    story.append(Paragraph(f"• <b>Visual Diagram [{vname}]:</b> <i>{cap_text}</i>", body_style))

            # Governing Equation
            if visuals.get("equation"):
                eq = visuals["equation"]
                eq_title = eq.get("title", "Governing Mathematical Law")
                eq_latex = eq.get("latex", "")
                eq_cap = eq.get("caption", "")
                eq_table_data = [
                    [Paragraph(f"<b>Governing Law: {eq_title}</b>", ParagraphStyle("EqT", fontName="Helvetica-Bold", fontSize=10, textColor=primary))],
                    [Paragraph(eq_latex, code_formula_style)],
                    [Paragraph(f"<b>Significance:</b> {eq_cap}", body_style)]
                ]
                t_eq = Table(eq_table_data, colWidths=[letter[0] - 108])
                t_eq.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fffbeb")),
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#fde68a")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]))
                story.append(Spacer(1, 4))
                story.append(KeepTogether([t_eq, Spacer(1, 6)]))

            story.append(Spacer(1, 10))

        # 3. Key Definitions
        definitions = guide_data.get("definitions", [])
        if definitions:
            story.append(Paragraph("3. Key Scientific & Technical Definitions", h2_style))
            def_rows = [
                [
                    Paragraph("<b>STEM Term & Vernacular</b>", ParagraphStyle("Hdr", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white)),
                    Paragraph("<b>Category</b>", ParagraphStyle("Hdr", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white)),
                    Paragraph("<b>Formal Definition</b>", ParagraphStyle("Hdr", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white))
                ]
            ]
            for d in definitions:
                term_cell = f"<b>{d.get('term', '')}</b><br/><font color='#0369a1'>{d.get('vernacular_term', '')}</font>"
                cat_cell = f"<i>{d.get('category', 'STEM')}</i>"
                desc_cell = f"{d.get('definition', '')}"
                def_rows.append([
                    Paragraph(term_cell, body_style),
                    Paragraph(cat_cell, body_style),
                    Paragraph(desc_cell, body_style)
                ])

            t_defs = Table(def_rows, colWidths=[150, 90, letter[0] - 108 - 240])
            t_defs.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), primary),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, border_col),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, card_bg]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(t_defs)
            story.append(Spacer(1, 14))

        # 4. Formulas & Equations
        formulas = guide_data.get("formulas", [])
        if formulas:
            story.append(Paragraph("4. Core Mathematical Formulas & Equations", h2_style))
            for f in formulas:
                f_name = f.get("name", "Formula")
                f_latex = f.get("latex", "")
                f_desc = f.get("description", "")
                f_vars = f.get("variables", "")

                formula_table_data = [
                    [Paragraph(f"<b>{f_name}</b>", ParagraphStyle("FTitle", fontName="Helvetica-Bold", fontSize=10, textColor=primary))],
                    [Paragraph(f_latex, code_formula_style)],
                    [Paragraph(f"<b>Significance:</b> {f_desc}", body_style)],
                    [Paragraph(f"<b>Variables:</b> {f_vars}", ParagraphStyle("FVars", fontName="Helvetica-Oblique", fontSize=9, textColor=muted_text))]
                ]
                t_f = Table(formula_table_data, colWidths=[letter[0] - 108])
                t_f.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), card_bg),
                    ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#93c5fd")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]))
                story.append(KeepTogether([t_f, Spacer(1, 8)]))
            story.append(Spacer(1, 6))

        # 5. Bulleted Takeaways
        takeaways = guide_data.get("takeaways", [])
        if takeaways:
            story.append(Paragraph("5. Key Lecture Takeaways & Timestamps", h2_style))
            for t in takeaways:
                t_pt = t.get("point", "")
                t_vpt = t.get("vernacular_point", "")
                t_ts = t.get("timestamp", "")
                
                point_html = f"• <b>[{t_ts}]</b> {t_pt}<br/>&nbsp;&nbsp;&nbsp;<font color='#0284c7'>➔ {t_vpt}</font>"
                story.append(Paragraph(point_html, body_style))
            story.append(Spacer(1, 14))

        # 6. Review Flashcards
        flashcards = guide_data.get("flashcards", [])
        if flashcards:
            story.append(Paragraph("6. Interactive Self-Test Flashcards", h2_style))
            for fc in flashcards:
                q_text = fc.get("front", "")
                vq_text = fc.get("vernacular_front", "")
                ans_text = fc.get("back", "")
                cat = fc.get("category", "Review")

                fc_data = [
                    [Paragraph(f"<b>Card #{fc.get('id', 1)} [{cat}] — Question:</b> {q_text} ({vq_text})", ParagraphStyle("FCQ", fontName="Helvetica-Bold", fontSize=9, textColor=colors.HexColor("#1e40af")))],
                    [Paragraph(f"<b>Answer:</b> {ans_text}", ParagraphStyle("FCA", fontName="Helvetica", fontSize=9, textColor=dark_text))]
                ]
                t_fc = Table(fc_data, colWidths=[letter[0] - 108])
                t_fc.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eff6ff")),
                    ("BACKGROUND", (0, 1), (-1, 1), colors.white),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#bfdbfe")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]))
                story.append(KeepTogether([t_fc, Spacer(1, 6)]))

        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()

    def generate_captions_pdf(
        self,
        segments: list,
        source_lang: str = "en",
        target_lang: str = "ta",
        title: str = "ClassBridge Live Bilingual Lecture Captions"
    ) -> bytes:
        import html
        from datetime import datetime

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = getSampleStyleSheet()
        primary = colors.HexColor("#1e3a8a")     # Deep blue
        secondary = colors.HexColor("#0284c7")   # Sky blue
        accent = colors.HexColor("#0f766e")      # Teal
        dark_text = colors.HexColor("#0f172a")   # Slate 900
        muted_text = colors.HexColor("#475569")  # Slate 600
        card_bg = colors.HexColor("#f8fafc")     # Slate 50
        border_col = colors.HexColor("#cbd5e1")  # Slate 300

        title_style = ParagraphStyle(
            "CapDocTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=primary,
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            "CapDocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=muted_text,
            spaceAfter=12
        )
        meta_style = ParagraphStyle(
            "CapMeta",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#1e40af")
        )
        src_style = ParagraphStyle(
            "CapSrc",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=dark_text
        )
        tgt_style = ParagraphStyle(
            "CapTgt",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#047857")
        )
        term_style = ParagraphStyle(
            "CapTerms",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#0369a1")
        )

        story = []
        safe_title = html.escape(title)
        story.append(Paragraph(f"🎓 {safe_title}", title_style))

        date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        avg_conf = 0
        if segments:
            avg_conf = round(sum(s.get("confidence", 95) for s in segments) / len(segments))

        lang_map = {
            "en": "English",
            "ta": "Tamil (தமிழ்)",
            "ml": "Malayalam (മലയാളം)",
            "hi": "Hindi (हिन्दी)"
        }
        src_name = lang_map.get(source_lang.lower(), source_lang.upper())
        tgt_name = lang_map.get(target_lang.lower(), target_lang.upper())

        meta_text = (
            f"<b>Export Date:</b> {date_str} &nbsp;|&nbsp; "
            f"<b>Direction:</b> [{source_lang.upper()}] {src_name} ➔ [{target_lang.upper()}] {tgt_name} &nbsp;|&nbsp; "
            f"<b>Segments:</b> {len(segments)} &nbsp;|&nbsp; <b>Avg Confidence:</b> {avg_conf}%"
        )
        story.append(Paragraph(meta_text, subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=primary, spaceBefore=0, spaceAfter=14))

        if not segments:
            empty_style = ParagraphStyle("EmptyNotice", fontName="Helvetica-Oblique", fontSize=11, textColor=muted_text)
            story.append(Paragraph("No live lecture captions recorded in this session yet.", empty_style))
        else:
            for idx, seg in enumerate(segments):
                ts = seg.get("timestamp")
                if not ts:
                    start_s = seg.get("start", idx * 4)
                    end_s = seg.get("end", (idx + 1) * 4)
                    ts = f"{int(start_s // 60):02d}:{int(start_s % 60):02d} - {int(end_s // 60):02d}:{int(end_s % 60):02d}"
                
                conf = round(seg.get("confidence", 95))
                src_text = html.escape(str(seg.get("text_source") or seg.get("text_en") or ""))
                tgt_text = html.escape(str(seg.get("text_vernacular") or ""))

                terms = seg.get("domain_terms", [])
                terms_str = ""
                if terms:
                    term_names = []
                    for t in terms:
                        t_en = t.get("en") or t.get("term") or ""
                        t_v = (t.get("translations") or {}).get(target_lang) or ""
                        term_names.append(f"{t_en} ({t_v})" if t_v else t_en)
                    terms_str = f"🔬 STEM Terms: {', '.join(term_names)}"

                card_rows = [
                    [Paragraph(f"<b>Segment #{idx + 1}</b> &nbsp;|&nbsp; ⏱️ <b>{ts}</b> &nbsp;|&nbsp; 🎯 Confidence: <b>{conf}%</b>", meta_style)],
                    [Paragraph(f"<b>[{source_lang.upper()}]:</b> {src_text}", src_style)],
                    [Paragraph(f"<b>[{target_lang.upper()}]:</b> {tgt_text}", tgt_style)],
                ]
                if terms_str:
                    card_rows.append([Paragraph(html.escape(terms_str), term_style)])

                t_card = Table(card_rows, colWidths=[letter[0] - 108])
                t_card.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                    ("BOX", (0, 0), (-1, -1), 0.75, border_col),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.5, border_col),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]))
                story.append(KeepTogether([t_card, Spacer(1, 8)]))

        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()

# Global singleton
pdf_export_service = PDFExportService()

