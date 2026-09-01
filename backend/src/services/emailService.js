const nodemailer = require("nodemailer");

function envFirst(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && String(value).trim().length > 0) return String(value).trim();
  }
  return "";
}

function isMailConfigured() {
  return Boolean(
    envFirst("SMTP_HOST", "EMAIL_HOST") &&
      envFirst("SMTP_PORT", "EMAIL_PORT") &&
      envFirst("SMTP_USER", "EMAIL_USER") &&
      envFirst("SMTP_PASS", "EMAIL_PASS")
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: envFirst("SMTP_HOST", "EMAIL_HOST"),
    port: Number(envFirst("SMTP_PORT", "EMAIL_PORT") || 587),
    secure: String(envFirst("SMTP_SECURE") || "false").toLowerCase() === "true",
    auth: {
      user: envFirst("SMTP_USER", "EMAIL_USER"),
      pass: envFirst("SMTP_PASS", "EMAIL_PASS")
    }
  });
}

async function sendInterviewScheduledEmail({ to, candidateEmail, recruiterEmail, scheduledTime, meetingLink }) {
  if (!isMailConfigured()) return { sent: false, reason: "SMTP_NOT_CONFIGURED" };

  const from = envFirst("SMTP_FROM", "EMAIL_FROM", "SMTP_USER", "EMAIL_USER");
  const transporter = createTransporter();
  const when = new Date(scheduledTime).toUTCString();

  await transporter.sendMail({
    from,
    to,
    subject: "Interview Scheduled - Hire Flow",
    text: `Your interview has been scheduled.\nCandidate: ${candidateEmail}\nRecruiter: ${recruiterEmail}\nTime: ${when}\nMeeting Link: ${meetingLink}`
  });

  return { sent: true };
}

async function sendPipelineEmail({ to, subject, text }) {
  if (!isMailConfigured()) return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  const from = envFirst("SMTP_FROM", "EMAIL_FROM", "SMTP_USER", "EMAIL_USER");
  const transporter = createTransporter();
  await transporter.sendMail({
    from,
    to,
    subject: String(subject || "Hire Flow Notification"),
    text: String(text || "")
  });
  return { sent: true };
}

module.exports = {
  isMailConfigured,
  sendInterviewScheduledEmail,
  sendPipelineEmail
};
