const DATA = window.SHAKAI_KOTOBA_DATA;
const terms = DATA.terms;
const tagMap = new Map(DATA.thinkingTags.map((tag) => [tag.id, tag]));
const referenceNote = DATA.config.referenceNote || "学習指導要領、教科書、年間指導計画を参考に作成。";

const state = {
  query: "",
  grade: "all",
  kana: "all",
  unit: "all",
  thinkingTag: "all",
  issueStats: new Map(),
  issueStatsLoaded: false
};

const feedbackLabels = {
  view_log: "調べた",
  helpful: "役に立った",
  image_request: "図解希望",
  add_word: "追加希望",
  correction: "修正提案"
};

// Googleフォーム URL（GASで作成したフォームの回答URL）
const googleFormUrls = {
  add_word:      "https://docs.google.com/forms/d/e/1FAIpQLSfN4o0kxUThyZajWw6gqnSNQ6STu92WrQHEuZJv_ZbGqxKOgA/viewform",
  view_log:      "https://docs.google.com/forms/d/e/1FAIpQLScYONu5KEYAGI8hswo5-gM_WtzapsurNi6Q5XpMmu8nUugNYQ/viewform",
  helpful:       "https://docs.google.com/forms/d/e/1FAIpQLSeXXx1PFSeIjnQ1HVq8sWYdrYhsmSBWPcPFxY-_qJaQ6SJZMA/viewform",
  image_request: "https://docs.google.com/forms/d/e/1FAIpQLSfF71BKVMunCebsb02AeO9j9X5eCPHIayIMMuhiEoQtqpJ9wQ/viewform",
  correction:    "https://docs.google.com/forms/d/e/1FAIpQLSfEdOGc-b0GSouR7Gab7YsTsbL2SntOROlpdBVskjJ4SmtN6A/viewform"
};

const iconPaths = {
  "map-pin": '<path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  network: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M8.5 7.5 11 15"/><path d="M15.5 7.5 13 15"/><path d="M9 6h6"/>',
  lightbulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M8.5 14.5a6 6 0 1 1 7 0c-.9.7-1.5 1.6-1.5 2.5h-4c0-.9-.6-1.8-1.5-2.5z"/>',
  home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>'
};

function iconSvg(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths["map-pin"]}</svg>`;
}

function tagStyle(tag) {
  return `--tag-color:${tag.color};--tag-bg:${tag.bg}`;
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getIssueStats(termId) {
  return state.issueStats.get(termId) || {};
}

function getCounts(term) {
  const stats = getIssueStats(term.id);
  return {
    viewCount: term.viewCount + (stats.view_log || 0),
    helpfulCount: term.helpfulCount + (stats.helpful || 0),
    imageRequestCount: term.imageRequestCount + (stats.image_request || 0)
  };
}

function getFilteredTerms() {
  const q = normalizeText(state.query);
  return terms.filter((term) => {
    const haystack = normalizeText([
      term.term,
      term.reading,
      term.unit,
      term.category,
      term.meaning,
      term.example,
      term.relatedTerms.join("")
    ].join(""));

    return (
      (!q || haystack.includes(q)) &&
      (state.grade === "all" || String(term.grade) === state.grade) &&
      (state.kana === "all" || term.initial === state.kana) &&
      (state.unit === "all" || term.unit === state.unit) &&
      (state.thinkingTag === "all" || term.thinkingTags.includes(state.thinkingTag))
    );
  });
}

function renderTagIcon(tagId, withLabel = true) {
  const tag = tagMap.get(tagId);
  if (!tag) return "";
  return `
    <span class="thinking-pill" style="${tagStyle(tag)}" title="${escapeHtml(`${tag.fullLabel}: ${tag.description}`)}">
      <span class="tag-icon" style="${tagStyle(tag)}">${iconSvg(tag.icon)}</span>
      ${withLabel ? `<span>${escapeHtml(tag.label)}</span>` : ""}
    </span>
  `;
}

function renderCards() {
  const filtered = getFilteredTerms().sort((a, b) => a.reading.localeCompare(b.reading, "ja"));
  const grid = document.querySelector("#termGrid");
  document.querySelector("#resultCount").textContent = filtered.length;
  document.querySelector("#emptyState").hidden = filtered.length !== 0;

  grid.innerHTML = filtered.map((term) => {
    const counts = getCounts(term);
    return `
      <button class="term-card" data-term-id="${term.id}" data-grade="${term.grade}" type="button">
        <span class="term-card-top">
          <span>
            <strong class="term-name">${escapeHtml(term.term)}</strong>
            <span class="reading">${escapeHtml(term.reading)}</span>
          </span>
          <span class="grade-badge">${term.grade}年</span>
        </span>
        <span class="meaning">${escapeHtml(term.meaning)}</span>
        <span class="term-meta">${term.thinkingTags.map((id) => renderTagIcon(id)).join("")}</span>
        <span class="stats-row">
          <span>調べた ${counts.viewCount}回</span>
          <span>役立った ${counts.helpfulCount}</span>
          <span>図解希望 ${counts.imageRequestCount}/${DATA.config.imageRequestThreshold}</span>
        </span>
      </button>
    `;
  }).join("");

  grid.querySelectorAll(".term-card").forEach((card) => {
    card.addEventListener("click", () => openTerm(card.dataset.termId));
  });
}

function openTerm(termId) {
  const term = terms.find((item) => item.id === termId);
  if (!term) return;

  const dialog = document.querySelector("#termDialog");
  const counts = getCounts(term);
  const imageReady = counts.imageRequestCount >= DATA.config.imageRequestThreshold;
  const requestCountLabel = `${counts.imageRequestCount}/${DATA.config.imageRequestThreshold}`;

  document.querySelector("#dialogContent").innerHTML = `
    <div class="dialog-title">
      <p class="eyebrow">${term.grade}年 / ${escapeHtml(term.unit)}</p>
      <h2>${escapeHtml(term.term)}</h2>
      <p class="reading">${escapeHtml(term.reading)}</p>
    </div>
    <div class="dialog-grid">
      <div class="detail-box">
        <h3>意味</h3>
        <p>${escapeHtml(term.meaning)}</p>
        <h3>例文</h3>
        <p>${escapeHtml(term.example)}</p>
        <h3>関連する言葉</h3>
        <p>${term.relatedTerms.map(escapeHtml).join(" / ")}</p>
      </div>
      <div class="detail-box">
        <h3>社会科の見方・考え方</h3>
        <div class="term-meta">${term.thinkingTags.map((id) => renderTagIcon(id)).join("")}</div>
        <h3>図解</h3>
        <div class="image-placeholder">
          <strong>${imageReady ? "図解作成の候補です" : "まだ図解はありません"}</strong>
          <span>図解リクエスト ${requestCountLabel}</span>
          <span class="source-note">30件以上たまった言葉から、AIで図解案を作成して先生が確認します。</span>
        </div>
      </div>
    </div>
    <div class="dialog-actions">
      <button class="button solid" type="button" data-feedback-action="view_log" data-feedback-term-id="${term.id}">調べた記録を送る</button>
      <button class="button soft" type="button" data-feedback-action="helpful" data-feedback-term-id="${term.id}">役に立った</button>
      <button class="button soft" type="button" data-feedback-action="image_request" data-feedback-term-id="${term.id}">図で解説してほしい</button>
      <button class="button ghost" type="button" data-feedback-action="correction" data-feedback-term-id="${term.id}">修正を提案する</button>
    </div>
    <p class="source-note">根拠: ${escapeHtml(referenceNote)}</p>
  `;

  if (typeof dialog.showModal === "function") dialog.showModal();
}

function renderEdition() {
  document.querySelectorAll("[data-edition-label]").forEach((item) => {
    item.textContent = DATA.config.editionLabel || "第2版";
  });
}

function renderKanaFilter() {
  const kanaOrder = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわ";
  const initials = [...new Set(terms.map((term) => term.initial))]
    .sort((a, b) => kanaOrder.indexOf(a) - kanaOrder.indexOf(b));
  const kana = ["all", ...initials];
  document.querySelector("#kanaFilter").innerHTML = kana.map((item) => `
    <button class="chip ${item === "all" ? "active" : ""}" data-filter-kind="kana" data-filter-value="${item}">
      ${item === "all" ? "全" : escapeHtml(item)}
    </button>
  `).join("");
}

function renderUnitFilter() {
  const units = [...new Set(terms.map((term) => term.unit))].sort((a, b) => a.localeCompare(b, "ja"));
  document.querySelector("#unitFilter").innerHTML = [
    `<button class="tag-button active" data-filter-kind="unit" data-filter-value="all">すべての単元</button>`,
    ...units.map((unit) => `<button class="tag-button" data-filter-kind="unit" data-filter-value="${escapeHtml(unit)}">${escapeHtml(unit)}</button>`)
  ].join("");
}

function renderThinkingFilter() {
  document.querySelector("#thinkingFilter").innerHTML = [
    `<button class="tag-button active" data-filter-kind="thinkingTag" data-filter-value="all">すべて</button>`,
    ...DATA.thinkingTags.map((tag) => `
      <button class="tag-button" data-filter-kind="thinkingTag" data-filter-value="${tag.id}">
        <span class="tag-icon" style="${tagStyle(tag)}">${iconSvg(tag.icon)}</span>
        <span>${escapeHtml(tag.fullLabel)}</span>
      </button>
    `)
  ].join("");
}

function setActiveButtons(kind, value) {
  document.querySelectorAll(`[data-filter-kind="${kind}"]`).forEach((button) => {
    button.classList.toggle("active", button.dataset.filterValue === value);
  });
}

function openFeedback(action, termId = "") {
  const term = terms.find((item) => item.id === termId);
  const dialog = document.querySelector("#feedbackDialog");
  const title = feedbackLabels[action] || "投稿";
  const googleUrl = googleFormUrls[action] || "";

  document.querySelector("#feedbackAction").value = action;
  document.querySelector("#feedbackTermId").value = term?.id || "";
  document.querySelector("#feedbackTerm").value = term?.term || "";
  document.querySelector("#feedbackGrade").value = term ? String(term.grade) : "";
  document.querySelector("#feedbackComment").value = "";
  document.querySelector("#feedbackTitle").textContent = `${title}を送る`;

  // Googleフォームセクションを動的に挿入
  const gSection = document.querySelector("#googleFormSection");
  if (gSection) {
    gSection.innerHTML = googleUrl ? `
      <a class="button solid gform-btn" href="${escapeHtml(googleUrl)}" target="_blank" rel="noopener">
        📋 Googleフォームで送る（アカウント不要）
      </a>
      <div class="or-divider"><span>または</span></div>
      <p class="github-label">GitHubアカウントをお持ちの方はこちら</p>
    ` : "";
  }

  const termInput = document.querySelector("#feedbackTerm");
  termInput.readOnly = Boolean(term && action !== "add_word");
  termInput.required = true;
  if (typeof dialog.showModal === "function") dialog.showModal();
}

function closeFeedback() {
  document.querySelector("#feedbackDialog").close();
}

function createIssueUrl(payload) {
  const marker = DATA.config.issueMarker;
  const repo = DATA.config.githubRepo;
  const title = `[${payload.label}] ${payload.term || "追加してほしい言葉"}`;
  const body = [
    marker,
    "",
    `action: ${payload.action}`,
    `termId: ${payload.termId || ""}`,
    `term: ${payload.term || ""}`,
    `grade: ${payload.grade || ""}`,
    `unit: ${payload.unit || ""}`,
    "",
    "comment:",
    payload.comment || "（メモなし）",
    "",
    "---",
    "このIssueは社会ことば辞典のサイト内フォームから作成されました。"
  ].join("\n");

  const url = new URL(`https://github.com/${repo}/issues/new`);
  url.searchParams.set("title", title);
  url.searchParams.set("body", body);
  if (DATA.config.issueLabels) url.searchParams.set("labels", DATA.config.issueLabels);
  return url.toString();
}

function submitFeedback(event) {
  event.preventDefault();
  const action = document.querySelector("#feedbackAction").value;
  const termId = document.querySelector("#feedbackTermId").value;
  const term = terms.find((item) => item.id === termId);
  const payload = {
    action,
    label: feedbackLabels[action] || "投稿",
    termId: term?.id || "",
    term: document.querySelector("#feedbackTerm").value.trim(),
    grade: document.querySelector("#feedbackGrade").value,
    unit: term?.unit || "",
    comment: document.querySelector("#feedbackComment").value.trim()
  };

  if (!payload.term) return;
  window.open(createIssueUrl(payload), "_blank", "noreferrer");
  closeFeedback();
}

function parseIssueBody(body) {
  if (!body || !body.includes(DATA.config.issueMarker)) return null;
  const lines = body.split(/\r?\n/);
  const record = {};
  for (const line of lines) {
    const match = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (match) record[match[1]] = match[2].trim();
  }
  if (!record.action) return null;
  return {
    action: record.action,
    termId: record.termId || "",
    term: record.term || ""
  };
}

async function loadIssueStats() {
  const status = document.querySelector("#issueStatsStatus");
  const repo = DATA.config.githubRepo;
  if (!repo) return;

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/issues?state=all&per_page=100`, {
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const issues = await response.json();
    const stats = new Map();

    for (const issue of issues) {
      if (issue.pull_request) continue;
      const record = parseIssueBody(issue.body);
      if (!record || !record.termId) continue;
      const current = stats.get(record.termId) || {};
      current[record.action] = (current[record.action] || 0) + 1;
      stats.set(record.termId, current);
    }

    state.issueStats = stats;
    state.issueStatsLoaded = true;
    status.textContent = `GitHub Issuesから${issues.length}件を確認しました。投稿が増えるとランキングに反映されます。`;
    renderCards();
    renderRanking();
  } catch (error) {
    status.textContent = "GitHub Issuesの読み込みに失敗しました。初期データのランキングを表示しています。";
    console.warn(error);
  }
}

function attachFilters() {
  document.body.addEventListener("click", (event) => {
    const feedbackButton = event.target.closest("[data-feedback-action]");
    if (feedbackButton) {
      if (feedbackButton.dataset.feedbackAction === "add_word") {
        window.open(googleFormUrls.add_word, "_blank", "noopener");
        return;
      }
      openFeedback(feedbackButton.dataset.feedbackAction, feedbackButton.dataset.feedbackTermId);
      return;
    }

    const button = event.target.closest("[data-filter-kind]");
    if (!button) return;
    const kind = button.dataset.filterKind;
    const value = button.dataset.filterValue;
    state[kind] = value;
    setActiveButtons(kind, value);
    renderCards();
  });

  document.querySelector("#searchInput").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderCards();
  });

  document.querySelector("#resetFilters").addEventListener("click", () => {
    state.query = "";
    state.grade = "all";
    state.kana = "all";
    state.unit = "all";
    state.thinkingTag = "all";
    document.querySelector("#searchInput").value = "";
    ["grade", "kana", "unit", "thinkingTag"].forEach((kind) => setActiveButtons(kind, "all"));
    renderCards();
  });

  document.querySelector("#closeDialog").addEventListener("click", () => {
    document.querySelector("#termDialog").close();
  });

  document.querySelector("#closeFeedbackDialog").addEventListener("click", closeFeedback);
  document.querySelector("#cancelFeedback").addEventListener("click", closeFeedback);
  document.querySelector("#feedbackForm").addEventListener("submit", submitFeedback);
}

function renderRanking() {
  const byViews = [...terms]
    .sort((a, b) => getCounts(b).viewCount - getCounts(a).viewCount)
    .slice(0, 8);
  const byImages = [...terms]
    .sort((a, b) => getCounts(b).imageRequestCount - getCounts(a).imageRequestCount)
    .slice(0, 8);
  const hasViewStats = byViews.some((term) => getCounts(term).viewCount > 0);
  const hasImageStats = byImages.some((term) => getCounts(term).imageRequestCount > 0);

  document.querySelector("#viewRanking").innerHTML = hasViewStats ? byViews.map((term) => {
    const counts = getCounts(term);
    return `
      <li><span class="rank-item"><span>${escapeHtml(term.term)}</span><span class="rank-count">${counts.viewCount}回</span></span></li>
    `;
  }).join("") : `<li><span class="rank-item"><span>まだ投稿がありません</span><span class="rank-count">0回</span></span></li>`;

  document.querySelector("#imageRanking").innerHTML = hasImageStats ? byImages.map((term) => {
    const counts = getCounts(term);
    return `
      <li><span class="rank-item"><span>${escapeHtml(term.term)}</span><span class="rank-count">${counts.imageRequestCount}件</span></span></li>
    `;
  }).join("") : `<li><span class="rank-item"><span>まだ投稿がありません</span><span class="rank-count">0件</span></span></li>`;

  const totals = DATA.thinkingTags.map((tag) => ({
    ...tag,
    total: terms
      .filter((term) => term.thinkingTags.includes(tag.id))
      .reduce((sum, term) => sum + getCounts(term).viewCount, 0)
  }));
  const max = Math.max(...totals.map((item) => item.total), 1);

  document.querySelector("#thinkingStats").innerHTML = totals.map((item) => `
    <div class="stat-line">
      <span>${escapeHtml(item.label)}</span>
      <span class="stat-bar"><span style="width:${Math.round((item.total / max) * 100)}%;background:${item.color}"></span></span>
      <span>${item.total}</span>
    </div>
  `).join("");
}

function init() {
  renderEdition();
  renderKanaFilter();
  renderUnitFilter();
  renderThinkingFilter();
  attachFilters();
  renderCards();
  renderRanking();
  loadIssueStats();
}

init();
