const DATA = window.SHAKAI_KOTOBA_DATA;
const terms = DATA.terms;
const tagMap = new Map(DATA.thinkingTags.map((tag) => [tag.id, tag]));

const state = {
  query: "",
  grade: "all",
  kana: "all",
  unit: "all",
  thinkingTag: "all"
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

function logAction(term, action) {
  const endpoint = DATA.config.trackingEndpoint;
  if (!endpoint) return;

  const payload = {
    timestamp: new Date().toISOString(),
    termId: term.id,
    term: term.term,
    grade: term.grade,
    unit: term.unit,
    action
  };

  try {
    navigator.sendBeacon?.(endpoint, JSON.stringify(payload)) ||
      fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
  } catch (error) {
    console.warn("tracking skipped", error);
  }
}

function formUrl(baseUrl, term, action) {
  if (!baseUrl || baseUrl.includes("REPLACE_WITH")) return "#";
  const url = new URL(baseUrl);
  url.searchParams.set("term_id", term.id);
  url.searchParams.set("term", term.term);
  url.searchParams.set("grade", `${term.grade}`);
  url.searchParams.set("unit", term.unit);
  url.searchParams.set("action", action);
  return url.toString();
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
    <span class="thinking-pill" style="${tagStyle(tag)}" title="${tag.fullLabel}: ${tag.description}">
      <span class="tag-icon" style="${tagStyle(tag)}">${iconSvg(tag.icon)}</span>
      ${withLabel ? `<span>${tag.label}</span>` : ""}
    </span>
  `;
}

function renderCards() {
  const filtered = getFilteredTerms().sort((a, b) => a.reading.localeCompare(b.reading, "ja"));
  const grid = document.querySelector("#termGrid");
  document.querySelector("#resultCount").textContent = filtered.length;
  document.querySelector("#emptyState").hidden = filtered.length !== 0;

  grid.innerHTML = filtered.map((term) => `
    <button class="term-card" data-term-id="${term.id}" type="button">
      <span class="term-card-top">
        <span>
          <strong class="term-name">${term.term}</strong>
          <span class="reading">${term.reading}</span>
        </span>
        <span class="grade-badge">${term.grade}年</span>
      </span>
      <span class="meaning">${term.meaning}</span>
      <span class="term-meta">${term.thinkingTags.map((id) => renderTagIcon(id)).join("")}</span>
      <span class="stats-row">
        <span>閲覧 ${term.viewCount}回</span>
        <span>役立った ${term.helpfulCount}</span>
        <span>図解希望 ${term.imageRequestCount}/${DATA.config.imageRequestThreshold}</span>
      </span>
    </button>
  `).join("");

  grid.querySelectorAll(".term-card").forEach((card) => {
    card.addEventListener("click", () => openTerm(card.dataset.termId));
  });
}

function openTerm(termId) {
  const term = terms.find((item) => item.id === termId);
  if (!term) return;
  logAction(term, "view");

  const dialog = document.querySelector("#termDialog");
  const imageReady = term.imageRequestCount >= DATA.config.imageRequestThreshold;
  const requestCountLabel = `${term.imageRequestCount}/${DATA.config.imageRequestThreshold}`;

  document.querySelector("#dialogContent").innerHTML = `
    <div class="dialog-title">
      <p class="eyebrow">${term.grade}年 / ${term.unit}</p>
      <h2>${term.term}</h2>
      <p class="reading">${term.reading}</p>
    </div>
    <div class="dialog-grid">
      <div class="detail-box">
        <h3>意味</h3>
        <p>${term.meaning}</p>
        <h3>例文</h3>
        <p>${term.example}</p>
        <h3>関連する言葉</h3>
        <p>${term.relatedTerms.join(" / ")}</p>
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
      <a class="button solid" href="${formUrl(DATA.config.helpfulFormUrl, term, "helpful")}" target="_blank" rel="noreferrer" data-action="helpful">役に立った</a>
      <a class="button soft" href="${formUrl(DATA.config.imageRequestFormUrl, term, "image_request")}" target="_blank" rel="noreferrer" data-action="image_request">図で解説してほしい</a>
      <a class="button ghost" href="${formUrl(DATA.config.addWordFormUrl, term, "add_request")}" target="_blank" rel="noreferrer">関連する言葉を追加してほしい</a>
    </div>
    <p class="source-note">根拠: ${term.source.join(" / ")}。説明文は子ども向けに独自作成した下書きです。</p>
  `;

  document.querySelectorAll("[data-action]").forEach((link) => {
    link.addEventListener("click", () => logAction(term, link.dataset.action));
  });

  if (typeof dialog.showModal === "function") dialog.showModal();
}

function renderKanaFilter() {
  const kana = ["all", "あ", "か", "き", "け", "こ", "さ", "し", "す", "せ", "た", "ち", "て", "と", "な", "に", "の", "ひ", "ふ", "へ", "ほ", "む", "よ", "り"];
  document.querySelector("#kanaFilter").innerHTML = kana.map((item) => `
    <button class="chip ${item === "all" ? "active" : ""}" data-filter-kind="kana" data-filter-value="${item}">
      ${item === "all" ? "全" : item}
    </button>
  `).join("");
}

function renderUnitFilter() {
  const units = [...new Set(terms.map((term) => term.unit))].sort((a, b) => a.localeCompare(b, "ja"));
  document.querySelector("#unitFilter").innerHTML = [
    `<button class="tag-button active" data-filter-kind="unit" data-filter-value="all">すべての単元</button>`,
    ...units.map((unit) => `<button class="tag-button" data-filter-kind="unit" data-filter-value="${unit}">${unit}</button>`)
  ].join("");
}

function renderThinkingFilter() {
  document.querySelector("#thinkingFilter").innerHTML = [
    `<button class="tag-button active" data-filter-kind="thinkingTag" data-filter-value="all">すべて</button>`,
    ...DATA.thinkingTags.map((tag) => `
      <button class="tag-button" data-filter-kind="thinkingTag" data-filter-value="${tag.id}">
        <span class="tag-icon" style="${tagStyle(tag)}">${iconSvg(tag.icon)}</span>
        <span>${tag.fullLabel}</span>
      </button>
    `)
  ].join("");
}

function setActiveButtons(kind, value) {
  document.querySelectorAll(`[data-filter-kind="${kind}"]`).forEach((button) => {
    button.classList.toggle("active", button.dataset.filterValue === value);
  });
}

function attachFilters() {
  document.body.addEventListener("click", (event) => {
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
}

function renderRanking() {
  const byViews = [...terms].sort((a, b) => b.viewCount - a.viewCount).slice(0, 6);
  const byImages = [...terms].sort((a, b) => b.imageRequestCount - a.imageRequestCount).slice(0, 6);

  document.querySelector("#viewRanking").innerHTML = byViews.map((term) => `
    <li><span class="rank-item"><span>${term.term}</span><span class="rank-count">${term.viewCount}回</span></span></li>
  `).join("");

  document.querySelector("#imageRanking").innerHTML = byImages.map((term) => `
    <li><span class="rank-item"><span>${term.term}</span><span class="rank-count">${term.imageRequestCount}件</span></span></li>
  `).join("");

  const totals = DATA.thinkingTags.map((tag) => ({
    ...tag,
    total: terms
      .filter((term) => term.thinkingTags.includes(tag.id))
      .reduce((sum, term) => sum + term.viewCount, 0)
  }));
  const max = Math.max(...totals.map((item) => item.total));

  document.querySelector("#thinkingStats").innerHTML = totals.map((item) => `
    <div class="stat-line">
      <span>${item.label}</span>
      <span class="stat-bar"><span style="width:${Math.round((item.total / max) * 100)}%;background:${item.color}"></span></span>
      <span>${item.total}</span>
    </div>
  `).join("");
}

function init() {
  document.querySelector("#addWordLink").href = DATA.config.addWordFormUrl;
  renderKanaFilter();
  renderUnitFilter();
  renderThinkingFilter();
  attachFilters();
  renderCards();
  renderRanking();
}

init();
