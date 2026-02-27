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

function updateLocalTimestamp() {
    localStorage.setItem('last_local_update', Date.now().toString());
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(CAT_KEY, JSON.stringify(categories));
    updateLocalTimestamp();
    if (typeof triggerCloudSync === 'function') triggerCloudSync();
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
    updateLocalTimestamp();
    if (typeof triggerCloudSync === 'function') triggerCloudSync();
}

