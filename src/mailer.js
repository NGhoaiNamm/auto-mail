const nodemailer = require("nodemailer");

function createTransport(config) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.gmailUser,
      pass: config.gmailAppPassword,
    },
  });
}

async function sendMail(config, payload) {
  if (config.dryRun) {
    console.log("[CHẠY THỬ] Chưa gửi email thật.");
    console.log(`[CHẠY THỬ] Người nhận: ${payload.to}`);
    console.log(`[CHẠY THỬ] Tiêu đề: ${payload.subject}`);
    console.log(`[CHẠY THỬ] Nội dung: ${payload.text}`);
    if (payload.html) {
      console.log(`[CHẠY THỬ] Độ dài HTML: ${payload.html.length}`);
    }
    return { messageId: "dry-run" };
  }

  const transport = createTransport(config);
  return transport.sendMail({
    from: config.gmailUser,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}

module.exports = {
  sendMail,
};
