// ====== js/ui-analysis.js ======
function getMonthlyRate(item) {
    const amt = item.amount;
    switch (item.cycle) {
        case 'monthly': return amt;
        case 'yearly': return amt / 12;
        case 'quarterly': return amt / 3;
        case 'half-yearly': return amt / 6;
        default: return 0;
    }
}
function getYearlyRate(item) {
    const amt = item.amount;
    switch (item.cycle) {
        case 'monthly': return amt * 12;
        case 'yearly': return amt;
        case 'quarterly': return amt * 4;
        case 'half-yearly': return amt * 2;
        default: return 0;
    }
}

function calculateStats() {
    let monthly = 0, yearly = 0;
    const now = new Date();
    // Compare dates based on start of day
    now.setHours(0, 0, 0, 0);
    const currentYearNum = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1; // 1-12 form

    items.forEach(item => {
        const startD = new Date(item.startDate);
        startD.setHours(0, 0, 0, 0);

        // Future start date checking explicitly
        if (startD > now) {
            // For fixed items, check if it's the current month/year exactly
            if (item.cycle === 'fixed') {
                if (startD.getFullYear() === currentYearNum && (startD.getMonth() + 1) === currentMonthNum) {
                    monthly += item.amount;
                }
                if (startD.getFullYear() === currentYearNum) {
                    yearly += item.amount;
                }
            }
            return; // Skip recurring future stuff
        }

        if (item.endDate && new Date(item.endDate) < now) return;

        if (item.cycle !== 'fixed') {
            monthly += getMonthlyRate(item);
            yearly += getYearlyRate(item);
        } else {
            // It's a past/present fixed, if it explicitly matches this month/year it theoretically already happened? 
            // fixed isn't really "recurring". Usually 'fixed' means one time.
        }
    });
    return { monthly, yearly };
}

function updateBudgetCalc() {
    var incomeInput = document.getElementById('monthlyIncomeInput');
    var estimated = parseFloat(incomeInput ? incomeInput.value : 0) || 0;
    localStorage.setItem(INCOME_KEY, estimated);

    var stats = calculateStats();
    var actualIncome = getLifeIncomeForMonth(lifeCurrentMonth);
    var lifeExpense = getLifeOnlyExpForMonth(lifeCurrentMonth);

    // Use actual recorded income if any; else fallback to estimate
    var income = actualIncome > 0 ? actualIncome : estimated;

    // Update analysis displays
    var lifeActualEl = document.getElementById('lifeActualIncome');
    if (lifeActualEl) lifeActualEl.textContent = 'NT$ ' + actualIncome.toLocaleString();

    var lifeEl = document.getElementById('totalLifeMonthly');
    if (lifeEl) lifeEl.textContent = 'NT$ ' + Math.round(lifeExpense).toLocaleString();

    var remaining = income - stats.monthly - lifeExpense;

    // Calculate total project savings to deduct
    var totalSavings = 0;
    if (typeof projects !== 'undefined' && projects) {
        var activeProjects = projects.filter(function (p) {
            return (p.status === 'active' || !p.status) && p.startDate;
        });
        var now = new Date();
        var currentYear = now.getFullYear();
        var currentMonth = now.getMonth();

        activeProjects.forEach(function (p) {
            var exps = typeof projectExpenses !== 'undefined' ? projectExpenses.filter(function (e) { return e.projectId === p.id; }) : [];
            var spent = exps.reduce(function (sum, item) { return sum + item.amount; }, 0);
            var remain = p.budget - spent;
            if (remain <= 0) return;

            var startD = new Date(p.startDate);
            var monthsRemaining = (startD.getFullYear() - currentYear) * 12 + (startD.getMonth() - currentMonth);

            if (monthsRemaining > 0) {
                totalSavings += Math.ceil(remain / monthsRemaining);
            } else {
                totalSavings += remain;
            }
        });
    }

    var deductCb = document.getElementById('deductProjectSavings');
    if (deductCb && deductCb.checked) {
        remaining -= totalSavings;
    }

    var remainEl = document.getElementById('remainingBudget');
    if (remainEl) {
        remainEl.textContent = 'NT$ ' + Math.round(remaining).toLocaleString();
        remainEl.className = 'stat-value ' + (remaining >= 0 ? 'stat-positive' : 'stat-negative');
    }

    renderProjectSavingsInfo();
}

function renderProjectSavingsInfo() {
    var container = document.getElementById('projectSavingsSection');
    var list = document.getElementById('projectSavingsList');
    if (!container || !list) return;

    if (typeof projects === 'undefined' || !projects) {
        container.style.display = 'none';
        return;
    }

    var activeProjects = projects.filter(function (p) {
        return (p.status === 'active' || !p.status) && p.startDate;
    });

    if (activeProjects.length === 0) {
        container.style.display = 'none';
        return;
    }

    var html = '';
    var hasSavingsTarget = false;
    var now = new Date();
    var currentYear = now.getFullYear();
    var currentMonth = now.getMonth();

    activeProjects.forEach(function (p) {
        var exps = typeof projectExpenses !== 'undefined' ? projectExpenses.filter(function (e) { return e.projectId === p.id; }) : [];
        var spent = exps.reduce(function (sum, item) { return sum + item.amount; }, 0);
        var remain = p.budget - spent;

        if (remain <= 0) return;

        var startD = new Date(p.startDate);
        var monthsRemaining = (startD.getFullYear() - currentYear) * 12 + (startD.getMonth() - currentMonth);

        var monthlySave = remain;
        var infoText = '當月出發';

        if (monthsRemaining > 0) {
            monthlySave = Math.ceil(remain / monthsRemaining);
            infoText = `距出發約 ${monthsRemaining} 個月`;
        } else if (monthsRemaining < 0) {
            infoText = '已出發 / 進行中';
        }

        html += `
            <div class="stat-card category-card" style="padding: 20px;">
                <div class="stat-title" style="margin-bottom:12px; font-size:1.1rem; color:var(--text-color); font-weight:bold;">
                    ${p.name}
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">
                    ${p.startDate} (${infoText})
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem;">
                    <span>資金缺口: <b>NT$ ${remain.toLocaleString()}</b></span>
                </div>
                <div style="margin-top:4px; padding-top:12px; border-top:1px solid var(--border-color);">
                    <div style="font-size:1.6rem; color:var(--primary-color); font-weight:bold;">
                        NT$ ${monthlySave.toLocaleString()} <span style="font-size:0.9rem; color:var(--text-muted); font-weight:normal;">/月</span>
                    </div>
                </div>
            </div>
        `;
        hasSavingsTarget = true;
    });

    if (hasSavingsTarget) {
        list.innerHTML = html;
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

function showIncomeSavedToast() {
    showToast('已儲存預估收入');
}

function calculateExpenseForMonth(item, year, month) {
    const start = new Date(item.startDate);
    const end = item.endDate ? new Date(item.endDate) : new Date(9999, 11, 31);

    // The specific month we are looking at:
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // Last day of that month

    if (item.cycle === 'fixed') {
        if (start.getFullYear() === year && start.getMonth() + 1 === month) {
            return item.amount;
        }
        return 0;
    }

    // For recurring cycles, use amortized monthly rate if the item is active this month
    const activeStart = start > monthStart ? start : monthStart;
    const activeEnd = end < monthEnd ? end : monthEnd;

    if (activeStart <= activeEnd) {
        return getMonthlyRate(item);
    }

    return 0;
}

function calculateExpenseForYear(item, year) {
    const start = new Date(item.startDate);
    const end = item.endDate ? new Date(item.endDate) : new Date(9999, 11, 31);
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const activeStart = start > yearStart ? start : yearStart;
    const activeEnd = end < yearEnd ? end : yearEnd;

    if (activeStart > activeEnd) return 0;

    let total = 0;
    let payDate = new Date(start);

    const increment = {
        'monthly': (d) => d.setMonth(d.getMonth() + 1),
        'quarterly': (d) => d.setMonth(d.getMonth() + 3),
        'half-yearly': (d) => d.setMonth(d.getMonth() + 6),
        'yearly': (d) => d.setFullYear(d.getFullYear() + 1),
        'fixed': (d) => d.setFullYear(d.getFullYear() + 100)
    }[item.cycle];

    while (payDate <= activeEnd) {
        if (payDate >= activeStart && payDate <= activeEnd) {
            total += item.amount;
        }
        increment(payDate);
        if (item.cycle === 'fixed') break;
    }
    return total;
}

let _subChartShape = 'pie';

function setSubChartShape(shape) {
    _subChartShape = shape;
    const btnPie = document.getElementById('chartShapePieBtn');
    const btnBar = document.getElementById('chartShapeBarBtn');

    if (shape === 'pie') {
        if (btnPie) btnPie.className = 'type-btn active';
        if (btnBar) btnBar.className = 'type-btn';
    } else {
        if (btnPie) btnPie.className = 'type-btn';
        if (btnBar) btnBar.className = 'type-btn active';
    }
    renderChart();
}

function setSubChartType(type) {
    _subChartType = type;
    const btnYear = document.getElementById('chartTypeYearBtn');
    const btnMonth = document.getElementById('chartTypeMonthBtn');
    const selYear = document.getElementById('chartYearSelect');
    const selMonth = document.getElementById('chartMonthSelect');

    if (type === 'year') {
        if (btnYear) btnYear.className = 'type-btn active';
        if (btnMonth) btnMonth.className = 'type-btn';
        if (selYear) selYear.style.display = 'block';
        if (selMonth) selMonth.style.display = 'none';
    } else {
        if (btnYear) btnYear.className = 'type-btn';
        if (btnMonth) btnMonth.className = 'type-btn active';
        if (selYear) selYear.style.display = 'none';
        if (selMonth) selMonth.style.display = 'block';
        if (selMonth && !selMonth.value) {
            selMonth.value = new Date().toISOString().slice(0, 7);
        }
    }
    renderChart();
}

function initChartYearSelect() {
    const select = document.getElementById('chartYearSelect');
    const monthSelect = document.getElementById('chartMonthSelect');
    if (monthSelect && !monthSelect.value) {
        monthSelect.value = new Date().toISOString().slice(0, 7);
    }

    if (!select) return;
    let min = new Date().getFullYear(), max = min + 3;
    items.forEach(i => {
        const s = new Date(i.startDate).getFullYear();
        if (s < min) min = s;
        if (i.endDate && new Date(i.endDate).getFullYear() > max) max = new Date(i.endDate).getFullYear();
    });

    const curr = select.value || currentChartYear;
    select.innerHTML = '';
    for (let y = min; y <= max; y++) {
        const opt = document.createElement('option');
        opt.value = y; opt.innerText = `${y}年`;
        if (y == curr) opt.selected = true;
        select.appendChild(opt);
    }
    currentChartYear = parseInt(select.value);
}

function renderChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;
    const select = document.getElementById('chartYearSelect');
    if (select) currentChartYear = parseInt(select.value);

    const dataMap = {};
    const selectMonth = document.getElementById('chartMonthSelect');
    const listContainer = document.getElementById('expenseChartList');

    let chartTitle = '';
    let detailedItems = []; // To store items mapping to cost

    if (_subChartType === 'year') {
        items.forEach(item => {
            const cost = calculateExpenseForYear(item, currentChartYear);
            if (cost > 0) {
                const cat = categories.find(c => c.id === item.categoryId) || categories[categories.length - 1];
                if (!dataMap[cat.id]) dataMap[cat.id] = { label: cat.name, amount: 0, color: cat.color };
                dataMap[cat.id].amount += cost;
                detailedItems.push({ name: item.name, cost: cost, color: cat.color });
            }
        });
        chartTitle = `${currentChartYear} 年度支出`;
    } else {
        const ym = selectMonth && selectMonth.value ? selectMonth.value : new Date().toISOString().slice(0, 7);
        const [yearStr, monthStr] = ym.split('-');
        const y = parseInt(yearStr);
        const m = parseInt(monthStr);

        items.forEach(item => {
            const cost = calculateExpenseForMonth(item, y, m);
            if (cost > 0) {
                const cat = categories.find(c => c.id === item.categoryId) || categories[categories.length - 1];
                if (!dataMap[cat.id]) dataMap[cat.id] = { label: cat.name, amount: 0, color: cat.color };
                dataMap[cat.id].amount += cost;
                detailedItems.push({ name: item.name, cost: cost, color: cat.color });
            }
        });
        chartTitle = `${ym} 月度支出`;
    }

    const labels = [], data = [], colors = [];
    Object.values(dataMap).forEach(d => {
        labels.push(d.label); data.push(d.amount); colors.push(d.color);
    });

    if (chartInstance) chartInstance.destroy();

    if (data.length > 0) {
        if (_subChartShape === 'pie') {
            chartInstance = new Chart(ctx, {
                type: 'pie',
                data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 1 }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        title: { display: true, text: `${chartTitle} (${labels.length} 分類)`, font: { size: 16 } }
                    }
                }
            });
        } else {
            var dk = document.documentElement.getAttribute('data-theme') === 'dark';
            var tc = dk ? '#F0EDE8' : '#1A1A1A';
            var gc = dk ? '#2D2B28' : '#E8E5E0';

            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: { labels, datasets: [{ data, backgroundColor: colors.map(c => c + 'CC'), borderColor: colors, borderWidth: 1, borderRadius: 4 }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: `${chartTitle} (${labels.length} 分類)`, font: { size: 16 } },
                        tooltip: { callbacks: { label: function (c) { return 'NT$ ' + c.raw.toLocaleString(); } } }
                    },
                    scales: {
                        y: { ticks: { color: tc, callback: function (v) { return 'NT$' + v.toLocaleString(); } }, grid: { color: gc } },
                        x: { ticks: { color: tc }, grid: { display: false } }
                    }
                }
            });
        }
    }

    // Render detailed list Below
    if (listContainer) {
        listContainer.innerHTML = '';
        if (detailedItems.length > 0) {
            detailedItems.sort((a, b) => b.cost - a.cost); // Sort desc
            let listHtml = '<div style="display:flex; flex-direction:column; gap:8px;">';
            detailedItems.forEach(di => {
                listHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-color); border-radius:var(--radius-sm); border:1px solid var(--border-color);">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:12px; height:12px; border-radius:50%; background-color:${di.color}; flex-shrink:0;"></div>
                            <span style="font-weight:500;">${di.name}</span>
                        </div>
                        <div style="font-weight:bold; color:var(--text-main);">
                            NT$ ${Math.round(di.cost).toLocaleString()}
                        </div>
                    </div>
                `;
            });
            listHtml += '</div>';
            listContainer.innerHTML = listHtml;
        } else {
            listContainer.innerHTML = '<div style="text-align:center; padding:10px; color:var(--text-muted);">本期無分類支出明細</div>';
        }
    }
}

function renderTimeline() {
    const container = document.getElementById('timelineContainer');
    const picker = document.getElementById('timelineMonth');
    if (!container || !picker || !picker.value) return;

    const [year, month] = picker.value.split('-').map(Number);

    const payments = [];
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    items.forEach(item => {
        const start = new Date(item.startDate);
        const end = item.endDate ? new Date(item.endDate) : new Date(9999, 11, 31);
        let payDate = new Date(start);

        const increment = {
            'monthly': (d) => d.setMonth(d.getMonth() + 1),
            'quarterly': (d) => d.setMonth(d.getMonth() + 3),
            'half-yearly': (d) => d.setMonth(d.getMonth() + 6),
            'yearly': (d) => d.setFullYear(d.getFullYear() + 1),
            'fixed': (d) => d.setFullYear(d.getFullYear() + 100)
        }[item.cycle];

        while (payDate <= monthEnd) {
            if (payDate >= monthStart && payDate <= monthEnd && payDate <= end) {
                const cat = categories.find(c => c.id === item.categoryId) || categories[categories.length - 1];
                payments.push({
                    day: payDate.getDate(), name: item.name, amount: item.amount,
                    currency: item.currency, orig: item.originalAmount, color: cat.color
                });
            }
            increment(payDate);
            if (item.cycle === 'fixed') break;
        }
    });

    payments.sort((a, b) => a.day - b.day);

    container.innerHTML = '';
    if (payments.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">本月無預定支出</div>';
        return;
    }

    payments.forEach(p => {
        let amtStr = `NT$ ${p.amount.toLocaleString()}`;
        if (p.currency !== 'TWD') amtStr = `${p.currency} ${p.orig.toLocaleString()} (NT$${p.amount})`;

        container.innerHTML += `
            <div class="timeline-row" style="border-left-color: ${p.color}">
                <div class="timeline-date" style="color:${p.color}">${p.day} <span style="font-size:0.6em">日</span></div>
                <div class="timeline-content">
                    <div style="font-weight:bold;">${p.name}</div>
                    <div class="timeline-original">${amtStr}</div>
                </div>
            </div>
        `;
    });
}

function renderLifeCategoryChart() {
    var ctx = document.getElementById('lifeCategoryChart');
    if (!ctx) return;
    var mi = document.getElementById('lifeChartMonth');
    var ym = (mi && mi.value) ? mi.value : lifeCurrentMonth;

    var labels = [], data = [], colors = [];
    lifeCategories.forEach(function (cat) {
        var s = getLifeSpentByCat(cat.id, ym);
        if (s > 0) { labels.push(cat.name); data.push(s); colors.push(cat.color); }
    });

    if (lifeCatChartInstance) { lifeCatChartInstance.destroy(); lifeCatChartInstance = null; }
    if (data.length === 0) return;

    var dk = document.documentElement.getAttribute('data-theme') === 'dark';
    var tc = dk ? '#F0EDE8' : '#1A1A1A';
    var gc = dk ? '#2D2B28' : '#E8E5E0';

    lifeCatChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ data: data, backgroundColor: colors.map(function (c) { return c + 'CC'; }), borderColor: colors, borderWidth: 1, borderRadius: 4 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return 'NT$ ' + c.raw.toLocaleString(); } } } },
            scales: { y: { ticks: { color: tc, callback: function (v) { return 'NT$' + v.toLocaleString(); } }, grid: { color: gc } }, x: { ticks: { color: tc }, grid: { display: false } } }
        }
    });
}

function renderTrendChart() {
    var ctx = document.getElementById('trendChart');
    if (!ctx) return;

    var months = [], now = new Date();
    for (var i = 5; i >= 0; i--) {
        var t = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'));
    }

    var labels = months.map(function (ym) { return ym.split('-')[1] + '月'; });
    var sub = Math.round(calculateStats().monthly);
    var subData = months.map(function () { return sub; });
    var lifeData = months.map(function (ym) { return getLifeTotalForMonth(ym); });

    if (trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; }

    var dk = document.documentElement.getAttribute('data-theme') === 'dark';
    var tc = dk ? '#F0EDE8' : '#1A1A1A';
    var gc = dk ? '#2D2B28' : '#E8E5E0';

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels, datasets: [
                { label: '固定支出', data: subData, borderColor: '#2A6475', backgroundColor: '#2A647518', borderWidth: 2, pointRadius: 4, tension: 0.3, fill: true },
                { label: '生活費', data: lifeData, borderColor: '#C17B2E', backgroundColor: '#C17B2E18', borderWidth: 2, pointRadius: 4, tension: 0.3, fill: true }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: tc, boxWidth: 12, padding: 16 } },
                tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': NT$ ' + c.raw.toLocaleString(); } } }
            },
            scales: { y: { ticks: { color: tc, callback: function (v) { return 'NT$' + v.toLocaleString(); } }, grid: { color: gc } }, x: { ticks: { color: tc }, grid: { display: false } } }
        }
    });
}
