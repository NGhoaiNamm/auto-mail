const { loadConfig } = require("./config");
const { sendMail } = require("./mailer");
const { buildDailyDigest } = require("./digestBuilder");

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runDailyJob() {
  const config = loadConfig();
  const subject = config.mailSubject;
  const digest = await buildDailyDigest({
    timezone: config.mailTimezone,
    recentHours: config.recentHours,
  });

  let attempt = 0;
  const totalAttempts = config.maxRetries + 1;

  while (attempt < totalAttempts) {
    attempt += 1;

    try {
      const result = await sendMail(config, {
        to: config.mailTo,
        subject,
        text: digest.text,
        html: digest.html,
      });

      console.log(
        `[THÀNH CÔNG] Đã gửi email ở lần thử ${attempt}/${totalAttempts}. MessageId: ${result.messageId}`,
      );
      return;
    } catch (error) {
      const isLastAttempt = attempt >= totalAttempts;
      console.error(
        `[LỖI] Lần thử ${attempt}/${totalAttempts} thất bại: ${error.message}`,
      );

      if (isLastAttempt) {
        throw error;
      }

      const backoffMs = 2000 * attempt;
      console.log(`[THỬ LẠI] Chờ ${backoffMs}ms trước lần thử tiếp theo...`);
      await wait(backoffMs);
    }
  }
}

runDailyJob().catch((error) => {
  console.error("[NGHIÊM TRỌNG] Job gửi mail hằng ngày thất bại.", error);
  process.exitCode = 1;
});
