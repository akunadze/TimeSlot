const nodemailer = require('nodemailer');

let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  if (process.env.SMTP_HOST) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  } else {
    // Development fallback: Ethereal captures emails without sending them.
    // The preview URL is printed to the console after each send.
    const test = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: test.user, pass: test.pass }
    });
    console.log(`[email] No SMTP_HOST set — using Ethereal test account (${test.user})`);
  }

  return _transporter;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmt(iso) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Send a cancellation notice to the reservation owner.
 * Fire-and-forget — caller should .catch() any errors.
 */
async function sendCancellationEmail({ to, displayName, toolName, toolLocation, startTime, endTime, notes }) {
  const transport = await getTransporter();
  const from = process.env.SMTP_FROM || '"TimeSlot" <noreply@timeslot.local>';

  const locationLine = toolLocation ? `<tr><td style="padding:4px 0;color:#6b7280">Location</td><td style="padding:4px 0 4px 16px;font-weight:600">${esc(toolLocation)}</td></tr>` : '';
  const notesLine    = notes        ? `<tr><td style="padding:4px 0;color:#6b7280">Notes</td><td style="padding:4px 0 4px 16px">${esc(notes)}</td></tr>` : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:#2563eb;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">TimeSlot</h1>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Reservation Cancelled</h2>
      <p style="margin:0 0 24px;color:#6b7280">Hi ${esc(displayName)}, your reservation has been cancelled by an administrator.</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:24px">
        <table style="border-collapse:collapse;font-size:14px;width:100%">
          <tr><td style="padding:4px 0;color:#6b7280">Tool</td><td style="padding:4px 0 4px 16px;font-weight:600">${esc(toolName)}</td></tr>
          ${locationLine}
          <tr><td style="padding:4px 0;color:#6b7280">Start</td><td style="padding:4px 0 4px 16px">${fmt(startTime)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">End</td><td style="padding:4px 0 4px 16px">${fmt(endTime)}</td></tr>
          ${notesLine}
        </table>
      </div>

      <p style="margin:0;font-size:13px;color:#9ca3af">
        If you believe this was a mistake, please contact your administrator.
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = [
    `Hi ${displayName},`,
    ``,
    `Your reservation has been cancelled by an administrator.`,
    ``,
    `Tool:  ${toolName}`,
    toolLocation ? `Location: ${toolLocation}` : null,
    `Start: ${fmt(startTime)}`,
    `End:   ${fmt(endTime)}`,
    notes ? `Notes: ${notes}` : null,
    ``,
    `If you believe this was a mistake, please contact your administrator.`
  ].filter(l => l !== null).join('\n');

  const info = await transport.sendMail({
    from,
    to,
    subject: `Your reservation for "${toolName}" has been cancelled`,
    text,
    html
  });

  if (!process.env.SMTP_HOST) {
    console.log(`[email] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }
}

module.exports = { sendCancellationEmail };
