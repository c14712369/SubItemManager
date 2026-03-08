// ====== js/ui-life.js ======
var _lifeSelectedCatId = null;
var _lifeExpSortMode = 'date-desc';
var _selectedCreditCardId = null;
var _calcCurrent = '0';

function _safeFormat(num, type) {
    if (typeof num !== 'number') num = parseFloat(num) || 0;
    if (window.isPrivacyMode && (type === 'income' || type === 'asset')) return '****';
    return num.toLocaleString();
}

function changeLifeMonth(delta) {
    var parts = lifeCurrentMonth.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1 + delta, 1);
    lifeCurrentMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    renderLifeTab();
}

function getLifeIncomeForMonth(ym) {
    return lifeExpenses.filter(e => e.type === 'income' && e.date && e.date.startsWith(ym)).reduce((s, e) => s + (e.amount || 0), 0);
}

function getLifeOnlyExpForMonth(ym) {
    return lifeExpenses.filter(e => e.type !== 'income' && e.date && e.date.startsWith(ym)).reduce((s, e) => s + (e.amount || 0), 0);
}

function getLifeSpentByCat(catId, ym) {
    if (!ym) return 0;
    return lifeExpenses.filter(e => e.categoryId === catId && e.date && e.date.startsWith(ym)).reduce((s, e) => s + (e.amount || 0), 0);
}

function getLifeBudget(catId, ym) { return lifeBudgets[catId + '|' + ym] || 0; }

function getMonthlyFixedTotal(ym) {
    if (!ym || !items) return 0;
    const [yearStr, monthStr] = ym.split('-');
    const viewYear = parseInt(yearStr), viewMonth = parseInt(monthStr);
    const monthStart = new Date(viewYear, viewMonth - 1, 1), monthEnd = new Date(viewYear, viewMonth, 0);
    return items.filter(item => {
        const start = new Date(item.startDate);
        if (start > monthEnd) return false;
        const end = item.endDate ? new Date(item.endDate) : null;
        if (end && end < monthStart) return false;
        return true;
    }).reduce((total, item) => {
        const baseAmt = item.amount || 0;
        let monthly = baseAmt;
        const daysInMonth = monthEnd.getDate();
        switch (item.cycle) {
            case 'daily': monthly = baseAmt * daysInMonth; break;
            case 'weekly': monthly = baseAmt * (daysInMonth / 7); break;
            case 'monthly': monthly = baseAmt; break;
            case 'bimonthly': monthly = baseAmt / 2; break;
            case 'quarterly': monthly = baseAmt / 3; break;
            case 'halfyear': monthly = baseAmt / 6; break;
            case 'yearly': monthly = baseAmt / 12; break;
            case 'fixed': 
                const startD = new Date(item.startDate);
                if (startD.getFullYear() === viewYear && (startD.getMonth() + 1) === viewMonth) return total + baseAmt;
                return total;
        }
        return total + monthly;
    }, 0);
}

async function renderLifeTab() {
    autoApplySalary(lifeCurrentMonth);
    autoApplyDailyExpenses(lifeCurrentMonth);
    var label = document.getElementById('lifeMonthDisplay');
    if (label) label.textContent = lifeMonthLabel(lifeCurrentMonth);
    var totalIncome = getLifeIncomeForMonth(lifeCurrentMonth);
    var totalExpense = getLifeOnlyExpForMonth(lifeCurrentMonth);
    var totalFixed = getMonthlyFixedTotal(lifeCurrentMonth);
    var remain = totalIncome - totalExpense - totalFixed;
    var isOver = (totalExpense + totalFixed) > totalIncome && totalIncome > 0;
    var pct = totalIncome > 0 ? Math.min(Math.round(((totalExpense + totalFixed) / totalIncome) * 100), 100) : 0;
    if (document.getElementById('lifeMonthBudget')) document.getElementById('lifeMonthBudget').textContent = 'NT$ ' + _safeFormat(totalIncome, 'income');
    if (document.getElementById('lifeMonthSpent')) document.getElementById('lifeMonthSpent').textContent = 'NT$ ' + _safeFormat(totalExpense, 'expense');
    if (document.getElementById('lifeMonthFixed')) document.getElementById('lifeMonthFixed').textContent = 'NT$ ' + _safeFormat(Math.round(totalFixed), 'fixed');
    var remainEl = document.getElementById('lifeMonthRemain');
    if (remainEl) {
        remainEl.textContent = 'NT$ ' + _safeFormat(Math.abs(Math.round(remain)), 'asset') + (remain < 0 ? ' (超支)' : '');
        remainEl.className = 'hero-amount ' + (remain < 0 ? 'stat-negative' : 'stat-positive');
    }
    if (document.getElementById('lifeOverallProgress')) {
        document.getElementById('lifeOverallProgress').style.width = pct + '%';
        document.getElementById('lifeOverallProgress').className = 'progress-fill' + (isOver ? ' over-budget' : '');
    }
    renderBudgetCards(); renderLifeExpenseList();
}

function renderBudgetCards() {
    var container = document.getElementById('budgetCards'); if (!container) return;
    container.innerHTML = '';
    var totalSpent = getLifeOnlyExpForMonth(lifeCurrentMonth);
    container.innerHTML = `<div class="life-cat-row ${(_lifeSelectedCatId === null ? 'active' : '')}" onclick="clearLifeFilter()">全部支出: NT$ ${totalSpent.toLocaleString()}</div>`;
    lifeCategories.forEach(cat => {
        var spent = lifeExpenses.filter(e => e.categoryId === cat.id && e.date && e.date.startsWith(lifeCurrentMonth)).reduce((s, e) => s + (e.amount || 0), 0);
        if (spent <= 0) return;
        container.innerHTML += `<div class="life-cat-row ${(_lifeSelectedCatId === cat.id ? 'active' : '')}" onclick="selectLifeCat('${cat.id}')">${cat.name}: NT$ ${spent.toLocaleString()}</div>`;
    });
}

function selectLifeCat(catId) { _lifeSelectedCatId = catId; renderLifeTab(); }
function clearLifeFilter() { _lifeSelectedCatId = null; renderLifeTab(); }

function renderLifeExpenseList() {
    var container = document.getElementById('lifeExpList'); if (!container) return;
    var sortMode = _lifeExpSortMode || 'date-desc';
    var rewardMap = {};
    lifeExpenses.forEach(e => { 
        if (e.type === 'income' && e._linkedExpenseId) {
            var rateMatch = (e.note || '').match(/\((.*?%)\)/);
            rewardMap[e._linkedExpenseId] = {
                amount: e.amount,
                rate: rateMatch ? rateMatch[1] : ''
            };
        }
    });
    var all = lifeExpenses.filter(e => {
        if (!e.date || !e.date.startsWith(lifeCurrentMonth)) return false;
        if (e.type === 'income' && e._linkedExpenseId) return false;
        if (_lifeSelectedCatId !== null) return e.categoryId === _lifeSelectedCatId;
        return true;
    }).sort((a, b) => sortMode === 'date-desc' ? (b.date.localeCompare(a.date) || b.id.localeCompare(a.id)) : (a.date.localeCompare(b.date) || a.id.localeCompare(b.id)));
    if (all.length === 0) { container.innerHTML = `<div class="empty-state"><strong>本月尚無記錄</strong></div>`; return; }
    container.innerHTML = all.map(e => {
        var day = parseInt(e.date.split('-')[2]);
        var editBtn = `<button class="icon-btn" onclick="editLifeExp('${e.id}')"><i class="fa-solid fa-pen"></i></button>`;
        var delBtn = `<button class="icon-btn delete" onclick="deleteLifeExp('${e.id}')"><i class="fa-solid fa-trash"></i></button>`;
        if (e.type === 'income') {
            var incCat = lifeIncomeCategories.find(c => c.id === e.categoryId) || {name: '收入', color: '#3D7A5A'};
            var displayNote = (e.note && e.note !== incCat.name) ? `<span class="life-item-note-sep">·</span><span class="life-item-note">${e.note}</span>` : '';
            return `<div class="life-income-row"><div class="life-income-date">${day}</div><div class="life-income-arrow" style="background:${incCat.color}"></div><div class="life-exp-info"><div class="life-item-main-line"><span class="life-item-cat-name">${incCat.name}</span>${displayNote}</div></div><div class="life-exp-amount-wrap"><div class="life-income-amount">+ NT$ ${_safeFormat(e.amount, 'income')}</div></div><div class="life-item-actions">${editBtn}${delBtn}</div></div>`;
        } else {
            var cat = lifeCategories.find(c => c.id === e.categoryId) || {name: '支出', color: '#6B6B6B'};
            var payIcon = e.paymentMethod && e.paymentMethod === 'card' ? ' <i class="fa-solid fa-credit-card" style="font-size:0.7rem;opacity:0.6;"></i>' : '';
            var linked = rewardMap[e.id];
            var rewardHtml = linked ? `<div class="life-exp-reward-inline"><i class="fa-solid fa-gift"></i> +${linked.amount.toLocaleString()} ${linked.rate ? '('+linked.rate+')' : ''}</div>` : '';
            var displayNote = (e.note && e.note !== cat.name) ? `<span class="life-item-note-sep">·</span><span class="life-item-note" title="${e.note}">${e.note}</span>` : '';
            return `<div class="life-exp-row"><div class="life-exp-date">${day}</div><div class="life-exp-dot" style="background:${cat.color}"></div><div class="life-exp-info"><div class="life-item-main-line"><span class="life-item-cat-name">${cat.name}</span>${displayNote}${payIcon}</div></div><div class="life-exp-amount-wrap"><div class="life-exp-amount stat-negative">- NT$ ${e.amount.toLocaleString()}</div>${rewardHtml}</div><div class="life-item-actions">${editBtn}${delBtn}</div></div>`;
        }
    }).join('');
}

function openLifeExpModal(typeOrPreset) {
    var overlay = document.getElementById('lifeExpModalOverlay'); if(!overlay) return;
    var type = (typeOrPreset === 'income') ? 'income' : 'expense';
    var presetCatId = (typeOrPreset && typeOrPreset !== 'income' && typeOrPreset !== 'expense') ? typeOrPreset : null;
    document.getElementById('lifeExpCat').innerHTML = lifeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('lifeExpIncCat').innerHTML = lifeIncomeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('lifeExpPaymentMethod').innerHTML = paymentMethods.map(pm => `<option value="${pm.id}">${pm.name}</option>`).join('');
    if (presetCatId) { if (type === 'income') document.getElementById('lifeExpIncCat').value = presetCatId; else if (cSel) cSel.value = presetCatId; }
    document.getElementById('lifeExpId').value = ''; document.getElementById('lifeExpAmount').value = '';
    document.getElementById('lifeExpDate').value = lifeCurrentMonth + '-' + String(new Date().getDate()).padStart(2, '0');
    document.getElementById('lifeExpNote').value = '';
    _selectedCreditCardId = null; document.getElementById('creditCardPickerGroup').style.display = 'none'; document.getElementById('benefitPlanPickerGroup').style.display = 'none';
    lifeCalcReset(); setLifeExpType(type); overlay.classList.add('active');
}

function closeLifeExpModal() { var o = document.getElementById('lifeExpModalOverlay'); if(o) o.classList.remove('active'); }

async function onPaymentMethodChange() {
    var pmId = document.getElementById('lifeExpPaymentMethod').value;
    var pickerGroup = document.getElementById('creditCardPickerGroup');
    if (pmId === 'card') { pickerGroup.style.display = 'block'; await loadCreditCardPicker(); } 
    else { pickerGroup.style.display = 'none'; var bGroup = document.getElementById('benefitPlanPickerGroup'); if(bGroup) bGroup.style.display = 'none'; _selectedCreditCardId = null; }
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
    var planGroup = document.getElementById('benefitPlanPickerGroup');
    var planPicker = document.getElementById('benefitPlanPicker');
    _selectedCreditCardId = picker.value ? parseInt(picker.value) : null;
    if (_selectedCreditCardId) {
        const cards = await CreditCardService.getCards();
        const card = cards.find(c => c.CardID === _selectedCreditCardId);
        if (card && card.RequireSwitch) {
            const rewards = await CreditCardService.getRewardsForCard(_selectedCreditCardId);
            const plans = [...new Set(rewards.map(r => r.PlanName).filter(Boolean))];
            if (plans.length > 0 && planPicker) { planPicker.innerHTML = plans.map(p => `<option value="${p}">${p}</option>`).join(''); planGroup.style.display = 'block'; } 
            else if(planGroup) planGroup.style.display = 'none';
        } else if(planGroup) planGroup.style.display = 'none';
    } else if(planGroup) planGroup.style.display = 'none';
    updateRewardPreview();
}

async function updateRewardPreview() {
    var amount = parseInt(document.getElementById('lifeExpAmount').value) || 0;
    var pmId = document.getElementById('lifeExpPaymentMethod').value;
    var preview = document.getElementById('rewardPreview'); if(!preview) return;
    if (pmId !== 'card' || amount <= 0 || !_selectedCreditCardId) { preview.style.display = 'none'; return; }
    const planName = (document.getElementById('benefitPlanPickerGroup').style.display !== 'none') ? document.getElementById('benefitPlanPicker').value : null;
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
    if (e.type === 'income') { var iSel = document.getElementById('lifeExpIncCat'); if(iSel) iSel.value = e.categoryId; }
    else {
        document.getElementById('lifeExpCat').value = e.categoryId;
        document.getElementById('lifeExpPaymentMethod').value = e.paymentMethod || 'cash';
        _selectedCreditCardId = e._selectedCardId || null;
        await onPaymentMethodChange();
        if (_selectedCreditCardId) {
            var picker = document.getElementById('creditCardPicker');
            if(picker) { picker.value = _selectedCreditCardId; await onCreditCardChange(); var bPicker = document.getElementById('benefitPlanPicker'); if(bPicker && e._selectedPlanName) bPicker.value = e._selectedPlanName; }
        }
    }
}

async function handleLifeExpSubmit(e) {
    e.preventDefault();
    var amount = parseInt(document.getElementById('lifeExpAmount').value);
    var date = document.getElementById('lifeExpDate').value;
    var note = document.getElementById('lifeExpNote').value.trim();
    var pmId = document.getElementById('lifeExpPaymentMethod').value;
    var type = document.getElementById('lifeExpType').value || 'expense';
    var id = document.getElementById('lifeExpId').value;
    if (!amount || amount <= 0 || !date) { showToast('請輸入金額'); return; }
    var catId = (type === 'income') ? document.getElementById('lifeExpIncCat').value : document.getElementById('lifeExpCat').value;
    var entry = { id: id || crypto.randomUUID(), type: type, categoryId: catId, amount: amount, date: date, note: note };
    if (type === 'expense') {
        entry.paymentMethod = pmId;
        if (pmId === 'card' && _selectedCreditCardId) {
            entry._selectedCardId = _selectedCreditCardId;
            var bGroup = document.getElementById('benefitPlanPickerGroup');
            var bPicker = document.getElementById('benefitPlanPicker');
            if (bGroup && bGroup.style.display !== 'none' && bPicker) entry._selectedPlanName = bPicker.value;
        }
    }
    if (id) { var idx = lifeExpenses.findIndex(ex => ex.id === id); if (idx !== -1) lifeExpenses[idx] = entry; } else lifeExpenses.push(entry);
    if (type === 'expense') await syncLinkedReward(entry);
    saveLifeData(); closeLifeExpModal(); renderLifeTab(); showToast('已儲存');
}

async function syncLinkedReward(expenseEntry) {
    lifeExpenses = lifeExpenses.filter(e => e._linkedExpenseId !== expenseEntry.id);
    let rate = 0, cardInfo = "";
    if (expenseEntry.paymentMethod === 'card' && expenseEntry._selectedCardId) {
        const best = await CreditCardService.getBestRewardRate(expenseEntry._selectedCardId, expenseEntry.categoryId, expenseEntry._selectedPlanName);
        rate = best.rate;
        const cards = await CreditCardService.getCards();
        const card = cards.find(c => c.CardID === expenseEntry._selectedCardId);
        cardInfo = card ? card.CardName : "信用卡";
    }
    if (rate > 0) {
        var rewardAmt = Math.floor(expenseEntry.amount * rate / 100);
        if (rewardAmt > 0) lifeExpenses.push({ id: crypto.randomUUID(), type: 'income', categoryId: 'lc_inc_invest', amount: rewardAmt, date: expenseEntry.date, note: `[回饋] ${cardInfo} (${rate}%)`, _linkedExpenseId: expenseEntry.id });
    }
}

function autoApplySalary(ym) {
    var s = JSON.parse(localStorage.getItem(SALARY_DEFAULT_KEY));
    if (!s || lifeExpenses.some(e => e.date.startsWith(ym) && e.categoryId === s.catId)) return;
    var d = new Date(ym + '-' + String(s.day).padStart(2, '0'));
    var day = d.getDay();
    if (day === 0) d.setDate(d.getDate() - 2); else if (day === 6) d.setDate(d.getDate() - 1);
    lifeExpenses.push({ id: crypto.randomUUID(), type: 'income', categoryId: s.catId, amount: s.amount, date: d.toISOString().split('T')[0], note: '薪資 (自動)', _autoSalary: true });
    saveLifeData();
}

function autoApplyDailyExpenses(ym) {
    var list = JSON.parse(localStorage.getItem(DAILY_EXP_DEFAULT_KEY) || '[]');
    list.forEach(rule => { if (!lifeExpenses.some(e => e._autoDailyId === rule.id && e.date.startsWith(ym))) { lifeExpenses.push({ id: crypto.randomUUID(), type: 'expense', categoryId: rule.catId, amount: rule.amount, date: ym + '-01', note: rule.name, _autoDailyId: rule.id }); } });
}

function setLifeExpType(type) {
    document.getElementById('lifeExpType').value = type;
    var cG = document.getElementById('lifeExpCatGroup'); if(cG) cG.style.display = (type === 'income') ? 'none' : 'block';
    var iG = document.getElementById('lifeExpIncCatGroup'); if(iG) iG.style.display = (type === 'income') ? 'block' : 'none';
    var pG = document.getElementById('lifeExpPaymentGroup'); if(pG) pG.style.display = (type === 'income') ? 'none' : 'block';
    var mT = document.getElementById('lifeExpModalTitle'); if(mT) mT.textContent = (type === 'income') ? '新增收入' : '新增支出';
    updateRewardPreview();
}

function deleteLifeExp(id) { if (confirm('確定刪除？')) { lifeExpenses = lifeExpenses.filter(e => e.id !== id && e._linkedExpenseId !== id); saveLifeData(); renderLifeTab(); } }

function _lifeCalcRefresh() {
    var val = parseFloat(_calcCurrent || 0).toLocaleString();
    var d1 = document.getElementById('lifeCalcDisplay'); if(d1) d1.textContent = val;
    var d2 = document.getElementById('lifeCalcAmountDisplay'); if(d2) d2.textContent = val;
    var v1 = document.getElementById('lifeExpAmount'); if(v1) v1.value = parseFloat(_calcCurrent || 0);
}
function lifeCalcReset() { _calcCurrent = '0'; _lifeCalcRefresh(); }
function lifeCalcDigit(d) { _calcCurrent = (_calcCurrent === '0') ? d : _calcCurrent + d; _lifeCalcRefresh(); }
function lifeCalcBack() { _calcCurrent = _calcCurrent.length > 1 ? _calcCurrent.slice(0, -1) : '0'; _lifeCalcRefresh(); }

function saveCCAnalyzerConfig() {
    var url = document.getElementById('ccAnalyzerUrl').value.trim();
    var key = document.getElementById('ccAnalyzerKey').value.trim();
    CreditCardService.saveConfig(url, key);
    var o = document.getElementById('ccAnalyzerSettingOverlay'); if(o) o.classList.remove('active');
    showToast('設定已儲存');
}
function openCCAnalyzerSettingModal() {
    var cfg = CreditCardService.getConfig();
    var u = document.getElementById('ccAnalyzerUrl'); if(u) u.value = cfg ? cfg.url : '';
    var k = document.getElementById('ccAnalyzerKey'); if(k) k.value = cfg ? cfg.anonKey : '';
    var o = document.getElementById('ccAnalyzerSettingOverlay'); if(o) o.classList.add('active');
}
function closeCCAnalyzerSettingModal() { var o = document.getElementById('ccAnalyzerSettingOverlay'); if(o) o.classList.remove('active'); }
