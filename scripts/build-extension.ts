import fs from 'node:fs/promises';
import path from 'node:path';

export async function buildUnpackedExtension(
  repoRoot: string = process.cwd()
): Promise<{ outputDir: string; filesWritten: string[] }> {
  const srcExtDir = path.join(repoRoot, 'src', 'extension');
  const distExtDir = path.join(repoRoot, 'dist', 'extension');

  await fs.mkdir(path.join(distExtDir, 'background'), { recursive: true });
  await fs.mkdir(path.join(distExtDir, 'content'), { recursive: true });
  await fs.mkdir(path.join(distExtDir, 'sidepanel'), { recursive: true });

  const filesWritten: string[] = [];

  // 1. Copy manifest.json
  const manifestSrc = path.join(srcExtDir, 'manifest.json');
  const manifestDest = path.join(distExtDir, 'manifest.json');
  await fs.copyFile(manifestSrc, manifestDest);
  filesWritten.push(manifestDest);

  // 2. Copy sidepanel/index.html
  const htmlSrc = path.join(srcExtDir, 'sidepanel', 'index.html');
  const htmlDest = path.join(distExtDir, 'sidepanel', 'index.html');
  await fs.copyFile(htmlSrc, htmlDest);
  filesWritten.push(htmlDest);

  // 3. Bundle TypeScript entrypoints via esbuild if installed, or emit ESM modules
  const entrypoints: Array<{ in: string; out: string; format: 'esm' | 'iife' }> = [
    {
      in: path.join(srcExtDir, 'background', 'index.ts'),
      out: path.join(distExtDir, 'background', 'index.js'),
      format: 'esm',
    },
    {
      in: path.join(srcExtDir, 'content', 'index.ts'),
      out: path.join(distExtDir, 'content', 'index.js'),
      format: 'iife',
    },
    {
      in: path.join(srcExtDir, 'sidepanel', 'controller.ts'),
      out: path.join(distExtDir, 'sidepanel', 'controller.js'),
      format: 'iife',
    },
  ];

  try {
    const esbuild = await import('esbuild');
    for (const entry of entrypoints) {
      await esbuild.build({
        entryPoints: [entry.in],
        outfile: entry.out,
        bundle: true,
        format: entry.format,
        platform: 'browser',
        target: ['chrome120'],
        sourcemap: false,
      });
      filesWritten.push(entry.out);
    }
  } catch {
    // Fallback transpilation for offline environments without esbuild binary
    const ts = await import('typescript');
    for (const entry of entrypoints) {
      const rawTs = await fs.readFile(entry.in, 'utf-8');
      const transpiled = ts.transpileModule(rawTs, {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      });
      await fs.writeFile(entry.out, transpiled.outputText, 'utf-8');
      filesWritten.push(entry.out);
    }
  }

  console.log(
    `[build:extension] Packaged unpacked MV3 extension to ${distExtDir} (${filesWritten.length} artifacts)`
  );
  return { outputDir: distExtDir, filesWritten };
}

const isDirectExecution =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('scripts/build-extension.ts');

if (isDirectExecution) {
  buildUnpackedExtension().catch((err) => {
    console.error('[build:extension] Build failed:', err);
    process.exit(1);
  });
}