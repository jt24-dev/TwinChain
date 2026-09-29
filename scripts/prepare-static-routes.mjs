import { copyFile, mkdir } from 'node:fs/promises';

// Vinext exports named routes as flat HTML files. Keep directory-style URLs
// usable on plain static servers (including the local preview), without host
// rewrites.
for (const route of ['pricing', 'product', 'how-it-works']) {
  await mkdir(`dist/client/${route}`, { recursive: true });
  await copyFile(
    `dist/client/${route}.html`,
    `dist/client/${route}/index.html`,
  );
}
