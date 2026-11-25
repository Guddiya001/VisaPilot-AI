import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Deterministic valid PDF header & structure for dev-mode test fallback
 */
function createFallbackPdfBuffer(fileName: string): Buffer {
  const content = [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    'endobj',
    '3 0 obj',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>`,
    'endobj',
    '4 0 obj',
    '<< /Length 75 >>',
    'stream',
    `BT /F1 12 Tf 72 712 Td (VisaPilot Fallback Resume for: ${fileName}) Tj ET`,
    'endstream',
    'endobj',
    'xref',
    '0 5',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    '0000000206 00000 n ',
    'trailer',
    '<< /Size 5 /Root 1 0 R >>',
    'startxref',
    '330',
    '%%EOF',
  ].join('\n');

  return Buffer.from(content, 'utf-8');
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const reqPath = url.searchParams.get('path');

    if (!reqPath) {
      return Response.json(
        { error: 'Missing path query parameter' },
        { status: 400 }
      );
    }

    // Check for null bytes or direct traversal
    if (reqPath.includes('\0')) {
      return Response.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    const dirCandidates = [
      path.resolve(process.cwd(), 'vault'),
      path.resolve(process.cwd(), '..', 'vault'),
      path.resolve(process.cwd(), '../..', 'vault'),
    ];
    let vaultBaseDir = dirCandidates[0];
    for (const d of dirCandidates) {
      if (fs.existsSync(d)) {
        vaultBaseDir = d;
        break;
      }
    }
    const candidates = [
      path.resolve(process.cwd(), reqPath),
      path.resolve(process.cwd(), '..', reqPath),
      path.resolve(process.cwd(), '../..', reqPath),
    ];
    let resolvedPath = candidates[0];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        resolvedPath = c;
        break;
      }
    }

    // Verify target path resides strictly inside the vault directory
    const relative = path.relative(vaultBaseDir, resolvedPath);
    const isInsideVault =
      !relative.startsWith('..') && !path.isAbsolute(relative);

    if (!isInsideVault) {
      return Response.json(
        { error: 'Directory traversal detected or unauthorized path outside vault' },
        { status: 403 }
      );
    }

    const fileName = path.basename(resolvedPath);

    // If file exists on disk, read and return base64
    if (fs.existsSync(resolvedPath)) {
      const stats = await fs.promises.stat(resolvedPath);
      if (!stats.isFile()) {
        return Response.json(
          { error: 'Target path is not a file' },
          { status: 400 }
        );
      }

      const buffer = await fs.promises.readFile(resolvedPath);
      return Response.json({
        base64: buffer.toString('base64'),
        fileName,
        mimeType: 'application/pdf',
      });
    }

    // If file does not exist on disk, serve deterministic fallback PDF
    const fallbackBuffer = createFallbackPdfBuffer(fileName);
    return Response.json({
      base64: fallbackBuffer.toString('base64'),
      fileName,
      mimeType: 'application/pdf',
      fallback: true,
    });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || 'Internal server error reading vault' },
      { status: 500 }
    );
  }
}
