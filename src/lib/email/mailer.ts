import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST ?? "localhost";
  const port = Number(process.env.SMTP_PORT ?? 1025);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: user ? { user, pass } : undefined,
  });
}

const from = process.env.SMTP_FROM ?? "UNO Premium <noreply@uno.local>";
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

async function sendMail(to: string, subject: string, html: string) {
  try {
    const transport = getTransport();
    await transport.sendMail({ from, to, subject, html });
    return true;
  } catch (err) {
    // In local/dev without SMTP, log the email content so flows remain testable.
    console.warn("[email] send failed, logging instead:", subject, to);
    console.info(html);
    void err;
    return false;
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return sendMail(
    email,
    "Verify your UNO Premium account",
    `
    <div style="font-family:Georgia,serif;background:#0A0A0A;color:#fff;padding:32px">
      <h1 style="color:#D4AF37;letter-spacing:0.08em">UNO PREMIUM</h1>
      <p style="color:#A0A0A0">Confirm your email to start playing.</p>
      <p><a href="${link}" style="color:#0A0A0A;background:#D4AF37;padding:12px 20px;text-decoration:none;font-weight:600">Verify Email</a></p>
      <p style="color:#A0A0A0;font-size:12px">Or open: ${link}</p>
    </div>`,
  );
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return sendMail(
    email,
    "Reset your UNO Premium password",
    `
    <div style="font-family:Georgia,serif;background:#0A0A0A;color:#fff;padding:32px">
      <h1 style="color:#D4AF37;letter-spacing:0.08em">UNO PREMIUM</h1>
      <p style="color:#A0A0A0">We received a password reset request.</p>
      <p><a href="${link}" style="color:#0A0A0A;background:#D4AF37;padding:12px 20px;text-decoration:none;font-weight:600">Reset Password</a></p>
      <p style="color:#A0A0A0;font-size:12px">This link expires in 1 hour.</p>
    </div>`,
  );
}
