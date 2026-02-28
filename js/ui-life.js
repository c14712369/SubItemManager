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

    return activeItems.reduce((total, item) => {
        let monthly = item.amount;
        // For fixed one-time items, only count if it specifically falls in this month
        if (item.cycle === 'fixed') {
            const startD = new Date(item.startDate);
            if (startD.getFullYear() === viewYear && (startD.getMonth() + 1) === viewMonth) {
                return total + item.amount;
            }
            return total;
        }

        switch (item.cycle) {
            case 'daily': monthly = item.amount * 30; break;
            case 'weekly': monthly = item.amount * 4.33; break;
            case 'bimonthly': monthly = item.amount / 2; break;
            case 'quarterly': monthly = item.amount / 3; break;
            case 'halfyear': monthly = item.amount / 6; break;
            case 'yearly': monthly = item.amount / 12; break;
        }
        return total + monthly;
    }, 0);
}

function renderLifeTab() {
    // Auto-apply salary if setting exists and no income recorded yet
    // Do this BEFORE calculating totals so the current render picks up the new entry
    autoApplySalary(lifeCurrentMonth);

    var label = document.getElementById('lifeMonthDisplay');
    if (label) label.textContent = lifeMonthLabel(lifeCurrentMonth);

    var totalIncome = getLifeIncomeForMonth(lifeCurrentMonth);
    var totalExpense = getLifeOnlyExpForMonth(lifeCurrentMonth);
    var totalFixed = getMonthlyFixedTotal(lifeCurrentMonth); // Fetch fixed expenses for the specific month

    var remain = totalIncome - totalExpense - totalFixed; // Deduct fixed as well

    // For progress bar: Total outgoing vs income
    var totalOutgoing = totalExpense + totalFixed;
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

    if (incomeEl) incomeEl.textContent = 'NT$ ' + totalIncome.toLocaleString();
    if (fixedEl) fixedEl.textContent = 'NT$ ' + Math.round(totalFixed).toLocaleString();
    if (spentEl) spentEl.textContent = 'NT$ ' + totalExpense.toLocaleString();
    if (remainEl) {
        remainEl.textContent = 'NT$ ' + Math.abs(Math.round(remain)).toLocaleString() + (remain < 0 ? ' (超支)' : '');
        remainEl.className = 'stat-value ' + (remain < 0 ? 'stat-negative' : 'stat-positive');
    }
    if (barEl) {
        barEl.style.width = pct + '%';
        barEl.className = 'progress-fill' + (isOver ? ' over-budget' : '');
    }
    if (pctEl) {
        pctEl.textContent = totalIncome > 0 ? '支出 ' + rawPct + '%' : '—';
        pctEl.className = 'progress-pct' + (isOver ? ' over-budget' : '');
    }
    if (actualEl) actualEl.textContent = 'NT$ ' + totalIncome.toLocaleString();

    renderBudgetCards();
    renderLifeExpenseList();
    updateSalaryApplyBtn();
}

// Track selected category filter
var _lifeSelectedCatId = null;

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

        var row = document.createElement('div');
        row.className = 'life-cat-row' + (_lifeSelectedCatId === cat.id ? ' active' : '');
        var catId = cat.id;
        row.onclick = function () { selectLifeCat(catId); };

        row.innerHTML =
            '<div class="life-cat-row-left">' +
            '<span class="life-cat-dot" style="background:' + cat.color + '"></span>' +
            '<span class="life-cat-row-name">' + cat.name + '</span>' +
            '</div>' +
            '<div class="life-cat-row-right">' +
            '<span class="life-cat-row-amt">NT$ ' + spent.toLocaleString() + '</span>' +
            '<button class="icon-btn life-cat-action" onclick="event.stopPropagation();openLifeExpModalWithCat(\'' + cat.id + '\')" title="新增支出"><i class="fa-solid fa-plus"></i></button>' +
            '</div>';

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

    var all = lifeExpenses
        .filter(function (e) {
            if (!e.date || !e.date.startsWith(lifeCurrentMonth)) return false;
            if (_lifeSelectedCatId !== null) {
                return e.type !== 'income' && e.categoryId === _lifeSelectedCatId;
            }
            return true;
        })
        .sort(function (a, b) { return a.date.localeCompare(b.date); });

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
                '<div class="life-income-amount">+ NT$ ' + e.amount.toLocaleString() + '</div>' +
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

    setLifeExpType(type);
    if (_lifeExpModal2) _lifeExpModal2.classList.add('active');
}
function openLifeExpModalWithCat(catId) { openLifeExpModal(catId); }
function closeLifeExpModal() {
    var _lifeExpModal = document.getElementById('lifeExpModalOverlay');
    if (_lifeExpModal) _lifeExpModal.classList.remove('active');
}

function handleLifeExpSubmit(e) {
    e.preventDefault();
    var id = document.getElementById('lifeExpId').value;
    var type = document.getElementById('lifeExpType').value || 'expense';
    var amount = parseInt(document.getElementById('lifeExpAmount').value);
    var date = document.getElementById('lifeExpDate').value;
    var note = document.getElementById('lifeExpNote').value.trim();
    if (!amount || !date) return;

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

    // Fill amount, date, note
    document.getElementById('lifeExpAmount').value = e.amount;
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
    // Check if we have default salary
    var setting = getDefaultSalary();
    if (!setting) return;

    // Check if any income exists for this month
    var existingIncome = getLifeIncomeForMonth(ym);
    if (existingIncome > 0) return;

    // Calculate correct date
    var dateStr = getAdjustedPaydate(ym, setting.day || 5);

    var salaryNote = (setting.note || '薪資').replace(/[（\(\[].*?([預設|自動]|[帶入|入帳]).*?[）\)\]]/g, '').trim();
    if (salaryNote === '') salaryNote = '薪資';

    // Create new income entry
    var newExp = {
        id: Date.now() + Math.random().toString(36).substr(2, 5),
        type: 'income',
        categoryId: setting.catId,
        amount: setting.amount,
        date: dateStr,
        note: salaryNote
    };

    lifeExpenses.push(newExp);
    saveLifeData();

    // Re-render is no longer needed here because autoApplySalary is now 
    // called as the first step of renderLifeTab().
    if (typeof triggerCloudSync === 'function') triggerCloudSync();
}
