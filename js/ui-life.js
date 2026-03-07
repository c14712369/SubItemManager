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
    // Auto-apply salary if setting exists and no income recorded yet
    // Do this BEFORE calculating totals so the current render picks up the new entry
    autoApplySalary(lifeCurrentMonth);
    // Auto-apply daily expenses for the current month
    autoApplyDailyExpenses(lifeCurrentMonth);
    
    // 預取當月外幣固定支出的歷史匯率
    const [ly, lm] = lifeCurrentMonth.split('-').map(Number);
    await prefetchFXRates(items, [[ly, lm]]);

    var label = document.getElementById('lifeMonthDisplay');
    if (label) label.textContent = lifeMonthLabel(lifeCurrentMonth);

    var totalIncome = getLifeIncomeForMonth(lifeCurrentMonth);
    var totalExpense = getLifeOnlyExpForMonth(lifeCurrentMonth);
    var totalFixed = getMonthlyFixedTotal(lifeCurrentMonth);

    // Calculate project expenses for the current month
    var totalProject = 0;
    if (typeof projectExpenses !== 'undefined' && projectExpenses) {
        projectExpenses.forEach(function (e) {
            if (e.date && e.date.startsWith(lifeCurrentMonth)) {
                totalProject += (e.amount || 0);
            }
        });
    }

    var remain = totalIncome - totalExpense - totalFixed - totalProject;

    // For progress bar: Total outgoing vs income
    var totalOutgoing = totalExpense + totalFixed + totalProject;
    var isOver = totalOutgoing > totalIncome && totalIncome > 0;
    var pct = totalIncome > 0 ? Math.min(Math.round((totalOutgoing / totalIncome) * 100), 100) : 0;
    var rawPct = totalIncome > 0 ? Math.round((totalOutgoing / totalIncome) * 100) : 0;

    var incomeEl = document.getElementById('lifeMonthBudget');
    var fixedEl = document.getElementById('lifeMonthFixed'); // New element
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
        // Preserve 'hero-amount' class while adding status colors
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

// Track selected category filter
var _lifeSelectedCatId = null;
var _lifeExpSortMode = 'date-desc';

function toggleLifeExpSort() {
    _lifeExpSortMode = (_lifeExpSortMode === 'date-desc') ? 'date-asc' : 'date-desc';
    var btn = document.getElementById('lifeExpSortBtn');
    if (btn) {
        if (_lifeExpSortMode === 'date-desc') {
            btn.innerHTML = '<i class="fa-solid fa-arrow-down-short-wide"></i>';
            btn.title = '切換排序 (新到舊)';
        } else {
            btn.innerHTML = '<i class="fa-solid fa-arrow-up-wide-short"></i>';
            btn.title = '切換排序 (舊到新)';
        }
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

function changeLifeExpPage(delta) {
    _lifeExpCurrentPage += delta;
    renderLifeExpenseList();
}
function renderBudgetCards() {
    var container = document.getElementById('budgetCards');
    if (!container) return;
    container.innerHTML = '';

    var totalSpent = getLifeOnlyExpForMonth(lifeCurrentMonth);

    // "全部" row
    var allRow = document.createElement('div');
    allRow.className = 'life-cat-row' + (_lifeSelectedCatId === null ? ' active' : '');
    allRow.onclick = function () { clearLifeFilter(); };
    allRow.innerHTML =
        '<div class="life-cat-row-left">' +
        '<span class="life-cat-dot" style="background:var(--primary-color)"></span>' +
        '<span class="life-cat-row-name">全部支出</span>' +
        '</div>' +
        '<div class="life-cat-row-right">' +
        '<span class="life-cat-row-amt">NT$ ' + totalSpent.toLocaleString() + '</span>' +
        '<button class="icon-btn life-cat-action" style="visibility:hidden;"><i class="fa-solid fa-plus"></i></button>' +
        '</div>';
    container.appendChild(allRow);

    var sep = document.createElement('div');
    sep.className = 'life-cat-sep';
    container.appendChild(sep);

    lifeCategories.forEach(function (cat) {
        var spent = getLifeSpentByCat(cat.id, lifeCurrentMonth);
        if (spent <= 0) return; // 只顯示有支出的分類

        var budget = getLifeBudget(cat.id, lifeCurrentMonth);
        var isOverBudget = budget > 0 && spent > budget;
        var budgetPct = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;

        var row = document.createElement('div');
        row.className = 'life-cat-row' + (_lifeSelectedCatId === cat.id ? ' active' : '') + (isOverBudget ? ' over-budget-row' : '');
        var catId = cat.id;
        row.onclick = function () { selectLifeCat(catId); };

        var budgetBar = budget > 0
            ? '<div class="cat-budget-bar"><div class="cat-budget-fill' + (isOverBudget ? ' over' : '') + '" style="width:' + budgetPct + '%"></div></div>'
            : '';
        var overIcon = isOverBudget ? '<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger-color);font-size:0.75rem;margin-left:4px;" title="已超出預算"></i>' : '';

        row.innerHTML =
            '<div class="life-cat-row-left">' +
            '<span class="life-cat-dot" style="background:' + cat.color + '"></span>' +
            '<span class="life-cat-row-name">' + cat.name + overIcon + '</span>' +
            '</div>' +
            '<div class="life-cat-row-right">' +
            '<div style="text-align:right">' +
            '<span class="life-cat-row-amt' + (isOverBudget ? ' text-danger' : '') + '">NT$ ' + spent.toLocaleString() + '</span>' +
            (budget > 0 ? '<div class="life-cat-row-budget-hint">/ NT$ ' + budget.toLocaleString() + '</div>' : '') +
            '</div>' +
            '<button class="icon-btn life-cat-action" onclick="event.stopPropagation();openLifeExpModalWithCat(\'' + cat.id + '\')" title="新增支出"><i class="fa-solid fa-plus"></i></button>' +
            '</div>' +
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

    // Use global state variable instead of reading from removed select
    var sortMode = _lifeExpSortMode || 'date-desc';

    var all = lifeExpenses
        .filter(function (e) {
            if (!e.date || !e.date.startsWith(lifeCurrentMonth)) return false;
            if (_lifeSelectedCatId !== null) {
                return e.type !== 'income' && e.categoryId === _lifeSelectedCatId;
            }
            return true;
        })
        .sort(function (a, b) { 
            if (sortMode === 'date-desc') {
                return b.date.localeCompare(a.date) || b.id.localeCompare(a.id); // New to old
            } else {
                return a.date.localeCompare(b.date) || a.id.localeCompare(b.id); // Old to new
            }
        });

    if (all.length === 0) {
        container.innerHTML =
            '<div class="empty-state">' +
            '<span class="empty-icon"><i class="fa-regular fa-face-smile-beam"></i></span>' +
            '<strong>本月尚無記錄</strong>' +
            '<p>點擊「支出」按鈕開始記帳</p>' +
            '</div>';
        return;
    }

    container.innerHTML = all.map(function (e) {
        var day = parseInt(e.date.split('-')[2]);
        var editBtn = '<button class="icon-btn" onclick="editLifeExp(\'' + e.id + '\')" title="編輯"><i class="fa-solid fa-pen"></i></button>';
        var delBtn = '<button class="icon-btn delete" onclick="deleteLifeExp(\'' + e.id + '\')" title="刪除"><i class="fa-solid fa-trash"></i></button>';

        if (e.type === 'income') {
            var incCat = getLifeIncCat(e.categoryId);
            var rawNote = e.note ? e.note : incCat.name;
            var note = rawNote.replace(/[（\(\[].*?[）\)\]]/g, '').trim();
            if (note === '') note = incCat.name;
            return '<div class="life-income-row">' +
                '<div class="life-income-date" style="color:' + incCat.color + ';">' + day + '</div>' +
                '<div class="life-income-arrow" style="background:' + incCat.color + ';"></div>' +
                '<div class="life-income-info">' +
                '<div class="life-income-src">' + incCat.name + '</div>' +
                '<div class="life-income-note">' + note + '</div>' +
                '</div>' +
                '<div class="life-income-amount">+ NT$ ' + formatAmount(e.amount, 'income') + '</div>' +
                editBtn + delBtn +
                '</div>';
        } else {
            var cat = getLifeCat(e.categoryId);
            var nodeNote = e.note ? e.note : cat.name;
            return '<div class="life-exp-row">' +
                '<div class="life-exp-date">' + day + '</div>' +
                '<div class="life-exp-dot" style="background:' + cat.color + '"></div>' +
                '<div class="life-exp-info">' +
                '<div class="life-exp-cat">' + cat.name + '</div>' +
                '<div class="life-exp-note">' + nodeNote + '</div>' +
                '</div>' +
                '<div class="life-exp-amount" style="color: var(--danger-color);">- NT$ ' + e.amount.toLocaleString() + '</div>' +
                editBtn + delBtn +
                '</div>';
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

    if (type === 'income') {
        expBtn.className = 'type-btn';
        incBtn.className = 'type-btn active income-mode';
        if (catGroup) catGroup.style.display = 'none';
        if (incCatGroup) incCatGroup.style.display = '';
        if (submitBtn) submitBtn.textContent = '儲存收入';
        document.getElementById('lifeExpModalTitle').textContent = '新增收入';
    } else {
        expBtn.className = 'type-btn active';
        incBtn.className = 'type-btn';
        if (catGroup) catGroup.style.display = '';
        if (incCatGroup) incCatGroup.style.display = 'none';
        if (submitBtn) submitBtn.textContent = '儲存支出';
        document.getElementById('lifeExpModalTitle').textContent = '新增支出';
    }
}

function openLifeExpModal(typeOrPreset) {
    var _lifeExpModal2 = document.getElementById('lifeExpModalOverlay');
    var type = 'expense';
    var presetCatId = null;
    if (typeOrPreset === 'income') { type = 'income'; }
    else if (typeOrPreset && typeOrPreset !== 'expense') { presetCatId = typeOrPreset; }

    var sel = document.getElementById('lifeExpCat');
    if (sel) {
        sel.innerHTML = lifeCategories.map(function (c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');
        if (type === 'expense' && presetCatId) sel.value = presetCatId;
    }

    var incSel = document.getElementById('lifeExpIncCat');
    if (incSel) {
        incSel.innerHTML = lifeIncomeCategories.map(function (c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');
        if (type === 'income' && presetCatId) incSel.value = presetCatId;
    }

    document.getElementById('lifeExpId').value = '';
    document.getElementById('lifeExpAmount').value = '';
    document.getElementById('lifeExpDate').value = lifeCurrentMonth + '-' + String(new Date().getDate()).padStart(2, '0');
    document.getElementById('lifeExpNote').value = '';

    lifeCalcReset();
    setLifeExpType(type);
    if (_lifeExpModal2) _lifeExpModal2.classList.add('active');
    document.body.classList.add('modal-open');
}
function openLifeExpModalWithCat(catId) { openLifeExpModal(catId); }
function closeLifeExpModal() {
    closeCalcPopup();
    var _lifeExpModal = document.getElementById('lifeExpModalOverlay');
    if (_lifeExpModal) _lifeExpModal.classList.remove('active');
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
    // Sync the amount display in the parent modal
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
    var amountInput = document.getElementById('lifeExpAmount');
    var amount = parseInt(amountInput.value);
    var date = document.getElementById('lifeExpDate').value;
    var note = document.getElementById('lifeExpNote').value.trim();

    if (!amount || amount <= 0 || !date) {
        const modal = document.querySelector('#lifeExpModalOverlay .modal');
        if (modal) {
            modal.classList.remove('shake');
            void modal.offsetWidth; // trigger reflow
            modal.classList.add('shake');
        }
        showToast('請輸入有效金額與日期');
        return;
    }

    var entry;
    if (type === 'income') {
        var incCatId = document.getElementById('lifeExpIncCat').value;
        // Smart Date Adjustment: if it's a weekend, adjust to previous Friday
        var originalDate = new Date(date);
        var dayOfWeek = originalDate.getDay();
        var adjustedDate = date;
        if (dayOfWeek === 0) { // Sun
            originalDate.setDate(originalDate.getDate() - 2);
            adjustedDate = originalDate.toISOString().split('T')[0];
            showToast('已口動調整週末發薪日至週五');
        } else if (dayOfWeek === 6) { // Sat
            originalDate.setDate(originalDate.getDate() - 1);
            adjustedDate = originalDate.toISOString().split('T')[0];
            showToast('已自動調整週末發薪日至週五');
        }
        entry = { id: id || crypto.randomUUID(), type: 'income', categoryId: incCatId, amount: amount, date: adjustedDate, note: note };
    } else {
        var catId = document.getElementById('lifeExpCat').value;
        entry = { id: id || crypto.randomUUID(), type: 'expense', categoryId: catId, amount: amount, date: date, note: note };
    }

    if (id) {
        var idx = lifeExpenses.findIndex(function (ex) { return ex.id === id; });
        if (idx !== -1) lifeExpenses[idx] = entry;
        showToast('已更新');
    } else {
        lifeExpenses.push(entry);
        showToast(type === 'income' ? '收入已記錄' : '支出已新增');
    }
    saveLifeData();
    closeLifeExpModal();
    renderLifeTab();
}

function deleteLifeExp(id) {
    if (confirm('確定刪除這筆紀錄？')) {
        lifeExpenses = lifeExpenses.filter(function (e) { return e.id !== id; });
        saveLifeData();
        showToast('已刪除');
        renderLifeTab();
    }
}

function editLifeExp(id) {
    var e = lifeExpenses.find(function (x) { return x.id === id; });
    if (!e) return;

    // Open the modal fresh, then fill in existing values
    openLifeExpModal(e.type === 'income' ? 'income' : 'expense');

    // Restore the hidden id so submit knows it's an update
    document.getElementById('lifeExpId').value = e.id;

    // Fill amount into calculator display
    lifeCalcDisplaySet(e.amount);
    document.getElementById('lifeExpDate').value = e.date;
    document.getElementById('lifeExpNote').value = e.note || '';

    // Set the correct category
    if (e.type === 'income') {
        var incSel = document.getElementById('lifeExpIncCat');
        if (incSel) incSel.value = e.categoryId;
        document.getElementById('lifeExpModalTitle').textContent = '編輯收入';
    } else {
        var catSel = document.getElementById('lifeExpCat');
        if (catSel) catSel.value = e.categoryId;
        document.getElementById('lifeExpModalTitle').textContent = '編輯支出';
    }
}

function openBudgetModal(catId) {
    var cat = getLifeCat(catId);
    var lbl = document.getElementById('budgetModalCatLabel');
    var cid = document.getElementById('budgetModalCatId');
    var amt = document.getElementById('budgetAmtInput');
    var _budgetModal = document.getElementById('budgetModalOverlay');
    if (!lbl || !cid || !amt) return;
    lbl.textContent = '「' + cat.name + '」' + lifeMonthLabel(lifeCurrentMonth) + ' 預算';
    cid.value = catId;
    var cur = getLifeBudget(catId, lifeCurrentMonth);
    amt.value = cur > 0 ? cur : '';
    if (_budgetModal) _budgetModal.classList.add('active');
}
function closeBudgetModal() {
    var _budgetModal = document.getElementById('budgetModalOverlay');
    if (_budgetModal) _budgetModal.classList.remove('active');
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

// ──  生活費分類動態管理 ──
function setCatManageType(type) {
    _currentCatManageType = type;
    var expBtn = document.getElementById('catTypeExpBtn');
    if (expBtn) expBtn.className = type === 'expense' ? 'type-btn active' : 'type-btn';
    var incBtn = document.getElementById('catTypeIncBtn');
    if (incBtn) incBtn.className = type === 'income' ? 'type-btn active income-mode' : 'type-btn';
    renderLifeCatList();
    document.getElementById('editLifeCatId').value = '';
    document.getElementById('newLifeCatName').value = '';
    document.getElementById('newLifeCatColor').value = type === 'expense' ? '#C17B2E' : '#5A9E7A';
    var cancelBtn = document.getElementById('cancelLifeCatBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

function openLifeCatModal(type) {
    setCatManageType(type || 'expense');
    var _lifeCatModal = document.getElementById('lifeCatModalOverlay');
    if (_lifeCatModal) _lifeCatModal.classList.add('active');
}

function closeLifeCatModal() {
    var _lifeCatModal = document.getElementById('lifeCatModalOverlay');
    if (_lifeCatModal) _lifeCatModal.classList.remove('active');

    var sel = document.getElementById('lifeExpCat');
    if (sel) {
        var pre = sel.value;
        sel.innerHTML = lifeCategories.map(function (c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');
        if (pre) sel.value = pre;
    }

    var incSel = document.getElementById('lifeExpIncCat');
    if (incSel) {
        var preInc = incSel.value;
        incSel.innerHTML = lifeIncomeCategories.map(function (c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');
        if (preInc) incSel.value = preInc;
    }

    renderLifeTab();
}

function renderLifeCatList() {
    var container = document.getElementById('lifeCategoryList');
    if (!container) return;

    var targetCats = _currentCatManageType === 'income' ? lifeIncomeCategories : lifeCategories;

    if (targetCats.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>尚無分類，請新增</p></div>';
        return;
    }

    container.innerHTML = targetCats.map(function (cat) {
        return '<div class="category-item" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
            '<span style="width:14px;height:14px;border-radius:50%;background:' + cat.color + ';flex-shrink:0;display:inline-block;"></span>' +
            '<span style="flex:1;font-weight:500;">' + cat.name + '</span>' +
            '<button class="icon-btn" onclick="editLifeCategory(\'' + cat.id + '\')" title="編輯"><i class="fa-solid fa-pen"></i></button>' +
            '<button class="icon-btn delete" onclick="deleteLifeCategory(\'' + cat.id + '\')" title="刪除"><i class="fa-solid fa-trash"></i></button>' +
            '</div>';
    }).join('');
}

function saveLifeCategory() {
    var id = document.getElementById('editLifeCatId').value;
    var name = document.getElementById('newLifeCatName').value.trim();
    var color = document.getElementById('newLifeCatColor').value;

    if (!name) { showToast('請輸入分類名稱'); return; }

    var targetCats = _currentCatManageType === 'income' ? lifeIncomeCategories : lifeCategories;

    if (id) {
        var idx = targetCats.findIndex(function (c) { return c.id === id; });
        if (idx !== -1) { targetCats[idx].name = name; targetCats[idx].color = color; }
    } else {
        var prefix = _currentCatManageType === 'income' ? 'lc_inc_' : 'lc_';
        targetCats.push({ id: prefix + Date.now(), name: name, color: color });
    }

    saveLifeData();
    document.getElementById('editLifeCatId').value = '';
    document.getElementById('newLifeCatName').value = '';
    document.getElementById('newLifeCatColor').value = _currentCatManageType === 'expense' ? '#C17B2E' : '#5A9E7A';
    var cancelBtn = document.getElementById('cancelLifeCatBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    renderLifeCatList();
    showToast(id ? '分類已更新' : '分類已新增');
}

function editLifeCategory(id) {
    var targetCats = _currentCatManageType === 'income' ? lifeIncomeCategories : lifeCategories;
    var cat = targetCats.find(function (c) { return c.id === id; });
    if (!cat) return;
    document.getElementById('editLifeCatId').value = id;
    document.getElementById('newLifeCatName').value = cat.name;
    document.getElementById('newLifeCatColor').value = cat.color;
    var cancelBtn = document.getElementById('cancelLifeCatBtn');
    if (cancelBtn) cancelBtn.style.display = '';
    document.getElementById('newLifeCatName').focus();
}

function cancelLifeCatEdit() {
    document.getElementById('editLifeCatId').value = '';
    document.getElementById('newLifeCatName').value = '';
    document.getElementById('newLifeCatColor').value = _currentCatManageType === 'expense' ? '#C17B2E' : '#5A9E7A';
    var cancelBtn = document.getElementById('cancelLifeCatBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

function deleteLifeCategory(id) {
    var targetCats = _currentCatManageType === 'income' ? lifeIncomeCategories : lifeCategories;
    var cat = targetCats.find(function (c) { return c.id === id; });
    if (!cat) return;
    var hasExpenses = lifeExpenses.some(function (e) { return e.categoryId === id; });
    var msg = hasExpenses
        ? '「' + cat.name + '」底下有記錄，刪除分類後記錄仍保留但不會顯示正確名稱，確定刪除？'
        : '刪除分類「' + cat.name + '」？';
    if (confirm(msg)) {
        if (_currentCatManageType === 'income') {
            lifeIncomeCategories = lifeIncomeCategories.filter(function (c) { return c.id !== id; });
        } else {
            lifeCategories = lifeCategories.filter(function (c) { return c.id !== id; });
        }
        saveLifeData();
        renderLifeCatList();
        showToast('分類已刪除');
    }
}

// ── 預設薪資功能 ──

function getDefaultSalary() {
    var raw = localStorage.getItem(SALARY_DEFAULT_KEY);
    return raw ? JSON.parse(raw) : null;
}

function updateSalaryApplyBtn() {
    var wrap = document.getElementById('salaryApplyWrap');
    if (!wrap) return;
    var setting = getDefaultSalary();
    if (!setting) { wrap.style.display = 'none'; return; }
    // Only show button if this month has no income from this salary cat yet
    var alreadyApplied = lifeExpenses.some(function (e) {
        return e.type === 'income' &&
            e.categoryId === setting.catId &&
            e.date && e.date.startsWith(lifeCurrentMonth) &&
            e._salaryDefault === true;
    });
    wrap.style.display = alreadyApplied ? 'none' : '';
}

function applyDefaultSalary() {
    var setting = getDefaultSalary();
    if (!setting) { showToast('請先設定預設薪資'); return; }

    var parts = lifeCurrentMonth.split('-');
    var year = parseInt(parts[0]);
    var month = parseInt(parts[1]);

    // Clamp day to last day of month (e.g. 31 in Feb → 28/29)
    var maxDay = new Date(year, month, 0).getDate();
    var targetDay = Math.min(parseInt(setting.day || 5), maxDay);

    // Check for weekend and adjust to preceding Friday
    var salaryDate = new Date(year, month - 1, targetDay);
    var dow = salaryDate.getDay(); // 0=Sun, 6=Sat
    var adjusted = false;
    if (dow === 6) { salaryDate.setDate(salaryDate.getDate() - 1); adjusted = true; } // Sat → Fri
    if (dow === 0) { salaryDate.setDate(salaryDate.getDate() - 2); adjusted = true; } // Sun → Fri

    var dateStr = salaryDate.getFullYear() + '-' +
        String(salaryDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(salaryDate.getDate()).padStart(2, '0');

    var dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    var toastMsg = '薪資已套用 NT$ ' + setting.amount.toLocaleString();
    if (adjusted) toastMsg += '（調整至 ' + salaryDate.getDate() + ' 日，週' + dayNames[salaryDate.getDay()] + '）';

    var entry = {
        id: crypto.randomUUID(),
        type: 'income',
        categoryId: setting.catId,
        amount: setting.amount,
        date: dateStr,
        note: setting.note || '薪資（預設帶入）',
        _salaryDefault: true
    };
    lifeExpenses.push(entry);
    saveLifeData();
    renderLifeTab();
    showToast(toastMsg);
}


function openSalarySettingModal() {
    var sel = document.getElementById('salaryDefaultCatSelect');
    if (sel) {
        sel.innerHTML = lifeIncomeCategories.map(function (c) {
            return '<option value="' + c.id + '">' + c.name + '</option>';
        }).join('');
    }
    var setting = getDefaultSalary();
    if (setting) {
        var amtEl = document.getElementById('salaryDefaultAmtInput');
        var dayEl = document.getElementById('salaryDefaultDay');
        if (amtEl) amtEl.value = setting.amount;
        if (sel) sel.value = setting.catId;
        if (dayEl) dayEl.value = setting.day || 5;
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
    var setting = { amount: amt, catId: catId, day: day, note: '薪資' };
    localStorage.setItem(SALARY_DEFAULT_KEY, JSON.stringify(setting));
    closeSalarySettingModal();
    updateSalaryApplyBtn();
    showToast('預設薪資已儲存');
}

function clearDefaultSalary() {
    if (!confirm('確定清除預設薪資設定？')) return;
    localStorage.removeItem(SALARY_DEFAULT_KEY);
    closeSalarySettingModal();
    updateSalaryApplyBtn();
    showToast('預設薪資已清除');
}

function getAdjustedPaydate(ym, payday) {
    var parts = ym.split('-');
    var year = parseInt(parts[0]);
    var month = parseInt(parts[1]);

    // Target date
    var d = new Date(year, month - 1, payday);

    // If payday is e.g. 31 but month has 30, it wraps. Cap it at month end.
    var monthEnd = new Date(year, month, 0).getDate();
    if (payday > monthEnd) d = new Date(year, month - 1, monthEnd);

    var dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
    if (dayOfWeek === 0) { // Sunday -> Friday
        d.setDate(d.getDate() - 2);
    } else if (dayOfWeek === 6) { // Saturday -> Friday
        d.setDate(d.getDate() - 1);
    }

    return d.toISOString().split('T')[0];
}

function autoApplySalary(ym) {
    // Only auto-apply for the current month — not past months
    var today = new Date().toISOString().slice(0, 7);
    if (ym < today) return;

    var setting = getDefaultSalary();
    if (!setting) return;

    // Check if a salary stub was already auto-applied for this month
    var alreadyApplied = lifeExpenses.some(function (e) {
        return e.type === 'income' &&
            e.date && e.date.startsWith(ym) &&
            (e._autoSalary === true || e._salaryDefault === true);
    });
    if (alreadyApplied) return;

    // Also skip if the user has manually recorded any income this month
    var existingIncome = getLifeIncomeForMonth(ym);
    if (existingIncome > 0) return;

    // Calculate correct date
    var dateStr = getAdjustedPaydate(ym, setting.day || 5);

    var salaryNote = (setting.note || '薪資').replace(/[（\(\[].*?([預設|自動]|[帶入|入帳]).*?[）\)\]]/g, '').trim();
    if (salaryNote === '') salaryNote = '薪資';

    var newExp = {
        id: crypto.randomUUID(),
        type: 'income',
        categoryId: setting.catId,
        amount: setting.amount,
        date: dateStr,
        note: salaryNote,
        _autoSalary: true
    };

    lifeExpenses.push(newExp);
    saveLifeData();
    if (typeof triggerCloudSync === 'function') triggerCloudSync();
}

// ── Full Numpad Calculator (Life Expense Modal) ──
var _calcCurrent = '0';      // current display string
var _calcFirstNum = null;    // stored first operand (number)
var _calcOp = null;          // pending operator symbol
var _calcFreshEntry = false; // next digit starts a new number

/** Update the display element + sync hidden amount field */
function _lifeCalcRefresh() {
    var disp = document.getElementById('lifeCalcDisplay');
    if (disp) disp.textContent = parseFloat(_calcCurrent).toLocaleString('zh-TW') || _calcCurrent;
    // Sync the hidden #lifeExpAmount so form submit always reads correct value
    var hidden = document.getElementById('lifeExpAmount');
    if (hidden) hidden.value = parseFloat(_calcCurrent) || '';
}

/** Reset entire calculator to zero state */
function lifeCalcReset() {
    _calcCurrent = '0';
    _calcFirstNum = null;
    _calcOp = null;
    _calcFreshEntry = false;
    var exprEl = document.getElementById('lifeCalcExpr');
    if (exprEl) exprEl.textContent = '';
    _lifeCalcRefresh();
}

/** Set display to a specific value (used when editing an entry) */
function lifeCalcDisplaySet(val) {
    _calcCurrent = String(val || 0);
    _calcFirstNum = null;
    _calcOp = null;
    _calcFreshEntry = false;
    var exprEl = document.getElementById('lifeCalcExpr');
    if (exprEl) exprEl.textContent = '';
    _lifeCalcRefresh();
}

/** Digit / decimal button pressed */
function lifeCalcDigit(d) {
    if (_calcFreshEntry) {
        _calcCurrent = (d === '.') ? '0.' : d;
        _calcFreshEntry = false;
    } else {
        if (d === '.' && _calcCurrent.includes('.')) return; // already has decimal
        if (_calcCurrent === '0' && d !== '.') {
            _calcCurrent = d; // replace leading zero
        } else {
            if (_calcCurrent.replace('-', '').replace('.', '').length >= 12) return; // max digits
            _calcCurrent += d;
        }
    }
    _lifeCalcRefresh();
}

/** Operator button (+, −, ×, ÷) pressed */
function lifeCalcOp(op) {
    var cur = parseFloat(_calcCurrent);
    if (isNaN(cur)) return;

    // Chain: if pending op, evaluate first
    if (_calcOp !== null && _calcFirstNum !== null && !_calcFreshEntry) {
        var res = _lifeCalcCompute(_calcFirstNum, cur, _calcOp);
        if (res === null) { lifeCalcReset(); return; }
        cur = res;
        _calcCurrent = String(Math.round(cur * 100) / 100);
    }

    _calcFirstNum = cur;
    _calcOp = op;
    _calcFreshEntry = true;

    var exprEl = document.getElementById('lifeCalcExpr');
    if (exprEl) exprEl.textContent = parseFloat(_calcCurrent).toLocaleString('zh-TW') + ' ' + op;
    _lifeCalcRefresh();
    // Highlight active op button
    document.querySelectorAll('.cpb-op').forEach(function (b) {
        b.classList.toggle('cpb-op-active', b.textContent.trim() === op);
    });
}

/** Equals button */
function lifeCalcEqual() {
    if (_calcOp === null || _calcFirstNum === null) return;
    var second = parseFloat(_calcCurrent);
    if (isNaN(second)) return;

    var result = _lifeCalcCompute(_calcFirstNum, second, _calcOp);
    if (result === null) { lifeCalcReset(); return; }

    var exprEl = document.getElementById('lifeCalcExpr');
    if (exprEl) exprEl.textContent =
        _calcFirstNum.toLocaleString('zh-TW') + ' ' + _calcOp + ' ' +
        second.toLocaleString('zh-TW') + ' =';

    _calcCurrent = String(Math.round(result * 100) / 100);
    _calcFirstNum = null;
    _calcOp = null;
    _calcFreshEntry = false;
    // Clear op highlight
    document.querySelectorAll('.cpb-op').forEach(function (b) { b.classList.remove('cpb-op-active'); });
    _lifeCalcRefresh();
}

/** Backspace */
function lifeCalcBack() {
    if (_calcFreshEntry) { return; }
    if (_calcCurrent.length <= 1 || (_calcCurrent.length === 2 && _calcCurrent[0] === '-')) {
        _calcCurrent = '0';
    } else {
        _calcCurrent = _calcCurrent.slice(0, -1);
        if (_calcCurrent === '-') _calcCurrent = '0';
    }
    _lifeCalcRefresh();
}

/** Toggle sign */
function lifeCalcToggleSign() {
    var v = parseFloat(_calcCurrent);
    if (isNaN(v) || v === 0) return;
    _calcCurrent = String(-v);
    _lifeCalcRefresh();
}

/** Clear (C) */
function lifeCalcClear() {
    lifeCalcReset();
}

/** Internal compute */
function _lifeCalcCompute(a, b, op) {
    switch (op) {
        case '+': return a + b;
        case '−': return a - b;
        case '×': return a * b;
        case '÷': return b === 0 ? null : a / b;
    }
    return null;
}

// Old compat stub (lifeCalcSyncFromInput was used by old oninput — no-op now)
function lifeCalcSyncFromInput() { }

// ── 常態支出功能 (Daily Expenses) ──
function getDailyExpenses() {
    var raw = localStorage.getItem(DAILY_EXP_DEFAULT_KEY);
    return raw ? JSON.parse(raw) : [];
}

function saveDailyExpenses(data) {
    localStorage.setItem(DAILY_EXP_DEFAULT_KEY, JSON.stringify(data));
    if (typeof triggerCloudSync === 'function') triggerCloudSync();
}

function openDailyExpModal() {
    var sel = document.getElementById('dailyExpCat');
    if (sel) {
        sel.innerHTML = lifeCategories.map(function (c) {
            return '<option value="' + c.id + '">' + c.name + '</option>';
        }).join('');
    }
    document.getElementById('dailyExpId').value = '';
    document.getElementById('dailyExpName').value = '';
    document.getElementById('dailyExpAmount').value = '';
    document.getElementById('dailyExpFreq').value = 'everyday';
    document.getElementById('dailyExpCancelBtn').style.display = 'none';
    
    renderDailyExpList();
    
    var overlay = document.getElementById('dailyExpModalOverlay');
    if (overlay) overlay.classList.add('active');
}

function closeDailyExpModal() {
    var overlay = document.getElementById('dailyExpModalOverlay');
    if (overlay) overlay.classList.remove('active');
}

function cancelDailyExpEdit() {
    document.getElementById('dailyExpId').value = '';
    document.getElementById('dailyExpName').value = '';
    document.getElementById('dailyExpAmount').value = '';
    document.getElementById('dailyExpFreq').value = 'everyday';
    document.getElementById('dailyExpCancelBtn').style.display = 'none';
}

function renderDailyExpList() {
    var list = getDailyExpenses();
    var container = document.getElementById('dailyExpList');
    if (!container) return;
    
    if (list.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.9rem;">尚未設定常態支出</div>';
        return;
    }
    
    container.innerHTML = list.map(function(item) {
        var cat = getLifeCat(item.catId);
        var freqText = item.freq === 'weekdays' ? '平日' : (item.freq === 'weekends' ? '假日' : '每天');
        return '<div class="expense-list-row" style="margin-bottom:8px;">' +
            '<div class="expense-list-info">' +
            '<div class="expense-list-color" style="background:' + (cat ? cat.color : '#ccc') + '"></div>' +
            '<div>' +
            '<div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">' + item.name + ' <span style="font-size:0.75rem; background:var(--border-color); padding:2px 6px; border-radius:4px; font-weight:normal; margin-left:4px;">' + freqText + '</span></div>' +
            '<div style="font-size:0.75rem; color:var(--text-muted);">' + (cat ? cat.name : '未知分類') + '</div>' +
            '</div></div>' +
            '<div style="display:flex; align-items:center; gap:12px;">' +
            '<div class="expense-list-amount">NT$ ' + item.amount.toLocaleString() + '</div>' +
            '<div style="display:flex; gap:4px;">' +
            '<button class="icon-btn" onclick="editDailyExp(\'' + item.id + '\')" title="編輯"><i class="fa-solid fa-pen"></i></button>' +
            '<button class="icon-btn delete" onclick="deleteDailyExp(\'' + item.id + '\')" title="刪除"><i class="fa-solid fa-trash"></i></button>' +
            '</div></div></div>';
    }).join('');
}

function handleDailyExpSubmit(e) {
    e.preventDefault();
    var id = document.getElementById('dailyExpId').value;
    var name = document.getElementById('dailyExpName').value.trim();
    var catId = document.getElementById('dailyExpCat').value;
    var amount = parseInt(document.getElementById('dailyExpAmount').value);
    var freq = document.getElementById('dailyExpFreq').value;
    
    if (!name || !amount || amount <= 0) {
        showToast('請輸入有效名稱與金額');
        return;
    }
    
    var list = getDailyExpenses();
    if (id) {
        var idx = list.findIndex(function(x) { return x.id === id; });
        if (idx !== -1) {
            list[idx] = { id: id, name: name, catId: catId, amount: amount, freq: freq };
        }
        showToast('常態支出已更新');
    } else {
        list.push({ id: crypto.randomUUID(), name: name, catId: catId, amount: amount, freq: freq });
        showToast('常態支出已新增');
    }
    
    saveDailyExpenses(list);
    cancelDailyExpEdit();
    renderDailyExpList();
    
    // Auto apply immediately for the current month up to today
    autoApplyDailyExpenses(lifeCurrentMonth);
    renderLifeTab();
}

function deleteDailyExp(id) {
    if (!confirm('確定刪除此常態支出？(已產生的明細不會被刪除)')) return;
    var list = getDailyExpenses();
    list = list.filter(function(x) { return x.id !== id; });
    saveDailyExpenses(list);
    renderDailyExpList();
    showToast('常態支出已刪除');
}

function editDailyExp(id) {
    var list = getDailyExpenses();
    var item = list.find(function(x) { return x.id === id; });
    if (!item) return;
    
    document.getElementById('dailyExpId').value = item.id;
    document.getElementById('dailyExpName').value = item.name;
    document.getElementById('dailyExpCat').value = item.catId;
    document.getElementById('dailyExpAmount').value = item.amount;
    document.getElementById('dailyExpFreq').value = item.freq || 'everyday';
    document.getElementById('dailyExpCancelBtn').style.display = 'inline-flex';
}

function autoApplyDailyExpenses(ym) {
    var list = getDailyExpenses();
    if (!list || list.length === 0) return;
    
    // Only process for the current viewing month if it's past or present
    var today = new Date();
    var currentViewDate = new Date(ym + '-01');
    
    var year = currentViewDate.getFullYear();
    var month = currentViewDate.getMonth();
    
    var maxDate = new Date(year, month + 1, 0).getDate(); // last day of month
    
    // If viewing current month, only apply up to today
    if (year === today.getFullYear() && month === today.getMonth()) {
        maxDate = today.getDate();
    } else if (currentViewDate > today) {
        // Future month, don't apply
        return;
    }
    
    var changed = false;
    
    // For each rule, check each day
    list.forEach(function(rule) {
        for (var d = 1; d <= maxDate; d++) {
            var targetDate = new Date(year, month, d);
            var dow = targetDate.getDay(); // 0=Sun, 6=Sat
            
            // Check frequency
            if (rule.freq === 'weekdays' && (dow === 0 || dow === 6)) continue;
            if (rule.freq === 'weekends' && (dow !== 0 && dow !== 6)) continue;
            
            var dateStr = targetDate.toISOString().split('T')[0];
            
            // Check if already applied (we use _autoDailyId to track)
            var alreadyApplied = lifeExpenses.some(function (e) {
                return e._autoDailyId === rule.id && e.date === dateStr;
            });
            
            if (!alreadyApplied) {
                lifeExpenses.push({
                    id: crypto.randomUUID(),
                    type: 'expense',
                    categoryId: rule.catId,
                    amount: rule.amount,
                    date: dateStr,
                    note: rule.name,
                    _autoDailyId: rule.id // Track so we don't duplicate
                });
                changed = true;
            }
        }
    });
    
    if (changed) {
        saveLifeData();
    }
}

function forceApplyDailyExpenses() {
    autoApplyDailyExpenses(lifeCurrentMonth);
    renderLifeTab();
    closeDailyExpModal();
    showToast('已檢查並套用本月常態支出');
}
