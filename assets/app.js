const DATA = window.SHAKAI_KOTOBA_DATA;
const ZUKAI = window.SHAKAI_ZUKAI || {};
const ILLUST = window.SHAKAI_ILLUST || {};
const terms = DATA.terms;
const tagMap = new Map(DATA.thinkingTags.map((tag) => [tag.id, tag]));

const CORRECTION_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfEdOGc-b0GSouR7Gab7YsTsbL2SntOROlpdBVskjJ4SmtN6A/viewform";

const GRADE_COLORS = { 3: "var(--g3)", 4: "var(--g4)", 5: "var(--g5)", 6: "var(--g6)" };

/* 歴史人物などのイラスト（六人衆・千早リコ作） */
const PERSON_IMG = {
  "himiko": "assets/img/jinbutsu/himiko.png",
  "shotoku-taishi": "assets/img/jinbutsu/shotoku_taishi.png",
  "minamoto-yoritomo": "assets/img/jinbutsu/minamoto_yoritomo.png",
  "oda-nobunaga": "assets/img/jinbutsu/oda_nobunaga.png",
  "toyotomi-hideyoshi": "assets/img/jinbutsu/toyotomi_hideyoshi.png",
  "tokugawa-ieyasu": "assets/img/jinbutsu/tokugawa_ieyasu.png",
  "senjin": "assets/img/jinbutsu/senjin.png"
};

/* 五十音は「行」でしぼりこむ（濁音・半濁音は清音の行に入れる） */
const KANA_ROWS = [
  ["あ行", "あいうえお"],
  ["か行", "かきくけこ"],
  ["さ行", "さしすせそ"],
  ["た行", "たちつてと"],
  ["な行", "なにぬねの"],
  ["は行", "はひふへほ"],
  ["ま行", "まみむめも"],
  ["や行", "やゆよ"],
  ["ら行", "らりるれろ"],
  ["わ行", "わをん"]
];

const DAKUTEN_MAP = {
  "が": "か", "ぎ": "き", "ぐ": "く", "げ": "け", "ご": "こ",
  "ざ": "さ", "じ": "し", "ず": "す", "ぜ": "せ", "ぞ": "そ",
  "だ": "た", "ぢ": "ち", "づ": "つ", "で": "て", "ど": "と",
  "ば": "は", "び": "ひ", "ぶ": "ふ", "べ": "へ", "ぼ": "ほ",
  "ぱ": "は", "ぴ": "ひ", "ぷ": "ふ", "ぺ": "へ", "ぽ": "ほ"
};

function seion(kana) {
  return DAKUTEN_MAP[kana] || kana;
}

function kanaRowOf(initial) {
  const s = seion(initial);
  const row = KANA_ROWS.find(([, chars]) => chars.includes(s));
  return row ? row[0] : "";
}

const PAGE_SIZE = 60;

const state = {
  query: "",
  grade: "all",
  kanaRow: "all",
  unit: "all",
  thinkingTag: "all",
  visibleCount: PAGE_SIZE
};

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
      (state.kanaRow === "all" || kanaRowOf(term.initial) === state.kanaRow) &&
      (state.unit === "all" || term.unit === state.unit) &&
      (state.thinkingTag === "all" || term.thinkingTags.includes(state.thinkingTag))
    );
  });
}

function renderCards() {
  const filtered = getFilteredTerms().sort((a, b) => {
    const s = seion(a.initial).localeCompare(seion(b.initial), "ja");
    return s !== 0 ? s : a.reading.localeCompare(b.reading, "ja");
  });
  const grid = document.querySelector("#termGrid");
  document.querySelector("#resultCount").textContent = filtered.length;
  document.querySelector("#emptyState").hidden = filtered.length !== 0;

  const visible = filtered.slice(0, state.visibleCount);
  const rest = filtered.length - visible.length;

  grid.innerHTML = visible.map((term) => `
    <button class="term-card" data-term-id="${term.id}" type="button" style="--grade-color:${GRADE_COLORS[term.grade]}">
      <span class="grade-label">${term.grade}年</span>
      <span class="term-name">${escapeHtml(term.term)}</span>
      <span class="reading">${escapeHtml(term.reading)}</span>
      <span class="meaning">${escapeHtml(term.meaning)}</span>
      ${ZUKAI[term.id] ? '<span class="zukai-mark">図解</span>' : ""}
    </button>
  `).join("");

  const moreButton = document.querySelector("#showMore");
  moreButton.hidden = rest <= 0;
  if (rest > 0) moreButton.textContent = `つづきを見る（あと${rest}語）`;
}

function renderThinkingPill(tagId) {
  const tag = tagMap.get(tagId);
  if (!tag) return "";
  return `
    <span class="thinking-pill" style="--tag-color:${tag.color}" title="${escapeHtml(tag.description)}">
      <span class="swatch"></span>${escapeHtml(tag.fullLabel)}
    </span>
  `;
}

function openTerm(termId) {
  const term = terms.find((item) => item.id === termId);
  if (!term) return;

  const dialog = document.querySelector("#termDialog");
  const zukai = ZUKAI[term.id];
  const personImg = PERSON_IMG[term.id] || (ILLUST[term.id] ? `assets/img/illust/${term.id}.webp` : "");

  document.querySelector("#dialogContent").innerHTML = `
    <div class="dialog-title" style="--grade-color:${GRADE_COLORS[term.grade]}">
      <p class="dialog-meta">${term.grade}年 / ${escapeHtml(term.unit)}</p>
      <h2>${escapeHtml(term.term)}</h2>
      <p class="reading">${escapeHtml(term.reading)}</p>
    </div>
    ${personImg ? `<figure class="person-box"><img src="${personImg}" alt="${escapeHtml(term.term)}のイラスト" loading="lazy"></figure>` : (zukai ? `<figure class="zukai-box">${zukai.svg}</figure>` : "")}
    <dl class="term-detail">
      <dt>意味</dt>
      <dd>${escapeHtml(term.meaning)}</dd>
      <dt>例文</dt>
      <dd>${escapeHtml(term.example)}</dd>
      <dt>関連する言葉</dt>
      <dd>
        <span class="related-buttons">
          ${term.relatedTerms.map((related) => `<button type="button" data-related="${escapeHtml(related)}">${escapeHtml(related)}</button>`).join("")}
        </span>
      </dd>
      <dt>見方・考え方</dt>
      <dd>
        <span class="thinking-pills">${term.thinkingTags.map(renderThinkingPill).join("")}</span>
      </dd>
    </dl>
    <div class="dialog-foot">
      <span>学習指導要領・教科書・年間指導計画を参考に作成</span>
      <a href="${CORRECTION_FORM_URL}" target="_blank" rel="noopener">まちがいを見つけたら教える</a>
    </div>
  `;

  if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
}

function renderKanaFilter() {
  const rows = ["all", ...KANA_ROWS.map(([label]) => label)];
  document.querySelector("#kanaFilter").innerHTML = rows.map((row) => `
    <button class="chip ${row === "all" ? "active" : ""}" data-filter-kind="kanaRow" data-filter-value="${row}">
      ${row === "all" ? "全" : row.charAt(0)}
    </button>
  `).join("");
}

function renderUnitFilter() {
  const byGrade = new Map();
  for (const term of terms) {
    if (!byGrade.has(term.grade)) byGrade.set(term.grade, []);
    const list = byGrade.get(term.grade);
    if (!list.includes(term.unit)) list.push(term.unit);
  }

  const parts = [
    `<button class="tag-button active" data-filter-kind="unit" data-filter-value="all">すべての単元</button>`
  ];
  for (const grade of [3, 4, 5, 6]) {
    const units = byGrade.get(grade) || [];
    parts.push(`<p class="unit-group-label">${grade}年</p>`);
    parts.push(...units.map((unit) => `
      <button class="tag-button" data-filter-kind="unit" data-filter-value="${escapeHtml(unit)}">${escapeHtml(unit)}</button>
    `));
  }
  document.querySelector("#unitFilter").innerHTML = parts.join("");
}

function renderThinkingFilter() {
  document.querySelector("#thinkingFilter").innerHTML = [
    `<button class="tag-button active" data-filter-kind="thinkingTag" data-filter-value="all">すべて</button>`,
    ...DATA.thinkingTags.map((tag) => `
      <button class="tag-button" data-filter-kind="thinkingTag" data-filter-value="${tag.id}" style="--tag-color:${tag.color}">
        <span class="swatch"></span><span>${escapeHtml(tag.fullLabel)}</span>
      </button>
    `)
  ].join("");
}

function setActiveButtons(kind, value) {
  document.querySelectorAll(`[data-filter-kind="${kind}"]`).forEach((button) => {
    button.classList.toggle("active", button.dataset.filterValue === value);
  });
}

function renderEdition() {
  document.querySelectorAll("[data-edition-label]").forEach((item) => {
    item.textContent = DATA.config.editionLabel;
  });
}

function attachEvents() {
  document.body.addEventListener("click", (event) => {
    const related = event.target.closest("[data-related]");
    if (related) {
      document.querySelector("#termDialog").close();
      state.query = related.dataset.related;
      document.querySelector("#searchInput").value = state.query;
      renderCards();
      window.scrollTo({ top: 0 });
      return;
    }

    const card = event.target.closest(".term-card");
    if (card) {
      openTerm(card.dataset.termId);
      return;
    }

    const button = event.target.closest("[data-filter-kind]");
    if (!button) return;
    const kind = button.dataset.filterKind;
    state[kind] = button.dataset.filterValue;
    state.visibleCount = PAGE_SIZE;
    setActiveButtons(kind, button.dataset.filterValue);
    renderCards();
  });

  document.querySelector("#searchInput").addEventListener("input", (event) => {
    state.query = event.target.value;
    state.visibleCount = PAGE_SIZE;
    renderCards();
  });

  document.querySelector("#showMore").addEventListener("click", () => {
    state.visibleCount += PAGE_SIZE * 2;
    renderCards();
  });

  document.querySelector("#resetFilters").addEventListener("click", () => {
    state.query = "";
    state.grade = "all";
    state.kanaRow = "all";
    state.unit = "all";
    state.thinkingTag = "all";
    state.visibleCount = PAGE_SIZE;
    document.querySelector("#searchInput").value = "";
    ["grade", "kanaRow", "unit", "thinkingTag"].forEach((kind) => setActiveButtons(kind, "all"));
    renderCards();
  });

  document.querySelector("#closeDialog").addEventListener("click", () => {
    document.querySelector("#termDialog").close();
  });
}

function setupMobilePanels() {
  if (window.matchMedia("(max-width: 860px)").matches) {
    document.querySelector("#kanaBlock").removeAttribute("open");
  }
}

function init() {
  renderEdition();
  renderKanaFilter();
  renderUnitFilter();
  renderThinkingFilter();
  attachEvents();
  setupMobilePanels();
  renderCards();
}

init();
