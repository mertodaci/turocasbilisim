const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'ssl',
    requireTLS: process.env.SMTP_SECURE === 'starttls',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

// GUVENLIK/SAGLAMLIK: mail gonderimi hicbir zaman cagiran islemi (bilet
// guncelleme, yorum ekleme vb.) bozmamali -- SMTP kapali/yanlis olsa bile
// asil CRUD islemi basarili donmeye devam eder, hata sadece loglanir.
async function sendMail({ to, subject, text }) {
  if (!to) return;
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] SMTP yapilandirilmamis, mail gonderilemedi:', subject);
    return;
  }
  try {
    await t.sendMail({ from: process.env.SMTP_USER, to, subject, text });
  } catch (err) {
    console.error('[mailer] mail gonderim hatasi:', err.message);
  }
}

module.exports = { sendMail };
