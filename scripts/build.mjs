import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { copyStatic, dist, esbuildArgs, esbuildBinary } from './esbuild-bin.mjs';

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const result = spawnSync(esbuildBinary(), esbuildArgs('build'), { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);

copyStatic();
console.log('build selesai: dist/');
