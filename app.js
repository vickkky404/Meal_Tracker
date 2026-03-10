// ===========================
// CONSTANTS & STATE
// ===========================
const DEFAULT_MEAL_COST = 50;

const MEAL_EMOJIS = {
  'Breakfast':  '🌅',
  'Lunch':      '☀️',
  'Snack':      '🧃',
  'Dinner':     '🌙',
  'Late Night': '🌃',
};

let selectedType = 'Breakfast';

// ===========================
// STORAGE HELPERS
// ===========================
function getStorageKey(date) { return `mealtracker-${date}`; }
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

function loadMeals(dateKey) {
  try { return JSON.parse(localStorage.getItem(getStorageKey(dateKey)) || '[]'); }
  catch { return []; }
}
function saveMeals(dateKey, meals) {
  localStorage.setItem(getStorageKey(dateKey), JSON.stringify(meals));
}

// Price
function getMealCost() {
  const v = parseInt(localStorage.getItem('mealtracker-price'), 10);
  return (!isNaN(v) && v > 0) ? v : DEFAULT_MEAL_COST;
}
function saveMealCost(price) { localStorage.setItem('mealtracker-price', price); }

// Budget
function getDailyBudget() {
  const v = parseInt(localStorage.getItem('mealtracker-budget'), 10);
  return (!isNaN(v) && v > 0) ? v : null;
}
function saveDailyBudget(v) { localStorage.setItem('mealtracker-budget', v); }
function clearDailyBudget() { localStorage.removeItem('mealtracker-budget'); }

// All meals across all dates
function getAllDateKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('mealtracker-') &&
        !['mealtracker-price','mealtracker-budget'].includes(k)) keys.push(k);
  }
  return keys;
}
function getAllMeals() {
  const all = [];
  getAllDateKeys().forEach(k => {
    const date = k.replace('mealtracker-', '');
    try {
      JSON.parse(localStorage.getItem(k) || '[]').forEach(m => all.push({ ...m, date }));
    } catch {}
  });
  return all;
}

// ===========================
// INIT
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  renderDateHeader();
  initPriceSettings();
  initBudgetSettings();
  renderAll();
  setupMealTypeButtons();
  setupRipple();
});

function renderAll() {
  renderStatsBar();
  renderMealList();
  renderWeeklyGrid();
  renderBudgetBar();
  renderStreak();
  renderMonthlyOverview();
}

function renderDateHeader() {
  const el = document.getElementById('today-date');
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

function setupMealTypeButtons() {
  document.querySelectorAll('.meal-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedType = btn.dataset.type;
      document.querySelectorAll('.meal-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// Ripple on log button
function setupRipple() {
  const btn = document.getElementById('log-btn');
  if (!btn) return;
  btn.addEventListener('click', function(e) {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.5;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;
    const span = document.createElement('span');
    span.className = 'ripple';
    span.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
    btn.appendChild(span);
    span.addEventListener('animationend', () => span.remove());
  });
}

// ===========================
// SETTINGS
// ===========================
function initPriceSettings() {
  const input = document.getElementById('price-input');
  const badge = document.getElementById('price-badge');
  const hint  = document.getElementById('price-hint');
  const cost  = getMealCost();
  if (input) input.value = cost;
  if (badge) badge.textContent = `₹${cost}`;
  if (hint)  hint.textContent  = `₹${cost}`;
}

function savePriceSetting() {
  const input = document.getElementById('price-input');
  const val = parseInt(input.value, 10);
  if (isNaN(val) || val <= 0) { showToast('Enter a valid price (> 0).', 'warning'); return; }
  saveMealCost(val);
  document.getElementById('price-badge').textContent = `₹${val}`;
  document.getElementById('price-hint').textContent  = `₹${val}`;
  renderAll();
  showToast(`✅ Meal price set to ₹${val}`, 'success');
}

function initBudgetSettings() {
  const budget = getDailyBudget();
  if (budget) document.getElementById('budget-input').value = budget;
}

function saveBudgetSetting() {
  const val = parseInt(document.getElementById('budget-input').value, 10);
  if (isNaN(val) || val <= 0) { showToast('Enter a valid budget (> 0).', 'warning'); return; }
  saveDailyBudget(val);
  renderBudgetBar();
  showToast(`💰 Daily budget set to ₹${val}`, 'success');
}

function clearBudget() {
  clearDailyBudget();
  document.getElementById('budget-input').value = '';
  renderBudgetBar();
  showToast('Budget removed.', 'warning');
}

// ===========================
// LOG MEAL
// ===========================
function logMeal() {
  const note = document.getElementById('meal-note').value.trim();
  const todayKey = getTodayStr();
  const meals = loadMeals(todayKey);
  const cost = getMealCost();

  meals.push({
    id:   Date.now(),
    type: selectedType,
    note: note,
    time: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }),
    cost: cost,
  });
  saveMeals(todayKey, meals);
  document.getElementById('meal-note').value = '';

  renderAll();
  showToast(`${MEAL_EMOJIS[selectedType]} ${selectedType} logged! ₹${cost} added.`, 'success');
}

// ===========================
// DELETE / CLEAR / RESET
// ===========================
function deleteMeal(id) {
  const today = getTodayStr();
  saveMeals(today, loadMeals(today).filter(m => m.id !== id));
  renderAll();
  showToast('Meal removed.', 'warning');
}

function clearToday() {
  if (!confirm('Clear all meals logged today?')) return;
  saveMeals(getTodayStr(), []);
  renderAll();
  showToast("Today's meals cleared.", 'warning');
}

function confirmReset() {
  if (!confirm('Reset ALL data? This cannot be undone.')) return;
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('mealtracker-')) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
  renderAll();
  showToast('All data has been reset.', 'warning');
}

// ===========================
// STREAK
// ===========================
function calcStreak() {
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const meals = loadMeals(key);
    if (meals.length === 0) break;
    streak++;
    d.setDate(d.getDate() - 1);
    if (streak > 365) break;
  }
  return streak;
}

function renderStreak() {
  const s = calcStreak();
  const el = document.getElementById('streak-count');
  if (el) countUp('streak-count', s);
  const wrap = document.getElementById('header-streak');
  if (wrap) {
    wrap.classList.toggle('streak-active', s > 0);
    wrap.title = s > 0 ? `${s} day streak!` : 'No streak yet — log a meal!';
  }
}

// ===========================
// STATS BAR
// ===========================
function renderStatsBar() {
  const today = getTodayStr();
  const todayMeals = loadMeals(today);
  const todayCost  = todayMeals.reduce((s, m) => s + (m.cost || getMealCost()), 0);

  const now = new Date();
  const monthPrefix = `mealtracker-${now.getFullYear()}-${pad(now.getMonth()+1)}-`;
  let monthMeals = 0, monthCost = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(monthPrefix)) {
      try {
        const arr = JSON.parse(localStorage.getItem(k) || '[]');
        monthMeals += arr.length;
        monthCost  += arr.reduce((s, m) => s + (m.cost || getMealCost()), 0);
      } catch {}
    }
  }

  countUp('stat-meals',       todayMeals.length);
  countUp('stat-cost',        todayCost,   v => `₹${v}`);
  countUp('stat-month-meals', monthMeals);
  countUp('stat-month-spend', monthCost,   v => `₹${v}`);
}

// ===========================
// BUDGET BAR
// ===========================
function renderBudgetBar() {
  const budget = getDailyBudget();
  const today  = getTodayStr();
  const spent  = loadMeals(today).reduce((s, m) => s + (m.cost || getMealCost()), 0);

  const fill    = document.getElementById('budget-bar-fill');
  const pct     = document.getElementById('budget-pct');
  const rem     = document.getElementById('budget-remaining');
  const status  = document.getElementById('budget-status-text');
  const wrap    = document.querySelector('.budget-bar-wrap');

  if (!budget) {
    if (wrap)   wrap.style.display = 'none';
    if (rem)    rem.textContent = '—';
    if (status) status.textContent = 'Set a budget to track your spending.';
    if (pct)    pct.textContent = '';
    return;
  }

  if (wrap) wrap.style.display = 'flex';
  const ratio = Math.min(spent / budget, 1);
  const pctVal = Math.round(ratio * 100);
  const remaining = budget - spent;

  if (fill) {
    fill.style.width = (pctVal) + '%';
    fill.className = 'budget-bar-fill ' +
      (pctVal >= 100 ? 'over' : pctVal >= 75 ? 'warn' : 'ok');
  }
  if (pct)    pct.textContent = `${pctVal}%`;
  if (rem)    rem.textContent = remaining >= 0 ? `₹${remaining}` : `-₹${Math.abs(remaining)}`;
  if (status) {
    if (pctVal >= 100)
      status.textContent = `⚠️ Over budget by ₹${Math.abs(remaining)}!`;
    else if (pctVal >= 75)
      status.textContent = `🟡 ₹${spent} of ₹${budget} spent — close to limit.`;
    else
      status.textContent = `🟢 ₹${spent} of ₹${budget} spent today.`;
  }
}

// ===========================
// MEAL LIST
// ===========================
function renderMealList() {
  const meals = loadMeals(getTodayStr());
  const container = document.getElementById('meal-list');
  if (meals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🍽️</span>
        <p>No meals logged yet today.<br/>Hit "Got It!" to log your first meal!</p>
      </div>`;
    return;
  }
  container.innerHTML = '';
  [...meals].reverse().forEach((meal, idx) => {
    const el = document.createElement('div');
    el.className = 'meal-item';
    el.style.animationDelay = `${idx * 40}ms`;
    el.innerHTML = `
      <span class="meal-item-emoji">${MEAL_EMOJIS[meal.type] || '🍴'}</span>
      <div class="meal-item-info">
        <div class="meal-item-title">${escapeHtml(meal.type)}${meal.note ? ` — ${escapeHtml(meal.note)}` : ''}</div>
        <div class="meal-item-meta">Logged at ${meal.time}</div>
      </div>
      <span class="meal-item-cost">₹${meal.cost}</span>
      <button class="meal-item-delete" onclick="deleteMeal(${meal.id})" title="Remove">✕</button>`;
    container.appendChild(el);
  });
}

// ===========================
// WEEKLY GRID
// ===========================
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function renderWeeklyGrid() {
  const grid = document.getElementById('weekly-grid');
  grid.innerHTML = '';
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const meals   = loadMeals(dateStr);
    const cost    = meals.reduce((s, m) => s + (m.cost || getMealCost()), 0);
    const isToday = (i === 0);
    const cell    = document.createElement('div');
    cell.className = 'day-cell' + (isToday ? ' today' : '') + (meals.length > 0 ? ' has-meals' : '');
    cell.style.animationDelay = `${(6-i)*40}ms`;
    cell.title = `${d.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'})} — ${meals.length} meal(s)`;
    cell.innerHTML = `
      <span class="day-name">${DAY_NAMES[d.getDay()]}</span>
      <span class="day-count">${meals.length || '—'}</span>
      <span class="day-cost">${meals.length > 0 ? '₹'+cost : ''}</span>`;
    cell.addEventListener('click', () => openDayModal(dateStr, d));
    grid.appendChild(cell);
  }
}

// ===========================
// MONTHLY OVERVIEW
// ===========================
function renderMonthlyOverview() {
  const now = new Date();
  const label = now.toLocaleDateString('en-IN', { month:'long', year:'numeric' });
  document.getElementById('month-label').textContent = label;

  const monthPrefix = `mealtracker-${now.getFullYear()}-${pad(now.getMonth()+1)}-`;
  const byType = {};
  let totalMeals = 0, totalCost = 0, daysEaten = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(monthPrefix)) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(k) || '[]');
      if (arr.length > 0) daysEaten++;
      arr.forEach(m => {
        totalMeals++;
        totalCost += (m.cost || getMealCost());
        byType[m.type] = (byType[m.type] || 0) + 1;
      });
    } catch {}
  }

  const container = document.getElementById('monthly-stats');
  if (totalMeals === 0) {
    container.innerHTML = `<p class="empty-hint">No meals logged this month yet.</p>`;
    return;
  }

  // Top meal type
  const topType = Object.entries(byType).sort((a,b) => b[1]-a[1])[0];

  container.innerHTML = `
    <div class="month-grid">
      <div class="month-stat">
        <span class="month-stat-val">${totalMeals}</span>
        <span class="month-stat-lbl">Total Meals</span>
      </div>
      <div class="month-stat">
        <span class="month-stat-val">₹${totalCost}</span>
        <span class="month-stat-lbl">Total Spent</span>
      </div>
      <div class="month-stat">
        <span class="month-stat-val">${daysEaten}</span>
        <span class="month-stat-lbl">Days Eaten</span>
      </div>
      <div class="month-stat">
        <span class="month-stat-val">₹${totalMeals ? Math.round(totalCost/daysEaten) : 0}</span>
        <span class="month-stat-lbl">Avg/Day</span>
      </div>
    </div>
    ${topType ? `<div class="top-meal-badge">${MEAL_EMOJIS[topType[0]] || '🍴'} Most logged: <strong>${topType[0]}</strong> (${topType[1]}×)</div>` : ''}
    ${renderMiniTypeBreakdown(byType, totalMeals)}
  `;
}

function renderMiniTypeBreakdown(byType, total) {
  if (!total) return '';
  const colors = { 'Breakfast':'#6c63ff','Lunch':'#ffd166','Snack':'#06d6a0','Dinner':'#ff6b6b','Late Night':'#a89cff' };
  const bars = Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([type,count]) => {
    const pct = Math.round((count/total)*100);
    const color = colors[type] || '#888';
    return `
      <div class="type-bar-row">
        <span class="type-bar-label">${MEAL_EMOJIS[type]||''} ${type}</span>
        <div class="type-bar-track">
          <div class="type-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="type-bar-count">${count}</span>
      </div>`;
  }).join('');
  return `<div class="type-breakdown">${bars}</div>`;
}

// ===========================
// DAY DETAIL MODAL
// ===========================
function openDayModal(dateStr, dateObj) {
  const meals = loadMeals(dateStr);
  const label = dateObj.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  document.getElementById('modal-title').textContent = label;

  const body = document.getElementById('modal-body');
  const footer = document.getElementById('modal-footer');

  if (meals.length === 0) {
    body.innerHTML = `<div class="empty-state" style="padding:24px 0"><span class="empty-icon">😶</span><p>No meals logged on this day.</p></div>`;
    footer.innerHTML = '';
  } else {
    const cost = meals.reduce((s,m) => s + (m.cost || getMealCost()), 0);
    body.innerHTML = meals.map(m => `
      <div class="modal-meal-item">
        <span>${MEAL_EMOJIS[m.type]||'🍴'}</span>
        <div style="flex:1">
          <div class="modal-meal-title">${escapeHtml(m.type)}${m.note ? ` — ${escapeHtml(m.note)}` : ''}</div>
          <div class="modal-meal-time">${m.time}</div>
        </div>
        <span class="modal-meal-cost">₹${m.cost}</span>
      </div>`).join('');
    footer.innerHTML = `<div class="modal-total">${meals.length} meal${meals.length!==1?'s':''} · Total: <strong>₹${cost}</strong></div>`;
  }

  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal on Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ===========================
// CSV EXPORT
// ===========================
function exportCSV() {
  const all = getAllMeals().sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  if (all.length === 0) { showToast('No data to export yet.', 'warning'); return; }

  const rows = [['Date','Type','Note','Time','Cost (₹)']];
  all.forEach(m => rows.push([m.date, m.type, m.note || '', m.time, m.cost]));

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `mealtracker-${getTodayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`📥 Exported ${all.length} meals to CSV!`, 'success');
}

// ===========================
// COUNT-UP ANIMATION
// ===========================
const countUpTimers = {};
function countUp(id, target, format = v => v) {
  const el = document.getElementById(id);
  if (!el) return;
  if (countUpTimers[id]) cancelAnimationFrame(countUpTimers[id]);

  const start = parseInt(el.dataset.raw || '0', 10);
  el.dataset.raw = target;
  if (start === target) { el.textContent = format(target); return; }

  const duration = 450, startTime = performance.now();
  function step(now) {
    const t      = Math.min((now - startTime) / duration, 1);
    const eased  = 1 - Math.pow(1 - t, 3);
    el.textContent = format(Math.round(start + (target - start) * eased));
    if (t < 1) { countUpTimers[id] = requestAnimationFrame(step); }
    else { el.textContent = format(target); delete countUpTimers[id]; }
  }
  countUpTimers[id] = requestAnimationFrame(step);
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 420);
}

// ===========================
// TOAST
// ===========================
let toastTimer = null;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3200);
}

// ===========================
// UTILS
// ===========================
function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}
