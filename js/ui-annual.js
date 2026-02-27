// ====== js/ui-annual.js ======

let annualReportChartInstance = null;
let annualPieChartInstance = null;

function initAnnualReport() {
    initAnnualYearSelect();
}

function initAnnualYearSelect() {
    const select = document.getElementById('annualReportYear');
    if (!select) return;

    // 收集所有年份
    let years = new Set();
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);

    // 從固定支出抓
    items.forEach(item => {
        if (item.startDate) years.add(item.startDate.substring(0, 4));
        if (item.endDate) years.add(item.endDate.substring(0, 4));
    });

    // 從生活費抓
    lifeExpenses.forEach(exp => {
        if (exp.date) years.add(exp.date.substring(0, 4));
    });

    // 從企劃抓
    projects.forEach(p => {
        if (p.expenses) {
            p.expenses.forEach(e => {
                if (e.date) years.add(e.date.substring(0, 4));
            })
        }
    });

    const yearArray = Array.from(years).sort().reverse();
    select.innerHTML = yearArray.map(y => `<option value="${y}">${y} 年</option>`).join('');
    select.value = currentYear;
}

function renderAnnualReport() {
    const year = document.getElementById('annualReportYear').value;
    if (!year) return;

    // 準備12個月的數據容器
    let monthlyData = Array.from({ length: 12 }, () => ({
        income: 0,
        fixed: 0,
        life: 0,
        project: 0,
        totalExp: 0,
        balance: 0
    }));

    // 預估每月收入作為墊底
    const incomeInput = document.getElementById('monthlyIncomeInput');
    const estimatedMonthlyIncome = parseFloat(incomeInput ? incomeInput.value : 0) || 0;

    let totalYearIncome = 0;
    let totalYearFixed = 0;
    let totalYearLife = 0;
    let totalYearProject = 0;

    for (let month = 1; month <= 12; month++) {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;

        // --- 1. 計算該月固定支出 ---
        let fixedExp = 0;
        const targetDate = new Date(year, month - 1, 15); // 用當月中間當作基準點測試
        items.forEach(item => {
            if (isItemActiveInMonth(item, targetDate)) {
                fixedExp += (item.amount / getMonthsInCycle(item.cycle));
            }
        });
        monthlyData[month - 1].fixed = Math.round(fixedExp);
        totalYearFixed += Math.round(fixedExp);

        // --- 2. 計算該月生活收支 ---
        let lifeExp = 0;
        let lifeInc = 0;
        lifeExpenses.forEach(exp => {
            if (exp.date && exp.date.startsWith(monthStr)) {
                if (exp.type === 'income') {
                    lifeInc += exp.amount;
                } else {
                    lifeExp += exp.amount;
                }
            }
        });
        monthlyData[month - 1].life = lifeExp;
        totalYearLife += lifeExp;

        // 如果當月有記生活收入，就用生活收入；否則用預估收入（過去月份如果是0代表根本沒記帳？這裡統一用最高者）
        let finalIncome = lifeInc > 0 ? lifeInc : estimatedMonthlyIncome;
        monthlyData[month - 1].income = finalIncome;
        totalYearIncome += finalIncome;

        // --- 3. 計算該月企劃花費 ---
        let projExp = 0;
        projects.forEach(p => {
            if (p.expenses) {
                p.expenses.forEach(e => {
                    if (e.date && e.date.startsWith(monthStr)) {
                        projExp += e.amount;
                    }
                });
            }
        });
        monthlyData[month - 1].project = projExp;
        totalYearProject += projExp;

        // --- 彙整統計 ---
        const totalExp = monthlyData[month - 1].fixed + monthlyData[month - 1].life + monthlyData[month - 1].project;
        monthlyData[month - 1].totalExp = totalExp;
        monthlyData[month - 1].balance = monthlyData[month - 1].income - totalExp;
    }

    // 更新 Dashboard UI
    const totalExpAll = totalYearFixed + totalYearLife + totalYearProject;
    const totalBalanceAll = totalYearIncome - totalExpAll;

    document.getElementById('annualTotalIncome').textContent = `NT$ ${totalYearIncome.toLocaleString()}`;
    document.getElementById('annualTotalExpense').textContent = `NT$ ${totalExpAll.toLocaleString()}`;
    document.getElementById('annualTotalBalance').textContent = `NT$ ${totalBalanceAll.toLocaleString()}`;

    // 更新圖表
    drawAnnualBarChart(monthlyData);
    drawAnnualPieChart({
        fixed: totalYearFixed,
        life: totalYearLife,
        project: totalYearProject
    });
}

function drawAnnualBarChart(monthlyData) {
    const ctx = document.getElementById('annualReportChart');
    if (!ctx) return;

    if (annualReportChartInstance) {
        annualReportChartInstance.destroy();
    }

    const labels = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#F0EDE8' : '#1A1A1A';
    const gridColor = isDark ? '#2D2B28' : '#E8E5E0';

    annualReportChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '固定支出',
                    data: monthlyData.map(d => d.fixed),
                    backgroundColor: '#2A6475',
                    stack: 'Stack 0'
                },
                {
                    label: '生活花費',
                    data: monthlyData.map(d => d.life),
                    backgroundColor: '#C17B2E',
                    stack: 'Stack 0'
                },
                {
                    label: '企劃支出',
                    data: monthlyData.map(d => d.project),
                    backgroundColor: '#8b5cf6',
                    stack: 'Stack 0'
                },
                {
                    label: '總結餘',
                    data: monthlyData.map(d => d.balance),
                    type: 'line',
                    borderColor: '#10b981',
                    backgroundColor: '#10b981',
                    borderWidth: 2,
                    pointRadius: 3,
                    fill: false,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': NT$ ' + Math.round(context.raw).toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: textColor },
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    ticks: { color: textColor, callback: val => 'NT$' + (val / 1000).toLocaleString() + 'k' },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

function drawAnnualPieChart(dataObj) {
    const ctx = document.getElementById('annualPieChart');
    if (!ctx) return;

    if (annualPieChartInstance) {
        annualPieChartInstance.destroy();
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#F0EDE8' : '#1A1A1A';

    annualPieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['固定支出', '生活花費', '企劃支出'],
            datasets: [{
                data: [dataObj.fixed, dataObj.life, dataObj.project],
                backgroundColor: ['#2A6475', '#C17B2E', '#8b5cf6'],
                borderWidth: 2,
                borderColor: isDark ? '#1A1917' : '#FFFFFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: textColor, padding: 20 }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = total > 0 ? Math.round((value / total) * 100) : 0;
                            return ` NT$ ${value.toLocaleString()} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
}
