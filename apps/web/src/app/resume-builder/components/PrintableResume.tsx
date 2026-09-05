'use client';

import { ResumeData } from '../types';
import { generatePrintHTML } from './ResumePreview';

export interface JobInfo {
  id: string;
  company: string;
  title: string;
  description: string;
  requirements: string;
}

export function openPrintWindow(data: ResumeData, jobInfo?: JobInfo | null): void {
  const htmlContent = generatePrintHTML(data);
  
  // Extract only the print CSS. In a real app we'd fetch the CSS file or rely on styled-components.
  // For this, we'll inline the core print rules from resume-preview.css
  const printStyles = `
    body {
      margin: 0;
      padding: 0;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: ui-sans-serif, system-ui, sans-serif;
    }
    .resume-print-window {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
    }
    .rp-page {
      padding: 0;
      box-sizing: border-box;
      color: #333;
      font-size: 9pt;
      line-height: 1.4;
    }
    .rp-header {
      text-align: center;
      margin-bottom: 12pt;
    }
    .rp-name {
      font-size: 24pt;
      font-weight: 700;
      color: #111;
      margin: 0 0 4pt 0;
    }
    .rp-subtitle {
      font-size: 11pt;
      color: #444;
      margin: 0 0 6pt 0;
    }
    .rp-contacts, .rp-links {
      font-size: 8.5pt;
      color: #555;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6pt;
      margin-bottom: 2pt;
    }
    .rp-sep {
      color: #ccc;
    }
    .rp-open-to {
      font-size: 8.5pt;
      color: #666;
      margin-top: 4pt;
      font-style: italic;
    }
    .rp-section {
      margin-bottom: 12pt;
    }
    .rp-section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #111;
      text-transform: uppercase;
      border-bottom: 1pt solid #ddd;
      padding-bottom: 2pt;
      margin: 0 0 6pt 0;
    }
    .rp-role {
      margin-bottom: 8pt;
    }
    .rp-role-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 3pt;
    }
    .rp-role-heading {
      margin: 0;
      font-size: 10pt;
    }
    .rp-role-title {
      font-weight: 600;
      color: #222;
    }
    .rp-company {
      font-weight: 500;
      color: #444;
    }
    .rp-dash {
      margin: 0 4pt;
      color: #888;
    }
    .rp-role-meta {
      font-size: 8.5pt;
      color: #666;
    }
    .rp-bullets {
      margin: 0;
      padding-left: 14pt;
      list-style-type: disc;
    }
    .rp-bullets li {
      margin-bottom: 2pt;
    }
    .rp-skills-flat-line {
      margin: 0 0 3pt 0;
    }
    .rp-project-tech {
      font-size: 8pt;
      color: #666;
      font-style: italic;
    }
    .rp-cover-letter-content p {
      margin: 0 0 10pt 0;
      line-height: 1.6;
    }
    @page {
      margin: 15mm 20mm;
    }
    @media print {
      body { margin: 0; }
    }
  `;

  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const docTitle = jobInfo
    ? `Resume_${sanitize(jobInfo.title)}_${sanitize(jobInfo.company)}`
    : `Resume_${sanitize(data.basics.title) || sanitize(data.basics.name) || 'Export'}`;

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${docTitle}</title>
      <style>${printStyles}</style>
    </head>
    <body>
      ${htmlContent}
      <script>
        setTimeout(() => {
          window.print();
          window.close();
        }, 500);
      </script>
    </body>
    </html>
  `;

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(fullHtml);
    printWin.document.close();
  }
}

export function openCoverLetterPrintWindow(data: ResumeData, jobInfo?: JobInfo | null): void {
  const generateHeader = () => `
    <header class="rp-header">
      <h1 class="rp-name">${data.basics.name}</h1>
      <p class="rp-subtitle">${data.basics.title}</p>
      <div class="rp-contacts">
        ${data.basics.location ? `<span>${data.basics.location}</span>` : ''}
        ${data.basics.location && data.basics.phone ? `<span class="rp-sep">|</span>` : ''}
        ${data.basics.phone ? `<span>${data.basics.phone}</span>` : ''}
        ${data.basics.phone && data.basics.email ? `<span class="rp-sep">|</span>` : ''}
        ${data.basics.email ? `<span>${data.basics.email}</span>` : ''}
      </div>
    </header>
  `;

  const coverLetterHtml = `
    <div class="resume-print-window">
      <main class="rp-page">
        ${generateHeader()}
        <section class="rp-section rp-cover-letter-content" style="margin-top: 30pt;">
          ${data.coverLetter.paragraphs.map(p => `<p>${p}</p>`).join('')}
        </section>
      </main>
    </div>
  `;

  const printStyles = `
    body {
      margin: 0;
      padding: 0;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: ui-sans-serif, system-ui, sans-serif;
    }
    .resume-print-window {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
    }
    .rp-page {
      padding: 0;
      box-sizing: border-box;
      color: #333;
      font-size: 10pt;
      line-height: 1.6;
    }
    .rp-header {
      text-align: center;
      margin-bottom: 12pt;
    }
    .rp-name {
      font-size: 24pt;
      font-weight: 700;
      color: #111;
      margin: 0 0 4pt 0;
    }
    .rp-subtitle {
      font-size: 11pt;
      color: #444;
      margin: 0 0 6pt 0;
    }
    .rp-contacts {
      font-size: 9pt;
      color: #555;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6pt;
    }
    .rp-sep {
      color: #ccc;
    }
    .rp-cover-letter-content p {
      margin: 0 0 12pt 0;
    }
    @page {
      margin: 15mm 20mm;
    }
    @media print {
      body { margin: 0; }
    }
  `;

  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const docTitle = jobInfo
    ? `Cover_Letter_${sanitize(jobInfo.title)}_${sanitize(jobInfo.company)}`
    : `Cover_Letter_${sanitize(data.basics.title) || sanitize(data.basics.name) || 'Export'}`;

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${docTitle}</title>
      <style>${printStyles}</style>
    </head>
    <body>
      ${coverLetterHtml}
      <script>
        setTimeout(() => {
          window.print();
          window.close();
        }, 500);
      </script>
    </body>
    </html>
  `;

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(fullHtml);
    printWin.document.close();
  }
}

export const PrintableResume = {
  openPrintWindow,
  openCoverLetterPrintWindow
};
