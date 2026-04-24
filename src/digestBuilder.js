const Parser = require("rss-parser");

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; DailyMailBot/1.0)",
  },
});

const SOURCE_MAP = {
  fuel: [
    "https://news.google.com/rss/search?q=gia+xang+dau+hom+nay+viet+nam&hl=vi&gl=VN&ceid=VN:vi",
    "https://news.google.com/rss/search?q=gia+xang+RON95+E5+cap+nhat+moi&hl=vi&gl=VN&ceid=VN:vi",
  ],
  tech: [
    "https://vnexpress.net/rss/so-hoa.rss",
    "https://news.google.com/rss/search?q=cong+nghe+moi+nhat&hl=vi&gl=VN&ceid=VN:vi",
  ],
  finance: [
    "https://vnexpress.net/rss/kinh-doanh.rss",
    "https://news.google.com/rss/search?q=tai+chinh+chung+khoan+ngan+hang+viet+nam&hl=vi&gl=VN&ceid=VN:vi",
  ],
  health: [
    "https://vnexpress.net/rss/suc-khoe.rss",
    "https://news.google.com/rss/search?q=suc+khoe+y+te+moi+nhat&hl=vi&gl=VN&ceid=VN:vi",
  ],
};

function sanitizeText(text) {
  if (!text) {
    return "Không có mô tả ngắn.";
  }

  const noHtml = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!noHtml) {
    return "Không có mô tả ngắn.";
  }

  return noHtml.length > 420 ? `${noHtml.slice(0, 417)}...` : noHtml;
}

function getSourceDomain(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch (_error) {
    return "nguon-khong-xac-dinh";
  }
}

function buildSummaryLines(item) {
  const merged = sanitizeText(item.summary);
  const words = merged.split(/\s+/).filter(Boolean);
  const lines = [];
  const wordsPerLine = 14;

  while (words.length > 0 && lines.length < 5) {
    const chunk = words.splice(0, wordsPerLine).join(" ");
    if (chunk) {
      lines.push(chunk);
    }
  }

  if (lines.length < 3) {
    lines.push(`Tiêu đề nổi bật: ${sanitizeText(item.title)}`);
  }

  if (lines.length < 3) {
    lines.push("Tin này phản ánh xu hướng đang được quan tâm trong ngày.");
  }

  if (lines.length < 3) {
    lines.push(
      "Nhấn vào liên kết để theo dõi bối cảnh đầy đủ và cập nhật mới nhất.",
    );
  }

  return lines.slice(0, 5);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeItem(item) {
  return {
    title: (item.title || "Không có tiêu đề").replace(/\s+/g, " ").trim(),
    link: item.link || "Không có liên kết",
    summary: sanitizeText(item.contentSnippet || item.content || item.summary),
    pubDate: item.isoDate || item.pubDate || "",
  };
}

async function readFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items || []).map(normalizeItem);
  } catch (error) {
    console.error(`[CẢNH BÁO] Không thể đọc RSS ${url}: ${error.message}`);
    return [];
  }
}

function dedupeAndSort(items) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    const key = `${item.title}|${item.link}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped.sort((a, b) => {
    const left = new Date(a.pubDate || 0).getTime();
    const right = new Date(b.pubDate || 0).getTime();
    return right - left;
  });
}

function parsePublishedTime(item) {
  const parsed = Date.parse(item.pubDate || "");
  return Number.isNaN(parsed) ? null : parsed;
}

async function collectSection(sectionName, maxItems, nowTime, recentHours) {
  const sourceUrls = SOURCE_MAP[sectionName] || [];
  const collected = [];

  for (const url of sourceUrls) {
    const items = await readFeed(url);
    collected.push(...items);
  }

  const sorted = dedupeAndSort(collected);
  const nowMs = nowTime.getTime();
  const recentWindowMs = recentHours * 60 * 60 * 1000;

  const recentOnly = sorted.filter((item) => {
    const publishedMs = parsePublishedTime(item);
    if (publishedMs === null || publishedMs > nowMs) {
      return false;
    }

    return nowMs - publishedMs <= recentWindowMs;
  });

  if (recentOnly.length >= Math.min(2, maxItems)) {
    return recentOnly.slice(0, maxItems);
  }

  return sorted.slice(0, maxItems);
}

function formatSection(
  title,
  items,
  minRequired,
  maxRequired,
  sectionTag = "Tổng hợp",
) {
  const lines = [title];

  if (!items.length) {
    lines.push("- Tạm thời chưa lấy được dữ liệu từ nguồn RSS.");
    return lines.join("\n");
  }

  const pickedCount = Math.max(
    minRequired,
    Math.min(maxRequired, items.length),
  );

  items.slice(0, pickedCount).forEach((item, index) => {
    const summaryLines = buildSummaryLines(item);
    lines.push(`${index + 1}. ${item.title}`);
    lines.push(
      `Nhãn: ${sectionTag} | Nguồn: ${getSourceDomain(item.link)} | Mục: Tin ${index + 1}`,
    );
    lines.push("Tóm tắt:");
    summaryLines.forEach((line, lineIndex) => {
      lines.push(`  - Dòng ${lineIndex + 1}: ${line}`);
    });
    lines.push(`Liên kết: ${item.link}`);
  });

  return lines.join("\n");
}

function formatSectionWithIcon(
  icon,
  title,
  items,
  minRequired,
  maxRequired,
  sectionTag = "Tổng hợp",
) {
  return formatSection(
    `${icon} ${title}`,
    items,
    minRequired,
    maxRequired,
    sectionTag,
  );
}

function buildQuickHighlights(fuelItems, techItems, financeItems, healthItems) {
  const pick = [];

  if (fuelItems[0]) {
    pick.push(`- ${fuelItems[0].title}`);
  }
  if (techItems[0]) {
    pick.push(`- ${techItems[0].title}`);
  }
  if (financeItems[0]) {
    pick.push(`- ${financeItems[0].title}`);
  }
  if (healthItems[0]) {
    pick.push(`- ${healthItems[0].title}`);
  }

  if (!pick.length) {
    return ["- Chưa có điểm nhấn nổi bật do nguồn tạm thời không khả dụng."];
  }

  return pick;
}

function formatHtmlSection(
  icon,
  title,
  items,
  minRequired,
  maxRequired,
  sectionTag,
) {
  const pickedCount = Math.max(
    minRequired,
    Math.min(maxRequired, items.length),
  );
  const selected = items.slice(0, pickedCount);

  if (!selected.length) {
    return `
      <section style="margin: 20px 0; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px;">
        <h2 style="margin: 0 0 8px; font-size: 20px; color: #111827;">${icon} ${escapeHtml(title)}</h2>
        <p style="margin: 0; color: #4b5563;">Tạm thời chưa lấy được dữ liệu từ nguồn RSS.</p>
      </section>
    `;
  }

  const itemsHtml = selected
    .map((item, index) => {
      const summaryLines = buildSummaryLines(item)
        .map(
          (line, lineIndex) =>
            `<li style="margin: 4px 0; color: #374151; line-height: 1.5;"><strong style="color:#1f2937;">Dòng ${lineIndex + 1}:</strong> ${escapeHtml(line)}</li>`,
        )
        .join("");

      const chipStyle =
        "display:inline-block; padding:4px 8px; border-radius:999px; font-size:11px; font-weight:700; margin-right:6px; margin-bottom:6px;";

      return `
        <article style="padding: 14px 14px; border: 1px solid #e5e7eb; border-radius: 12px; margin: 10px 0; background: #ffffff; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);">
          <div style="margin-bottom: 8px;">
            <span style="${chipStyle} background:#dbeafe; color:#1e3a8a;">${escapeHtml(sectionTag)}</span>
            <span style="${chipStyle} background:#e0f2fe; color:#0c4a6e;">${escapeHtml(getSourceDomain(item.link))}</span>
            <span style="${chipStyle} background:#ede9fe; color:#5b21b6;">Tin ${index + 1}</span>
            <span style="${chipStyle} background:#dcfce7; color:#166534;">Cập nhật mới</span>
          </div>
          <h3 style="margin: 0 0 8px; font-size: 17px; line-height: 1.4; color: #111827;">${escapeHtml(item.title)}</h3>
          <div style="margin: 0 0 10px; color: #4b5563; font-size: 13px;"><strong>Tóm tắt 3-5 dòng</strong></div>
          <ul style="margin: 0 0 12px 18px; padding: 0;">
            ${summaryLines}
          </ul>
          <a href="${escapeHtml(item.link)}" style="display: inline-block; padding: 8px 12px; border-radius: 999px; background: #0b57d0; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px;">Đọc chi tiết ↗</a>
        </article>
      `;
    })
    .join("");

  return `
    <section style="margin: 20px 0; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px;">
      <h2 style="margin: 0 0 8px; font-size: 21px; color: #111827;">${icon} ${escapeHtml(title)}</h2>
      ${itemsHtml}
    </section>
  `;
}

function buildHtmlDigest({
  timezone,
  generatedAt,
  recentHours,
  fuelItems,
  techItems,
  financeItems,
  healthItems,
}) {
  const timestamp = formatTimestamp(timezone);
  const highlights = buildQuickHighlights(
    fuelItems,
    techItems,
    financeItems,
    healthItems,
  )
    .map(
      (line) =>
        `<li style="margin: 4px 0; color: #1f2937;">${escapeHtml(line.replace(/^-\s*/, ""))}</li>`,
    )
    .join("");

  return `
<!doctype html>
<html lang="vi">
  <body style="margin: 0; padding: 0; background: #f3f6fb; font-family: Arial, Helvetica, sans-serif; color: #111827;">
    <div style="max-width: 760px; margin: 0 auto; padding: 22px 14px;">
      <header style="background: linear-gradient(135deg, #0b57d0, #17a2ff); color: #ffffff; border-radius: 16px; padding: 18px 20px;">
        <h1 style="margin: 0 0 8px; font-size: 24px;">🗞️ Bản Tin Nóng Mỗi Ngày</h1>
        <p style="margin: 0; font-size: 14px; opacity: 0.95;">Tổng hợp giá xăng dầu, công nghệ, tài chính và sức khỏe. Dữ liệu được cập nhật theo thời điểm gửi thư.</p>
      </header>

      <section style="background: #ffffff; border-radius: 14px; padding: 14px 16px; margin-top: 14px; border: 1px solid #e5e7eb;">
        <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">⚡ Điểm nhanh hôm nay</h2>
        <ul style="margin: 0; padding-left: 18px; color: #1f2937; line-height: 1.45;">
          ${highlights}
        </ul>
      </section>

      ${formatHtmlSection("⛽", "Giá xăng dầu", fuelItems, 3, 5, "Xăng dầu")}
      ${formatHtmlSection("💡", "Công nghệ", techItems, 3, 5, "Công nghệ")}
      ${formatHtmlSection("💰", "Tài chính", financeItems, 3, 5, "Tài chính")}
      ${formatHtmlSection("🩺", "Sức khỏe", healthItems, 3, 5, "Sức khỏe")}

      <footer style="margin-top: 16px; padding: 12px 14px; border-radius: 12px; background: #ffffff; border: 1px solid #e5e7eb; color: #4b5563; font-size: 13px;">
        <p style="margin: 0 0 4px;">🕒 Cập nhật lúc: ${escapeHtml(timestamp)} (${escapeHtml(timezone)})</p>
        <p style="margin: 0 0 4px;">⏱ Cửa sổ tin mới: ${recentHours} giờ gần nhất tính đến lúc gửi.</p>
        <p style="margin: 0;">🔄 Thời điểm truy vấn RSS: ${escapeHtml(generatedAt)}</p>
      </footer>
    </div>
  </body>
</html>
  `;
}

function formatTimestamp(timezone) {
  const now = new Date();
  return now.toLocaleString("vi-VN", { timeZone: timezone });
}

async function buildDailyDigest({ timezone, recentHours = 24 }) {
  const collectedAt = formatTimestamp(timezone);
  const nowTime = new Date();
  const [fuelItems, techItems, financeItems, healthItems] = await Promise.all([
    collectSection("fuel", 5, nowTime, recentHours),
    collectSection("tech", 5, nowTime, recentHours),
    collectSection("finance", 5, nowTime, recentHours),
    collectSection("health", 5, nowTime, recentHours),
  ]);

  const highlights = buildQuickHighlights(
    fuelItems,
    techItems,
    financeItems,
    healthItems,
  );
  const textSections = [
    "🗞️ BẢN TIN NÓNG MỖI NGÀY",
    "Xin chào, dưới đây là bản tin tổng hợp theo phong cách đọc báo nhanh.",
    `Tin được làm mới tại thời điểm gửi, ưu tiên bài trong ${recentHours} giờ gần nhất.`,
    "",
    "⚡ Điểm nhanh hôm nay",
    ...highlights,
    "",
    formatSectionWithIcon("⛽", "A) Giá xăng dầu", fuelItems, 3, 5, "Xăng dầu"),
    "",
    formatSectionWithIcon("💡", "B) Công nghệ", techItems, 3, 5, "Công nghệ"),
    "",
    formatSectionWithIcon(
      "💰",
      "C) Tài chính",
      financeItems,
      3,
      5,
      "Tài chính",
    ),
    "",
    formatSectionWithIcon("🩺", "D) Sức khỏe", healthItems, 3, 5, "Sức khỏe"),
    "",
    `Cập nhật lúc: ${formatTimestamp(timezone)} (${timezone})`,
    `Thời điểm truy vấn RSS: ${collectedAt}`,
  ];

  return {
    text: textSections.join("\n"),
    html: buildHtmlDigest({
      timezone,
      generatedAt: collectedAt,
      recentHours,
      fuelItems,
      techItems,
      financeItems,
      healthItems,
    }),
  };
}

module.exports = {
  buildDailyDigest,
};
