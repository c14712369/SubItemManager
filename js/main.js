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
    document.getElementById(`tab-${tabId}`).classList.add('active');

    if (tabId === 'analysis') {
        requestAnimationFrame(() => {
            renderChart();
            renderTimeline();
            renderLifeCategoryChart();
            renderTrendChart();
            updateBudgetCalc();
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

function init() {
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
    switchTab('manage');

    const savedIncome = localStorage.getItem(INCOME_KEY);
    if (savedIncome) {
        const incomeInput = document.getElementById('monthlyIncomeInput');
        if (incomeInput) incomeInput.value = savedIncome;
    }

    render();
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
    projectDetailModalLocal.addEventListener('click', function (e) {
        if (e.target === projectDetailModalLocal) closeProjectDetailModal();
    });
}
