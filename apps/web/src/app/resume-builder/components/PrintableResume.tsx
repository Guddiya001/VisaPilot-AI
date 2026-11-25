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
  
  const printStyles = `
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
    }
    .no-print-bar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: inherit;
    }
    .no-print-bar-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .no-print-bar-title {
      font-size: 14px;
      font-weight: 700;
      color: #f8fafc;
    }
    .no-print-bar-tip {
      font-size: 12px;
      color: #94a3b8;
    }
    .no-print-bar-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .print-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: background 0.15s ease;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }
    .close-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #334155;
      color: #f1f5f9;
      border: none;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .close-btn:hover {
      background: #475569;
    }
    .resume-print-window {
      width: 100%;
      max-width: 210mm;
      min-height: 297mm;
      margin: 24px auto;
      background: #ffffff;
      padding: 12mm 15mm;
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
      border-radius: 4px;
    }
    .rp-page {
      padding: 0;
      box-sizing: border-box;
      color: #333;
      font-size: 8.5pt;
      line-height: 1.32;
    }
    .rp-header {
      text-align: center;
      margin-bottom: 5pt;
    }
    .rp-name {
      font-size: 20pt;
      font-weight: 700;
      color: #111;
      margin: 0 0 2pt 0;
      letter-spacing: -0.2px;
    }
    .rp-subtitle {
      font-size: 9.5pt;
      font-weight: 600;
      color: #333;
      margin: 0 0 3pt 0;
    }
    .rp-contacts, .rp-links {
      font-size: 8pt;
      color: #555;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 4pt;
      margin-bottom: 1.5pt;
    }
    .rp-sep {
      color: #ccc;
      margin: 0 1pt;
      user-select: none;
    }
    .rp-open-to {
      font-size: 8pt;
      color: #666;
      margin-top: 2pt;
      font-style: italic;
    }
    .rp-section {
      margin-bottom: 6pt;
    }
    .rp-section-title, h2 {
      font-size: 9.5pt;
      font-weight: 700;
      color: #060652;
      text-transform: uppercase;
      border-bottom: 1pt solid #ddd;
      padding-bottom: 1.5pt;
      margin: 4pt 0 3pt 0;
      letter-spacing: 0.3px;
    }
    .rp-role {
      margin-bottom: 5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .rp-role-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2pt;
    }
    .rp-role-heading {
      margin: 0;
      font-size: 9pt;
    }
    .rp-role-title {
      font-weight: 600;
      color: #111;
    }
    .rp-company {
      font-weight: 600;
      color: #2b4374;
    }
    .rp-dash {
      margin: 0 3pt;
      color: #888;
    }
    .rp-role-meta {
      font-size: 8pt;
      color: #666;
    }
    .rp-bullets {
      margin: 0;
      padding-left: 12pt;
      list-style-type: disc;
    }
    .rp-bullets li {
      margin-bottom: 1.5pt;
      line-height: 1.3;
    }
    .rp-skills-flat-line {
      margin: 0 0 2.5pt 0;
      line-height: 1.32;
    }
    .rp-project-tech {
      font-size: 7.5pt;
      color: #666;
      font-style: italic;
    }
    .rp-cover-letter-content p {
      margin: 0 0 8pt 0;
      line-height: 1.5;
    }
    @page {
      margin: 8mm 12mm;
      size: A4;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .resume-print-window {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        min-height: auto !important;
      }
      .rp-role {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      /* Hide any Chrome extension injected UI (VisaPilot pill, field badges) */
      #visapilot-autopilot-pill,
      .visapilot-shadow-badge-host {
        display: none !important;
        visibility: hidden !important;
      }
    }
    /* Also hide extension UI on screen in the print-preview window */
    #visapilot-autopilot-pill,
    .visapilot-shadow-badge-host {
      display: none !important;
    }
  `;

  const sanitize = (str: string) => str.trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const candidateName = sanitize(data.basics.name) || 'Ashish_Kumar_Singh';
  const roleName = sanitize(jobInfo?.title || data.basics.title.split('|')[0].trim() || 'Software_Engineer');
  const companyName = jobInfo?.company && jobInfo.company.toLowerCase() !== 'company'
    ? sanitize(jobInfo.company)
    : '';

  const docTitle = companyName
    ? `${candidateName}_${roleName}_${companyName}_Resume`
    : `${candidateName}_${roleName}_Resume`;

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${docTitle}</title>
      <style>${printStyles}</style>
    </head>
    <body>
      <div class="no-print-bar">
        <div class="no-print-bar-info">
          <span class="no-print-bar-title">📄 ${docTitle.replace(/_/g, ' ')}</span>
          <span class="no-print-bar-tip">💡 Tip: In print destination, select <strong>&quot;Save as PDF&quot;</strong> to export</span>
        </div>
        <div class="no-print-bar-actions">
          <button class="print-btn" onclick="window.print()">
            🖨️ Print / Save as PDF
          </button>
          <button class="close-btn" onclick="window.close()">
            ✕ Close
          </button>
        </div>
      </div>
      ${htmlContent}
      <script>
        function triggerPrint() {
          setTimeout(function() {
            window.print();
          }, 400);
        }
        if (document.readyState === 'complete') {
          triggerPrint();
        } else {
          window.addEventListener('load', triggerPrint);
        }
      </script>
    </body>
    </html>
  `;

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Popup was blocked by your browser. Please allow popups for this site to export or print your resume.');
    return;
  }
  printWin.document.open();
  printWin.document.write(fullHtml);
  printWin.document.close();
  printWin.focus();
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

  const paragraphs = data.coverLetter?.paragraphs || [];
  const coverLetterHtml = `
    <div class="resume-print-window">
      <main class="rp-page">
        ${generateHeader()}
        <section class="rp-section rp-cover-letter-content" style="margin-top: 30pt;">
          ${paragraphs.map(p => `<p>${p}</p>`).join('')}
        </section>
      </main>
    </div>
  `;

  const printStyles = `
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
    }
    .no-print-bar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: inherit;
    }
    .no-print-bar-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .no-print-bar-title {
      font-size: 14px;
      font-weight: 700;
      color: #f8fafc;
    }
    .no-print-bar-tip {
      font-size: 12px;
      color: #94a3b8;
    }
    .no-print-bar-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .print-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: background 0.15s ease;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }
    .close-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #334155;
      color: #f1f5f9;
      border: none;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .close-btn:hover {
      background: #475569;
    }
    .resume-print-window {
      width: 100%;
      max-width: 210mm;
      min-height: 297mm;
      margin: 24px auto;
      background: #ffffff;
      padding: 15mm 20mm;
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
      border-radius: 4px;
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
      size: A4;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .resume-print-window {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        min-height: auto !important;
      }
      /* Hide any Chrome extension injected UI (VisaPilot pill, field badges) */
      #visapilot-autopilot-pill,
      .visapilot-shadow-badge-host {
        display: none !important;
        visibility: hidden !important;
      }
    }
    /* Also hide extension UI on screen in the print-preview window */
    #visapilot-autopilot-pill,
    .visapilot-shadow-badge-host {
      display: none !important;
    }
  `;

  const sanitize = (str: string) => str.trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const candidateName = sanitize(data.basics.name) || 'Ashish_Kumar_Singh';
  const roleName = sanitize(jobInfo?.title || data.basics.title.split('|')[0].trim() || 'Software_Engineer');
  const companyName = jobInfo?.company && jobInfo.company.toLowerCase() !== 'company'
    ? sanitize(jobInfo.company)
    : '';

  const docTitle = companyName
    ? `${candidateName}_${roleName}_${companyName}_Cover_Letter`
    : `${candidateName}_${roleName}_Cover_Letter`;

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${docTitle}</title>
      <style>${printStyles}</style>
    </head>
    <body>
      <div class="no-print-bar">
        <div class="no-print-bar-info">
          <span class="no-print-bar-title">📄 ${docTitle.replace(/_/g, ' ')}</span>
          <span class="no-print-bar-tip">💡 Tip: In print destination, select <strong>&quot;Save as PDF&quot;</strong> to export</span>
        </div>
        <div class="no-print-bar-actions">
          <button class="print-btn" onclick="window.print()">
            🖨️ Print / Save as PDF
          </button>
          <button class="close-btn" onclick="window.close()">
            ✕ Close
          </button>
        </div>
      </div>
      ${coverLetterHtml}
      <script>
        function triggerPrint() {
          setTimeout(function() {
            window.print();
          }, 400);
        }
        if (document.readyState === 'complete') {
          triggerPrint();
        } else {
          window.addEventListener('load', triggerPrint);
        }
      </script>
    </body>
    </html>
  `;

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Popup was blocked by your browser. Please allow popups for this site to export or print your cover letter.');
    return;
  }
  printWin.document.open();
  printWin.document.write(fullHtml);
  printWin.document.close();
  printWin.focus();
}

export const PrintableResume = {
  openPrintWindow,
  openCoverLetterPrintWindow
};
