import test from 'node:test';
import assert from 'node:assert/strict';
import { productEntry, productLinks } from '../lib/product-entry.ts';

test('Free CTA and Demo links select their existing product entry flows', () => {
  for (const entry of ['app', 'demo']) {
    const url = new URL(productLinks[entry], 'http://localhost');
    assert.equal(url.pathname, '/');
    assert.equal(productEntry(url.search), entry);
  }
});
test('Product anchors explicitly return to Home from a saved session', () => {
  const url = new URL(`${productLinks.home}#product`, 'http://localhost');
  assert.equal(productEntry(url.search), 'home');
  assert.equal(url.hash, '#product');
});
test('Absent or unrecognized entry preserves ordinary session behavior', () => {
  for (const search of [
    '',
    '?other=app',
    '?view=unknown',
    '?view=https://example.com',
  ]) {
    assert.equal(productEntry(search), null);
  }
});
