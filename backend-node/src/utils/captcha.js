/**
 * Server-Side Cryptographic SVG CAPTCHA Generator & Validator
 * Generates an SVG challenge and issues a stateless HMAC-signed token.
 */
const crypto = require('crypto');
const config = require('../config/env');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes 0, O, 1, I, L to prevent ambiguity
const CAPTCHA_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function randomText(length = 5) {
  let text = '';
  for (let i = 0; i < length; i++) {
    text += CHARS[crypto.randomInt(0, CHARS.length)];
  }
  return text;
}

function hashText(text) {
  return crypto.createHash('sha256').update(text.trim().toUpperCase()).digest('hex');
}

function generateCaptchaToken(text) {
  const expiresAt = Date.now() + CAPTCHA_EXPIRY_MS;
  const payload = {
    h: hashText(text),
    exp: expiresAt,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.captchaSecret)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

function verifyCaptcha(token, solution) {
  if (!token || typeof token !== 'string' || !solution || typeof solution !== 'string') {
    return { valid: false, message: 'CAPTCHA token and answer are required' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, message: 'Invalid CAPTCHA token format' };
  }

  const [data, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', config.captchaSecret)
    .update(data)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return { valid: false, message: 'Invalid or tampered CAPTCHA signature' };
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) {
      return { valid: false, message: 'CAPTCHA challenge has expired. Please refresh.' };
    }

    const providedHash = hashText(solution);
    if (providedHash !== payload.h) {
      return { valid: false, message: 'Incorrect CAPTCHA answer. Please try again.' };
    }

    return { valid: true };
  } catch (_err) {
    return { valid: false, message: 'Failed to decode CAPTCHA token' };
  }
}

function generateSvgCaptcha() {
  const text = randomText(5);
  const width = 160;
  const height = 48;

  // Generate random disturbance lines and dots
  const colors = ['#1D3A5F', '#2B6CB0', '#16304F', '#4A5568'];
  let lines = '';
  for (let i = 0; i < 3; i++) {
    const x1 = crypto.randomInt(5, 30);
    const y1 = crypto.randomInt(5, height - 5);
    const x2 = crypto.randomInt(width - 30, width - 5);
    const y2 = crypto.randomInt(5, height - 5);
    const color = colors[i % colors.length];
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5" stroke-opacity="0.4" />`;
  }

  let charsSvg = '';
  const charSpacing = width / (text.length + 1);
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = Math.round((i + 0.6) * charSpacing);
    const y = crypto.randomInt(30, 36);
    const rotate = crypto.randomInt(-18, 18);
    const color = colors[i % colors.length];
    charsSvg += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${color}" transform="rotate(${rotate}, ${x}, ${y})">${char}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #F8FAFC; border: 1px solid #D8DCE1; border-radius: 4px;">
    ${lines}
    ${charsSvg}
  </svg>`;

  const token = generateCaptchaToken(text);

  return {
    svg,
    token,
    // Note: text is never sent to the client, only the token
  };
}

module.exports = {
  generateSvgCaptcha,
  verifyCaptcha,
};

