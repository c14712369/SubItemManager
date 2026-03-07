// ====== js/ui-life.js ======
function changeLifeMonth(delta) {
    var parts = lifeCurrentMonth.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1 + delta, 1);
    lifeCurrentMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    renderLifeTab();
}

function getLifeTotalForMonth(ym) {
    return lifeExpenses
        .filter(e => e.date && e.date.startsWith(ym))
        .reduce((s, e) => s + (e.amount || 0), 0);
}

function getLifeSpentByCat(catId, ym) {
    return lifeExpenses
        .filter(e => e.categoryId === catId && e.date && e.date.startsWith(ym))
        .reduce((s, e) => s + (e.amount || 0), 0);
}

function getLifeBudget(catId, ym) {
    return lifeBudgets[catId + '|' + ym] || 0;
}

function getTotalBudgetForMonth(ym) {
    return lifeCategories.reduce((s, c) => s + getLifeBudget(c.id, ym), 0);
}

function getLifeIncomeForMonth(ym) {
    return lifeExpenses
        .filter(e => e.type === 'income' && e.date && e.date.startsWith(ym))
        .reduce((s, e) => s + (e.amount || 0), 0);
}

function getLifeOnlyExpForMonth(ym) {
    return lifeExpenses
        .filter(e => e.type !== 'income' && e.date && e.date.startsWith(ym))
        .reduce((s, e) => s + (e.amount || 0), 0);
}

function getMonthlyFixedTotal(ym) {
    if (!ym) return 0;

    // Parse the current viewing month
    const [yearStr, monthStr] = ym.split('-');
    const viewYear = parseInt(yearStr);
    const viewMonth = parseInt(monthStr); // 1-12

    const monthStart = new Date(viewYear, viewMonth - 1, 1);
    const monthEnd = new Date(viewYear, viewMonth, 0); // Last day of that month
    monthStart.setHours(0, 0, 0, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const activeItems = items.filter(item => {
        const start = new Date(item.startDate);
        start.setHours(0, 0, 0, 0);

        // If it starts after the viewing month ends, it's not active yet
        if (start > monthEnd) return false;

        // If it ended before the viewing month started, it's no longer active
        const end = item.endDate ? new Date(item.endDate) : null;
        if (end) {
            end.setHours(23, 59, 59, 999);
            if (end < monthStart) return false;
        }

        return true;
    });

    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

    return activeItems.reduce((total, item) => {
        const baseAmt = getItemAmountForMonth(item, viewYear, viewMonth);
        // For fixed one-time items, only count if it specifically falls in this month
        if (item.cycle === 'fixed') {
            const startD = new Date(item.startDate);
            if (startD.getFullYear() === viewYear && (startD.getMonth() + 1) === viewMonth) {
                return total + baseAmt;
            }
            return total;
        }

        let monthly = baseAmt;
        switch (item.cycle) {
            case 'daily': monthly = baseAmt * daysInMonth; break;
            case 'weekly': monthly = baseAmt * (daysInMonth / 7); break;
            case 'monthly': monthly = baseAmt; break;
            case 'bimonthly': monthly = baseAmt / 2; break;
            case 'quarterly': monthly = baseAmt / 3; break;
            case 'half-yearly':
            case 'halfyear': monthly = baseAmt / 6; break;
            case 'yearly': monthly = baseAmt / 12; break;
        }
        return total + monthly;
    }, 0);
}

async function renderLifeTab() {
    autoApplySalary(lifeCurrentMonth);
    autoApplyDailyExpenses(lifeCurrentMonth);
    
    const [ly, lm] = lifeCurrentMonth.split('-').map(Number);
    await prefetchFXRates(items, [[ly, lm]]);

    var label = document.getElementById('lifeMonthDisplay');
    if (label) label.textContent = lifeMonthLabel(lifeCurrentMonth);

    var totalIncome = getLifeIncomeForMonth(lifeCurrentMonth);
    var totalExpense = getLifeOnlyExpForMonth(lifeCurrentMonth);
    var totalFixed = getMonthlyFixedTotal(lifeCurrentMonth);

    var totalProject = 0;
    if (typeof projectExpenses !== 'undefined' && projectExpenses) {
        projectExpenses.forEach(function (e) {
            if (e.date && e.date.startsWith(lifeCurrentMonth)) {
                totalProject += (e.amount || 0);
            }
        });
    }

    var remain = totalIncome - totalExpense - totalFixed - totalProject;
    var totalOutgoing = totalExpense + totalFixed + totalProject;
    var isOver = totalOutgoing > totalIncome && totalIncome > 0;
    var pct = totalIncome > 0 ? Math.min(Math.round((totalOutgoing / totalIncome) * 100), 100) : 0;
    var rawPct = totalIncome > 0 ? Math.round((totalOutgoing / totalIncome) * 100) : 0;

    var incomeEl = document.getElementById('lifeMonthBudget');
    var fixedEl = document.getElementById('lifeMonthFixed');
    var spentEl = document.getElementById('lifeMonthSpent');
    var remainEl = document.getElementById('lifeMonthRemain');
    var barEl = document.getElementById('lifeOverallProgress');
    var pctEl = document.getElementById('lifeOverallPct');
    var actualEl = document.getElementById('lifeActualIncome');
    var projectEl = document.getElementById('lifeMonthProject');
    var projectRowEl = document.getElementById('lifeMonthProjectRow');

    if (incomeEl) incomeEl.textContent = 'NT$ ' + formatAmount(totalIncome, 'income');
    if (fixedEl) fixedEl.textContent = 'NT$ ' + formatAmount(Math.round(totalFixed), 'fixed');
    if (spentEl) spentEl.textContent = 'NT$ ' + formatAmount(totalExpense, 'expense');
    if (projectEl) projectEl.textContent = 'NT$ ' + formatAmount(Math.round(totalProject), 'expense');
    if (projectRowEl) projectRowEl.style.display = totalProject > 0 ? '' : 'none';
    if (remainEl) {
        remainEl.textContent = 'NT$ ' + formatAmount(Math.abs(Math.round(remain)), 'asset') + (remain < 0 ? ' (超支)' : '');
        remainEl.className = 'hero-amount ' + (remain < 0 ? 'stat-negative' : 'stat-positive');
    }
    if (barEl) {
        barEl.style.width = pct + '%';
        barEl.className = 'progress-fill' + (isOver ? ' over-budget' : '');
    }
    if (pctEl) {
        pctEl.textContent = totalIncome > 0 ? '支出 ' + rawPct + '%' : '—';
        pctEl.className = 'progress-pct' + (isOver ? ' over-budget' : '');
    }
    if (actualEl) actualEl.textContent = 'NT$ ' + formatAmount(totalIncome, 'income');

    renderBudgetCards();
    renderLifeExpenseList();
    if (typeof updateSalaryApplyBtn === 'function') updateSalaryApplyBtn();
}

var _lifeSelectedCatId = null;
var _lifeExpSortMode = 'date-desc';

function toggleLifeExpSort() {
    _lifeExpSortMode = (_lifeExpSortMode === 'date-desc') ? 'date-asc' : 'date-desc';
    var btn = document.getElementById('lifeExpSortBtn');
    if (btn) {
        btn.innerHTML = (_lifeExpSortMode === 'date-desc') ? '<i class="fa-solid fa-arrow-down-short-wide"></i>' : '<i class="fa-solid fa-arrow-up-wide-short"></i>';
        btn.title = (_lifeExpSortMode === 'date-desc') ? '切換排序 (新到舊)' : '切換排序 (舊到新)';
    }
    renderLifeExpenseList();
}

function switchLifeView(viewType) {
    document.getElementById('lifeTabBtnCat').classList.toggle('active', viewType === 'cat');
    document.getElementById('lifeTabBtnExp').classList.toggle('active', viewType === 'exp');
    document.getElementById('lifeViewCat').classList.toggle('active', viewType === 'cat');
    document.getElementById('lifeViewExp').classList.toggle('active', viewType === 'exp');
    
    if (viewType === 'cat') {
        document.getElementById('lifeViewExp').style.display = 'none';
        document.getElementById('lifeViewCat').style.display = 'block';
    } else {
        document.getElementById('lifeViewCat').style.display = 'none';
        document.getElementById('lifeViewExp').style.display = 'block';
    }
}

function renderBudgetCards() {
    var container = document.getElementById('budgetCards');
    if (!container) return;
    container.innerHTML = '';
    var totalSpent = getLifeOnlyExpForMonth(lifeCurrentMonth);

    var allRow = document.createElement('div');
    allRow.className = 'life-cat-row' + (_lifeSelectedCatId === null ? ' active' : '');
    allRow.onclick = function () { clearLifeFilter(); };
    allRow.innerHTML =
        '<div class="life-cat-row-left"><span class="life-cat-dot" style="background:var(--primary-color)"></span><span class="life-cat-row-name">全部支出</span></div>' +
        '<div class="life-cat-row-right"><span class="life-cat-row-amt">NT$ ' + totalSpent.toLocaleString() + '</span>' +
        '<button class="icon-btn life-cat-action" style="visibility:hidden;"><i class="fa-solid fa-plus"></i></button></div>';
    container.appendChild(allRow);

    var sep = document.createElement('div');
    sep.className = 'life-cat-sep';
    container.appendChild(sep);

    lifeCategories.forEach(function (cat) {
        var spent = getLifeSpentByCat(cat.id, lifeCurrentMonth);
        if (spent <= 0) return;
        var budget = getLifeBudget(cat.id, lifeCurrentMonth);
        var isOverBudget = budget > 0 && spent > budget;
        var budgetPct = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
        var row = document.createElement('div');
        row.className = 'life-cat-row' + (_lifeSelectedCatId === cat.id ? ' active' : '') + (isOverBudget ? ' over-budget-row' : '');
        var catId = cat.id;
        row.onclick = function () { selectLifeCat(catId); };
        var budgetBar = budget > 0 ? '<div class="cat-budget-bar"><div class="cat-budget-fill' + (isOverBudget ? ' over' : '') + '" style="width:' + budgetPct + '%"></div></div>' : '';
        var overIcon = isOverBudget ? '<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger-color);font-size:0.75rem;margin-left:4px;" title="已超出預算"></i>' : '';
        row.innerHTML =
            '<div class="life-cat-row-left"><span class="life-cat-dot" style="background:' + cat.color + '"></span><span class="life-cat-row-name">' + cat.name + overIcon + '</span></div>' +
            '<div class="life-cat-row-right"><div style="text-align:right"><span class="life-cat-row-amt' + (isOverBudget ? ' text-danger' : '') + '">NT$ ' + spent.toLocaleString() + '</span>' +
            (budget > 0 ? '<div class="life-cat-row-budget-hint">/ NT$ ' + budget.toLocaleString() + '</div>' : '') + '</div>' +
            '<button class="icon-btn life-cat-action" onclick="event.stopPropagation();openLifeExpModalWithCat(\'' + cat.id + '\')" title="新增支出"><i class="fa-solid fa-plus"></i></button></div>' +
            (budgetBar ? '<div class="cat-budget-bar-wrap">' + budgetBar + '</div>' : '');
        container.appendChild(row);
    });
}

function selectLifeCat(catId) {
    _lifeSelectedCatId = catId;
    renderBudgetCards();
    renderLifeExpenseList();
    var cat = getLifeCat(catId);
    var titleEl = document.getElementById('lifeDetailTitle');
    var clearBtn = document.getElementById('lifeClearFilter');
    if (titleEl) titleEl.innerHTML = '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + cat.color + ';margin-right:6px;vertical-align:middle;"></span>' + cat.name + ' 明細';
    if (clearBtn) clearBtn.style.display = '';
}

function clearLifeFilter() {
    _lifeSelectedCatId = null;
    renderBudgetCards();
    renderLifeExpenseList();
    var titleEl = document.getElementById('lifeDetailTitle');
    var clearBtn = document.getElementById('lifeClearFilter');
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-book"></i> 全部明細';
    if (clearBtn) clearBtn.style.display = 'none';
}

function renderLifeExpenseList() {
    var container = document.getElementById('lifeExpList');
    if (!container) return;
    var sortMode = _lifeExpSortMode || 'date-desc';
    var all = lifeExpenses.filter(function (e) {
        if (!e.date || !e.date.startsWith(lifeCurrentMonth)) return false;
        if (_lifeSelectedCatId !== null) return e.type !== 'income' && e.categoryId === _lifeSelectedCatId;
        return true;
    }).sort(function (a, b) { 
        return sortMode === 'date-desc' ? (b.date.localeCompare(a.date) || b.id.localeCompare(a.id)) : (a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    });

    if (all.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-icon"><i class="fa-regular fa-face-smile-beam"></i></span><strong>本月尚無記錄</strong><p>點擊「支出」按鈕開始記帳</p></div>';
        return;
    }

    container.innerHTML = all.map(function (e) {
        var day = parseInt(e.date.split('-')[2]);
        var editBtn = '<button class="icon-btn" onclick="editLifeExp(\'' + e.id + '\')" title="編輯"><i class="fa-solid fa-pen"></i></button>';
        var delBtn = '<button class="icon-btn delete" onclick="deleteLifeExp(\'' + e.id + '\')" title="刪除"><i class="fa-solid fa-trash"></i></button>';
        if (e.type === 'income') {
            var incCat = getLifeIncCat(e.categoryId);
            var note = (e.note || incCat.name).replace(/[（\(\[].*?[）\)\]]/g, '').trim() || incCat.name;
            return '<div class="life-income-row"><div class="life-income-date" style="color:' + incCat.color + ';">' + day + '</div><div class="life-income-arrow" style="background:' + incCat.color + ';"></div><div class="life-income-info"><div class="life-income-src">' + incCat.name + '</div><div class="life-income-note">' + note + '</div></div><div class="life-income-amount">+ NT$ ' + formatAmount(e.amount, 'income') + '</div>' + editBtn + delBtn + '</div>';
        } else {
            var cat = getLifeCat(e.categoryId);
            return '<div class="life-exp-row"><div class="life-exp-date">' + day + '</div><div class="life-exp-dot" style="background:' + cat.color + '"></div><div class="life-exp-info"><div class="life-exp-cat">' + cat.name + '</div><div class="life-exp-note">' + (e.note || cat.name) + '</div></div><div class="life-exp-amount" style="color: var(--danger-color);">- NT$ ' + e.amount.toLocaleString() + '</div>' + editBtn + delBtn + '</div>';
        }
    }).join('');
}

function setLifeExpType(type) {
    document.getElementById('lifeExpType').value = type;
    var expBtn = document.getElementById('typeExpBtn');
    var incBtn = document.getElementById('typeIncBtn');
    var catGroup = document.getElementById('lifeExpCatGroup');
    var incCatGroup = document.getElementById('lifeExpIncCatGroup');
    var submitBtn = document.getElementById('lifeExpSubmitBtn');
    var batchWrap = document.getElementById('lifeExpBatchToggleWrap');

    if (type === 'income') {
        expBtn.className = 'type-btn';
        incBtn.className = 'type-btn active income-mode';
        if (catGroup) catGroup.style.display = 'none';
        if (incCatGroup) incCatGroup.style.display = '';
        if (submitBtn) submitBtn.textContent = '儲存收入';
        if (batchWrap) batchWrap.style.display = 'none';
        document.getElementById('lifeExpModalTitle').textContent = '新增收入';
    } else {
        expBtn.className = 'type-btn active';
        incBtn.className = 'type-btn';
        if (catGroup) catGroup.style.display = '';
        if (incCatGroup) incCatGroup.style.display = 'none';
        if (submitBtn) submitBtn.textContent = '儲存支出';
        if (batchWrap) batchWrap.style.display = '';
        document.getElementById('lifeExpModalTitle').textContent = '新增支出';
    }
}

function openLifeExpModal(typeOrPreset) {
    var overlay = document.getElementById('lifeExpModalOverlay');
    var type = (typeOrPreset === 'income') ? 'income' : 'expense';
    var presetCatId = (typeOrPreset && typeOrPreset !== 'income' && typeOrPreset !== 'expense') ? typeOrPreset : null;

    var sel = document.getElementById('lifeExpCat');
    if (sel) {
        sel.innerHTML = lifeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        if (type === 'expense' && presetCatId) sel.value = presetCatId;
    }
    var incSel = document.getElementById('lifeExpIncCat');
    if (incSel) {
        incSel.innerHTML = lifeIncomeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        if (type === 'income' && presetCatId) incSel.value = presetCatId;
    }

    document.getElementById('lifeExpId').value = '';
    document.getElementById('lifeExpAmount').value = '';
    document.getElementById('lifeExpDate').value = lifeCurrentMonth + '-' + String(new Date().getDate()).padStart(2, '0');
    document.getElementById('lifeExpNote').value = '';

    // Reset Batch Panel
    var batchWrap = document.getElementById('lifeExpBatchToggleWrap');
    if (batchWrap) {
        batchWrap.classList.remove('active');
        batchWrap.style.display = ''; 
        document.getElementById('lifeExpBatchPanel').style.display = 'none';
        document.getElementById('lifeExpBatchDates').value = '';
        document.getElementById('batchPreviewList').innerHTML = '';
        document.getElementById('batchToggleIcon').className = 'fa-solid fa-chevron-down toggle-icon';
    }

    lifeCalcReset();
    setLifeExpType(type);
    if (overlay) overlay.classList.add('active');
    document.body.classList.add('modal-open');
}

function closeLifeExpModal() {
    closeCalcPopup();
    var overlay = document.getElementById('lifeExpModalOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('modal-open');
    if (typeof resetViewport === 'function') resetViewport();
    lifeCalcReset();
}

function openCalcPopup() {
    var overlay = document.getElementById('calcPopupOverlay');
    if (overlay) overlay.classList.add('active');
}

function closeCalcPopup() {
    var overlay = document.getElementById('calcPopupOverlay');
    if (overlay) overlay.classList.remove('active');
    var displayEl = document.getElementById('lifeCalcAmountDisplay');
    var cur = parseFloat(_calcCurrent);
    if (displayEl) displayEl.textContent = isNaN(cur) ? '0' : cur.toLocaleString('zh-TW');
}

function calcPopupBgClick(e) {
    if (e.target === document.getElementById('calcPopupOverlay')) closeCalcPopup();
}

function handleLifeExpSubmit(e) {
    e.preventDefault();
    var id = document.getElementById('lifeExpId').value;
    var type = document.getElementById('lifeExpType').value || 'expense';
    var amount = parseInt(document.getElementById('lifeExpAmount').value);
    var date = document.getElementById('lifeExpDate').value;
    var note = document.getElementById('lifeExpNote').value.trim();
    var batchDatesStr = document.getElementById('lifeExpBatchDates') ? document.getElementById('lifeExpBatchDates').value : '';

    if (!amount || amount <= 0 || !date) {
        const modal = document.querySelector('#lifeExpModalOverlay .modal');
        if (modal) { modal.classList.remove('shake'); void modal.offsetWidth; modal.classList.add('shake'); }
        showToast('請輸入有效金額與日期');
        return;
    }

    if (id) {
        var catId = type === 'income' ? document.getElementById('lifeExpIncCat').value : document.getElementById('lifeExpCat').value;
        var entry = { id: id, type: type, categoryId: catId, amount: amount, date: date, note: note };
        var idx = lifeExpenses.findIndex(ex => ex.id === id);
        if (idx !== -1) lifeExpenses[idx] = entry;
        showToast('已更新');
    } else {
        var datesToProcess = [date];
        if (batchDatesStr && type === 'expense') datesToProcess = batchDatesStr.split(',');
        var catId = type === 'income' ? document.getElementById('lifeExpIncCat').value : document.getElementById('lifeExpCat').value;

        datesToProcess.forEach(d => {
            var adjustedDate = d;
            if (type === 'income') {
                var dObj = new Date(d);
                if (dObj.getDay() === 0) dObj.setDate(dObj.getDate() - 2);
                else if (dObj.getDay() === 6) dObj.setDate(dObj.getDate() - 1);
                adjustedDate = dObj.toISOString().split('T')[0];
            }
            lifeExpenses.push({ id: crypto.randomUUID(), type: type, categoryId: catId, amount: amount, date: adjustedDate, note: note });
        });
        showToast(datesToProcess.length > 1 ? `已批次新增 ${datesToProcess.length} 筆記錄` : (type === 'income' ? '收入已記錄' : '支出已新增'));
    }

    saveLifeData();
    closeLifeExpModal();
    renderLifeTab();
}

function deleteLifeExp(id) {
    if (confirm('確定刪除這筆紀錄？')) {
        lifeExpenses = lifeExpenses.filter(e => e.id !== id);
        saveLifeData();
        showToast('已刪除');
        renderLifeTab();
    }
}

function editLifeExp(id) {
    var e = lifeExpenses.find(x => x.id === id);
    if (!e) return;
    openLifeExpModal(e.type === 'income' ? 'income' : 'expense');
    document.getElementById('lifeExpId').value = e.id;
    var batchWrap = document.getElementById('lifeExpBatchToggleWrap');
    if (batchWrap) batchWrap.style.display = 'none'; // Hide batch for edit

    lifeCalcDisplaySet(e.amount);
    document.getElementById('lifeExpDate').value = e.date;
    document.getElementById('lifeExpNote').value = e.note || '';
    if (e.type === 'income') {
        document.getElementById('lifeExpIncCat').value = e.categoryId;
        document.getElementById('lifeExpModalTitle').textContent = '編輯收入';
    } else {
        document.getElementById('lifeExpCat').value = e.categoryId;
        document.getElementById('lifeExpModalTitle').textContent = '編輯支出';
    }
}

// ── Batch Apply Helpers ──
function toggleBatchPanel() {
    var wrap = document.getElementById('lifeExpBatchToggleWrap');
    var panel = document.getElementById('lifeExpBatchPanel');
    var trigger = wrap.querySelector('.batch-trigger');
    var icon = document.getElementById('batchToggleIcon');
    var isHidden = panel.style.display === 'none';
    
    panel.style.display = isHidden ? 'block' : 'none';
    wrap.classList.toggle('active', isHidden);
    trigger.setAttribute('aria-expanded', isHidden);
    icon.className = isHidden ? 'fa-solid fa-chevron-up toggle-icon' : 'fa-solid fa-chevron-down toggle-icon';
}

function applyBatchPreset(type) {
    var baseDate = new Date(document.getElementById('lifeExpDate').value);
    if (isNaN(baseDate.getTime())) baseDate = new Date();
    
    // Update button active states
    document.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active'));
    if (type !== 'clear') {
        var activeBtn = document.getElementById('batch-preset-' + type);
        if (activeBtn) activeBtn.classList.add('active');
    }

    var dates = [];
    if (type === 'clear') {
        document.getElementById('lifeExpBatchDates').value = '';
        document.getElementById('batchPreviewList').innerHTML = '';
        return;
    }

    // Get Monday of current week
    var day = baseDate.getDay(); 
    var diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
    var monday = new Date(baseDate.getTime());
    monday.setDate(diff);

    for (var i = 0; i < 7; i++) {
        var d = new Date(monday.getTime());
        d.setDate(monday.getDate() + i);
        var dow = d.getDay();
        if (type === 'weekdays' && (dow === 0 || dow === 6)) continue;
        dates.push(d.toISOString().split('T')[0]);
    }

    document.getElementById('lifeExpBatchDates').value = dates.join(',');
    _updateBatchPreview(dates);
}

function _updateBatchPreview(dates) {
    var container = document.getElementById('batchPreviewList');
    if (!container) return;
    
    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    container.innerHTML = dates.map((d, index) => {
        var dObj = new Date(d);
        var dayNum = dObj.getDate();
        var dayName = dayMap[dObj.getDay()];
        // Add a slight delay to each tag for a staggered effect
        return `<div class="batch-tag" style="animation-delay: ${index * 0.05}s">
            <span>${dayNum}</span>
            <small>${dayName}</small>
        </div>`;
    }).join('');
}

function openBudgetModal(catId) {
    var cat = getLifeCat(catId);
    var overlay = document.getElementById('budgetModalOverlay');
    document.getElementById('budgetModalCatLabel').textContent = '「' + cat.name + '」' + lifeMonthLabel(lifeCurrentMonth) + ' 預算';
    document.getElementById('budgetModalCatId').value = catId;
    var cur = getLifeBudget(catId, lifeCurrentMonth);
    document.getElementById('budgetAmtInput').value = cur > 0 ? cur : '';
    if (overlay) overlay.classList.add('active');
}
function closeBudgetModal() {
    var overlay = document.getElementById('budgetModalOverlay');
    if (overlay) overlay.classList.remove('active');
}
function saveBudget() {
    var catId = document.getElementById('budgetModalCatId').value;
    var amt = parseInt(document.getElementById('budgetAmtInput').value) || 0;
    lifeBudgets[catId + '|' + lifeCurrentMonth] = amt;
    saveLifeData();
    closeBudgetModal();
    renderLifeTab();
    showToast('預算已設定');
}

function setCatManageType(type) {
    _currentCatManageType = type;
    document.getElementById('catTypeExpBtn').className = type === 'expense' ? 'type-btn active' : 'type-btn';
    document.getElementById('catTypeIncBtn').className = type === 'income' ? 'type-btn active income-mode' : 'type-btn';
    renderLifeCatList();
    document.getElementById('editLifeCatId').value = '';
    document.getElementById('newLifeCatName').value = '';
    document.getElementById('newLifeCatColor').value = type === 'expense' ? '#C17B2E' : '#5A9E7A';
    document.getElementById('cancelLifeCatBtn').style.display = 'none';
}

function openLifeCatModal(type) {
    setCatManageType(type || 'expense');
    var overlay = document.getElementById('lifeCatModalOverlay');
    if (overlay) overlay.classList.add('active');
}

function closeLifeCatModal() {
    var overlay = document.getElementById('lifeCatModalOverlay');
    if (overlay) overlay.classList.remove('active');
    document.getElementById('lifeExpCat').innerHTML = lifeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('lifeExpIncCat').innerHTML = lifeIncomeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    renderLifeTab();
}

function renderLifeCatList() {
    var container = document.getElementById('lifeCategoryList');
    if (!container) return;
    var cats = _currentCatManageType === 'income' ? lifeIncomeCategories : lifeCategories;
    if (cats.length === 0) { container.innerHTML = '<div class="empty-state"><p>尚無分類，請新增</p></div>'; return; }
    container.innerHTML = cats.map(cat => `<div class="category-item" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="width:14px;height:14px;border-radius:50%;background:${cat.color};flex-shrink:0;display:inline-block;"></span><span style="flex:1;font-weight:500;">${cat.name}</span><button class="icon-btn" onclick="editLifeCategory('${cat.id}')"><i class="fa-solid fa-pen"></i></button><button class="icon-btn delete" onclick="deleteLifeCategory('${cat.id}')"><i class="fa-solid fa-trash"></i></button></div>`).join('');
}

function saveLifeCategory() {
    var id = document.getElementById('editLifeCatId').value;
    var name = document.getElementById('newLifeCatName').value.trim();
    var color = document.getElementById('newLifeCatColor').value;
    if (!name) { showToast('請輸入分類名稱'); return; }
    var cats = _currentCatManageType === 'income' ? lifeIncomeCategories : lifeCategories;
    if (id) {
        var idx = cats.findIndex(c => c.id === id);
        if (idx !== -1) { cats[idx].name = name; cats[idx].color = color; }
    } else {
        cats.push({ id: (_currentCatManageType === 'income' ? 'lc_inc_' : 'lc_') + Date.now(), name: name, color: color });
    }
    saveLifeData();
    setCatManageType(_currentCatManageType);
    showToast('分類已儲存');
}

function editLifeCategory(id) {
    var cats = _currentCatManageType === 'income' ? lifeIncomeCategories : lifeCategories;
    var cat = cats.find(c => c.id === id);
    if (!cat) return;
    document.getElementById('editLifeCatId').value = id;
    document.getElementById('newLifeCatName').value = cat.name;
    document.getElementById('newLifeCatColor').value = cat.color;
    document.getElementById('cancelLifeCatBtn').style.display = '';
}

function cancelLifeCatEdit() {
    setCatManageType(_currentCatManageType);
}

function deleteLifeCategory(id) {
    var cat = (_currentCatManageType === 'income' ? lifeIncomeCategories : lifeCategories).find(c => c.id === id);
    if (!cat) return;
    if (confirm(`刪除分類「${cat.name}」？`)) {
        if (_currentCatManageType === 'income') lifeIncomeCategories = lifeIncomeCategories.filter(c => c.id !== id);
        else lifeCategories = lifeCategories.filter(c => c.id !== id);
        saveLifeData();
        renderLifeCatList();
        showToast('分類已刪除');
    }
}

function getDefaultSalary() {
    var raw = localStorage.getItem(SALARY_DEFAULT_KEY);
    return raw ? JSON.parse(raw) : null;
}

function updateSalaryApplyBtn() {
    var wrap = document.getElementById('salaryApplyWrap');
    if (!wrap) return;
    var setting = getDefaultSalary();
    if (!setting) { wrap.style.display = 'none'; return; }
    var applied = lifeExpenses.some(e => e.type === 'income' && e.categoryId === setting.catId && e.date && e.date.startsWith(lifeCurrentMonth) && (e._salaryDefault || e._autoSalary));
    wrap.style.display = applied ? 'none' : '';
}

function applyDefaultSalary() {
    var setting = getDefaultSalary();
    if (!setting) { showToast('請先設定預設薪資'); return; }
    var parts = lifeCurrentMonth.split('-');
    var d = getAdjustedPaydate(lifeCurrentMonth, setting.day || 5);
    lifeExpenses.push({ id: crypto.randomUUID(), type: 'income', categoryId: setting.catId, amount: setting.amount, date: d, note: setting.note || '薪資', _salaryDefault: true });
    saveLifeData();
    renderLifeTab();
    showToast('薪資已套用');
}

function openSalarySettingModal() {
    var sel = document.getElementById('salaryDefaultCatSelect');
    if (sel) sel.innerHTML = lifeIncomeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    var setting = getDefaultSalary();
    if (setting) {
        document.getElementById('salaryDefaultAmtInput').value = setting.amount;
        document.getElementById('salaryDefaultCatSelect').value = setting.catId;
        document.getElementById('salaryDefaultDay').value = setting.day || 5;
    }
    var overlay = document.getElementById('salarySettingModalOverlay');
    if (overlay) overlay.classList.add('active');
}

function closeSalarySettingModal() {
    var overlay = document.getElementById('salarySettingModalOverlay');
    if (overlay) overlay.classList.remove('active');
}

function saveDefaultSalary() {
    var amt = parseInt(document.getElementById('salaryDefaultAmtInput').value);
    var catId = document.getElementById('salaryDefaultCatSelect').value;
    var day = parseInt(document.getElementById('salaryDefaultDay').value) || 5;
    if (!amt || amt <= 0) { showToast('請輸入有效金額'); return; }
    localStorage.setItem(SALARY_DEFAULT_KEY, JSON.stringify({ amount: amt, catId: catId, day: day, note: '薪資' }));
    closeSalarySettingModal();
    updateSalaryApplyBtn();
    showToast('預設薪資已儲存');
}

function clearDefaultSalary() {
    if (confirm('確定清除預設薪資設定？')) {
        localStorage.removeItem(SALARY_DEFAULT_KEY);
        closeSalarySettingModal();
        updateSalaryApplyBtn();
        showToast('預設薪資已清除');
    }
}

function getAdjustedPaydate(ym, payday) {
    var parts = ym.split('-');
    var d = new Date(parts[0], parts[1] - 1, payday);
    var last = new Date(parts[0], parts[1], 0).getDate();
    if (payday > last) d = new Date(parts[0], parts[1] - 1, last);
    if (d.getDay() === 0) d.setDate(d.getDate() - 2);
    else if (d.getDay() === 6) d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

function autoApplySalary(ym) {
    if (ym < new Date().toISOString().slice(0, 7)) return;
    var setting = getDefaultSalary();
    if (!setting) return;
    if (lifeExpenses.some(e => e.type === 'income' && e.date && e.date.startsWith(ym) && (e._autoSalary || e._salaryDefault))) return;
    if (getLifeIncomeForMonth(ym) > 0) return;
    lifeExpenses.push({ id: crypto.randomUUID(), type: 'income', categoryId: setting.catId, amount: setting.amount, date: getAdjustedPaydate(ym, setting.day || 5), note: setting.note || '薪資', _autoSalary: true });
    saveLifeData();
    if (typeof triggerCloudSync === 'function') triggerCloudSync();
}

// ── Calculator ──
var _calcCurrent = '0', _calcFirstNum = null, _calcOp = null, _calcFreshEntry = false;
function _lifeCalcRefresh() {
    var disp = document.getElementById('lifeCalcDisplay');
    if (disp) disp.textContent = parseFloat(_calcCurrent).toLocaleString('zh-TW');
    var hidden = document.getElementById('lifeExpAmount');
    if (hidden) hidden.value = parseFloat(_calcCurrent) || '';
}
function lifeCalcReset() { _calcCurrent = '0'; _calcFirstNum = null; _calcOp = null; _calcFreshEntry = false; if(document.getElementById('lifeCalcExpr')) document.getElementById('lifeCalcExpr').textContent = ''; _lifeCalcRefresh(); }
function lifeCalcDisplaySet(val) { _calcCurrent = String(val || 0); _calcFirstNum = null; _calcOp = null; _calcFreshEntry = false; if(document.getElementById('lifeCalcExpr')) document.getElementById('lifeCalcExpr').textContent = ''; _lifeCalcRefresh(); }
function lifeCalcDigit(d) {
    if (_calcFreshEntry) { _calcCurrent = (d === '.') ? '0.' : d; _calcFreshEntry = false; }
    else { if (d === '.' && _calcCurrent.includes('.')) return; if (_calcCurrent === '0' && d !== '.') _calcCurrent = d; else _calcCurrent += d; }
    _lifeCalcRefresh();
}
function lifeCalcOp(op) {
    var cur = parseFloat(_calcCurrent);
    if (_calcOp && _calcFirstNum !== null && !_calcFreshEntry) cur = _lifeCalcCompute(_calcFirstNum, cur, _calcOp);
    _calcFirstNum = cur; _calcOp = op; _calcFreshEntry = true;
    if(document.getElementById('lifeCalcExpr')) document.getElementById('lifeCalcExpr').textContent = cur.toLocaleString('zh-TW') + ' ' + op;
    _lifeCalcRefresh();
}
function lifeCalcEqual() {
    if (!_calcOp || _calcFirstNum === null) return;
    var res = _lifeCalcCompute(_calcFirstNum, parseFloat(_calcCurrent), _calcOp);
    lifeCalcDisplaySet(Math.round(res * 100) / 100);
}
function lifeCalcBack() { _calcCurrent = _calcCurrent.length > 1 ? _calcCurrent.slice(0, -1) : '0'; _lifeCalcRefresh(); }
function lifeCalcToggleSign() { _calcCurrent = String(-parseFloat(_calcCurrent)); _lifeCalcRefresh(); }
function lifeCalcClear() { lifeCalcReset(); }
function _lifeCalcCompute(a, b, op) {
    switch (op) { case '+': return a + b; case '−': return a - b; case '×': return a * b; case '÷': return b === 0 ? a : a / b; }
    return b;
}
function lifeCalcSyncFromInput() {}

// ── Daily Expenses ──
function getDailyExpenses() { return JSON.parse(localStorage.getItem(DAILY_EXP_DEFAULT_KEY) || '[]'); }
function saveDailyExpenses(data) { localStorage.setItem(DAILY_EXP_DEFAULT_KEY, JSON.stringify(data)); if (typeof triggerCloudSync === 'function') triggerCloudSync(); }
function openDailyExpModal() {
    document.getElementById('dailyExpCat').innerHTML = lifeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    cancelDailyExpEdit();
    renderDailyExpList();
    var overlay = document.getElementById('dailyExpModalOverlay');
    if (overlay) overlay.classList.add('active');
}
function closeDailyExpModal() { var overlay = document.getElementById('dailyExpModalOverlay'); if (overlay) overlay.classList.remove('active'); }
function cancelDailyExpEdit() { document.getElementById('dailyExpId').value = ''; document.getElementById('dailyExpName').value = ''; document.getElementById('dailyExpAmount').value = ''; document.getElementById('dailyExpFreq').value = 'everyday'; document.getElementById('dailyExpCancelBtn').style.display = 'none'; }
function renderDailyExpList() {
    var container = document.getElementById('dailyExpList');
    if (!container) return;
    var list = getDailyExpenses();
    if (list.length === 0) { container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">尚未設定常態支出</div>'; return; }
    container.innerHTML = list.map(item => {
        var cat = getLifeCat(item.catId);
        var freqText = item.freq === 'weekdays' ? '平日' : (item.freq === 'weekends' ? '假日' : '每天');
        return `<div class="expense-list-row" style="margin-bottom:8px;"><div class="expense-list-info"><div class="expense-list-color" style="background:${cat?cat.color:'#ccc'}"></div><div><div style="font-weight:600;">${item.name} <span style="font-size:0.75rem;background:var(--border-color);padding:2px 6px;border-radius:4px;font-weight:normal;">${freqText}</span></div><div style="font-size:0.75rem;color:var(--text-muted);">${cat?cat.name:'未知'}</div></div></div><div style="display:flex;align-items:center;gap:12px;"><div class="expense-list-amount">NT$ ${item.amount.toLocaleString()}</div><div style="display:flex;gap:4px;"><button class="icon-btn" onclick="editDailyExp('${item.id}')"><i class="fa-solid fa-pen"></i></button><button class="icon-btn delete" onclick="deleteDailyExp('${item.id}')"><i class="fa-solid fa-trash"></i></button></div></div></div>`;
    }).join('');
}
function handleDailyExpSubmit(e) {
    e.preventDefault();
    var id = document.getElementById('dailyExpId').value, name = document.getElementById('dailyExpName').value.trim(), catId = document.getElementById('dailyExpCat').value, amount = parseInt(document.getElementById('dailyExpAmount').value), freq = document.getElementById('dailyExpFreq').value;
    if (!name || !amount) { showToast('請輸入有效名稱與金額'); return; }
    var list = getDailyExpenses();
    if (id) { var idx = list.findIndex(x => x.id === id); if (idx !== -1) list[idx] = { id, name, catId, amount, freq }; }
    else list.push({ id: crypto.randomUUID(), name, catId, amount, freq });
    saveDailyExpenses(list); cancelDailyExpEdit(); renderDailyExpList(); autoApplyDailyExpenses(lifeCurrentMonth); renderLifeTab(); showToast('常態支出已更新');
}
function deleteDailyExp(id) { if (confirm('確定刪除？')) { var list = getDailyExpenses().filter(x => x.id !== id); saveDailyExpenses(list); renderDailyExpList(); showToast('已刪除'); } }
function editDailyExp(id) {
    var item = getDailyExpenses().find(x => x.id === id);
    if (!item) return;
    document.getElementById('dailyExpId').value = item.id; document.getElementById('dailyExpName').value = item.name; document.getElementById('dailyExpCat').value = item.catId; document.getElementById('dailyExpAmount').value = item.amount; document.getElementById('dailyExpFreq').value = item.freq || 'everyday'; document.getElementById('dailyExpCancelBtn').style.display = 'inline-flex';
}
function autoApplyDailyExpenses(ym) {
    var list = getDailyExpenses(); if (!list.length) return;
    var today = new Date(), viewDate = new Date(ym + '-01'), year = viewDate.getFullYear(), month = viewDate.getMonth(), max = (year === today.getFullYear() && month === today.getMonth()) ? today.getDate() : new Date(year, month + 1, 0).getDate();
    if (viewDate > today) return;
    var changed = false;
    list.forEach(rule => {
        for (var d = 1; d <= max; d++) {
            var target = new Date(year, month, d), dow = target.getDay(), dateStr = target.toISOString().split('T')[0];
            if (rule.freq === 'weekdays' && (dow === 0 || dow === 6)) continue;
            if (rule.freq === 'weekends' && (dow !== 0 && dow !== 6)) continue;
            if (!lifeExpenses.some(e => e._autoDailyId === rule.id && e.date === dateStr)) {
                lifeExpenses.push({ id: crypto.randomUUID(), type: 'expense', categoryId: rule.catId, amount: rule.amount, date: dateStr, note: rule.name, _autoDailyId: rule.id });
                changed = true;
            }
        }
    });
    if (changed) saveLifeData();
}
function forceApplyDailyExpenses() { autoApplyDailyExpenses(lifeCurrentMonth); renderLifeTab(); closeDailyExpModal(); showToast('已套用'); }
