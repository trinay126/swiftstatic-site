/**
 * SwiftStatic – Express backend server
 *
 * Features:
 *  • Serves all static files from this directory (index.html, style.css, script.js, images/)
 *  • POST /api/booking  – receives booking form data, sends notification email via Nodemailer
 *  • POST /api/contact  – receives contact form data, sends notification email via Nodemailer
 *
 * Setup:
 *  1. npm install
 *  2. Copy .env.example → .env and fill in your Gmail credentials
 *  3. node server.js  (or:  npm start)
 */

require('dotenv').config();
const express    = require('express');
const nodemailer = require('nodemailer');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve all static files from this folder (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));

/* ── Rate limiting – prevent form spam ── */
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                      // max 10 form submissions per IP per window
  message: { ok: false, message: 'Too many requests - please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ── Nodemailer transporter ── */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,   // your Gmail address
    pass: process.env.EMAIL_PASS,   // Gmail App Password (not your account password)
  },
});

/* ── Helper: send email ── */
async function sendMail(subject, html) {
  await transporter.sendMail({
    from: `"SwiftStatic Bot" <${process.env.EMAIL_USER}>`,
    to:   process.env.NOTIFY_EMAIL || process.env.EMAIL_USER,
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

    const html = `
      <h2>📅 New Free Call Booking</h2>
      <table cellpadding="8" style="border-collapse:collapse; font-family:sans-serif;">
        <tr><td><strong>Name</strong></td><td>${name}</td></tr>
        <tr><td><strong>Email</strong></td><td><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td><strong>Service</strong></td><td>${service}</td></tr>
        <tr><td><strong>Date</strong></td><td>${date}</td></tr>
        <tr><td><strong>Time</strong></td><td>${time}</td></tr>
        <tr><td><strong>Message</strong></td><td>${message || '(none)'}</td></tr>
      </table>
    `;

    await sendMail(`Free Call Booking: ${name}`, html);
    res.json({ ok: true, message: 'Booking received!' });
  } catch (err) {
    console.error('Booking email error:', err.message);
    // Still report success to the browser so fallback mailto is not triggered
    res.status(500).json({ ok: false, message: 'Server error – please try the mailto fallback.' });
  }
});

/* ── POST /api/contact ── */
app.post('/api/contact', formLimiter, async (req, res) => {
  try {
    const { name, email, plan, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ ok: false, message: 'Missing required fields.' });
    }

    const html = `
      <h2>💬 New Contact Message</h2>
      <table cellpadding="8" style="border-collapse:collapse; font-family:sans-serif;">
        <tr><td><strong>Name</strong></td><td>${name}</td></tr>
        <tr><td><strong>Email</strong></td><td><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td><strong>Interested Plan</strong></td><td>${plan || 'Not specified'}</td></tr>
        <tr><td><strong>Subject</strong></td><td>${subject}</td></tr>
        <tr><td><strong>Message</strong></td><td>${message}</td></tr>
      </table>
    `;

    await sendMail(`[SwiftStatic Contact] ${subject}`, html);
    res.json({ ok: true, message: 'Message received!' });
  } catch (err) {
    console.error('Contact email error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error – please try the mailto fallback.' });
  }
});

/* ── Catch-all: return index.html for any unknown route ── */
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ── Start ── */
app.listen(PORT, () => {
  console.log(`✅ SwiftStatic server running → http://localhost:${PORT}`);
});
