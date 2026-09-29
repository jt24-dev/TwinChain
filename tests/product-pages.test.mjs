import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('dedicated Product and How It Works routes render their page components', async () => {
  const [productRoute, howRoute] = await Promise.all([
    readSource('app/product/page.tsx'),
    readSource('app/how-it-works/page.tsx'),
  ]);
  assert.match(productRoute, /<ProductPage \/>/);
  assert.match(howRoute, /<HowItWorksPage \/>/);
});

test('shared navigation uses dedicated Product and How It Works links', async () => {
  const navigation = await readSource(
    'components/simulator/product-navigation.tsx',
  );
  assert.match(navigation, /href=\{productLinks\.product\}/);
  assert.match(navigation, /href=\{productLinks\.howItWorks\}/);
  assert.doesNotMatch(navigation, /#product|#how-it-works/);
});
