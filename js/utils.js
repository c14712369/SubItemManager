// ====== js/utils.js ======
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = `<i class="fa-solid fa-check"></i> ${msg}`;
    t.className = 'toast show success';
    setTimeout(() => t.className = 'toast', 3000);
}

function getCycleLabel(cycle) {
    return {
        'monthly': '每月', 'quarterly': '每季', 'half-yearly': '每半年', 'yearly': '每年', 'fixed': '單次'
    }[cycle] || cycle;
}

function lifeMonthLabel(ym) {
    var p = ym.split('-').map(Number);
    return p[0] + ' 年 ' + p[1] + ' 月';
}

function getLifeCat(id) {
    return lifeCategories.find(function (c) { return c.id === id; }) || lifeCategories[lifeCategories.length - 1];
}

function getLifeIncCat(id) {
    var c = lifeIncomeCategories.find(function (x) { return x.id === id; });
    return c || { id: 'other', name: '其他', color: '#8A8A8A' };
}
