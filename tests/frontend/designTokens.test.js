/**
 * Automated Verification of Design Tokens per design.md §5.65
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('Design Tokens Verification Tests', () => {
  const tokensCssPath = path.resolve(__dirname, '../../frontend/src/styles/tokens.css');
  const tokensContent = fs.readFileSync(tokensCssPath, 'utf8');

  test('tokens.css exists and is readable', () => {
    assert.ok(tokensContent.length > 0);
  });

  const expectedColors = {
    '--color-primary': '#1D3A5F',
    '--color-primary-hover': '#16304F',
    '--color-secondary': '#2B6CB0',
    '--color-background': '#F5F6F8',
    '--color-surface': '#FFFFFF',
    '--color-text': '#1A1D21',
    '--color-muted': '#5A616B',
    '--color-border': '#D8DCE1',
    '--color-success': '#1E7A34',
    '--color-warning': '#B8860B',
    '--color-error': '#B3261E',
    '--color-info': '#2B6CB0',
    '--color-focus': '#0B5FFF',
  };

  for (const [token, expectedValue] of Object.entries(expectedColors)) {
    test(`Color token ${token} matches exact design token ${expectedValue}`, () => {
      const regex = new RegExp(`${token}\\s*:\\s*${expectedValue}`, 'i');
      assert.match(tokensContent, regex, `Expected ${token} to equal ${expectedValue}`);
    });
  }

  const expectedSpacingAndSizing = {
    '--space-1': '4px',
    '--space-2': '8px',
    '--space-3': '12px',
    '--space-4': '16px',
    '--space-6': '24px',
    '--space-8': '32px',
    '--space-12': '48px',
    '--radius-sm': '4px',
    '--radius-md': '8px',
    '--btn-height': '40px',
    '--input-height': '40px',
    '--table-row-height': '48px',
  };

  for (const [token, expectedValue] of Object.entries(expectedSpacingAndSizing)) {
    test(`Sizing token ${token} matches exact design token ${expectedValue}`, () => {
      const regex = new RegExp(`${token}\\s*:\\s*${expectedValue}`, 'i');
      assert.match(tokensContent, regex, `Expected ${token} to equal ${expectedValue}`);
    });
  }
});

