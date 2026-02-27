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

function renderLifeTab() {
    var label = document.getElementById('lifeMonthDisplay');
    if (label) label.textContent = lifeMonthLabel(lifeCurrentMonth);

    var totalIncome = getLifeIncomeForMonth(lifeCurrentMonth);
    var totalExpense = getLifeOnlyExpForMonth(lifeCurrentMonth);
    var remain = totalIncome - totalExpense;
    var isOver = totalExpense > totalIncome && totalIncome > 0;
    var pct = totalIncome > 0 ? Math.min(Math.round((totalExpense / totalIncome) * 100), 100) : 0;
    var rawPct = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

    var incomeEl = document.getElementById('lifeMonthBudget');
    var spentEl = document.getElementById('lifeMonthSpent');
    var remainEl = document.getElementById('lifeMonthRemain');
    var barEl = document.getElementById('lifeOverallProgress');
    var pctEl = document.getElementById('lifeOverallPct');
    var actualEl = document.getElementById('lifeActualIncome');

    if (incomeEl) incomeEl.textContent = 'NT$ ' + totalIncome.toLocaleString();
    if (spentEl) spentEl.textContent = 'NT$ ' + totalExpense.toLocaleString();
    if (remainEl) {
        remainEl.textContent = 'NT$ ' + Math.abs(remain).toLocaleString() + (remain < 0 ? ' (超支)' : '');
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
}

function renderBudgetCards() {
    var container = document.getElementById('budgetCards');
    if (!container) return;
    container.innerHTML = '';
    lifeCategories.forEach(function (cat) {
        var spent = getLifeSpentByCat(cat.id, lifeCurrentMonth);
        var budget = getLifeBudget(cat.id, lifeCurrentMonth);
        var isOver = budget > 0 && spent > budget;
        var pct = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
        var rawPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;

        var card = document.createElement('div');
        card.className = 'budget-card';
        // Add a subtle background color based on the category color
        card.style.backgroundColor = cat.color + '0a'; // 0a is very low alpha (hex)
        card.style.borderLeft = '3px solid ' + cat.color;

        var limitHtml = budget > 0
            ? '<span class="budget-limit">/ NT$ ' + budget.toLocaleString() + '</span>'
            : '';

        var fillClass = 'progress-fill' + (isOver ? ' over-budget' : '');
        var pctClass = 'progress-pct' + (isOver ? ' over-budget' : '');
        var barHtml = budget > 0
            ? '<div class="progress-bar"><div class="' + fillClass + '" style="width:' + pct + '%"></div></div><span class="' + pctClass + '">' + rawPct + '%</span>'
            : '<div class="progress-bar"><div class="progress-fill" style="width:0%; opacity:0.1"></div></div><span class="progress-pct" style="opacity:0.3">—</span>';

        var spentClass = 'budget-spent' + (isOver ? ' over-budget' : '');

        card.innerHTML =
            '<div class="budget-card-header">' +
            '<div class="budget-cat-name">' +
            '<span style="width:8px;height:8px;border-radius:50%;background:' + cat.color + ';display:inline-block;"></span>' +
            cat.name +
            '</div>' +
            '<div class="budget-card-actions">' +
            '<button class="icon-btn" onclick="openLifeExpModalWithCat(\'' + cat.id + '\')" title="新增支出"><i class="fa-solid fa-plus"></i></button>' +
            '<button class="icon-btn" onclick="openBudgetModal(\'' + cat.id + '\')" title="設定預算"><i class="fa-solid fa-sliders"></i></button>' +
            '</div>' +
            '</div>' +
            '<div class="budget-card-info">' +
            '<div style="margin-bottom:8px;"><span class="' + spentClass + '">NT$ ' + spent.toLocaleString() + '</span>' + limitHtml + '</div>' +
            '<div class="progress-bar-wrap" style="gap:8px;">' + barHtml + '</div>' +
            '</div>';

        container.appendChild(card);
    });
}

function renderLifeExpenseList() {
    var container = document.getElementById('lifeExpList');
    if (!container) return;

    var all = lifeExpenses
        .filter(function (e) { return e.date && e.date.startsWith(lifeCurrentMonth); })
        .sort(function (a, b) { return b.date.localeCompare(a.date); });

    if (all.length === 0) {
        container.innerHTML =
            '<div class="empty-state">' +
            '<span class="empty-icon"><i class="fa-regular fa-face-smile-beam"></i></span>' +
            '<strong>本月尚無記錄</strong>' +
            '<p>點擊「收入」或「支出」按鈕開始記帳</p>' +
            '</div>';
        return;
    }

    container.innerHTML = all.map(function (e) {
        var day = parseInt(e.date.split('-')[2]);
        if (e.type === 'income') {
            var incCat = getLifeIncCat(e.categoryId);
            var note = e.note ? e.note : incCat.name;
            var ns = e.note ? '' : ' style="color:var(--text-muted);font-style:italic;"';
            return '<div class="life-income-row">' +
                '<div class="life-income-date" style="color:' + incCat.color + ';">' + day + '</div>' +
                '<div class="life-income-arrow" style="background:' + incCat.color + ';"></div>' +
                '<div class="life-income-info">' +
                '<div class="life-income-src">' + incCat.name + '</div>' +
                '<div class="life-income-note"' + ns + '>' + note + '</div>' +
                '</div>' +
                '<div class="life-income-amount" style="color:' + incCat.color + ';">+ NT$ ' + e.amount.toLocaleString() + '</div>' +
                '<button class="icon-btn delete" onclick="deleteLifeExp(\'' + e.id + '\')" title="刪除"><i class="fa-solid fa-trash"></i></button>' +
                '</div>';
        } else {
            var cat = getLifeCat(e.categoryId);
            var nodeNote = e.note ? e.note : cat.name;
            var nsCat = e.note ? '' : ' style="color:var(--text-muted);font-style:italic;"';
            return '<div class="life-exp-row">' +
                '<div class="life-exp-date">' + day + '</div>' +
                '<div class="life-exp-dot" style="background:' + cat.color + '"></div>' +
                '<div class="life-exp-info">' +
                '<div class="life-exp-cat">' + cat.name + '</div>' +
                '<div class="life-exp-note"' + nsCat + '>' + nodeNote + '</div>' +
                '</div>' +
                '<div class="life-exp-amount">NT$ ' + e.amount.toLocaleString() + '</div>' +
                '<button class="icon-btn delete" onclick="deleteLifeExp(\'' + e.id + '\')" title="刪除"><i class="fa-solid fa-trash"></i></button>' +
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
        entry = { id: id || crypto.randomUUID(), type: 'income', categoryId: incCatId, amount: amount, date: date, note: note };
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
