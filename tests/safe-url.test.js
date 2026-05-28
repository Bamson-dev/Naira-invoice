const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { isAllowedLogoUrl, safePdfFilename } = require('../src/utils/safeUrl');

let prevBase;

before(() => {
  prevBase = process.env.APP_BASE_URL;
  process.env.APP_BASE_URL = 'https://app.example.com';
});

after(() => {
  process.env.APP_BASE_URL = prevBase;
});

test('isAllowedLogoUrl accepts same-origin uploads path', () => {
  assert.equal(isAllowedLogoUrl('/uploads/logos/user-1.png'), true);
  assert.equal(isAllowedLogoUrl('https://app.example.com/uploads/logos/user-1.png'), true);
});

test('isAllowedLogoUrl rejects external hosts', () => {
  assert.equal(isAllowedLogoUrl('https://evil.example.com/uploads/logos/x.png'), false);
  assert.equal(isAllowedLogoUrl('http://169.254.169.254/latest'), false);
});

test('safePdfFilename strips unsafe characters', () => {
  assert.equal(safePdfFilename('INV/001<script>'), 'INV_001_script_.pdf');
});
