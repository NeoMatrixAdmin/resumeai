import { jsPDF } from 'jspdf';

const NAVY  = [30, 58, 95]    as const;
const BLACK = [15, 15, 15]    as const;
const DARK  = [35, 35, 35]    as const;
const MID   = [90, 90, 90]    as const;
const LIGHT = [150, 150, 150] as const;
const RULE  = [210, 218, 228] as const;

function buildResumePDF(
  resumeText: string,
  cfg: { fs: number; lh: number; sg: number; bg: number }
): { doc: jsPDF; pages: number } {

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 54, MR = 54, MT = 46, MB = 44;
  const CW = PW - ML - MR;
  let y = MT;
  const { fs, lh, sg, bg } = cfg;

  const check = (n: number) => {
    if (y + n > PH - MB) { doc.addPage(); y = MT; }
  };
  const setC = (rgb: readonly [number, number, number]) =>
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setD = (rgb: readonly [number, number, number]) =>
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  const setF = (rgb: readonly [number, number, number]) =>
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);

  // ── Detectors ──────────────────────────────────────────────

  const isBullet = (s: string) => /^\s*[•\-\*]/.test(s);

  const isContact = (s: string, idx: number): boolean => {
    if (idx > 8) return false;
    const t = s.trim();
    return (
      t.includes('@') ||
      t.includes('+91') ||
      t.toLowerCase().includes('linkedin') ||
      t.toLowerCase().includes('github') ||
      (t.includes('•') && idx < 6 && t.length < 140)
    );
  };

  const isSkillsLine = (s: string): boolean => {
    const t = s.trim();
    const ci = t.indexOf(':');
    if (ci === -1) return false;
    const label = t.slice(0, ci).trim();
    const value = t.slice(ci + 1).trim();
    // Label must be short (1-3 words), value must have content
    return (
      label.split(/\s+/).length <= 3 &&
      value.length > 3 &&
      label.length < 35 &&
      !isBullet(t)
    );
  };

  const isSection = (s: string): boolean => {
    const t = s.trim();
    if (!t || t.length > 52) return false;
    if (isBullet(t)) return false;
    if (t.includes('@') || t.includes('+')) return false;
    if (isSkillsLine(s)) return false;
    if (t.includes('•') && t.length > 25) return false;
    const words = t.split(/\s+/);
    if (words.length > 4) return false;
    const allCaps = t === t.toUpperCase() && /[A-Z]/.test(t) && !/^\d/.test(t);
    const titleCase =
      words.length <= 3 &&
      words.every(w => !w[0] || w[0] === w[0].toUpperCase());
    return allCaps || titleCase;
  };

  const isProjectTitle = (s: string, next: string): boolean => {
    const t = s.trim();
    if (!t || isBullet(t)) return false;
    if (isContact(t, 99)) return false;
    if (isSection(t)) return false;
    if (isSkillsLine(t)) return false;
    if (/cgpa|gpa|relevant|coursework|b\.tech|b\.e\.|bachelor|master|icse|cbse/i.test(t))
      return false;
    // Explicit pipe separator
    if (t.includes(' | ')) return true;
    // AI dropped the pipe — short line before a bullet = project title
    if (t.length < 100 && isBullet(next)) return true;
    return false;
  };

  const isEduLine = (s: string): boolean =>
    /b\.tech|b\.e\.|bachelor|master|university|institute|cgpa|gpa|icse|cbse|hsc|ssc/i.test(
      s.trim()
    ) ||
    ((s.includes('–') || s.includes(' - ')) &&
      s.trim().length < 70 &&
      !s.trim().includes('•'));

  // Skip "Relevant Coursework" lines entirely
  const isCoursework = (s: string): boolean =>
    /relevant\s+coursework/i.test(s.trim());

  // ── Parse ────────────────────────────────────────────────────
  const lines = resumeText.split('\n');
  let li = 0;

  // ── NAME — use Times Bold for distinction ──────────────────
  const nameLine = lines[li]?.trim() ?? '';
  if (nameLine) {
    doc.setFont('times', 'bold');
    doc.setFontSize(fs + 16);
    setC(BLACK);
    const nw = doc.getTextWidth(nameLine);
    doc.text(nameLine, (PW - nw) / 2, y);
    y += fs + 21;
    li++;
  }

  // ── CONTACT ────────────────────────────────────────────────
  const contactParts: string[] = [];
  while (li < lines.length && isContact(lines[li], li)) {
    const t = lines[li].trim();
    if (t) {
      const parts = t.split(/\s*•\s*/).map(p => p.trim()).filter(Boolean);
      contactParts.push(...parts);
    }
    li++;
  }

  if (contactParts.length) {
    // Try progressively smaller font until it fits on one line
    let contactFontSize = fs - 0.5;
    let joined = contactParts.join('  •  ');
    doc.setFont('helvetica', 'normal');

    for (let attempt = 0; attempt < 5; attempt++) {
      doc.setFontSize(contactFontSize);
      const jw = doc.getTextWidth(joined);
      if (jw <= CW + 10) break;
      contactFontSize -= 0.4;
    }

    setC(MID);
    const finalW = doc.getTextWidth(joined);
    doc.text(joined, (PW - finalW) / 2, y);
    y += lh;
  }

  // Navy header rule
  y += 8;
  setD(NAVY);
  doc.setLineWidth(1.5);
  doc.line(ML, y, ML + CW, y);
  y += lh + 3;

  // ── BODY ───────────────────────────────────────────────────
  for (; li < lines.length; li++) {
    const raw     = lines[li];
    const trimmed = raw.trim();
    const next    = lines[li + 1] ?? '';

    // Skip blank lines
    if (!trimmed) { y += bg; continue; }

    // Skip "Relevant Coursework" lines entirely
    if (isCoursework(raw)) continue;

    // ── SECTION HEADER ──────────────────────────────────
    if (isSection(raw)) {
      check(sg + 24);
      y += sg;
      setF(NAVY);
      doc.rect(ML, y - 11, 3, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fs);
      setC(NAVY);
      doc.text(trimmed.toUpperCase(), ML + 9, y);
      y += 5;
      setD(RULE);
      doc.setLineWidth(0.4);
      doc.line(ML + 9, y, ML + CW, y);
      y += lh;
      continue;
    }

    // ── PROJECT / JOB TITLE ─────────────────────────────
    if (isProjectTitle(raw, next)) {
      check(lh + 4);
      y += 3;
      let title = trimmed;
      let tech  = '';
      if (trimmed.includes(' | ')) {
        const parts = trimmed.split(' | ');
        title = parts[0].trim();
        tech  = parts.slice(1).join(' | ').trim();
      } else {
        // AI dropped the | — try to split on double space first
        const doubleSpace = trimmed.match(/^(.+?)\s{2,}(.+)$/);
        if (doubleSpace) {
          title = doubleSpace[1].trim();
          tech  = doubleSpace[2].trim();
        } else {
          // Last resort: split where text transitions from words to
          // a tech-looking comma-separated list
          // e.g. "Multi-Agent AI Research System Python, LLMs, Tool Orchestration"
          const techPattern = trimmed.match(
            /^(.*?)\s+([A-Z][a-z]+(?:\+\+|\.js|\.ts)?,.*|Python.*|Django.*|React.*|Node.*|Java\b.*)$/
          );
          if (techPattern) {
            title = techPattern[1].trim();
            tech  = techPattern[2].trim();
          }
        }
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fs);
      setC(DARK);
      doc.text(title, ML, y);

      if (tech) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(fs - 1);
        setC(NAVY);
        const techW  = doc.getTextWidth(tech);
        const titleW = doc.getTextWidth(title);
        if (titleW + techW + 20 <= CW) {
          doc.text(tech, ML + CW - techW, y);
        } else {
          y += lh - 2;
          check(lh);
          doc.text(tech, ML, y);
        }
      }
      y += lh;
      continue;
    }

    // ── BULLET ──────────────────────────────────────────
    if (isBullet(raw)) {
      const content = trimmed.replace(/^[•\-\*]\s*/, '');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fs);
      setC(DARK);
      const wrapped = doc.splitTextToSize(content, CW - 16);
      check(wrapped.length * lh + 2);
      setF(NAVY);
      doc.circle(ML + 4, y - 3.5, 1.5, 'F');
      for (let wi = 0; wi < wrapped.length; wi++) {
        if (wi > 0) check(lh);
        doc.text(wrapped[wi], ML + 13, y);
        y += lh;
      }
      continue;
    }

    // ── SKILLS LINE ─────────────────────────────────────
    if (isSkillsLine(raw)) {
      check(lh);
      const ci    = trimmed.indexOf(':');
      const label = trimmed.slice(0, ci).trim();
      const value = trimmed.slice(ci + 1).trim();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fs);
      setC(NAVY);
      doc.text(label + ':', ML, y);
      const lw = doc.getTextWidth(label + ':  ');
      doc.setFont('helvetica', 'normal');
      setC(DARK);
      const wrapped = doc.splitTextToSize(value, CW - lw);
      doc.text(wrapped[0], ML + lw, y);
      for (let vi = 1; vi < wrapped.length; vi++) {
        y += lh;
        check(lh);
        doc.text(wrapped[vi], ML + lw, y);
      }
      y += lh;
      continue;
    }

    // ── NORMAL / EDUCATION ───────────────────────────────
    check(lh);
    const bold = isEduLine(raw);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fs);
    setC(bold ? DARK : MID);
    const wrapped = doc.splitTextToSize(trimmed, CW);
    for (const wl of wrapped) {
      check(lh);
      doc.text(wl, ML, y);
      y += lh;
    }
  }

  // FOOTER — page numbers only on multi-page resumes
  const total = (doc.internal as any).getNumberOfPages();
  if (total > 1) {
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      setD(RULE);
      doc.setLineWidth(0.4);
      doc.line(ML, PH - 28, ML + CW, PH - 28);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setC(LIGHT);
      const pt = `Page ${p} of ${total}`;
      doc.text(pt, ML + CW - doc.getTextWidth(pt), PH - 16);
    }
  }

  return { doc, pages: (doc.internal as any).getNumberOfPages() };
}

export function downloadResumePDF(resumeText: string, fileName: string = 'resume') {
  const configs = [
    { fs: 9.5,  lh: 13,   sg: 8, bg: 4 },
    { fs: 9.2,  lh: 12.5, sg: 7, bg: 3 },
    { fs: 8.9,  lh: 12,   sg: 6, bg: 3 },
    { fs: 8.6,  lh: 11.5, sg: 5, bg: 2 },
    { fs: 8.3,  lh: 11,   sg: 4, bg: 2 },
    { fs: 8.0,  lh: 10.5, sg: 3, bg: 1 },
  ];

  let best = buildResumePDF(resumeText, configs[0]);
  for (const cfg of configs) {
    const attempt = buildResumePDF(resumeText, cfg);
    best = attempt;
    if (attempt.pages === 1) break;
  }

  const safeName = fileName
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9_\- ]/g, '');
  best.doc.save(`${safeName}_optimized.pdf`);
}

export async function downloadCoverLetterDOCX(
  coverLetterText: string,
  candidateName: string = 'Candidate'
) {
  const { Document, Packer, Paragraph, TextRun, BorderStyle } = await import('docx');
  const { saveAs } = await import('file-saver');

  const paras = coverLetterText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 23, color: '1a1a1a' },
          paragraph: { spacing: { line: 340 } },
        },
      },
    },
    sections: [{
      properties: {
        page: { margin: { top: 1080, bottom: 1080, left: 1134, right: 1134 } },
      },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: candidateName,
              bold: true,
              size: 36,
              font: 'Calibri',
              color: '1e3a5f',
            }),
          ],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [new TextRun({ text: '' })],
          border: {
            bottom: { color: '1e3a5f', space: 6, style: BorderStyle.SINGLE, size: 12 },
          },
          spacing: { after: 320 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: today,
              size: 20,
              font: 'Calibri',
              color: '888888',
              italics: true,
            }),
          ],
          spacing: { after: 320 },
        }),
        ...paras.map((para, i) =>
          new Paragraph({
            children: [
              new TextRun({ text: para, size: 23, font: 'Calibri', color: '1a1a1a' }),
            ],
            spacing: { after: i < paras.length - 1 ? 280 : 480, line: 360 },
          })
        ),
        new Paragraph({
          children: [
            new TextRun({ text: 'Sincerely,', size: 23, font: 'Calibri', color: '1a1a1a' }),
          ],
          spacing: { after: 480 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: candidateName,
              bold: true,
              size: 23,
              font: 'Calibri',
              color: '1e3a5f',
            }),
          ],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${candidateName.replace(/\s+/g, '_')}_cover_letter.docx`);
}   