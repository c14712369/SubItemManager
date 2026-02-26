// ====== js/data.js ======
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    items = stored ? JSON.parse(stored) : [];

    const storedCats = localStorage.getItem(CAT_KEY);
    categories = storedCats ? JSON.parse(storedCats) : DEFAULT_CATS;

    let migrated = false;
    items.forEach(item => {
        if (!item.categoryId && item.type) {
            if (item.type === 'subscription') item.categoryId = 'cat_ent';
            else if (item.type === 'insurance') item.categoryId = 'cat_ins';
            else item.categoryId = 'cat_other';
            migrated = true;
        }
        if (!item.currency) {
            item.currency = 'TWD';
            item.originalAmount = item.amount;
            item.exchangeRate = 1;
        }
    });
    if (migrated) saveData();
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(CAT_KEY, JSON.stringify(categories));
    render();
}

function loadLifeData() {
    var stored = localStorage.getItem(LIFE_EXP_KEY);
    lifeExpenses = stored ? JSON.parse(stored) : [];

    var storedCats = localStorage.getItem(LIFE_CAT_KEY);
    lifeCategories = storedCats ? JSON.parse(storedCats) : DEFAULT_LIFE_CATS.map(function (c) { return Object.assign({}, c); });

    var storedIncCats = localStorage.getItem(LIFE_INC_CAT_KEY);
    lifeIncomeCategories = storedIncCats ? JSON.parse(storedIncCats) : DEFAULT_LIFE_INC_CATS.map(function (c) { return Object.assign({}, c); });

    var storedBdg = localStorage.getItem(LIFE_BDG_KEY);
    lifeBudgets = storedBdg ? JSON.parse(storedBdg) : {};
}

function saveLifeData() {
    localStorage.setItem(LIFE_EXP_KEY, JSON.stringify(lifeExpenses));
    localStorage.setItem(LIFE_CAT_KEY, JSON.stringify(lifeCategories));
    localStorage.setItem(LIFE_INC_CAT_KEY, JSON.stringify(lifeIncomeCategories));
    localStorage.setItem(LIFE_BDG_KEY, JSON.stringify(lifeBudgets));
}

function exportData() {
    var storedIncome = localStorage.getItem(INCOME_KEY); // optionally export this

    // Force save wealth params right now, just in case debounce hasn't fired
    if (document.getElementById('wealthTargetInput')) {
        localStorage.setItem(WEALTH_PARAMS_KEY, JSON.stringify({
            invCurrent: document.getElementById('wealthInvestCurrentInput').value,
            invMonthly: document.getElementById('wealthInvestMonthlyInput').value,
            invRate: document.getElementById('wealthInvestRateInput').value,
            cashCurrent: document.getElementById('wealthCashCurrentInput').value,
            cashMonthly: document.getElementById('wealthCashMonthlyInput').value,
            cashRate: document.getElementById('wealthCashRateInput').value,
            target: document.getElementById('wealthTargetInput').value
        }));
    }

    var storedWealth = localStorage.getItem(WEALTH_PARAMS_KEY);
    const dataStr = JSON.stringify({
        items,
        categories,
        lifeExpenses,
        lifeCategories,
        lifeIncomeCategories,
        lifeBudgets,
        projects,
        projectExpenses,
        settings: {
            estimatedIncome: storedIncome,
            wealthParams: storedWealth ? JSON.parse(storedWealth) : null
        }
    }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.items && Array.isArray(data.items)) {
                if (confirm('匯入備份（這將覆蓋現有資料）？')) {
                    items = data.items;
                    categories = data.categories || DEFAULT_CATS;
                    lifeExpenses = data.lifeExpenses || [];
                    lifeCategories = data.lifeCategories || DEFAULT_LIFE_CATS;
                    lifeIncomeCategories = data.lifeIncomeCategories || DEFAULT_LIFE_INC_CATS;
                    lifeBudgets = data.lifeBudgets || {};
                    projects = data.projects || [];
                    projectExpenses = data.projectExpenses || [];
                    if (data.settings) {
                        if (data.settings.estimatedIncome !== undefined) {
                            localStorage.setItem(INCOME_KEY, data.settings.estimatedIncome);
                            var incInput = document.getElementById('monthlyIncomeInput');
                            if (incInput) incInput.value = data.settings.estimatedIncome;
                        }
                        if (data.settings.wealthParams) {
                            localStorage.setItem(WEALTH_PARAMS_KEY, JSON.stringify(data.settings.wealthParams));
                        }
                    }
                    saveData();
                    saveLifeData();
                    showToast('匯入成功');
                    init(); // Auto refresh UI
                    if (typeof initWealthTab === 'function') initWealthTab();
                }
            } else if (Array.isArray(data)) {
                if (confirm('匯入舊版備份？')) {
                    items = data;
                    saveData();
                    showToast('匯入成功');
                    init();
                }
            }
        } catch (err) { console.error(err); showToast('檔案格式錯誤'); }
        input.value = '';
    };
    reader.readAsText(file);
}
