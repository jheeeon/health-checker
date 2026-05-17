const program = [
  {
    day: 1,
    title: "회복 시작일",
    goal: "몸을 다시 움직여도 괜찮다는 감각 만들기",
    items: [
      ["water", "기상 후 물 500mL"],
      ["sunlight", "햇빛 5~10분 보기"],
      ["stretch", "가벼운 스트레칭 5분"],
      ["walk", "대화 가능한 속도로 25분 걷기"],
      ["meal", "운동 후 단백질과 탄수화물 함께 섭취"]
    ]
  },
  {
    day: 2,
    title: "아주 약한 근력",
    goal: "근육통을 만들지 않고 아주 낮은 강도로 몸을 깨우기",
    items: [
      ["squat", "스쿼트 10회, 2세트"],
      ["pushup", "벽 또는 무릎 푸시업 8~10회, 2세트"],
      ["row", "밴드 로우 또는 문고리 당기기 10회, 2세트"],
      ["plank", "플랭크 20초, 2세트"],
      ["walk", "원하면 저녁 15~20분 산책"]
    ]
  },
  {
    day: 3,
    title: "회복 유산소",
    goal: "운동을 머리 정리 루틴과 연결하기",
    items: [
      ["walk", "30~40분 걷기"],
      ["audio", "음악, 팟캐스트, 생각 정리 중 하나와 연결"],
      ["stairs", "계단이 덜 힘든지 확인"],
      ["fatigue", "오후 피로감 기록"],
      ["condition", "몸 열감이나 무기력 변화 확인"]
    ]
  },
  {
    day: 4,
    title: "휴식 같은 활동일",
    goal: "운동하는 날이 아니라 움직이는 사람이라는 감각 만들기",
    items: [
      ["home", "집안 정리 또는 가벼운 외출"],
      ["walk", "카페나 목적지까지 걷기"],
      ["stairs", "가능하면 계단 이용"],
      ["neat", "생활 활동량을 의식적으로 늘리기"]
    ]
  },
  {
    day: 5,
    title: "약한 근력 + 회복",
    goal: "잘 되어도 강도를 올리지 않고 일부러 부족하게 끝내기",
    items: [
      ["squat", "스쿼트 10회, 2세트"],
      ["pushup", "벽 또는 무릎 푸시업 8~10회, 2세트"],
      ["row", "밴드 로우 또는 문고리 당기기 10회, 2세트"],
      ["plank", "플랭크 20초, 2세트"],
      ["mood", "끝난 뒤 기분과 정신 맑음 확인"]
    ]
  },
  {
    day: 6,
    title: "긴 저강도 이동",
    goal: "심폐보다 지속 에너지 시스템 회복하기",
    items: [
      ["longWalk", "45~60분 천천히 걷기"],
      ["place", "동네, 공원, 햇빛 있는 경로 선택"],
      ["phone", "가능하면 휴대폰 덜 보고 걷기"],
      ["nervous", "걷기가 신경계 회복에 주는 느낌 기록"]
    ]
  },
  {
    day: 7,
    title: "점검일",
    goal: "이번 주 프로그램을 다시 반복할 수 있을지 확인하기",
    items: [
      ["weight", "아침 몸무게 기록"],
      ["fatigue", "피로감 기록"],
      ["focus", "집중력 기록"],
      ["sleep", "잠의 질 기록"],
      ["stairs", "계단 체감 기록"],
      ["repeat", "이번 주 프로그램을 다시 반복할 수 있을지 답하기"]
    ]
  }
];

const scoreFields = [
  ["fatigue_score", "피로감"],
  ["focus_score", "집중력"],
  ["sleep_score", "잠의 질"],
  ["stability_score", "몸의 안정감"]
];

const fallbackState = {
  programStartDate: new Date().toISOString().slice(0, 10),
  logs: Object.fromEntries(program.map((day) => [
    day.day,
    {
      day_index: day.day,
      log_date: offsetDate(new Date(), day.day - 1),
      checked_items: {},
      fatigue_score: null,
      focus_score: null,
      sleep_score: null,
      stability_score: null,
      memo: ""
    }
  ]))
};

let appState = structuredClone(fallbackState);
let supabaseClient = null;
let saveTimer = null;
let activeDay = 1;
let currentDay = 1;
let recoveryDraft = {};
let pullStartY = null;
let pullDistance = 0;
let isRefreshing = false;

const pullThreshold = 86;

const els = {
  todayLabel: document.querySelector("#todayLabel"),
  todaySummaryButton: document.querySelector("#todaySummaryButton"),
  saveStatus: document.querySelector("#saveStatus"),
  configNotice: document.querySelector("#configNotice"),
  todayTitle: document.querySelector("#todayTitle"),
  todayGoal: document.querySelector("#todayGoal"),
  todayChecklist: document.querySelector("#todayChecklist"),
  scoreGrid: document.querySelector("#scoreGrid"),
  memoInput: document.querySelector("#memoInput"),
  saveRecoveryButton: document.querySelector("#saveRecoveryButton"),
  programList: document.querySelector("#programList")
};

init();

async function init() {
  renderStaticControls();
  setupPullToRefresh();
  configureSupabase();
  await loadState();
  currentDay = getTodayDayIndex();
  activeDay = currentDay;
  syncRecoveryDraft();
  render();
}

function configureSupabase() {
  const config = window.HEALTH_CHECKER_CONFIG;

  if (!config?.supabaseUrl || !config?.supabaseAnonKey || config.supabaseUrl.includes("YOUR_PROJECT_ID")) {
    els.configNotice.hidden = false;
    setSaveStatus("로컬 모드");
    return;
  }

  els.configNotice.hidden = true;
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

async function loadState() {
  if (!supabaseClient) {
    const saved = localStorage.getItem("health-checker-state");
    if (saved) appState = JSON.parse(saved);
    return;
  }

  setSaveStatus("불러오는 중");
  const { data: appData, error: appError } = await supabaseClient
    .from("app_state")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (appError) {
    setSaveStatus("불러오기 실패");
    return;
  }

  if (!appData) {
    await supabaseClient.from("app_state").insert({
      id: "default",
      program_start_date: fallbackState.programStartDate
    });
    appState.programStartDate = fallbackState.programStartDate;
  } else {
    appState.programStartDate = appData.program_start_date;
  }

  const { data: logs, error: logsError } = await supabaseClient
    .from("daily_logs")
    .select("*")
    .order("day_index");

  if (logsError) {
    setSaveStatus("불러오기 실패");
    return;
  }

  if (!logs?.length) {
    const rows = program.map((day) => ({
      day_index: day.day,
      log_date: offsetDate(new Date(appState.programStartDate), day.day - 1),
      checked_items: {}
    }));
    await supabaseClient.from("daily_logs").insert(rows);
    appState.logs = structuredClone(fallbackState.logs);
  } else {
    appState.logs = Object.fromEntries(logs.map((log) => [log.day_index, normalizeLog(log)]));
  }

  setSaveStatus("저장됨");
}

function renderStaticControls() {
  els.scoreGrid.innerHTML = scoreFields.map(([key, label]) => `
    <fieldset class="score-control" data-score-field="${key}">
      <legend>${label}</legend>
      <div class="score-options">
        ${[1, 2, 3, 4, 5].map((value) => `<button type="button" data-score="${value}">${value}</button>`).join("")}
      </div>
    </fieldset>
  `).join("");

  els.scoreGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-score]");
    if (!button) return;
    const field = button.closest("[data-score-field]").dataset.scoreField;
    recoveryDraft[field] = Number(button.dataset.score);
    renderRecovery();
  });

  els.memoInput.addEventListener("input", () => {
    recoveryDraft.memo = els.memoInput.value;
    renderRecoverySaveState();
  });

  els.saveRecoveryButton.addEventListener("click", () => {
    saveRecoveryDraft();
  });

  els.todaySummaryButton.addEventListener("click", () => {
    selectDay(currentDay);
  });

  els.programList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-day-card]");
    if (!card) return;
    selectDay(Number(card.dataset.dayCard));
  });

  els.programList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest("[data-day-card]");
    if (!card) return;
    event.preventDefault();
    selectDay(Number(card.dataset.dayCard));
  });
}

function setupPullToRefresh() {
  window.addEventListener("touchstart", (event) => {
    if (window.scrollY > 0 || isRefreshing) return;
    pullStartY = event.touches[0].clientY;
    pullDistance = 0;
  }, { passive: true });

  window.addEventListener("touchmove", (event) => {
    if (pullStartY === null || isRefreshing) return;

    const nextDistance = event.touches[0].clientY - pullStartY;
    if (nextDistance <= 0 || window.scrollY > 0) {
      resetPullState();
      return;
    }

    pullDistance = Math.min(nextDistance * 0.55, 120);

    if (pullDistance > 12) {
      event.preventDefault();
    }
  }, { passive: false });

  window.addEventListener("touchend", () => {
    if (pullStartY === null || isRefreshing) return;

    if (pullDistance >= pullThreshold) {
      refreshState();
      return;
    }

    resetPullState();
  }, { passive: true });

  window.addEventListener("touchcancel", resetPullState, { passive: true });
}

function render() {
  renderSummary();
  renderToday();
  renderRecovery();
  renderProgram();
}

function renderSummary() {
  els.todayLabel.textContent = formatDayWithDate(currentDay);
}

function renderToday() {
  const day = program.find((item) => item.day === activeDay);
  const log = appState.logs[activeDay];

  els.todayTitle.textContent = `${formatDayWithDate(day.day)} - ${day.title}`;
  els.todayGoal.textContent = day.goal;
  els.todayChecklist.innerHTML = day.items.map(([key, label]) => `
    <label class="check-row">
      <input type="checkbox" data-day="${day.day}" data-key="${key}" ${log.checked_items[key] ? "checked" : ""}>
      <span>${label}</span>
    </label>
  `).join("");

  els.todayChecklist.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", handleCheckChange);
  });
}

function renderRecovery() {
  scoreFields.forEach(([key]) => {
    document.querySelectorAll(`[data-score-field="${key}"] button`).forEach((button) => {
      button.classList.toggle("is-selected", Number(button.dataset.score) === recoveryDraft[key]);
    });
  });

  if (els.memoInput.value !== recoveryDraft.memo) {
    els.memoInput.value = recoveryDraft.memo ?? "";
  }

  renderRecoverySaveState();
}

function renderProgram() {
  els.programList.innerHTML = program.map((day) => {
    const log = appState.logs[day.day];
    const completeCount = day.items.filter(([key]) => Boolean(log?.checked_items?.[key])).length;
    const isComplete = completeCount === day.items.length;
    const isSelected = day.day === activeDay;
    const isCurrent = day.day === currentDay;
    return `
      <article class="day-card ${isSelected ? "is-selected" : ""} ${isCurrent ? "is-today" : ""} ${isComplete ? "is-complete" : ""}" data-day-card="${day.day}" tabindex="0" role="button" aria-pressed="${isSelected}">
        <div class="day-meta">
          <span>${formatDayWithDate(day.day)}</span>
          <span>${completeCount}/${day.items.length}</span>
        </div>
        <div>
          <h3>${day.title}</h3>
          <p class="day-goal">${day.goal}</p>
        </div>
        <ul class="mini-list">
          ${day.items.map(([, label]) => `<li>${label}</li>`).join("")}
        </ul>
      </article>
    `;
  }).join("");
}

function handleCheckChange(event) {
  const day = Number(event.target.dataset.day);
  const key = event.target.dataset.key;
  appState.logs[day].checked_items[key] = event.target.checked;
  scheduleSave(day);
  renderSummary();
  renderProgram();
}

function selectDay(day) {
  activeDay = day;
  syncRecoveryDraft();
  render();
  document.querySelector(".today-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function refreshState() {
  const keepDraft = isRecoveryDirty();
  const draftSnapshot = { ...recoveryDraft };

  isRefreshing = true;
  setSaveStatus("새로고침 중");

  await loadState();
  currentDay = getTodayDayIndex();

  if (keepDraft) {
    recoveryDraft = draftSnapshot;
  } else {
    syncRecoveryDraft();
  }

  render();
  window.setTimeout(() => {
    isRefreshing = false;
    resetPullState();
  }, 450);
}

function resetPullState() {
  pullStartY = null;
  pullDistance = 0;
}

function scheduleSave(day, delay = 120) {
  setSaveStatus("저장 중");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveLog(day), delay);
}

function syncRecoveryDraft() {
  const log = appState.logs[activeDay];
  recoveryDraft = {
    fatigue_score: log?.fatigue_score ?? null,
    focus_score: log?.focus_score ?? null,
    sleep_score: log?.sleep_score ?? null,
    stability_score: log?.stability_score ?? null,
    memo: log?.memo ?? ""
  };
}

function renderRecoverySaveState() {
  const dirty = isRecoveryDirty();
  els.saveRecoveryButton.disabled = !dirty;
  els.saveRecoveryButton.textContent = dirty ? "회복 기록 저장" : "저장됨";
}

function isRecoveryDirty() {
  const log = appState.logs[activeDay];
  return scoreFields.some(([key]) => log?.[key] !== recoveryDraft[key]) || (log?.memo ?? "") !== (recoveryDraft.memo ?? "");
}

function saveRecoveryDraft() {
  const log = appState.logs[activeDay];
  scoreFields.forEach(([key]) => {
    log[key] = recoveryDraft[key];
  });
  log.memo = recoveryDraft.memo ?? "";
  scheduleSave(activeDay);
  renderRecoverySaveState();
}

async function saveLog(day) {
  const log = appState.logs[day];

  if (!supabaseClient) {
    localStorage.setItem("health-checker-state", JSON.stringify(appState));
    setSaveStatus("로컬 저장됨");
    return;
  }

  const { error } = await supabaseClient
    .from("daily_logs")
    .upsert({
      day_index: log.day_index,
      log_date: log.log_date,
      checked_items: log.checked_items,
      fatigue_score: log.fatigue_score,
      focus_score: log.focus_score,
      sleep_score: log.sleep_score,
      stability_score: log.stability_score,
      memo: log.memo ?? "",
      updated_at: new Date().toISOString()
    });

  setSaveStatus(error ? "저장 실패" : "저장됨");
}

function setSaveStatus(label) {
  els.saveStatus.textContent = label;
  els.saveStatus.style.color = label.includes("실패") ? "var(--danger)" : "inherit";
}

function getTodayDayIndex() {
  const start = new Date(`${appState.programStartDate}T00:00:00`);
  const today = new Date();
  const diff = Math.floor((startOfDay(today) - startOfDay(start)) / 86400000) + 1;
  return Math.min(Math.max(diff, 1), 7);
}

function normalizeLog(log) {
  return {
    day_index: log.day_index,
    log_date: log.log_date,
    checked_items: log.checked_items ?? {},
    fatigue_score: log.fatigue_score,
    focus_score: log.focus_score,
    sleep_score: log.sleep_score,
    stability_score: log.stability_score,
    memo: log.memo ?? ""
  };
}

function formatDayWithDate(dayIndex) {
  return `${dayIndex}일차 (${formatShortDate(appState.logs[dayIndex]?.log_date)})`;
}

function formatShortDate(dateString) {
  if (!dateString) return "--.--.--";
  const [year, month, day] = dateString.split("-");
  return `${year.slice(2)}-${month}-${day}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function offsetDate(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next.toISOString().slice(0, 10);
}
