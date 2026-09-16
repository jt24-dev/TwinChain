import { copyFile, mkdir } from 'node:fs/promises';

// Vinext currently exports pricing.html. Keep /pricing/ usable on plain static
// servers (including the local preview), without relying on host rewrites.
await mkdir('dist/client/pricing', { recursive: true });
await copyFile('dist/client/pricing.html', 'dist/client/pricing/index.html');
