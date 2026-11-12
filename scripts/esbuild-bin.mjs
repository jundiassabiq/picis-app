import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const dist = path.join(root, 'dist');
const publicDir = path.join(root, 'public');

/** Path to the esbuild native binary for this machine. */
export function esbuildBinary() {
  const pkg = `@esbuild/${process.platform}-${process.arch}`;
  const base = path.join(root, 'node_modules', pkg);
  const candidates = [
    path.join(base, 'esbuild.exe'),
    path.join(base, 'bin', 'esbuild'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`esbuild binary not found for ${pkg}`);
}

export function copyStatic() {
  fs.mkdirSync(dist, { recursive: true });
  fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));
  if (fs.existsSync(publicDir)) {
    for (const entry of fs.readdirSync(publicDir)) {
      fs.cpSync(path.join(publicDir, entry), path.join(dist, entry), { recursive: true });
    }
  }
}

export function esbuildArgs(mode) {
  const production = mode === 'build';
  return [
    path.join(root, 'src/main.tsx'),
    '--bundle',
    '--outdir=dist',
    '--format=esm',
    '--jsx=automatic',
    '--target=es2020',
    '--loader:.woff2=file',
    '--loader:.woff=file',
    '--loader:.png=file',
    '--loader:.svg=file',
    `--define:process.env.NODE_ENV=${JSON.stringify(production ? 'production' : 'development')}`,
    ...(production ? ['--minify'] : ['--sourcemap']),
    ...(production ? [] : ['--watch=forever']),
  ];
}
