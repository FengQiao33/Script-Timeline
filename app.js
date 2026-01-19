const STORAGE_KEY = "script_timeline_state_v1";

const DEFAULT_SEGMENTS = [
  {
    key: "opening",
    title: "开场",
    minutes: 8,
    goal: "建立信任、说明节奏、引导关注",
    script:
      "家人们晚上好！今天这场我会用最短时间把重点讲清楚：先带大家看清需求→再把对比讲透→最后给到本场专属福利。\n先点个关注别走开，评论区打个“1”，我看看多少老朋友在。",
    interaction:
      "评论区打“1”报到；问：你更关注【价格】还是【效果/体验】？",
    conversion:
      "引导加购/收藏：先把链接挂上，先加购物车不吃亏；强调直播节奏：福利会分批放",
    closingHint: "开场最后 30 秒做一次节奏确认与福利预告",
  },
  {
    key: "interaction",
    title: "互动",
    minutes: 22,
    goal: "拉高停留、制造参与感、收集用户偏好",
    script:
      "我先做个小调查：你们最怕踩坑的点是什么？\nA 质量不稳定｜B 使用麻烦｜C 价格虚高｜D 售后不好\n评论区打字母，我按票数最高的先讲。",
    interaction:
      "投票互动（A/B/C/D）；抽 3 位送小礼；引导提问：把你的使用场景发出来",
    conversion:
      "引导私域/关注：想要对比清单的，关注后私信“清单”；承诺：我按大家的场景推荐",
    closingHint: "互动段末尾 1 分钟，把票数最高问题总结成 3 句话",
  },
  {
    key: "conversion",
    title: "转化",
    minutes: 48,
    goal: "讲清价值与差异、给出强理由、推动下单",
    script:
      "核心就一句：如果你是【人群/场景】——选它最省心。\n我从三点讲：①关键参数/体验 ②对比同价位 ③本场福利怎么拿。\n现在把福利规则讲清楚：前 X 名/限时券/加赠是什么。",
    interaction:
      "现场演示/对比；让用户选：你要【基础款】还是【进阶款】？评论区打“基础/进阶”",
    conversion:
      "明确行动：点小黄车第 1 个；强调限时：倒计时结束恢复原价；复述保障：运费险/退换/质保",
    closingHint: "转化段每 8–10 分钟做一次“复盘+行动口令”",
  },
  {
    key: "closing",
    title: "收尾",
    minutes: 12,
    goal: "最后一波成交、降低退款风险、引导复访",
    script:
      "最后 10 分钟我们把重点再过一遍：适合谁、不适合谁、怎么选。\n已经拍到的家人，按我说的使用/注意事项来，效果更稳。\n还没拍的，现在是最后一轮福利。",
    interaction:
      "回访提问：你下单的是哪个版本？留言我给你使用建议；提醒截图订单信息",
    conversion:
      "最后催单：倒计时 3 分钟；给出最后口令；强调售后与发货时间",
    closingHint: "结束前 30 秒：感谢+下场预告+引导关注",
  },
];

/** @type {ReturnType<typeof setInterval> | null} */
let timerHandle = null;
/** @type {{ nodes: TimelineNode[], startAtMs: number | null } | null} */
let generated = null;

/**
 * @typedef {{
 *  key: string;
 *  title: string;
 *  minutes: number;
 *  goal: string;
 *  script: string;
 *  interaction: string;
 *  conversion: string;
 *  closingHint: string;
 * }} Segment
 */

/**
 * @typedef {{
 *  idx: number;
 *  segmentKey: string;
 *  segmentTitle: string;
 *  tOffsetMin: number;
 *  absoluteText: string | null;
 *  relativeText: string;
 *  goal: string;
 *  script: string;
 *  interaction: string;
 *  conversion: string;
 *  closingHint: string;
 * }} TimelineNode
 */

const $ = (sel) => /** @type {HTMLElement} */ (document.querySelector(sel));
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const elSegWrap = $("#segWrap");
const elCards = $("#cards");
const elStatus = $("#status");
const elStartAt = /** @type {HTMLInputElement} */ ($("#startAt"));
const elTotalMinutes = /** @type {HTMLInputElement} */ ($("#totalMinutes"));

const elToast = $("#toast");
const elNextTitle = $("#nextTitle");
const elNextMeta = $("#nextMeta");
const elTimer = $("#timer");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatHHMM(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function minutesToRelText(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `T+${m}m`;
  if (m === 0) return `T+${h}h`;
  return `T+${h}h${m}m`;
}

function showToast(text) {
  elToast.textContent = text;
  elToast.classList.add("toast--show");
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => elToast.classList.remove("toast--show"), 1400);
}
showToast._t = 0;

function safeNumber(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function nowLocalInputValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    return obj;
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function getSegmentsFromUI() {
  /** @type {Segment[]} */
  const segs = [];
  $$(".seg").forEach((segEl) => {
    const key = segEl.getAttribute("data-key") || "";
    const title = segEl.getAttribute("data-title") || "";
    const minutes = safeNumber(segEl.querySelector("[data-field='minutes']")?.value, 0);
    const goal = segEl.querySelector("[data-field='goal']")?.value?.trim?.() || "";
    const script = segEl.querySelector("[data-field='script']")?.value?.trim?.() || "";
    const interaction = segEl.querySelector("[data-field='interaction']")?.value?.trim?.() || "";
    const conversion = segEl.querySelector("[data-field='conversion']")?.value?.trim?.() || "";
    const closingHint = segEl.querySelector("[data-field='closingHint']")?.value?.trim?.() || "";
    segs.push({ key, title, minutes, goal, script, interaction, conversion, closingHint });
  });
  return segs;
}

function renderSegments(segments) {
  elSegWrap.innerHTML = "";
  const pills = {
    opening: "开播前 1 分钟准备好话术",
    interaction: "每 3–5 分钟抛一个问题",
    conversion: "每 8–10 分钟复述一次口令",
    closing: "最后 3 分钟强提示倒计时",
  };

  segments.forEach((s) => {
    const seg = document.createElement("div");
    seg.className = "seg";
    seg.setAttribute("data-key", s.key);
    seg.setAttribute("data-title", s.title);

    seg.innerHTML = `
      <div class="seg__top">
        <div class="seg__name">
          <div class="seg__title">${escapeHtml(s.title)}</div>
          <div class="pill">${escapeHtml(pills[s.key] || "可按需调整")}</div>
        </div>
        <div class="seg__minutes">
          <span class="label" style="margin:0">时长(分钟)</span>
          <input class="input" data-field="minutes" type="number" min="1" max="240" step="1" value="${escapeAttr(
            String(s.minutes)
          )}" />
        </div>
      </div>
      <div class="seg__body">
        <div class="field">
          <label class="label">目标</label>
          <textarea class="textarea" data-field="goal">${escapeHtml(s.goal)}</textarea>
        </div>
        <div class="field">
          <label class="label">主话术</label>
          <textarea class="textarea" data-field="script">${escapeHtml(s.script)}</textarea>
        </div>
        <div class="field">
          <label class="label">互动设计</label>
          <textarea class="textarea" data-field="interaction">${escapeHtml(s.interaction)}</textarea>
        </div>
        <div class="field">
          <label class="label">转化动作</label>
          <textarea class="textarea" data-field="conversion">${escapeHtml(s.conversion)}</textarea>
        </div>
        <div class="field" style="grid-column: 1 / -1;">
          <label class="label">段尾提醒</label>
          <textarea class="textarea" data-field="closingHint">${escapeHtml(s.closingHint)}</textarea>
        </div>
      </div>
    `;

    elSegWrap.appendChild(seg);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", "&#10;");
}

function parseStartAtMs() {
  const v = (elStartAt.value || "").trim();
  if (!v) return null;
  const d = new Date(v);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  return ms;
}

function buildTimeline(segments, startAtMs) {
  /** @type {TimelineNode[]} */
  const nodes = [];

  let cursorMin = 0;
  segments.forEach((s, i) => {
    const abs = startAtMs == null ? null : formatHHMM(new Date(startAtMs + cursorMin * 60_000));
    const node = {
      idx: i + 1,
      segmentKey: s.key,
      segmentTitle: s.title,
      tOffsetMin: cursorMin,
      absoluteText: abs,
      relativeText: minutesToRelText(cursorMin),
      goal: s.goal,
      script: s.script,
      interaction: s.interaction,
      conversion: s.conversion,
      closingHint: s.closingHint,
    };
    nodes.push(node);
    cursorMin += Math.max(0, safeNumber(s.minutes, 0));
  });

  return nodes;
}

function validate(segments, totalMinutes) {
  const sum = segments.reduce((a, s) => a + Math.max(0, safeNumber(s.minutes, 0)), 0);
  const problems = [];
  if (sum <= 0) problems.push("各段时长不能为空。");
  if (totalMinutes > 0 && sum !== totalMinutes) {
    problems.push(`各段时长之和为 ${sum} 分钟，与你设置的总时长 ${totalMinutes} 分钟不一致。`);
  }
  return { sum, problems };
}

function segmentTag(key) {
  if (key === "opening") return "开场";
  if (key === "interaction") return "互动";
  if (key === "conversion") return "转化";
  if (key === "closing") return "收尾";
  return "节点";
}

function cardText(node) {
  const when = node.absoluteText ? `${node.absoluteText}（${node.relativeText}）` : node.relativeText;
  return [
    `【${node.idx}. ${node.segmentTitle}】`,
    `时间：${when}`,
    "",
    "目标：",
    node.goal || "（未填写）",
    "",
    "主话术：",
    node.script || "（未填写）",
    "",
    "互动设计：",
    node.interaction || "（未填写）",
    "",
    "转化动作：",
    node.conversion || "（未填写）",
    "",
    "段尾提醒：",
    node.closingHint || "（未填写）",
  ].join("\n");
}

function renderCards(nodes) {
  elCards.innerHTML = "";
  nodes.forEach((n) => {
    const card = document.createElement("div");
    card.className = "card";
    const whenText = n.absoluteText ? `${n.absoluteText} · ${n.relativeText}` : n.relativeText;
    card.innerHTML = `
      <div class="card__head">
        <div class="card__left">
          <div class="card__when">${escapeHtml(whenText)}</div>
          <div class="card__title">${escapeHtml(n.segmentTitle)}</div>
        </div>
        <div class="row">
          <span class="card__tag">${escapeHtml(segmentTag(n.segmentKey))}</span>
          <button class="btn btn--ghost" data-copy="${escapeAttr(String(n.idx))}" type="button">复制</button>
        </div>
      </div>
      <div class="card__body">
        <div class="kv"><div class="k">目标</div><div class="v">${escapeHtml(n.goal || "（未填写）")}</div></div>
        <div class="kv"><div class="k">主话术</div><div class="v">${escapeHtml(n.script || "（未填写）")}</div></div>
        <div class="kv"><div class="k">互动设计</div><div class="v">${escapeHtml(n.interaction || "（未填写）")}</div></div>
        <div class="kv"><div class="k">转化动作</div><div class="v">${escapeHtml(n.conversion || "（未填写）")}</div></div>
        <div class="kv"><div class="k">段尾提醒</div><div class="v">${escapeHtml(n.closingHint || "（未填写）")}</div></div>
      </div>
    `;
    elCards.appendChild(card);
  });

  elCards.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = safeNumber(btn.getAttribute("data-copy"), 0);
      const node = nodes.find((x) => x.idx === idx);
      if (!node) return;
      await copyToClipboard(cardText(node));
      showToast("已复制脚本卡");
    });
  });
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

function buildTxt(nodes, totalMinutes, startAtMs) {
  const startLine = startAtMs == null ? "未设置" : new Date(startAtMs).toLocaleString();
  const header = [
    "直播间脚本时间轴（导出）",
    `生成时间：${new Date().toLocaleString()}`,
    `直播开始时间：${startLine}`,
    `总时长（分钟）：${totalMinutes}`,
    "----------------------------------------",
  ].join("\n");
  const body = nodes.map((n) => cardText(n)).join("\n\n========================================\n\n");
  return `${header}\n\n${body}\n`;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function updateStatus(segments) {
  const total = safeNumber(elTotalMinutes.value, 0);
  const { sum, problems } = validate(segments, total);
  if (problems.length) {
    elStatus.className = "status status--bad";
    elStatus.innerHTML = `<b>提示：</b>${escapeHtml(problems[0])}`;
  } else {
    elStatus.className = "status";
    elStatus.innerHTML = `<b>校验通过</b>：结构总计 ${sum} 分钟。`;
  }
}

function findNextNode(nodes, startAtMs, nowMs) {
  if (startAtMs == null) return null;
  for (const n of nodes) {
    const t = startAtMs + n.tOffsetMin * 60_000;
    if (t > nowMs) return n;
  }
  return null;
}

function setNextDisplay(node, startAtMs) {
  if (!node || startAtMs == null) {
    elNextTitle.textContent = "未生成";
    elNextMeta.textContent = "请先生成脚本卡";
    elTimer.textContent = "--:--";
    return;
  }
  const abs = new Date(startAtMs + node.tOffsetMin * 60_000);
  elNextTitle.textContent = `${node.idx}. ${node.segmentTitle}`;
  elNextMeta.textContent = `${formatHHMM(abs)} · ${node.relativeText}`;
}

function tickTimer() {
  if (!generated || generated.startAtMs == null) return;
  const now = Date.now();
  const next = findNextNode(generated.nodes, generated.startAtMs, now);
  if (!next) {
    elNextTitle.textContent = "已到最后";
    elNextMeta.textContent = "可准备结束与下场预告";
    elTimer.textContent = "00:00";
    return;
  }
  setNextDisplay(next, generated.startAtMs);
  const target = generated.startAtMs + next.tOffsetMin * 60_000;
  const leftSec = Math.max(0, Math.floor((target - now) / 1000));
  const mm = Math.floor(leftSec / 60);
  const ss = leftSec % 60;
  elTimer.textContent = `${pad2(mm)}:${pad2(ss)}`;
}

function startTimer() {
  stopTimer();
  tickTimer();
  timerHandle = setInterval(tickTimer, 300);
}

function stopTimer() {
  if (timerHandle != null) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}

function generate() {
  const segments = getSegmentsFromUI();
  const total = safeNumber(elTotalMinutes.value, 0);
  const { problems } = validate(segments, total);
  const startAtMs = parseStartAtMs();

  updateStatus(segments);

  if (problems.length) {
    showToast("请先修正配置提示");
    return;
  }

  const nodes = buildTimeline(segments, startAtMs);
  renderCards(nodes);

  generated = { nodes, startAtMs };
  if (startAtMs != null) {
    setNextDisplay(findNextNode(nodes, startAtMs, Date.now()) || nodes[0], startAtMs);
    tickTimer();
  } else {
    setNextDisplay(null, null);
  }

  saveState({
    startAt: elStartAt.value,
    totalMinutes: total,
    segments,
  });

  showToast("已生成脚本卡");
}

function fillExample() {
  elStartAt.value = nowLocalInputValue();
  elTotalMinutes.value = "90";
  renderSegments(DEFAULT_SEGMENTS);
  updateStatus(getSegmentsFromUI());
  showToast("已填充示例");
}

function resetAll() {
  localStorage.removeItem(STORAGE_KEY);
  elStartAt.value = "";
  elTotalMinutes.value = "90";
  renderSegments(DEFAULT_SEGMENTS);
  elCards.innerHTML = "";
  generated = null;
  setNextDisplay(null, null);
  stopTimer();
  updateStatus(getSegmentsFromUI());
  showToast("已重置");
}

function init() {
  const state = loadState();
  if (state?.segments?.length) {
    elStartAt.value = state.startAt || "";
    elTotalMinutes.value = String(state.totalMinutes ?? 90);
    renderSegments(state.segments);
  } else {
    renderSegments(DEFAULT_SEGMENTS);
  }

  updateStatus(getSegmentsFromUI());

  elSegWrap.addEventListener("input", () => {
    const segs = getSegmentsFromUI();
    updateStatus(segs);
    saveState({
      startAt: elStartAt.value,
      totalMinutes: safeNumber(elTotalMinutes.value, 0),
      segments: segs,
    });
  });

  elStartAt.addEventListener("input", () => {
    saveState({
      startAt: elStartAt.value,
      totalMinutes: safeNumber(elTotalMinutes.value, 0),
      segments: getSegmentsFromUI(),
    });
    if (generated) {
      generated.startAtMs = parseStartAtMs();
      tickTimer();
    }
  });

  elTotalMinutes.addEventListener("input", () => {
    const segs = getSegmentsFromUI();
    updateStatus(segs);
    saveState({
      startAt: elStartAt.value,
      totalMinutes: safeNumber(elTotalMinutes.value, 0),
      segments: segs,
    });
  });

  $("#btnGenerate").addEventListener("click", generate);
  $("#btnExample").addEventListener("click", fillExample);
  $("#btnReset").addEventListener("click", resetAll);

  $("#btnDownload").addEventListener("click", () => {
    if (!generated) generate();
    if (!generated) return;
    const total = safeNumber(elTotalMinutes.value, 0);
    const txt = buildTxt(generated.nodes, total, generated.startAtMs);
    const name = `直播脚本时间轴_${new Date().toISOString().slice(0, 10)}.txt`;
    downloadText(name, txt);
    showToast("已下载 TXT");
  });

  $("#btnStartTimer").addEventListener("click", () => {
    if (!generated) generate();
    if (!generated) return;
    if (generated.startAtMs == null) {
      showToast("请先设置直播开始时间");
      return;
    }
    startTimer();
    showToast("倒计时已开始");
  });
  $("#btnStopTimer").addEventListener("click", () => {
    stopTimer();
    showToast("已暂停");
  });
  $("#btnJumpNow").addEventListener("click", () => {
    elStartAt.value = nowLocalInputValue();
    if (generated) generated.startAtMs = parseStartAtMs();
    saveState({
      startAt: elStartAt.value,
      totalMinutes: safeNumber(elTotalMinutes.value, 0),
      segments: getSegmentsFromUI(),
    });
    tickTimer();
    showToast("已更新开播时间");
  });
}

init();

