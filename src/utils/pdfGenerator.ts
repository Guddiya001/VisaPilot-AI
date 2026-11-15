import * as fs from 'node:fs';
import * as path from 'node:path';
import { sanitizeAtsText } from './atsSanitizer.ts';

export interface ResumePdfBasics {
  name: string;
  title: string;
  summary: string;
  location: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface ResumePdfExperience {
  role: string;
  company: string;
  client?: string;
  location?: string;
  period?: string;
  bullets: string[];
}

export interface ResumePdfProject {
  title: string;
  technologies?: string;
  bullets: string[];
}

export interface ResumePdfData {
  basics: ResumePdfBasics;
  skills: Record<string, string[]>;
  experience: ResumePdfExperience[];
  projects: ResumePdfProject[];
  education?: Array<{ degree: string; school: string; year?: string; location?: string }>;
  certifications?: string[];
}

/**
 * Escapes characters for PDF literal strings (...).
 */
function escapePdfString(str: string): string {
  const safeStr = sanitizeAtsText(str);
  return safeStr
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Wraps text into lines that fit within a maximum character width.
 */
function wrapText(text: string, maxCharsPerLine: number = 95): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Pure TypeScript ATS-Safe PDF Document Builder
 * Generates standards-compliant PDF 1.4 documents without native binary dependencies.
 */
export class ResumePdfDocument {
  private pages: string[] = [];
  private currentPageOps: string[] = [];
  private currentY: number = 800;
  private readonly pageHeight: number = 841.89; // A4 height in pt
  private readonly pageWidth: number = 595.28;  // A4 width in pt
  private readonly leftMargin: number = 40;
  private readonly rightMargin: number = 555;
  private readonly bottomMargin: number = 40;

  constructor() {
    this.newPage();
  }

  private newPage() {
    if (this.currentPageOps.length > 0) {
      this.pages.push(this.currentPageOps.join('\n'));
      this.currentPageOps = [];
    }
    this.currentY = this.pageHeight - 40;
  }

  private ensureSpace(requiredHeight: number) {
    if (this.currentY - requiredHeight < this.bottomMargin) {
      this.newPage();
    }
  }

  private addText(
    text: string,
    x: number,
    y: number,
    fontKey: 'F1' | 'F2' = 'F1',
    size: number = 9.5
  ) {
    const escaped = escapePdfString(text);
    this.currentPageOps.push(
      `BT\n/${fontKey} ${size} Tf\n${x.toFixed(2)} ${y.toFixed(2)} Td\n(${escaped}) Tj\nET`
    );
  }

  private addHorizontalRule(y: number) {
    this.currentPageOps.push(
      `0.75 w\n0.7 0.7 0.7 RG\n${this.leftMargin} ${y.toFixed(2)} m\n${this.rightMargin} ${y.toFixed(2)} l\nS`
    );
  }

  public renderHeader(basics: ResumePdfBasics) {
    // Name (Centered, Bold, 18pt)
    this.ensureSpace(80);
    const nameX = this.pageWidth / 2 - (basics.name.length * 4.8);
    this.addText(basics.name, Math.max(this.leftMargin, nameX), this.currentY, 'F2', 18);
    this.currentY -= 20;

    // Title (Centered, Bold, 11pt)
    const titleX = this.pageWidth / 2 - (basics.title.length * 3.1);
    this.addText(basics.title, Math.max(this.leftMargin, titleX), this.currentY, 'F2', 11);
    this.currentY -= 15;

    // Location & Visa Header (Centered, 9pt)
    const locX = this.pageWidth / 2 - (basics.location.length * 2.4);
    this.addText(basics.location, Math.max(this.leftMargin, locX), this.currentY, 'F1', 9);
    this.currentY -= 14;

    // Contact info & links (Centered, 8.5pt)
    const contactParts = [
      basics.email ? `Email: ${basics.email}` : '',
      basics.phone ? `Phone: ${basics.phone}` : '',
      basics.linkedin ? `LinkedIn: ${basics.linkedin}` : '',
      basics.github ? `GitHub: ${basics.github}` : '',
    ].filter(Boolean);

    const contactLine = contactParts.join(' | ');
    const contactX = this.pageWidth / 2 - (contactLine.length * 2.2);
    this.addText(contactLine, Math.max(this.leftMargin, contactX), this.currentY, 'F1', 8.5);
    this.currentY -= 20;
  }

  public renderSectionTitle(title: string) {
    this.ensureSpace(30);
    this.addText(title.toUpperCase(), this.leftMargin, this.currentY, 'F2', 11);
    this.currentY -= 4;
    this.addHorizontalRule(this.currentY);
    this.currentY -= 14;
  }

  public renderParagraph(text: string, fontKey: 'F1' | 'F2' = 'F1', size: number = 9) {
    const lines = wrapText(text, 100);
    for (const line of lines) {
      this.ensureSpace(14);
      this.addText(line, this.leftMargin, this.currentY, fontKey, size);
      this.currentY -= 13;
    }
    this.currentY -= 4;
  }

  public renderBullet(text: string, size: number = 9) {
    const lines = wrapText(text, 96);
    for (let i = 0; i < lines.length; i++) {
      this.ensureSpace(14);
      const prefix = i === 0 ? '- ' : '  ';
      this.addText(prefix + lines[i], this.leftMargin + 6, this.currentY, 'F1', size);
      this.currentY -= 12.5;
    }
    this.currentY -= 1.5;
  }

  public renderSkills(skillsSection: Record<string, string[]>) {
    this.renderSectionTitle('Core Technical Skills');
    for (const [category, skills] of Object.entries(skillsSection)) {
      this.ensureSpace(16);
      const lineText = `${category}: ${skills.join(', ')}`;
      const wrapped = wrapText(lineText, 98);
      for (const line of wrapped) {
        this.ensureSpace(14);
        this.addText(line, this.leftMargin + 6, this.currentY, 'F1', 9);
        this.currentY -= 12.5;
      }
    }
    this.currentY -= 6;
  }

  public renderExperience(experiences: ResumePdfExperience[]) {
    this.renderSectionTitle('Work Experience');
    for (const exp of experiences) {
      this.ensureSpace(35);
      const companyHeader = `${exp.company}${exp.client ? ` (${exp.client})` : ''} - ${exp.role}`;
      this.addText(companyHeader, this.leftMargin, this.currentY, 'F2', 9.5);
      
      if (exp.period) {
        const periodWidth = exp.period.length * 5;
        this.addText(exp.period, this.rightMargin - periodWidth, this.currentY, 'F1', 9);
      }
      this.currentY -= 14;

      for (const bullet of exp.bullets) {
        this.renderBullet(bullet);
      }
      this.currentY -= 5;
    }
  }

  public renderProjects(projects: ResumePdfProject[]) {
    if (!projects || projects.length === 0) return;
    this.renderSectionTitle('Selected Engineering Projects');
    for (const proj of projects) {
      this.ensureSpace(30);
      const projHeader = proj.technologies
        ? `${proj.title} | ${proj.technologies}`
        : proj.title;
      this.addText(projHeader, this.leftMargin, this.currentY, 'F2', 9.5);
      this.currentY -= 14;

      for (const bullet of proj.bullets) {
        this.renderBullet(bullet);
      }
      this.currentY -= 5;
    }
  }

  public toBuffer(): Buffer {
    if (this.currentPageOps.length > 0) {
      this.pages.push(this.currentPageOps.join('\n'));
      this.currentPageOps = [];
    }

    const totalPages = this.pages.length;
    const objects: string[] = [];
    const offsets: number[] = [];

    // Object 1: Catalog
    objects.push(`1 0 obj\n<<\n  /Type /Catalog\n  /Pages 2 0 R\n>>\nendobj`);

    // Object 2: Pages
    const kidsRefs = Array.from({ length: totalPages }, (_, i) => `${3 + i * 2} 0 R`).join(' ');
    objects.push(`2 0 obj\n<<\n  /Type /Pages\n  /Kids [${kidsRefs}]\n  /Count ${totalPages}\n>>\nendobj`);

    // Font definitions:
    // Font F1 (Helvetica Regular)
    const fontRegularIndex = 3 + totalPages * 2;
    const fontBoldIndex = fontRegularIndex + 1;

    // Objects for each Page (Page object + Content stream)
    for (let i = 0; i < totalPages; i++) {
      const pageObjIndex = 3 + i * 2;
      const contentObjIndex = pageObjIndex + 1;
      const streamContent = this.pages[i];
      const streamLength = Buffer.byteLength(streamContent, 'utf-8');

      // Page Object
      objects.push(
        `${pageObjIndex} 0 obj\n<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}]\n  /Resources <<\n    /Font <<\n      /F1 ${fontRegularIndex} 0 R\n      /F2 ${fontBoldIndex} 0 R\n    >>\n  >>\n  /Contents ${contentObjIndex} 0 R\n>>\nendobj`
      );

      // Content Stream Object
      objects.push(
        `${contentObjIndex} 0 obj\n<<\n  /Length ${streamLength}\n>>\nstream\n${streamContent}\nendstream\nendobj`
      );
    }

    // Font F1
    objects.push(
      `${fontRegularIndex} 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica\n  /Encoding /StandardEncoding\n>>\nendobj`
    );

    // Font F2
    objects.push(
      `${fontBoldIndex} 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica-Bold\n  /Encoding /StandardEncoding\n>>\nendobj`
    );

    // Assemble PDF
    let pdfString = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const totalObjectCount = objects.length;

    for (let i = 0; i < totalObjectCount; i++) {
      offsets.push(Buffer.byteLength(pdfString, 'binary'));
      pdfString += objects[i] + '\n';
    }

    const startXref = Buffer.byteLength(pdfString, 'binary');
    pdfString += `xref\n0 ${totalObjectCount + 1}\n0000000000 65535 f \n`;

    for (let i = 0; i < totalObjectCount; i++) {
      const offsetStr = String(offsets[i]).padStart(10, '0');
      pdfString += `${offsetStr} 00000 n \n`;
    }

    pdfString += `trailer\n<<\n  /Size ${totalObjectCount + 1}\n  /Root 1 0 R\n>>\nstartxref\n${startXref}\n%%EOF\n`;

    return Buffer.from(pdfString, 'binary');
  }
}

/**
 * Generates an ATS-compliant PDF resume from structured data.
 */
export function generateResumePdf(data: ResumePdfData, outputPath?: string): Buffer {
  const doc = new ResumePdfDocument();

  // 1. Header
  doc.renderHeader(data.basics);

  // 2. Summary
  if (data.basics.summary) {
    doc.renderSectionTitle('Professional Summary');
    doc.renderParagraph(data.basics.summary);
  }

  // 3. Skills
  if (data.skills && Object.keys(data.skills).length > 0) {
    doc.renderSkills(data.skills);
  }

  // 4. Experience
  if (data.experience && data.experience.length > 0) {
    doc.renderExperience(data.experience);
  }

  // 5. Projects
  if (data.projects && data.projects.length > 0) {
    doc.renderProjects(data.projects);
  }

  const pdfBuffer = doc.toBuffer();

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, pdfBuffer);
  }

  return pdfBuffer;
}

/**
 * Extracts plain text from a PDF buffer by decoding text streams.
 * Mirrors the exact text extraction algorithms used by ATS systems (Workday, Greenhouse, Lever).
 */
export function extractPdfText(pdfBuffer: Buffer | string): string {
  let raw: string;
  if (typeof pdfBuffer === 'string') {
    if (fs.existsSync(pdfBuffer)) {
      raw = fs.readFileSync(pdfBuffer).toString('binary');
    } else {
      raw = pdfBuffer;
    }
  } else {
    raw = pdfBuffer.toString('binary');
  }
  const textChunks: string[] = [];

  // Match all streams in the PDF
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(raw)) !== null) {
    const streamContent = match[1];

    // Find all BT ... ET (Begin Text ... End Text) blocks
    const btRegex = /BT([\s\S]*?)ET/g;
    let btMatch: RegExpExecArray | null;

    while ((btMatch = btRegex.exec(streamContent)) !== null) {
      const block = btMatch[1];
      const lines = block.split(/\r?\n/);
      let currentLineText = '';

      for (const line of lines) {
        // Match string literals in (string) Tj or '
        const tjMatch = line.match(/\((.*?)\)\s*(?:Tj|')/);
        if (tjMatch) {
          const unescaped = tjMatch[1]
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\');
          currentLineText += (currentLineText ? ' ' : '') + unescaped;
        }

        // Match kerning arrays [(string) -10 (string)] TJ
        const tjArrayMatch = line.match(/\[(.*?)\]\s*TJ/);
        if (tjArrayMatch) {
          const parts = tjArrayMatch[1].match(/\((.*?)\)/g) || [];
          const reconstructed = parts
            .map((p) => p.slice(1, -1).replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\'))
            .join('');
          currentLineText += (currentLineText ? ' ' : '') + reconstructed;
        }

        // Check for line moves (T*, or Td with negative y translation)
        if (/T\*|(?:\d+(?:\.\d+)?\s+-\d+(?:\.\d+)?\s+Td)/.test(line)) {
          if (currentLineText.trim()) {
            textChunks.push(currentLineText.trim());
            currentLineText = '';
          }
        }
      }

      if (currentLineText.trim()) {
        textChunks.push(currentLineText.trim());
      }
    }
  }

  return textChunks.join('\n');
}

