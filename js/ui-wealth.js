// ====== js/ui-wealth.js ======

function initWealthTab() {
    var stored = localStorage.getItem(WEALTH_PARAMS_KEY);
    if (stored) {
        try {
            var params = JSON.parse(stored);
            if (params.invCurrent !== undefined) document.getElementById('wealthInvestCurrentInput').value = params.invCurrent;
            if (params.invMonthly !== undefined) document.getElementById('wealthInvestMonthlyInput').value = params.invMonthly;
            if (params.invRate !== undefined) document.getElementById('wealthInvestRateInput').value = params.invRate;

            if (params.cashCurrent !== undefined) document.getElementById('wealthCashCurrentInput').value = params.cashCurrent;
            if (params.cashMonthly !== undefined) document.getElementById('wealthCashMonthlyInput').value = params.cashMonthly;
            if (params.cashRate !== undefined) document.getElementById('wealthCashRateInput').value = params.cashRate;

            if (params.target !== undefined) document.getElementById('wealthTargetInput').value = params.target;
        } catch (e) {
            console.error(e);
        }
    }
}

function useMonthlyBalanceForWealth() {
    // 依賴 ui-analysis.js 的 calculateStats 還有 getLifeIncomeForMonth, getLifeOnlyExpForMonth
    var stats = calculateStats();
    var incomeInput = document.getElementById('monthlyIncomeInput');
    var estimated = parseFloat(incomeInput ? incomeInput.value : 0) || 0;
    var actualIncome = getLifeIncomeForMonth(lifeCurrentMonth);
    var lifeExpense = getLifeOnlyExpForMonth(lifeCurrentMonth);

    var income = actualIncome > 0 ? actualIncome : estimated;
    var remaining = income - stats.monthly - lifeExpense;

    // 將結餘扣掉目前已設定的「投資金額」，剩下的才是可以當現金存的
    var invMonthly = parseFloat(document.getElementById('wealthInvestMonthlyInput').value) || 0;
    var cashAvailable = Math.max(0, Math.round(remaining - invMonthly));

    document.getElementById('wealthCashMonthlyInput').value = cashAvailable;
    calculateWealth();
    showToast('已帶入剩餘結餘作為現金存款：NT$ ' + cashAvailable.toLocaleString());
}

let wealthDebounceTimer = null;
function calculateWealth() {
    if (wealthDebounceTimer) clearTimeout(wealthDebounceTimer);
    wealthDebounceTimer = setTimeout(_doCalculateWealth, 300);
}

function _doCalculateWealth() {
    // 投資部位
    var invCurrent = parseFloat(document.getElementById('wealthInvestCurrentInput').value) || 0;
    var invMonthly = parseFloat(document.getElementById('wealthInvestMonthlyInput').value) || 0;
    var invRate = parseFloat(document.getElementById('wealthInvestRateInput').value) || 0;
    var invMonthlyRate = (invRate / 100) / 12;

    // 現金部位
    var cashCurrent = parseFloat(document.getElementById('wealthCashCurrentInput').value) || 0;
    var cashMonthly = parseFloat(document.getElementById('wealthCashMonthlyInput').value) || 0;
    var cashRate = parseFloat(document.getElementById('wealthCashRateInput').value) || 0;
    var cashMonthlyRate = (cashRate / 100) / 12;

    // 目標
    var targetFV = parseFloat(document.getElementById('wealthTargetInput').value) || 0;

    localStorage.setItem(WEALTH_PARAMS_KEY, JSON.stringify({
        invCurrent: document.getElementById('wealthInvestCurrentInput').value,
        invMonthly: document.getElementById('wealthInvestMonthlyInput').value,
        invRate: document.getElementById('wealthInvestRateInput').value,
        cashCurrent: document.getElementById('wealthCashCurrentInput').value,
        cashMonthly: document.getElementById('wealthCashMonthlyInput').value,
        cashRate: document.getElementById('wealthCashRateInput').value,
        target: document.getElementById('wealthTargetInput').value
    }));
    if (typeof triggerCloudSync === 'function') triggerCloudSync();

    var resultEl = document.getElementById('wealthResultText');
    var summaryEl = document.getElementById('wealthSummaryText');

    if (targetFV <= 0) {
        resultEl.textContent = '請輸入有效的目標金額';
        summaryEl.textContent = '';
        renderWealthChart([], [], [], [], 0);
        return;
    }

    var totalCurrent = invCurrent + cashCurrent;

    if (totalCurrent >= targetFV) {
        resultEl.textContent = '您已經達標了！🎉';
        summaryEl.textContent = '當前總資產已等於或超過目標金額。';
        renderWealthChart([0], [cashCurrent], [invCurrent], [totalCurrent], targetFV);
        return;
    }

    if (invMonthly <= 0 && cashMonthly <= 0 && invRate <= 0 && cashRate <= 0) {
        resultEl.textContent = '無法達標';
        summaryEl.textContent = '每月沒有新資金投入，且無利息或報酬增長，資產無法增加。';
        renderWealthChart([], [], [], [], targetFV);
        return;
    }

    var curInv = invCurrent;
    var curCash = cashCurrent;
    var total = totalCurrent;

    var months = 0;
    var MAX_MONTHS = 1200; // 100 years max loop

    var dataLabels = [];
    var cashData = [];
    var investData = [];
    var totalData = [];

    // 紀錄第 0 年
    dataLabels.push('第 0 年');
    cashData.push(curCash);
    investData.push(curInv);
    totalData.push(total);

    while (total < targetFV && months < MAX_MONTHS) {
        months++;
        curInv = curInv * (1 + invMonthlyRate) + invMonthly;
        curCash = curCash * (1 + cashMonthlyRate) + cashMonthly;
        total = curInv + curCash;

        if (months % 12 === 0 || total >= targetFV) {
            var yearLabel = '第 ' + Math.ceil(months / 12) + ' 年' + (months % 12 !== 0 ? ' (' + (months % 12) + '個月)' : '');
            dataLabels.push(yearLabel);
            cashData.push(curCash);
            investData.push(curInv);
            totalData.push(total);
        }
    }

    if (months >= MAX_MONTHS) {
        resultEl.textContent = '超過 100 年才能達標';
        summaryEl.textContent = '依目前條件需耗時太久，請考慮增加每月投入或預期報酬。';
    } else {
        var y = Math.floor(months / 12);
        var m = months % 12;
        var timeStr = (y > 0 ? y + ' 年 ' : '') + (m > 0 ? m + ' 個月' : (y === 0 ? '不到 1 個月' : ''));
        resultEl.textContent = '約需 ' + timeStr;
        summaryEl.textContent = '總結累積：NT$ ' + Math.round(total).toLocaleString() + ' (現金 NT$ ' + Math.round(curCash).toLocaleString() + ' / 投資 NT$ ' + Math.round(curInv).toLocaleString() + ')';
    }

    renderWealthChart(dataLabels, cashData, investData, totalData, targetFV);
}

function renderWealthChart(labels, cashData, investData, totalData, targetFV) {
    var ctx = document.getElementById('wealthChart');
    if (!ctx) return;

    if (wealthChartInstance) {
        wealthChartInstance.destroy();
        wealthChartInstance = null;
    }

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var textColor = isDark ? '#F0EDE8' : '#1A1A1A';
    var gridColor = isDark ? '#2D2B28' : '#E8E5E0';

    var targetLineArr = new Array(labels.length).fill(targetFV);

    wealthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '現金/活存累積',
                    data: cashData,
                    borderColor: '#10b981', // green
                    backgroundColor: '#10b98133',
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: '投資部位累積',
                    data: investData,
                    borderColor: '#3b82f6', // blue
                    backgroundColor: '#3b82f633',
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: '總資產',
                    data: totalData,
                    borderColor: '#8b5cf6', // purple
                    backgroundColor: '#8b5cf633',
                    borderWidth: 3,
                    pointRadius: 3,
                    tension: 0.3,
                    fill: false
                },
                {
                    label: '目標金額',
                    data: targetLineArr,
                    borderColor: '#f59e0b', // amber
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
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
                y: {
                    stacked: false, // 總資產是一條獨立的線，不需要 stacked（若把現金跟投資 stacked 也行，但兩條分開畫跟堆疊畫有一點差別。這裡讓線條各自往上長，總資產最高）
                    ticks: {
                        color: textColor,
                        callback: function (val) {
                            return 'NT$ ' + (val / 10000).toLocaleString() + '萬';
                        }
                    },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { display: false }
                }
            }
        }
    });
}
