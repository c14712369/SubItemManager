// ====== js/ui-life.js ======
var _lifeSelectedCatId = null, _lifeExpSortMode = 'date-desc', _selectedCreditCardId = null, _calcCurrent = '0', _calcFirstNum = null, _calcOp = null, _calcFreshEntry = false;

function _lifeFormat(n, t) {
    if (n == null) return '0';
    if (window.isPrivacyMode && (t === 'income' || t === 'asset')) return '****';
    return Number(n).toLocaleString();
}

function changeLifeMonth(delta) {
    var parts = lifeCurrentMonth.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1 + delta, 1);
    lifeCurrentMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    renderLifeTab();
}

function getLifeIncomeForMonth(ym) { return lifeExpenses.filter(e => e.type === 'income' && (e.date||'').startsWith(ym)).reduce((s, e) => s + (Number(e.amount) || 0), 0); }
function getLifeOnlyExpForMonth(ym) { return lifeExpenses.filter(e => e.type !== 'income' && (e.date||'').startsWith(ym)).reduce((s, e) => s + (Number(e.amount) || 0), 0); }
function getLifeSpentByCat(cid, ym) { return lifeExpenses.filter(e => e.categoryId === cid && (e.date||'').startsWith(ym)).reduce((s, e) => s + (Number(e.amount) || 0), 0); }
function getLifeBudget(cid, ym) { return lifeBudgets[cid + '|' + ym] || 0; }

function getMonthlyFixedTotal(ym) {
    if (!ym || !items) return 0;
    const [y, m] = ym.split('-').map(Number);
    const mE = new Date(y, m, 0);
    return items.filter(i => {
        const s = new Date(i.startDate);
        if (s > mE) return false;
        if (i.endDate && new Date(i.endDate) < new Date(y, m - 1, 1)) return false;
        return true;
    }).reduce((t, i) => {
        const b = Number(i.amount) || 0;
        if (i.cycle === 'monthly') return t + b;
        if (i.cycle === 'yearly') return t + (b / 12);
        if (i.cycle === 'fixed' && i.startDate.startsWith(ym)) return t + b;
        return t;
    }, 0);
}

async function renderLifeTab() {
    try {
        autoApplySalary(lifeCurrentMonth);
        autoApplyDailyExpenses(lifeCurrentMonth);
        var label = document.getElementById('lifeMonthDisplay');
        if (label) label.textContent = lifeMonthLabel(lifeCurrentMonth);
        var tInc = getLifeIncomeForMonth(lifeCurrentMonth), tExp = getLifeOnlyExpForMonth(lifeCurrentMonth), tFix = getMonthlyFixedTotal(lifeCurrentMonth);
        var rem = tInc - tExp - tFix, pct = tInc > 0 ? Math.round(((tExp + tFix) / tInc) * 100) : 0;
        
        if (document.getElementById('lifeMonthBudget')) {
            var el = document.getElementById('lifeMonthBudget');
            el.textContent = 'NT$ ' + _lifeFormat(tInc, 'income');
            el.className = 'detail-value stat-positive';
        }
        if (document.getElementById('lifeMonthSpent')) {
            var el = document.getElementById('lifeMonthSpent');
            el.textContent = 'NT$ ' + _lifeFormat(tExp, 'expense');
            el.className = 'detail-value stat-negative';
        }
        if (document.getElementById('lifeMonthFixed')) {
            var el = document.getElementById('lifeMonthFixed');
            el.textContent = 'NT$ ' + _lifeFormat(Math.round(tFix), 'fixed');
            el.className = 'detail-value stat-negative';
        }
        var rEl = document.getElementById('lifeMonthRemain');
        if (rEl) {
            rEl.textContent = 'NT$ ' + _lifeFormat(Math.abs(Math.round(rem)), 'asset') + (rem < 0 ? ' (超支)' : '');
            rEl.className = 'hero-amount ' + (rem < 0 ? 'stat-negative' : 'stat-positive');
        }
        if (document.getElementById('lifeOverallProgress')) document.getElementById('lifeOverallProgress').style.width = Math.min(pct, 100) + '%';
        if (document.getElementById('lifeOverallPct')) document.getElementById('lifeOverallPct').textContent = '支出 ' + pct + '%';
        renderBudgetCards(); renderLifeExpenseList();
    } catch (e) { console.error(e); }
}

function renderBudgetCards() {
    var container = document.getElementById('budgetCards'); if (!container) return;
    var tExp = getLifeOnlyExpForMonth(lifeCurrentMonth);
    container.innerHTML = `<div class="life-cat-row ${(_lifeSelectedCatId === null ? 'active' : '')}" onclick="clearLifeFilter()">全部支出: NT$ ${tExp.toLocaleString()}</div>`;
    lifeCategories.forEach(cat => {
        var spent = getLifeSpentByCat(cat.id, lifeCurrentMonth); if (spent <= 0) return;
        container.innerHTML += `<div class="life-cat-row ${(_lifeSelectedCatId === cat.id ? 'active' : '')}" onclick="selectLifeCat('${cat.id}')">${cat.name}: NT$ ${spent.toLocaleString()}</div>`;
    });
}

function selectLifeCat(id) { _lifeSelectedCatId = id; renderLifeTab(); }
function clearLifeFilter() { _lifeSelectedCatId = null; renderLifeTab(); }

function renderLifeExpenseList() {
    var container = document.getElementById('lifeExpList'); if (!container) return;
    var sortMode = _lifeExpSortMode || 'date-desc', rewardMap = {};
    lifeExpenses.forEach(e => {
        if (e.type === 'income' && e._linkedExpenseId) {
            var m = (e.note || '').match(/\((.*?%)\)/);
            rewardMap[e._linkedExpenseId] = { amount: e.amount, rate: m ? m[1] : '' };
        }
    });
    var all = lifeExpenses.filter(e => {
        if (!(e.date||'').startsWith(lifeCurrentMonth)) return false;
        if (e.type === 'income' && e._linkedExpenseId) return false;
        if (_lifeSelectedCatId !== null) return e.categoryId === _lifeSelectedCatId;
        return true;
    }).sort((a, b) => sortMode === 'date-desc' ? (b.date.localeCompare(a.date) || b.id.localeCompare(a.id)) : (a.date.localeCompare(b.date) || a.id.localeCompare(b.id)));
    if (all.length === 0) { container.innerHTML = '<strong>本月尚無記錄</strong>'; return; }
    container.innerHTML = all.map(e => {
        var day = parseInt(e.date.split('-')[2]), editBtn = `<button class="icon-btn" onclick="editLifeExp('${e.id}')"><i class="fa-solid fa-pen"></i></button>`, delBtn = `<button class="icon-btn delete" onclick="deleteLifeExp('${e.id}')"><i class="fa-solid fa-trash"></i></button>`;
        if (e.type === 'income') {
            var cat = lifeIncomeCategories.find(c => c.id === e.categoryId) || { name: '收入', color: '#3D7A5A' };
            var noteStr = (e.note && e.note.trim() !== cat.name) ? `<span class="life-item-note-sep">·</span><span class="life-item-note">${e.note}</span>` : '';
            return `<div class="life-income-row"><div class="life-income-date">${day}</div><div class="life-income-arrow" style="background:${cat.color}"></div><div class="life-exp-info"><div class="life-item-main-line"><span class="life-item-cat-name">${cat.name}</span>${noteStr}</div></div><div class="life-exp-amount-wrap"><div class="life-income-amount">+ NT$ ${_lifeFormat(e.amount, 'income')}</div></div><div class="life-item-actions">${editBtn}${delBtn}</div></div>`;
        } else {
            var cat = lifeCategories.find(c => c.id === e.categoryId) || { name: '支出', color: '#6B6B6B' }, payIcon = e.paymentMethod === 'card' ? ' <i class="fa-solid fa-credit-card" style="font-size:0.7rem;opacity:0.6;margin-left:4px;"></i>' : '', lk = rewardMap[e.id], rwHtml = lk ? `<div class="life-exp-reward-inline"><i class="fa-solid fa-gift"></i> +${lk.amount.toLocaleString()} ${lk.rate ? '(' + lk.rate + ')' : ''}</div>` : '', noteStr = (e.note && e.note.trim() !== cat.name) ? `<span class="life-item-note-sep">·</span><span class="life-item-note" title="${e.note}">${e.note}</span>` : '';
            return `<div class="life-exp-row"><div class="life-exp-date">${day}</div><div class="life-exp-dot" style="background:${cat.color}"></div><div class="life-exp-info"><div class="life-item-main-line"><span class="life-item-cat-name">${cat.name}</span>${noteStr}${payIcon}</div></div><div class="life-exp-amount-wrap"><div class="life-exp-amount stat-negative">- NT$ ${Number(e.amount).toLocaleString()}</div>${rwHtml}</div><div class="life-item-actions">${editBtn}${delBtn}</div></div>`;
        }
    }).join('');
}

function openLifeExpModal(typeOrPreset) {
    var type = (typeOrPreset === 'income') ? 'income' : 'expense', presetCatId = (typeOrPreset && typeOrPreset !== 'income' && typeOrPreset !== 'expense') ? typeOrPreset : null;
    var cSel = document.getElementById('lifeExpCat'); if(cSel) cSel.innerHTML = lifeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    var iSel = document.getElementById('lifeExpIncCat'); if(iSel) iSel.innerHTML = lifeIncomeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    var pSel = document.getElementById('lifeExpPaymentMethod'); if(pSel) pSel.innerHTML = paymentMethods.map(pm => `<option value="${pm.id}">${pm.name}</option>`).join('');
    if (presetCatId) { if (type === 'income') iSel.value = presetCatId; else if (type === 'expense') cSel.value = presetCatId; }
    document.getElementById('lifeExpId').value = ''; document.getElementById('lifeExpAmount').value = '';
    document.getElementById('lifeExpDate').value = lifeCurrentMonth + '-' + String(new Date().getDate()).padStart(2, '0');
    document.getElementById('lifeExpNote').value = '';
    _selectedCreditCardId = null; 
    if(document.getElementById('creditCardPickerGroup')) document.getElementById('creditCardPickerGroup').style.display = 'none';
    if(document.getElementById('benefitPlanPickerGroup')) document.getElementById('benefitPlanPickerGroup').style.display = 'none';
    lifeCalcReset(); setLifeExpType(type); document.getElementById('lifeExpModalOverlay').classList.add('active');
}

function closeLifeExpModal() { document.getElementById('lifeExpModalOverlay').classList.remove('active'); }
async function onPaymentMethodChange() {
    var pmId = document.getElementById('lifeExpPaymentMethod').value;
    var pickerGroup = document.getElementById('creditCardPickerGroup');
    if (pmId === 'card') { if(pickerGroup) pickerGroup.style.display = 'block'; await loadCreditCardPicker(); } 
    else { if(pickerGroup) pickerGroup.style.display = 'none'; if(document.getElementById('benefitPlanPickerGroup')) document.getElementById('benefitPlanPickerGroup').style.display = 'none'; _selectedCreditCardId = null; }
    updateRewardPreview();
}

async function loadCreditCardPicker() {
    var picker = document.getElementById('creditCardPicker'); if(!picker) return;
    try {
        var cards = await CreditCardService.getCards();
        picker.innerHTML = '<option value="">-- 選擇信用卡 --</option>' + cards.map(c => `<option value="${c.CardID}">${c.BankName} ${c.CardName}</option>`).join('');
        if (_selectedCreditCardId) picker.value = _selectedCreditCardId;
    } catch (e) { }
}

async function onCreditCardChange() {
    var picker = document.getElementById('creditCardPicker'); if(!picker) return;
    var planGroup = document.getElementById('benefitPlanPickerGroup'), planPicker = document.getElementById('benefitPlanPicker');
    _selectedCreditCardId = picker.value ? parseInt(picker.value) : null;
    if (_selectedCreditCardId) {
        const cards = await CreditCardService.getCards();
        const card = cards.find(c => c.CardID === _selectedCreditCardId);
        if (card && card.RequireSwitch) {
            const rewards = await CreditCardService.getRewardsForCard(_selectedCreditCardId);
            const plans = [...new Set(rewards.map(r => r.PlanName).filter(Boolean))];
            if (plans.length > 0 && planPicker) { planPicker.innerHTML = plans.map(p => `<option value="${p}">${p}</option>`).join(''); if(planGroup) planGroup.style.display = 'block'; } else if(planGroup) planGroup.style.display = 'none';
        } else if(planGroup) planGroup.style.display = 'none';
    } else if(planGroup) planGroup.style.display = 'none';
    updateRewardPreview();
}

async function updateRewardPreview() {
    var amount = Number(document.getElementById('lifeExpAmount').value) || 0, pmId = document.getElementById('lifeExpPaymentMethod').value, preview = document.getElementById('rewardPreview'); if (!preview) return;
    if (pmId !== 'card' || amount <= 0 || !_selectedCreditCardId) { preview.style.display = 'none'; return; }
    var bP = document.getElementById('benefitPlanPicker'), bG = document.getElementById('benefitPlanPickerGroup');
    const planName = (bG && bG.style.display !== 'none' && bP) ? bP.value : null;
    const best = await CreditCardService.getBestRewardRate(_selectedCreditCardId, document.getElementById('lifeExpCat').value, planName);
    if (best.rate > 0) {
        document.getElementById('rewardPreviewAmount').textContent = Math.floor(amount * best.rate / 100);
        document.getElementById('rewardPreviewRate').textContent = best.rate + '% [' + best.category + ']';
        preview.style.display = 'block';
    } else preview.style.display = 'none';
}

async function editLifeExp(id) {
    var e = lifeExpenses.find(x => x.id === id); if (!e) return;
    openLifeExpModal(e.type === 'income' ? 'income' : 'expense');
    document.getElementById('lifeExpId').value = e.id;
    document.getElementById('lifeExpAmount').value = e.amount;
    _calcCurrent = String(e.amount); _lifeCalcRefresh();
    document.getElementById('lifeExpDate').value = e.date;
    document.getElementById('lifeExpNote').value = e.note || '';
    if (e.type === 'income') { if(document.getElementById('lifeExpIncCat')) document.getElementById('lifeExpIncCat').value = e.categoryId; }
    else {
        if(document.getElementById('lifeExpCat')) document.getElementById('lifeExpCat').value = e.categoryId;
        if(document.getElementById('lifeExpPaymentMethod')) document.getElementById('lifeExpPaymentMethod').value = e.paymentMethod || 'cash';
        _selectedCreditCardId = e._selectedCardId || null;
        await onPaymentMethodChange();
        if (_selectedCreditCardId) {
            var picker = document.getElementById('creditCardPicker');
            if(picker) { picker.value = _selectedCreditCardId; await onCreditCardChange(); var bP = document.getElementById('benefitPlanPicker'); if(bP && e._selectedPlanName) bP.value = e._selectedPlanName; }
        }
    }
}

async function handleLifeExpSubmit(e) {
    e.preventDefault();
    var amount = Number(document.getElementById('lifeExpAmount').value), date = document.getElementById('lifeExpDate').value, note = document.getElementById('lifeExpNote').value.trim(), pmId = document.getElementById('lifeExpPaymentMethod').value, type = document.getElementById('lifeExpType').value || 'expense', id = document.getElementById('lifeExpId').value;
    if (!amount || amount <= 0 || !date) { showToast('請輸入金額'); return; }
    var catId = (type === 'income') ? document.getElementById('lifeExpIncCat').value : document.getElementById('lifeExpCat').value;
    var entry = { id: id || crypto.randomUUID(), type: type, categoryId: catId, amount: amount, date: date, note: note };
    if (type === 'expense') {
        entry.paymentMethod = pmId;
        if (pmId === 'card' && _selectedCreditCardId) {
            entry._selectedCardId = _selectedCreditCardId;
            var bG = document.getElementById('benefitPlanPickerGroup'), bP = document.getElementById('benefitPlanPicker');
            if (bG && bG.style.display !== 'none' && bP) entry._selectedPlanName = bP.value;
        }
    }
    if (id) { var idx = lifeExpenses.findIndex(ex => ex.id === id); if (idx !== -1) lifeExpenses[idx] = entry; } else lifeExpenses.push(entry);
    if (type === 'expense') await syncLinkedReward(entry);
    saveLifeData(); closeLifeExpModal(); renderLifeTab(); showToast('已儲存');
}

async function syncLinkedReward(ex) {
    lifeExpenses = lifeExpenses.filter(e => e._linkedExpenseId !== ex.id);
    let rate = 0, cardInfo = "";
    if (ex.paymentMethod === 'card' && ex._selectedCardId) {
        const best = await CreditCardService.getBestRewardRate(ex._selectedCardId, ex.categoryId, ex._selectedPlanName);
        rate = best.rate;
        const cards = await CreditCardService.getCards();
        const card = cards.find(c => c.CardID === ex._selectedCardId);
        cardInfo = card ? card.CardName : "信用卡";
    }
    if (rate > 0) {
        var rAmt = Math.floor(ex.amount * rate / 100);
        if (rAmt > 0) lifeExpenses.push({ id: crypto.randomUUID(), type: 'income', categoryId: 'lc_inc_invest', amount: rAmt, date: ex.date, note: `[回饋] ${cardInfo} (${rate}%)`, _linkedExpenseId: ex.id });
    }
}

function autoApplySalary(ym) {
    var s = JSON.parse(localStorage.getItem(SALARY_DEFAULT_KEY));
    if (!s || lifeExpenses.some(e => e.date.startsWith(ym) && e.categoryId === s.catId)) return;
    var d = new Date(ym + '-' + String(s.day).padStart(2, '0')), day = d.getDay();
    if (day === 0) d.setDate(d.getDate() - 2); else if (day === 6) d.setDate(d.getDate() - 1);
    lifeExpenses.push({ id: crypto.randomUUID(), type: 'income', categoryId: s.catId, amount: s.amount, date: d.toISOString().split('T')[0], note: '薪資 (自動)', _autoSalary: true });
    saveLifeData();
}

function autoApplyDailyExpenses(ym) { var list = JSON.parse(localStorage.getItem(DAILY_EXP_DEFAULT_KEY) || '[]'); list.forEach(rule => { if (!lifeExpenses.some(e => e._autoDailyId === rule.id && e.date.startsWith(ym))) { lifeExpenses.push({ id: crypto.randomUUID(), type: 'expense', categoryId: rule.catId, amount: rule.amount, date: ym + '-01', note: rule.name, _autoDailyId: rule.id }); } }); }
function setLifeExpType(type) { document.getElementById('lifeExpType').value = type; if(document.getElementById('lifeExpCatGroup')) document.getElementById('lifeExpCatGroup').style.display = (type === 'income') ? 'none' : 'block'; if(document.getElementById('lifeExpIncCatGroup')) document.getElementById('lifeExpIncCatGroup').style.display = (type === 'income') ? 'block' : 'none'; if(document.getElementById('lifeExpPaymentGroup')) document.getElementById('lifeExpPaymentGroup').style.display = (type === 'income') ? 'none' : 'block'; if(document.getElementById('lifeExpModalTitle')) document.getElementById('lifeExpModalTitle').textContent = (type === 'income') ? '新增收入' : '新增支出'; updateRewardPreview(); }
function deleteLifeExp(id) { if (confirm('確定刪除？')) { lifeExpenses = lifeExpenses.filter(e => e.id !== id && e._linkedExpenseId !== id); saveLifeData(); renderLifeTab(); } }
function _lifeCalcRefresh() { var v = parseFloat(_calcCurrent || 0); if (document.getElementById('lifeCalcDisplay')) document.getElementById('lifeCalcDisplay').textContent = v.toLocaleString(); if (document.getElementById('lifeCalcAmountDisplay')) document.getElementById('lifeCalcAmountDisplay').textContent = v.toLocaleString(); if (document.getElementById('lifeExpAmount')) document.getElementById('lifeExpAmount').value = v; }
function lifeCalcReset() { _calcCurrent = '0'; _calcFirstNum = null; _calcOp = null; _calcFreshEntry = false; _lifeCalcRefresh(); }
function lifeCalcDigit(d) { if (_calcFreshEntry) { _calcCurrent = d; _calcFreshEntry = false; } else { if (_calcCurrent === '0' && d !== '.') _calcCurrent = d; else _calcCurrent += d; } _lifeCalcRefresh(); }
function lifeCalcOp(op) { _calcFirstNum = parseFloat(_calcCurrent); _calcOp = op; _calcFreshEntry = true; }
function lifeCalcEqual() { if (_calcOp === null || _calcFirstNum === null) return; var a = _calcFirstNum, b = parseFloat(_calcCurrent), res = 0; if (_calcOp === '+') res = a + b; else if (_calcOp === '−') res = a - b; else if (_calcOp === '×') res = a * b; else if (_calcOp === '÷') res = (b !== 0) ? a / b : 0; _calcCurrent = String(res); _calcOp = null; _calcFirstNum = null; _calcFreshEntry = true; _lifeCalcRefresh(); }
function lifeCalcBack() { _calcCurrent = _calcCurrent.length > 1 ? _calcCurrent.slice(0, -1) : '0'; _lifeCalcRefresh(); }
function openCalcPopup() { var o = document.getElementById('calcPopupOverlay'); if (o) o.classList.add('active'); }
function closeCalcPopup() { var o = document.getElementById('calcPopupOverlay'); if (o) o.classList.remove('active'); updateRewardPreview(); }
function calcPopupBgClick(e) { if (e.target.id === 'calcPopupOverlay') closeCalcPopup(); }
function saveCCAnalyzerConfig() { var url = document.getElementById('ccAnalyzerUrl').value.trim(), key = document.getElementById('ccAnalyzerKey').value.trim(); CreditCardService.saveConfig(url, key); if (document.getElementById('ccAnalyzerSettingOverlay')) document.getElementById('ccAnalyzerSettingOverlay').classList.remove('active'); showToast('設定已儲存'); }
function openCCAnalyzerSettingModal() { var cfg = CreditCardService.getConfig(); if (document.getElementById('ccAnalyzerUrl')) document.getElementById('ccAnalyzerUrl').value = cfg ? cfg.url : ''; if (document.getElementById('ccAnalyzerKey')) document.getElementById('ccAnalyzerKey').value = cfg ? cfg.anonKey : ''; if (document.getElementById('ccAnalyzerSettingOverlay')) document.getElementById('ccAnalyzerSettingOverlay').classList.add('active'); }
function closeCCAnalyzerSettingModal() { if (document.getElementById('ccAnalyzerSettingOverlay')) document.getElementById('ccAnalyzerSettingOverlay').classList.remove('active'); }
