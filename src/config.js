const dotenv = require("dotenv");

dotenv.config();

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function validateEmail(value, label) {
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicEmailRegex.test(value)) {
    throw new Error(`${label} không phải địa chỉ email hợp lệ: ${value}`);
  }
}

function loadConfig() {
  const dryRun = (process.env.DRY_RUN || "false").toLowerCase() === "true";
  const defaultMailTo = process.env.MAIL_TO || "namkimu46@gmail.com";
  const authUser = process.env.GMAIL_USER || defaultMailTo;

  const config = {
    gmailUser: authUser,
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",
    mailTo: defaultMailTo,
    mailSubject:
      process.env.MAIL_SUBJECT ||
      "Bản tin giá xăng dầu, công nghệ, tài chính và sức khỏe",
    mailBody:
      process.env.MAIL_BODY || "Hello! This is your daily automated email.",
    mailTimezone: process.env.MAIL_TIMEZONE || "Asia/Ho_Chi_Minh",
    maxRetries: parseInteger(process.env.MAIL_MAX_RETRIES, 2),
    recentHours: parseInteger(process.env.MAIL_RECENT_HOURS, 24),
    dryRun,
  };

  if (!config.mailTo && !dryRun) {
    throw new Error("Thiếu biến MAIL_TO.");
  }

  if (!dryRun) {
    if (!config.gmailAppPassword) {
      throw new Error("Thiếu biến GMAIL_APP_PASSWORD.");
    }

    validateEmail(config.gmailUser, "GMAIL_USER");
    validateEmail(config.mailTo, "MAIL_TO");
  }

  if (config.maxRetries < 0) {
    throw new Error("MAIL_MAX_RETRIES phải lớn hơn hoặc bằng 0.");
  }

  if (config.recentHours <= 0) {
    throw new Error("MAIL_RECENT_HOURS phải lớn hơn 0.");
  }

  return config;
}

module.exports = {
  loadConfig,
};
