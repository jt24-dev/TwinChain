import test from 'node:test';
import assert from 'node:assert/strict';
import {
  productEntry,
  productLinks,
  resolveProductEntry,
} from '../lib/product-entry.ts';

test('Free CTA and Demo links select their existing product entry flows', () => {
  for (const entry of ['app', 'demo']) {
    const url = new URL(productLinks[entry], 'http://localhost');
    assert.equal(url.pathname, '/');
    assert.equal(productEntry(url.search), entry);
  }
});
test('Product and How It Works use dedicated routes without Home anchors', () => {
  const productUrl = new URL(productLinks.product, 'http://localhost');
  const howUrl = new URL(productLinks.howItWorks, 'http://localhost');

  assert.equal(productUrl.pathname, '/product/');
  assert.equal(howUrl.pathname, '/how-it-works/');
  assert.equal(productUrl.hash, '');
  assert.equal(howUrl.hash, '');
});
test('Dedicated marketing routes do not alter Home entry resolution', () => {
  const url = new URL(productLinks.home, 'http://localhost');
  assert.equal(resolveProductEntry(url.search), 'home');
  assert.equal(url.hash, '');
});
test('Root always resolves to Home independently of stored networks', () => {
  assert.equal(resolveProductEntry(''), 'home');
  assert.equal(productLinks.home, '/');
});
test('Workspace and direct simulator entries remain distinct on refresh', () => {
  assert.equal(resolveProductEntry('?view=app'), 'app');
  assert.equal(resolveProductEntry('?view=demo'), 'demo');
  assert.equal(resolveProductEntry('?view=network'), 'network');
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
