/* ==========================================================
   NETA NOTE — app
   データは data/reviews.js。ここは表示とアニメーションだけ。
   GSAP / Lenis が読めなくても、アニメなしで全部見られる作り。
   ========================================================== */
(() => {
  "use strict";

  const DATA = window.NETA_NOTE || { reviews: [] };

  /* ---------- 定義 ---------- */
  const CRITERIA = [
    { key: "omoshiro", label: "おもしろ", en: "INTEREST", desc: "ネタそのもののおもしろさ。発想や設定の良さ。" },
    { key: "warai", label: "笑い", en: "LAUGHS", desc: "実際にどれだけ笑ったか。" },
    { key: "rikai", label: "理解度", en: "CLARITY", desc: "すんなり入ってきたか。わかりやすさ。" },
    { key: "ochi", label: "オチ", en: "PUNCHLINE", desc: "締めの決まり具合。" },
  ];
  const GRADES = ["A+", "A-", "B+", "B-", "C"];
  const GRADE_RANK = { "A+": 5, "A-": 4, "B+": 3, "B-": 2, C: 1 };
  const GRADE_CLS = { "A+": "ap", "A-": "am", "B+": "bp", "B-": "bm", C: "c" };

  /* ---------- 小道具 ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const has = (obj, k) => k != null && Object.prototype.hasOwnProperty.call(obj, k);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = (n) => String(Math.round(n * 10) / 10);
  const pad2 = (n) => String(n).padStart(2, "0");
  const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
  const signed = (n) => {
    const r = Math.round(n * 10) / 10;
    return (r > 0 ? "+" : r < 0 ? "−" : "±") + Math.abs(r).toFixed(1);
  };
  const heat = (v) => "h" + Math.max(0, Math.min(8, Math.round((v - 1) * 2)));
  const badge = (g, extra = "") => `<span class="grade grade--${GRADE_CLS[g] || "c"} ${extra}">${esc(g || "—")}</span>`;
  // 検索用：全角半角・大文字小文字・カタカナ/ひらがなの違いを吸収
  const norm = (s) => String(s).normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };

  /* ---------- データ整形 ---------- */
  const acts = DATA.reviews.map((r, i) => {
    const scores = r.scores || {};
    const total = CRITERIA.reduce((s, c) => s + (Number(scores[c.key]) || 0), 0);
    return {
      ...r,
      scores,
      notes: Array.isArray(r.notes) ? r.notes : [],
      tags: Array.isArray(r.tags) ? r.tags : [],
      id: "n" + (i + 1),
      order: i,
      total,
      avg: total / CRITERIA.length,
      gradeRank: GRADE_RANK[r.grade] || 0,
    };
  });
  const byId = new Map(acts.map((a) => [a.id, a]));

  // 好き補正：自分の採点のクセ（平均点 → 全体評価 の回帰直線）から予想される評価との差
  (() => {
    const mx = mean(acts.map((a) => a.avg));
    const my = mean(acts.map((a) => a.gradeRank));
    let sxy = 0, sxx = 0;
    acts.forEach((a) => { sxy += (a.avg - mx) * (a.gradeRank - my); sxx += (a.avg - mx) ** 2; });
    const slope = sxx ? sxy / sxx : 0;
    const icpt = my - slope * mx;
    acts.forEach((a) => { a.bias = a.gradeRank - (icpt + slope * a.avg); });
  })();

  const byScore = (k) => (a, b) =>
    (b.scores[k] || 0) - (a.scores[k] || 0) || b.gradeRank - a.gradeRank || b.total - a.total || a.order - b.order;
  const SORTS = {
    grade: { label: "全体評価が高い順", fn: (a, b) => b.gradeRank - a.gradeRank || b.total - a.total || a.order - b.order },
    total: { label: "合計点が高い順", fn: (a, b) => b.total - a.total || b.gradeRank - a.gradeRank || a.order - b.order },
    ...Object.fromEntries(CRITERIA.map((c) => [c.key, { label: `${c.label}が高い順`, fn: byScore(c.key) }])),
    bias: { label: "点数より好き順", fn: (a, b) => b.bias - a.bias || b.gradeRank - a.gradeRank || a.order - b.order },
    order: { label: "観た順", fn: (a, b) => a.order - b.order },
  };
  [...acts].sort(SORTS.grade.fn).forEach((a, i) => { a.rank = i + 1; });

  /* ---------- 状態（URL > 前回の設定 > 既定） ---------- */
  const store = {
    get(k) { try { return localStorage.getItem("netanote:" + k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem("netanote:" + k, v); } catch { /* プライベートモード等 */ } },
  };
  const params = new URLSearchParams(location.search);
  const gradeParam = (params.get("grade") || "").replace(/ /g, "+");
  const state = {
    q: params.get("q") || "",
    grade: GRADES.includes(gradeParam) ? gradeParam : "all",
    sort: has(SORTS, params.get("sort")) ? params.get("sort") : has(SORTS, store.get("sort")) ? store.get("sort") : "grade",
    view: ["card", "table"].includes(params.get("view")) ? params.get("view") : store.get("view") === "table" ? "table" : "card",
  };

  /* ---------- モーション準備 ---------- */
  const root = document.documentElement;
  const G = window.gsap;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasFlip = !!(G && window.Flip);
  const hasST = !!(G && window.ScrollTrigger);
  const motion = !!G && !reduceMotion;
  if (G) G.registerPlugin(...[window.Flip, window.ScrollTrigger].filter(Boolean));
  if (motion) root.classList.add("motion-on");
  else root.classList.remove("js-motion");

  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
    if (hasST) lenis.on("scroll", ScrollTrigger.update);
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  const scrollToTarget = (target) => {
    if (lenis) return lenis.scrollTo(target, { duration: 1.5 });
    const behavior = reduceMotion ? "auto" : "smooth";
    if (typeof target === "number") window.scrollTo({ top: target, behavior });
    else target.scrollIntoView({ behavior });
  };

  /* ---------- DOM ---------- */
  const els = {
    nav: $("#nav"),
    cards: $("#cards"),
    tableView: $("#table-view"),
    tableWrap: $("#table-wrap"),
    empty: $("#empty"),
    result: $("#result"),
    chips: $("#chips"),
    sort: $("#sort"),
    q: $("#q"),
    viewToggle: $("#view-toggle"),
    picks: $("#picks-grid"),
    sheet: $("#sheet"),
    panel: $(".sheet-panel"),
    backdrop: $(".sheet-backdrop"),
    scroller: $(".sheet-scroll"),
    sheetBody: $("#sheet-body"),
  };

  /* ---------- 部品 ---------- */
  const meterRows = (a, big = false) =>
    CRITERIA.map((c) => {
      const v = Number(a.scores[c.key]) || 0;
      return `<li class="m-row" data-k="${c.key}">
        <span class="m-label">${c.label}${big ? `<small>${c.en}</small>` : ""}</span>
        <span class="m-track"><span class="m-fill" data-v="${v / 5}" style="--v:${v / 5}"></span></span>
        <span class="m-val">${fmt(v)}</span>
      </li>`;
    }).join("");

  const tagItems = (a) =>
    [...a.tags.map((t) => `<li>#${esc(t)}</li>`), a.result ? `<li class="result">${esc(a.result)}</li>` : ""].join("");

  const NOTE_LIMIT = 3;
  const cardHTML = (a) => {
    const shown = a.notes.slice(0, NOTE_LIMIT);
    const more = a.notes.length - shown.length;
    const tags = tagItems(a);
    return `<div class="card-inner" data-tilt>
      <div class="card-head"><span class="card-rank">#${pad2(a.rank)}</span>${badge(a.grade)}</div>
      <h3 class="card-name">${esc(a.name)}</h3>
      <ul class="meters">${meterRows(a)}</ul>
      ${shown.length ? `<ul class="notes">${shown.map((n) => `<li>${esc(n)}</li>`).join("")}${more > 0 ? `<li class="more">+${more} MORE</li>` : ""}</ul>` : ""}
      <div class="card-foot">
        ${tags ? `<ul class="tags">${tags}</ul>` : ""}
        <span class="bias">好き補正 <b>${signed(a.bias)}</b></span>
        <span class="card-total"><b>${fmt(a.total)}</b>/20</span>
      </div>
    </div>`;
  };

  const cardEls = new Map();
  acts.forEach((a) => {
    const el = document.createElement("article");
    el.className = "card";
    el.dataset.id = a.id;
    el.dataset.flipId = a.id;
    el.dataset.grade = a.grade;
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `${a.name}（全体評価 ${a.grade}）の詳細を開く`);
    el.innerHTML = cardHTML(a);
    cardEls.set(a.id, el);
  });

  /* ---------- メーター・出現アニメ ---------- */
  function fillMeters(scope, delay = 0) {
    if (!motion) return;
    const scopes = Array.isArray(scope) ? scope : [scope];
    const fills = scopes.flatMap((el) => $$(".m-fill, .d-fill", el));
    if (!fills.length) return;
    G.fromTo(fills, { "--v": 0 }, { "--v": (i, el) => +el.dataset.v, duration: 1.6, ease: "expo.out", stagger: 0.018, delay, overwrite: true });
  }

  function revealInner(cards, quick) {
    const inners = cards.map((c) => $(".card-inner", c)).filter((el) => el && !el.dataset.revealed);
    if (!inners.length) return;
    inners.forEach((el) => { el.dataset.revealed = "1"; });
    if (!motion) return;
    if (quick) G.set(inners, { autoAlpha: 1, y: 0 });
    else G.fromTo(inners, { y: 70, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.15, ease: "expo.out", stagger: 0.08, overwrite: "auto" });
    fillMeters(inners, quick ? 0.25 : 0.15);
  }

  /* ---------- 一覧 ---------- */
  function visibleList() {
    const q = norm(state.q.trim());
    return acts
      .filter((a) => state.grade === "all" || a.grade === state.grade)
      .filter((a) => !q || norm([a.name, ...a.notes, ...a.tags, a.event || "", a.result || ""].join(" ")).includes(q))
      .sort(SORTS[state.sort].fn);
  }

  let firstRender = true;
  let flipTl = null;
  function renderList({ animate = true } = {}) {
    const list = visibleList();
    const ids = new Set(list.map((a) => a.id));
    els.cards.dataset.sort = state.sort;
    els.tableWrap.dataset.sort = state.sort;
    els.result.innerHTML = `<b>${list.length}</b> / ${acts.length} ACTS`;
    els.empty.hidden = list.length > 0;

    if (state.view === "card") {
      const all = [...cardEls.values()];
      const doFlip = animate && motion && hasFlip && !firstRender;
      if (flipTl) { flipTl.progress(1); flipTl = null; }
      const flipState = doFlip ? Flip.getState(all) : null;

      all.forEach((el) => el.classList.toggle("is-out", !ids.has(el.dataset.id)));
      list.forEach((a, i) => {
        const el = cardEls.get(a.id);
        $(".card-rank", el).textContent = "#" + pad2(i + 1);
        els.cards.appendChild(el);
      });

      if (!firstRender && motion) {
        // 並び替え後に画面内へ来るカードは先に中身を出しておく
        revealInner(list.map((a) => cardEls.get(a.id)).filter(inView), true);
      }
      if (flipState) {
        flipTl = Flip.from(flipState, {
          duration: 0.85,
          ease: "expo.inOut",
          absolute: true,
          stagger: 0.012,
          onEnter: (enter) => {
            revealInner(enter, true);
            return G.fromTo(enter, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.7, ease: "expo.out", delay: 0.25 });
          },
          onLeave: (leave) => G.to(leave, { autoAlpha: 0, scale: 0.85, duration: 0.45, ease: "power2.in" }),
          onComplete: () => { flipTl = null; if (hasST) ScrollTrigger.refresh(); },
        });
      } else if (!firstRender && hasST) {
        ScrollTrigger.refresh();
      }
    } else {
      renderTable(list, animate && motion && !firstRender);
    }
    firstRender = false;
  }

  function renderTable(list, animate) {
    const sortBtn = (key, label) => `<button type="button" data-sort="${key}" aria-pressed="${state.sort === key}">${label}</button>`;
    const head = `<thead><tr>
      <th scope="col" class="t-name"><span>組</span></th>
      ${CRITERIA.map((c) => `<th scope="col">${sortBtn(c.key, c.label)}</th>`).join("")}
      <th scope="col">${sortBtn("total", "合計")}</th>
      <th scope="col">${sortBtn("grade", "全体")}</th>
    </tr></thead>`;
    const rows = list.map((a) => `<tr data-id="${a.id}">
      <th scope="row" class="t-name"><button type="button" data-open="${a.id}">${esc(a.name)}</button></th>
      ${CRITERIA.map((c) => {
        const v = Number(a.scores[c.key]) || 0;
        return `<td class="heat ${heat(v)}" data-k="${c.key}">${fmt(v)}</td>`;
      }).join("")}
      <td class="t-total">${fmt(a.total)}</td>
      <td class="t-grade">${badge(a.grade)}</td>
    </tr>`).join("");
    els.tableWrap.innerHTML = `<table><caption class="vh">採点一覧（各項目1〜5点、合計20点満点）</caption>${head}<tbody>${rows}</tbody></table>`;
    if (animate) G.fromTo($$("tbody tr", els.tableWrap), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "power2.out", stagger: 0.025 });
  }

  /* ---------- ツールバー ---------- */
  function renderChips() {
    const count = (g) => acts.filter((a) => a.grade === g).length;
    const items = [["all", "ALL", acts.length], ...GRADES.map((g) => [g, g, count(g)])];
    els.chips.innerHTML = items
      .map(([v, label, n]) => `<button type="button" class="chip" data-grade="${v}" aria-pressed="${state.grade === v}"${n === 0 ? " disabled" : ""}>${label}<small>${n}</small></button>`)
      .join("");
    const pill = document.createElement("span");
    pill.className = "chip-pill";
    pill.setAttribute("aria-hidden", "true");
    ($(`.chip[data-grade="${state.grade}"]`, els.chips) || els.chips.firstElementChild).appendChild(pill);
  }

  els.chips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip || chip.disabled || chip.dataset.grade === state.grade) return;
    state.grade = chip.dataset.grade;
    const pill = $(".chip-pill", els.chips);
    const st = motion && hasFlip ? Flip.getState(pill) : null;
    $$(".chip", els.chips).forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    chip.appendChild(pill);
    if (st) Flip.from(st, { duration: 0.65, ease: "expo.out", scale: true, onComplete: () => G.set(pill, { clearProps: "transform" }) });
    renderList();
  });

  els.sort.innerHTML = Object.entries(SORTS).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join("");
  els.sort.value = state.sort;
  function setSort(k) {
    if (!has(SORTS, k) || k === state.sort) return;
    state.sort = k;
    els.sort.value = k;
    store.set("sort", k);
    renderList();
  }
  els.sort.addEventListener("change", () => setSort(els.sort.value));

  let qTimer = 0;
  els.q.value = state.q;
  els.q.addEventListener("input", () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.q = els.q.value; renderList(); }, 160);
  });

  function setView(v, animate = true) {
    state.view = v;
    store.set("view", v);
    els.viewToggle.dataset.view = v;
    $$("button", els.viewToggle).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
    const showCards = v === "card";
    const incoming = showCards ? els.cards : els.tableView;
    const outgoing = showCards ? els.tableView : els.cards;
    if (!animate || !motion || outgoing.hidden) {
      outgoing.hidden = true;
      incoming.hidden = false;
      renderList({ animate: false });
      if (hasST) ScrollTrigger.refresh();
      return;
    }
    G.to(outgoing, {
      autoAlpha: 0, y: 24, duration: 0.25, ease: "power2.in",
      onComplete: () => {
        outgoing.hidden = true;
        G.set(outgoing, { clearProps: "all" });
        incoming.hidden = false;
        renderList({ animate: false });
        G.fromTo(incoming, { autoAlpha: 0, y: 36 }, {
          autoAlpha: 1, y: 0, duration: 0.8, ease: "expo.out", clearProps: "transform",
          onComplete: () => { if (hasST) ScrollTrigger.refresh(); },
        });
        if (showCards) revealInner([...cardEls.values()].filter((c) => !c.classList.contains("is-out") && inView(c)), false);
        else G.fromTo($$("tbody tr", els.tableWrap), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, stagger: 0.025, delay: 0.1 });
      },
    });
  }
  els.viewToggle.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-view]");
    if (b && b.dataset.view !== state.view) setView(b.dataset.view);
  });

  /* ---------- PICKS / HERO / HOW ---------- */
  let picksList = [];
  function renderPicks() {
    picksList = acts.filter((a) => a.grade === "A+").sort((a, b) => b.total - a.total || a.order - b.order);
    if (!picksList.length) { $("#picks").hidden = true; return; }
    els.picks.innerHTML = picksList.map((a, i) => `
      <article class="pick" data-id="${a.id}" tabindex="0" role="button" aria-label="${esc(a.name)}（全体評価 A+）の詳細を開く">
        <div class="pick-inner" data-tilt>
          <div class="pick-head"><span class="pick-no outline-fx" aria-hidden="true">${pad2(i + 1)}</span>${badge(a.grade)}</div>
          <h3 class="pick-name">${esc(a.name)}</h3>
          <ul class="meters">${meterRows(a)}</ul>
          ${a.notes[0] ? `<p class="pick-quote">${esc(a.notes[0])}</p>` : ""}
          <span class="pick-total"><b>${fmt(a.total)}</b>/20</span>
        </div>
      </article>`).join("");
  }

  function renderHero() {
    const setStat = (id, v, dec = 0) => {
      const el = $("#" + id);
      el.dataset.to = v;
      el.dataset.dec = dec;
      el.textContent = v.toFixed(dec);
    };
    setStat("stat-count", acts.length);
    setStat("stat-ap", acts.filter((a) => a.grade === "A+").length);
    setStat("stat-avg", mean(acts.map((a) => a.avg)), 1);

    const items = [...acts].sort(SORTS.grade.fn)
      .map((a) => `<span class="mq-item">${esc(a.name)}<em class="mq-grade">${esc(a.grade)}</em></span><span class="mq-star">✦</span>`)
      .join("");
    $$(".mq-track").forEach((t) => { t.innerHTML = `<div class="mq-group">${items}</div><div class="mq-group">${items}</div>`; });

    $("#updated").textContent = DATA.updated || "";
    $("#foot-count").textContent = acts.length;
  }

  function renderHow() {
    $("#crit-grid").innerHTML = CRITERIA.map((c, i) => `
      <div class="crit">
        <span class="crit-no outline-fx" aria-hidden="true">${pad2(i + 1)}</span>
        <h3><small>${c.en}</small>${c.label}</h3>
        <p>${c.desc}</p>
        <p class="crit-avg">AVERAGE<b>${mean(acts.map((a) => Number(a.scores[c.key]) || 0)).toFixed(1)}</b></p>
      </div>`).join("");
    const counts = GRADES.map((g) => acts.filter((a) => a.grade === g).length);
    const max = Math.max(1, ...counts);
    $("#dist").innerHTML = GRADES.map((g, i) => `
      <li>${badge(g)}
        <span class="d-track"><span class="d-fill" data-v="${counts[i] / max}" style="--v:${counts[i] / max}"></span></span>
        <b>${counts[i]}<small>組</small></b>
      </li>`).join("");
  }

  /* ---------- 詳細シート ---------- */
  let cur = null, curSource = null, curList = [], lastFocus = null, sheetBusy = false;

  const biasText = (b) =>
    b >= 0.5 ? "点数から予想されるより全体評価が高め。点数以上に好き。"
      : b <= -0.5 ? "点数のわりに全体評価は控えめ。"
        : "ほぼ点数どおりの全体評価。";

  function sheetHTML(a) {
    const idx = curList.indexOf(a);
    const meta = [a.event, a.date].filter(Boolean).map(esc).join(" ・ ");
    const tags = tagItems(a);
    return `
      <p class="sh-kicker"><b>RANK #${pad2(a.rank)}</b> / ${acts.length}${meta ? " ・ " + meta : ""}</p>
      <h2 class="sh-name" id="sh-name">${esc(a.name)}</h2>
      <div class="sh-top">${badge(a.grade, "grade--xl")}<span class="sh-total"><b>${fmt(a.total)}</b>/ 20</span></div>
      <ul class="meters sh-meters">${meterRows(a, true)}</ul>
      <div class="sh-bias"><b>${signed(a.bias)}</b><span>好き補正</span><small>${biasText(a.bias)}</small></div>
      ${a.notes.length ? `<ul class="sh-notes">${a.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
      ${tags ? `<ul class="tags">${tags}</ul>` : ""}
      ${curList.length > 1 ? `<nav class="sh-nav" aria-label="前後の組">
        <button type="button" data-nav="-1">← PREV</button>
        <span>${idx + 1} / ${curList.length}</span>
        <button type="button" data-nav="1">NEXT →</button>
      </nav>` : ""}`;
  }

  function lockScroll(on) {
    root.classList.toggle("is-locked", on);
    if (lenis) (on ? lenis.stop() : lenis.start());
  }

  // パネルを「元のカードの位置・大きさ」に重ねるための変形
  function deltaFrom(el) {
    G.set(els.panel, { clearProps: "transform" });
    const a = el.getBoundingClientRect();
    const b = els.panel.getBoundingClientRect();
    return { transformOrigin: "0 0", x: a.left - b.left, y: a.top - b.top, scaleX: a.width / b.width, scaleY: a.height / b.height };
  }

  function revealSheetBody() {
    G.set(els.sheetBody, { autoAlpha: 1 });
    G.fromTo(els.sheetBody.children, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.85, ease: "expo.out", stagger: 0.05 });
    fillMeters(els.sheetBody, 0.1);
  }

  function openSheet(id, source, list) {
    const a = byId.get(id);
    if (!a || sheetBusy) return;
    const vis = visibleList();
    curList = list || (vis.some((x) => x.id === id) ? vis : [...acts].sort(SORTS.grade.fn));
    cur = a;
    curSource = source || null;
    lastFocus = document.activeElement;
    els.sheetBody.innerHTML = sheetHTML(a);
    els.sheet.hidden = false;
    els.scroller.scrollTop = 0;
    lockScroll(true);
    history.replaceState(null, "", "#" + id);
    $(".sheet-close", els.sheet).focus({ preventScroll: true });
    if (!motion) return;

    sheetBusy = true;
    const done = () => {
      sheetBusy = false;
      G.set(els.panel, { clearProps: "transform,transformOrigin,opacity,visibility" });
      revealSheetBody();
    };
    G.fromTo(els.backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "power2.out" });
    G.set(els.sheetBody, { autoAlpha: 0 });
    if (curSource && inView(curSource)) {
      G.fromTo(els.panel, deltaFrom(curSource), { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.8, ease: "expo.inOut", onComplete: done });
      G.to(curSource, { autoAlpha: 0, duration: 0.12 });
    } else {
      G.fromTo(els.panel, { y: 70, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.75, ease: "expo.out", onComplete: done });
    }
  }

  function closeSheet() {
    if (els.sheet.hidden || sheetBusy) return;
    const src = curSource && curSource.isConnected && inView(curSource) ? curSource : null;
    const finish = () => {
      els.sheet.hidden = true;
      sheetBusy = false;
      if (G) {
        G.set([els.panel, els.backdrop, els.sheetBody], { clearProps: "all" });
        if (curSource) G.set(curSource, { autoAlpha: 1 });
      }
      lockScroll(false);
      history.replaceState(null, "", location.pathname + location.search);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      cur = curSource = null;
    };
    if (!motion) return finish();
    sheetBusy = true;
    G.to(els.sheetBody, { autoAlpha: 0, duration: 0.18, ease: "power1.in" });
    G.to(els.backdrop, { autoAlpha: 0, duration: 0.6, ease: "power2.inOut" });
    if (src) G.to(els.panel, { ...deltaFrom(src), duration: 0.7, ease: "expo.inOut", delay: 0.06, onComplete: finish });
    else G.to(els.panel, { y: 80, autoAlpha: 0, duration: 0.45, ease: "power2.in", onComplete: finish });
  }

  function navSheet(dir) {
    if (!cur || curList.length < 2 || sheetBusy) return;
    const i = curList.indexOf(cur);
    const next = curList[(i + dir + curList.length) % curList.length];
    const keepNavFocus = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.nav;

    if (curSource && G) G.set(curSource, { autoAlpha: 1 });
    const fromPick = curSource && curSource.classList && curSource.classList.contains("pick");
    const cand = fromPick
      ? $(`.pick[data-id="${next.id}"]`)
      : state.view === "card" ? cardEls.get(next.id) : $(`tr[data-id="${next.id}"]`, els.tableWrap);
    curSource = cand && !cand.classList.contains("is-out") ? cand : null;
    if (curSource && motion) G.set(curSource, { autoAlpha: 0 });
    cur = next;
    history.replaceState(null, "", "#" + next.id);

    const render = () => {
      els.sheetBody.innerHTML = sheetHTML(next);
      els.scroller.scrollTop = 0;
      if (keepNavFocus) { const b = $(`[data-nav="${dir}"]`, els.sheetBody); if (b) b.focus({ preventScroll: true }); }
    };
    if (!motion) return render();
    sheetBusy = true;
    G.to(els.sheetBody, {
      x: -44 * dir, autoAlpha: 0, duration: 0.22, ease: "power2.in",
      onComplete: () => {
        render();
        G.fromTo(els.sheetBody, { x: 44 * dir, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.65, ease: "expo.out", onComplete: () => { sheetBusy = false; } });
        fillMeters(els.sheetBody, 0.05);
      },
    });
  }

  els.sheet.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) return closeSheet();
    const nav = e.target.closest("[data-nav]");
    if (nav) navSheet(Number(nav.dataset.nav));
  });

  // スマホ：左右スワイプで前後、下スワイプで閉じる
  let touch = null;
  els.panel.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touch = { x: t.clientX, y: t.clientY, top: els.scroller.scrollTop };
  }, { passive: true });
  els.panel.addEventListener("touchend", (e) => {
    if (!touch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.4) navSheet(dx < 0 ? 1 : -1);
    else if (dy > 110 && touch.top <= 0 && dy > Math.abs(dx) * 1.4) closeSheet();
    touch = null;
  }, { passive: true });

  /* ---------- グローバル操作 ---------- */
  document.addEventListener("click", (e) => {
    const opener = e.target.closest(".card, .pick");
    if (opener) return openSheet(opener.dataset.id, opener, opener.classList.contains("pick") ? picksList : null);
    const openBtn = e.target.closest("[data-open]");
    if (openBtn) return openSheet(openBtn.dataset.open, openBtn.closest("tr"));
    const sortBtn = e.target.closest("button[data-sort]");
    if (sortBtn) return setSort(sortBtn.dataset.sort);
    const link = e.target.closest("a[data-scroll]");
    if (link) {
      e.preventDefault();
      const id = link.getAttribute("href").slice(1);
      const target = id === "top" ? 0 : document.getElementById(id);
      if (target !== null) scrollToTarget(target);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (els.sheet.hidden) {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".card, .pick")) {
        e.preventDefault();
        e.target.click();
      }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); closeSheet(); }
    else if (e.key === "ArrowRight") navSheet(1);
    else if (e.key === "ArrowLeft") navSheet(-1);
    else if (e.key === "Tab") {
      const f = $$("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])", els.panel).filter((el) => !el.disabled && el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  const onScroll = () => els.nav.classList.toggle("is-scrolled", window.scrollY > 24);
  addEventListener("scroll", onScroll, { passive: true });

  /* ---------- 演出 ---------- */
  function intro() {
    if (!motion) return;
    $$("[data-split]").forEach((el) => {
      const text = el.textContent;
      el.textContent = "";
      [...text].forEach((ch) => {
        const s = document.createElement("span");
        s.className = "ch";
        s.textContent = ch;
        el.appendChild(s);
      });
    });
    G.set(".hero-title", { visibility: "visible" });
    G.timeline({ defaults: { ease: "expo.out" } })
      .fromTo(".hero-title .ch", { yPercent: 120, rotate: 8 }, { yPercent: 0, rotate: 0, duration: 1.6, stagger: 0.07 }, 0.1)
      .fromTo(".hero [data-intro]", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.3, stagger: 0.08 }, 0.55);

    $$("[data-to]").forEach((el) => {
      const to = +el.dataset.to, dec = +el.dataset.dec || 0, o = { v: 0 };
      el.textContent = (0).toFixed(dec);
      G.to(o, { v: to, duration: 2.2, ease: "expo.out", delay: 0.8, onUpdate: () => { el.textContent = o.v.toFixed(dec); } });
    });
  }

  function scrollFx() {
    if (!motion || !hasST) {
      $$(".card-inner").forEach((el) => { el.dataset.revealed = "1"; });
      return;
    }
    G.to(".progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
    G.to(".hero-title", { yPercent: -16, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

    $$(".sec-head").forEach((h) => {
      G.timeline({ scrollTrigger: { trigger: h, start: "top 86%", once: true } })
        .fromTo($(".rv > span", h), { yPercent: 115 }, { yPercent: 0, duration: 1.4, ease: "expo.out" })
        .fromTo([$(".sec-no", h), $("p", h)], { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: "expo.out", stagger: 0.08 }, 0.15);
    });

    const pickInners = $$(".pick-inner");
    if (pickInners.length) {
      G.set(pickInners, { autoAlpha: 0 });
      ScrollTrigger.create({
        trigger: els.picks, start: "top 85%", once: true,
        onEnter: () => {
          G.fromTo(pickInners, { y: 100, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.4, ease: "expo.out", stagger: 0.12 });
          fillMeters(pickInners, 0.35);
        },
      });
    }

    G.set($$(".card-inner"), { autoAlpha: 0 });
    ScrollTrigger.batch(".card", { start: "top 92%", once: true, onEnter: (batch) => revealInner(batch, false) });

    G.set(".crit", { autoAlpha: 0 });
    ScrollTrigger.batch(".crit", {
      start: "top 90%", once: true,
      onEnter: (b) => G.fromTo(b, { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, ease: "expo.out", stagger: 0.08 }),
    });
    G.set(".d-fill", { "--v": 0 });
    ScrollTrigger.create({ trigger: ".dist", start: "top 85%", once: true, onEnter: () => fillMeters($(".dist"), 0.1) });

    G.fromTo(".foot-mark", { xPercent: -8 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: ".foot", start: "top bottom", end: "bottom bottom", scrub: true } });
  }

  function marqueeFx() {
    if (!motion) return;
    const tweens = $$(".mq-track").map((t, i) => {
      const tw = i % 2 === 0
        ? G.fromTo(t, { xPercent: 0 }, { xPercent: -50, duration: 50, ease: "none", repeat: -1 })
        : G.fromTo(t, { xPercent: -50 }, { xPercent: 0, duration: 58, ease: "none", repeat: -1 });
      tw.totalTime(tw.duration() * 400); // 逆再生しても端に当たらないよう時間を進めておく
      return tw;
    });
    if (!hasST) return;
    // スクロールの勢いで加速、上スクロールで逆走
    let target = 1, current = 1, dir = 1;
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: (self) => { target = 1 + Math.min(Math.abs(self.getVelocity()) / 180, 9); dir = self.direction; },
    });
    G.ticker.add(() => {
      target += (1 - target) * 0.05;
      current += (target - current) * 0.1;
      tweens.forEach((tw) => { tw.timeScale(current); tw.reversed(dir < 0); });
    });
  }

  function pointerFx() {
    if (!motion) return;
    const spot = $(".spot");
    if (!finePointer) {
      G.to(spot, { x: innerWidth * 0.2, y: innerHeight * 0.65, duration: 9, ease: "sine.inOut", yoyo: true, repeat: -1 });
      return;
    }
    const cursor = document.createElement("div");
    cursor.className = "cursor is-hidden";
    cursor.setAttribute("aria-hidden", "true");
    document.body.appendChild(cursor);
    const cx = G.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
    const cy = G.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
    const sx = G.quickTo(spot, "x", { duration: 1.8, ease: "power3" });
    const sy = G.quickTo(spot, "y", { duration: 1.8, ease: "power3" });

    const tilts = new WeakMap();
    const tiltOf = (el) => {
      let t = tilts.get(el);
      if (!t) {
        G.set(el, { transformPerspective: 1000 });
        t = { rx: G.quickTo(el, "rotationX", { duration: 0.8, ease: "power3" }), ry: G.quickTo(el, "rotationY", { duration: 0.8, ease: "power3" }) };
        tilts.set(el, t);
      }
      return t;
    };
    let tiltEl = null;
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      cursor.classList.remove("is-hidden");
      cx(e.clientX); cy(e.clientY); sx(e.clientX); sy(e.clientY);
      const target = e.target instanceof Element ? e.target : null;
      const opener = target && els.sheet.hidden ? target.closest(".card, .pick") : null;
      cursor.classList.toggle("is-card", !!opener);
      cursor.classList.toggle("is-hover", !opener && !!(target && target.closest("a, button, select, input, label")));
      const el = opener ? $("[data-tilt]", opener) : null;
      if (tiltEl && tiltEl !== el) { const t = tiltOf(tiltEl); t.rx(0); t.ry(0); }
      tiltEl = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", px * 100 + "%");
      el.style.setProperty("--my", py * 100 + "%");
      const t = tiltOf(el);
      t.rx((0.5 - py) * 7);
      t.ry((px - 0.5) * 9);
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => cursor.classList.add("is-hidden"));
  }

  /* ---------- 起動 ---------- */
  renderHero();
  renderHow();
  renderPicks();
  renderChips();
  els.viewToggle.dataset.view = state.view;
  $$("button", els.viewToggle).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === state.view)));
  els.cards.hidden = state.view !== "card";
  els.tableView.hidden = state.view !== "table";
  // カード要素は最初に全部入れておく（表表示スタートでも切り替え時に使う）
  cardEls.forEach((el) => els.cards.appendChild(el));
  renderList({ animate: false });
  onScroll();
  intro();
  scrollFx();
  marqueeFx();
  pointerFx();

  const hashId = decodeURIComponent(location.hash.slice(1));
  if (byId.has(hashId)) openSheet(hashId, null);
})();
