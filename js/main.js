// ====== js/main.js ======

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon(true);
    } else {
        document.documentElement.removeAttribute('data-theme');
        updateThemeIcon(false);
    }
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'light');
        updateThemeIcon(false);
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(THEME_KEY, 'dark');
        updateThemeIcon(true);
    }
    renderChart();
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(tabId));
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const tabEl = document.getElementById(`tab-${tabId}`);
    if (!tabEl) { console.warn('switchTab: unknown tab', tabId); return; }
    tabEl.classList.add('active');

    if (tabId === 'analysis') {
        requestAnimationFrame(() => {
            renderChart();
            renderTimeline();
            renderLifeCategoryChart();
            renderTrendChart();
            updateBudgetCalc();
            initAnnualReport();
            renderAnnualReport();
        });
    }
    if (tabId === 'life') {
        requestAnimationFrame(() => renderLifeTab());
    }
    if (tabId === 'wealth') {
        requestAnimationFrame(() => calculateWealth());
    }
    if (tabId === 'projects') {
        requestAnimationFrame(() => renderProjects());
    }
}

function init(skipCloudFetch = false) {
    initTheme();
    loadData();
    loadLifeData(); // from data.js
    if (typeof loadProjectsData === 'function') loadProjectsData(); // from ui-projects.js

    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('itemStartDate');
    if (startDateInput) startDateInput.value = today;

    const timelinePicker = document.getElementById('timelineMonth');
    if (timelinePicker) timelinePicker.value = today.slice(0, 7);

    const lifeChartMonthInput = document.getElementById('lifeChartMonth');
    if (lifeChartMonthInput) lifeChartMonthInput.value = today.slice(0, 7);

    lifeCurrentMonth = today.slice(0, 7);

    initChartYearSelect();
    initWealthTab();
    switchTab('life');

    render();

    // Now that local arrays are filled with defaults or local data, it's safe to sync
    if (typeof checkSession === 'function') checkSession(skipCloudFetch);
}

// 綁定全域 Event Listeners
document.addEventListener('DOMContentLoaded', init);

const modalOverlayLocal = document.getElementById('modalOverlay');
const catModalOverlayLocal = document.getElementById('categoryModalOverlay');
const lifeExpModalLocal = document.getElementById('lifeExpModalOverlay');
const budgetModalLocal = document.getElementById('budgetModalOverlay');
const lifeCatModalLocal = document.getElementById('lifeCatModalOverlay');

if (modalOverlayLocal) {
    modalOverlayLocal.addEventListener('click', (e) => {
        if (e.target === modalOverlayLocal) closeModal();
    });
}
if (catModalOverlayLocal) {
    catModalOverlayLocal.addEventListener('click', (e) => {
        if (e.target === catModalOverlayLocal) closeCategoryModal();
    });
}
if (lifeExpModalLocal) {
    lifeExpModalLocal.addEventListener('click', function (e) {
        if (e.target === lifeExpModalLocal) closeLifeExpModal();
    });
}
if (budgetModalLocal) {
    budgetModalLocal.addEventListener('click', function (e) {
        if (e.target === budgetModalLocal) closeBudgetModal();
    });
}
if (lifeCatModalLocal) {
    lifeCatModalLocal.addEventListener('click', function (e) {
        if (e.target === lifeCatModalLocal) closeLifeCatModal();
    });
}

const projectModalLocal = document.getElementById('projectModalOverlay');
if (projectModalLocal) {
    projectModalLocal.addEventListener('click', function (e) {
        if (e.target === projectModalLocal) closeProjectModal();
    });
}

const projectDetailModalLocal = document.getElementById('projectDetailModalOverlay');
if (projectDetailModalLocal) {
}

// ── Global Search ──
function openGlobalSearch() {
    const modal = document.getElementById('globalSearchModalOverlay');
    const input = document.getElementById('globalSearchInput');
    const results = document.getElementById('globalSearchResults');
    if (modal) modal.classList.add('active');
    if (input) {
        input.value = '';
        input.focus();
    }
    if (results) {
        results.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">請輸入關鍵字以搜尋全站紀錄</div>';
    }
}

function closeGlobalSearch() {
    const modal = document.getElementById('globalSearchModalOverlay');
    if (modal) modal.classList.remove('active');
}

function executeGlobalSearch() {
    const query = document.getElementById('globalSearchInput').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('globalSearchResults');
    if (!resultsContainer) return;

    if (!query) {
        resultsContainer.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">請輸入關鍵字以搜尋全站紀錄</div>';
        return;
    }

    let foundItems = [];

    // Search Fixed Subscriptions
    items.forEach(item => {
        const cat = categories.find(c => c.id === item.categoryId) || { name: '未知' };
        if (
            item.name.toLowerCase().includes(query) ||
            (item.note && item.note.toLowerCase().includes(query)) ||
            cat.name.toLowerCase().includes(query)
        ) {
            foundItems.push({
                type: '固定支出',
                date: item.startDate,
                name: item.name,
                note: item.note || cat.name,
                amount: `NT$ ${item.amount.toLocaleString()}`,
                color: '#2A6475'
            });
        }
    });

    // Search Life Expenses/Income
    lifeExpenses.forEach(exp => {
        let catName = '未知';
        if (exp.type === 'income') {
            catName = (lifeIncomeCategories.find(c => c.id === exp.categoryId) || {}).name || '收入';
        } else {
            catName = (lifeCategories.find(c => c.id === exp.categoryId) || {}).name || '支出';
        }

        if (
            (exp.note && exp.note.toLowerCase().includes(query)) ||
            catName.toLowerCase().includes(query)
        ) {
            const prefix = exp.type === 'income' ? '+' : '-';
            foundItems.push({
                type: exp.type === 'income' ? '生活收入' : '-生活支出', // For distinguishing in color
                date: exp.date,
                title: catName,
                note: exp.note || '',
                amount: `${prefix} NT$ ${exp.amount.toLocaleString()}`,
                color: exp.type === 'income' ? '#5A9E7A' : '#C17B2E'
            });
        }
    });

    // Render Results
    if (foundItems.length === 0) {
        resultsContainer.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">找不到符合條件的紀錄</div>';
        return;
    }

    // Sort by date descending
    foundItems.sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
    foundItems.forEach(fi => {
        let displayType = fi.type.replace('-', '');
        html += `
            <div style="background:var(--bg-color); border:1px solid var(--border-color); padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                        <span style="font-size:0.7rem; padding:2px 6px; border-radius:4px; border:1px solid ${fi.color}; color:${fi.color};">${displayType}</span>
                        <span style="font-weight:600; font-size:1rem;">${fi.name || fi.title}</span>
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">
                        ${fi.date} <span style="margin:0 4px;">|</span> ${fi.note}
                    </div>
                </div>
                <div style="font-family:var(--font-serif); font-weight:700; color:${fi.color}; font-size:1.1rem;">
                    ${fi.amount}
                </div>
            </div>
        `;
    });
    html += '</div>';

    resultsContainer.innerHTML = html;
}
