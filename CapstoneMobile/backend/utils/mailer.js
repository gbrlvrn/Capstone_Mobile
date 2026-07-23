import nodemailer from "nodemailer";

export function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Gmail SMTP env vars missing.");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,           // use STARTTLS (not SSL on 465)
    connectionTimeout: 10000, // 10s timeout instead of hanging
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendOtpEmail({ to, otp }) {
  const transporter = createTransporter();

  const from = `FaithLy <${process.env.EMAIL_USER}>`;

  return transporter.sendMail({
    from,
    to,
    subject: "Your FaithLy OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">Verify your email</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 12px 0;">
          ${otp}
        </div>
        <p>This code expires in <b>5 minutes</b>.</p>
        <p style="color:#666;font-size:12px;margin-top:18px;">
          If you did not request this, you can ignore this email.
        </p>
      </div>
    `,
  });
}
