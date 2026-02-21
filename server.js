/**
 * SwiftStatic – Express backend server
 *
 * Features:
 *  • Serves all static files from this directory (index.html, style.css, script.js)
 *  • POST /api/booking  – booking form → notification email via Nodemailer
 *  • POST /api/contact  – contact form  → notification email via Nodemailer
 *  • Security headers, rate limiting, HTML escaping in email bodies
 *
 * Setup:
 *  1. npm install
 *  2. Copy .env.example → .env and fill in your Gmail credentials
 *  3. node server.js  (or:  npm run dev)
 */

require('dotenv').config();
const express    = require('express');
const nodemailer = require('nodemailer');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Check .env is present ── */
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn(
    '⚠️  EMAIL_USER / EMAIL_PASS not set in .env\n' +
    '   Forms will return 503 and the browser will fall back to mailto.\n' +
    '   Copy .env.example → .env and add your Gmail App Password to enable emails.'
  );
}

/* ── Gzip compression: cuts payload 60-80%, biggest TTFB win ── */
app.use(compression({ level: 6, threshold: 1024 }));

/* ── Early Hints: preload critical assets on HTML page requests ── */
app.use((req, res, next) => {
  if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html'))) {
    res.setHeader('Link', [
      '</tw.css>; rel=preload; as=style',
      '</style.css>; rel=preload; as=style',
      '</script.js>; rel=preload; as=script',
    ].join(', '));
  }
  next();
});

/* ── Security headers ── */
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

/* ── Middleware ── */
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// Serve all static files with performance-tuned cache headers
app.use(express.static(path.join(__dirname), {
  // CSS, JS, images cached for 1 year (they're content-addressed by Vercel on deploy)
  maxAge: '1y',
  // index.html must always revalidate so fresh deploys are seen immediately
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

/* ── Rate limiting – prevent form spam ── */
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { ok: false, message: 'Too many requests – please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ── Nodemailer transporter ── */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ── HTML-escape helper (prevent XSS in email body) ── */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Simple email validator ── */
function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(str || '').trim());
}

/* ── Helper: send email ── */
async function sendMail(subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials not configured');
  }
  await transporter.sendMail({
    from:    `"SwiftStatic Bot" <${process.env.EMAIL_USER}>`,
    to:      process.env.NOTIFY_EMAIL || process.env.EMAIL_USER,
    subject,
    html,
  });
}

/* ── POST /api/booking ── */
app.post('/api/booking', formLimiter, async (req, res) => {
  try {
    const { name, email, service, date, time, message } = req.body;

    if (!name || !email || !service || !date || !time) {
      return res.status(400).json({ ok: false, message: 'Missing required fields.' });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, message: 'Invalid email address.' });
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#6366f1;margin-bottom:16px">📅 New Free Call Booking</h2>
        <table cellpadding="10" style="border-collapse:collapse;width:100%;font-size:14px">
          <tr style="background:#f8f9fa"><td style="border:1px solid #e5e7eb;font-weight:600;width:140px">Name</td><td style="border:1px solid #e5e7eb">${esc(name)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;font-weight:600">Email</td><td style="border:1px solid #e5e7eb"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
          <tr style="background:#f8f9fa"><td style="border:1px solid #e5e7eb;font-weight:600">Service</td><td style="border:1px solid #e5e7eb">${esc(service)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;font-weight:600">Date</td><td style="border:1px solid #e5e7eb">${esc(date)}</td></tr>
          <tr style="background:#f8f9fa"><td style="border:1px solid #e5e7eb;font-weight:600">Time</td><td style="border:1px solid #e5e7eb">${esc(time)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;font-weight:600">Message</td><td style="border:1px solid #e5e7eb">${esc(message) || '(none)'}</td></tr>
        </table>
      </div>
    `;

    await sendMail(`Free Call Booking: ${esc(name)}`, html);
    res.json({ ok: true, message: 'Booking received!' });
  } catch (err) {
    console.error('Booking email error:', err.message);
    res.status(503).json({ ok: false, message: 'Email service unavailable.' });
  }
});

/* ── POST /api/contact ── */
app.post('/api/contact', formLimiter, async (req, res) => {
  try {
    const { name, email, plan, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ ok: false, message: 'Missing required fields.' });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, message: 'Invalid email address.' });
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#6366f1;margin-bottom:16px">💬 New Contact Message</h2>
        <table cellpadding="10" style="border-collapse:collapse;width:100%;font-size:14px">
          <tr style="background:#f8f9fa"><td style="border:1px solid #e5e7eb;font-weight:600;width:160px">Name</td><td style="border:1px solid #e5e7eb">${esc(name)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;font-weight:600">Email</td><td style="border:1px solid #e5e7eb"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
          <tr style="background:#f8f9fa"><td style="border:1px solid #e5e7eb;font-weight:600">Interested Plan</td><td style="border:1px solid #e5e7eb">${esc(plan) || 'Not specified'}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;font-weight:600">Subject</td><td style="border:1px solid #e5e7eb">${esc(subject)}</td></tr>
          <tr style="background:#f8f9fa"><td style="border:1px solid #e5e7eb;font-weight:600;vertical-align:top">Message</td><td style="border:1px solid #e5e7eb;white-space:pre-line">${esc(message)}</td></tr>
        </table>
      </div>
    `;

    await sendMail(`[SwiftStatic Contact] ${esc(subject)}`, html);
    res.json({ ok: true, message: 'Message received!' });
  } catch (err) {
    console.error('Contact email error:', err.message);
    res.status(503).json({ ok: false, message: 'Email service unavailable.' });
  }
});

/* ── Catch-all: return index.html for any unknown route ── */
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ── Start ── */
app.listen(PORT, () => {
  console.log(`✅  SwiftStatic server running → http://localhost:${PORT}`);
  // Verify SMTP connection if credentials are provided
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter.verify()
      .then(() => console.log('📧  SMTP connection verified – emails are ready.'))
      .catch(err => console.warn('⚠️  SMTP verify failed:', err.message));
  }
});
