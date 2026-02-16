// --- Data Management ---
const STORAGE_KEY = 'subscription_manager_data';
const THEME_KEY = 'subscription_manager_theme';
const CAT_KEY = 'subscription_manager_categories';

let items = [];
let categories = [];
let chartInstance = null;
let currentChartYear = new Date().getFullYear();

// Default Categories
const DEFAULT_CATS = [
    { id: 'cat_ent', name: '娛樂', color: '#8b5cf6' }, // Violet
    { id: 'cat_work', name: '工作', color: '#3b82f6' }, // Blue
    { id: 'cat_life', name: '生活', color: '#10b981' }, // Emerald
    { id: 'cat_ins', name: '保險', color: '#f59e0b' }, // Amber
    { id: 'cat_other', name: '其他', color: '#94a3b8' } // Slate
];

// Initialize
function init() {
    initTheme();
    loadData();

    // Set Default Dates
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('itemStartDate');
    if (startDateInput) startDateInput.value = today;

    const timelinePicker = document.getElementById('timelineMonth');
    if (timelinePicker) timelinePicker.value = today.slice(0, 7); // YYYY-MM

    initChartYearSelect();

    switchTab('manage'); // Default Tab

    render();
}

// --- Theme ---
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

// --- Tabs ---
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
        });
    }
}

// --- Data CRUD ---
function loadData() {
    // Items
    const stored = localStorage.getItem(STORAGE_KEY);
    items = stored ? JSON.parse(stored) : [];

    // Categories
    const storedCats = localStorage.getItem(CAT_KEY);
    categories = storedCats ? JSON.parse(storedCats) : DEFAULT_CATS;

    // Migrate old items (if they have 'type' but no 'categoryId')
    let migrated = false;
    items.forEach(item => {
        if (!item.categoryId && item.type) {
            // Map old types to new categories
            if (item.type === 'subscription') item.categoryId = 'cat_ent';
            else if (item.type === 'insurance') item.categoryId = 'cat_ins';
            else item.categoryId = 'cat_other';
            migrated = true;
        }
        // Migrate Currency
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

function addItem(item) {
    items.push({ ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    saveData();
    showToast('新增成功');
}

function updateItem(id, data) {
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
        items[index] = { ...items[index], ...data };
        saveData();
        showToast('更新成功');
    }
}

function deleteItem(id) {
    if (confirm('確定刪除？')) {
        items = items.filter(i => i.id !== id);
        saveData();
        showToast('刪除成功');
    }
}

function clearAllData() {
    if (confirm('清除所有資料？')) {
        items = [];
        saveData();
        showToast('已清空');
    }
}

// --- Categories Management ---
const catModalOverlay = document.getElementById('categoryModalOverlay');

function openCategoryModal() {
    catModalOverlay.classList.add('active');
    renderCategoryList();
}

function closeCategoryModal() {
    catModalOverlay.classList.remove('active');
    // Refresh main modal category select
    populateCategorySelect();
}

function renderCategoryList() {
    const list = document.getElementById('categoryList');
    list.innerHTML = categories.map(cat => `
        <div class="category-item">
            <div style="display:flex; align-items:center;">
                <div class="color-dot" style="background:${cat.color}"></div>
                <span>${cat.name}</span>
            </div>
            ${DEFAULT_CATS.find(d => d.id === cat.id) ? '' :
            `<button class="icon-btn delete" onclick="deleteCategory('${cat.id}')"><i class="fa-solid fa-trash"></i></button>`
        }
        </div>
    `).join('');
}

function addCategory() {
    const nameInput = document.getElementById('newCatName');
    const colorInput = document.getElementById('newCatColor');
    const name = nameInput.value.trim();
    if (!name) return;

    categories.push({
        id: 'cat_' + Date.now(),
        name: name,
        color: colorInput.value
    });
    nameInput.value = '';

    saveData(); // Save categories
    renderCategoryList();
}

function deleteCategory(id) {
    if (confirm('刪除此分類？關聯的項目將變為「其他」。')) {
        categories = categories.filter(c => c.id !== id);
        // Reset items
        items.forEach(i => {
            if (i.categoryId === id) i.categoryId = 'cat_other';
        });
        saveData();
        renderCategoryList();
    }
}

function populateCategorySelect() {
    const select = document.getElementById('itemCategory');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (currentVal && categories.find(c => c.id === currentVal)) {
        select.value = currentVal;
    }
}

// --- Main Modal & Multi-currency ---
const modalOverlay = document.getElementById('modalOverlay');
const form = document.getElementById('itemForm');
const itemIdInput = document.getElementById('itemId');

function openModal(editMode = false) {
    populateCategorySelect();
    modalOverlay.classList.add('active');

    if (!editMode) {
        form.reset();
        itemIdInput.value = '';
        document.getElementById('modalTitle').textContent = '新增項目';
        document.getElementById('itemStartDate').value = new Date().toISOString().split('T')[0];
        // Defaults
        document.getElementById('itemCurrency').value = 'TWD';
        document.getElementById('itemExchangeRate').value = 1;
        handleCurrencyChange();
    }
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

function handleCurrencyChange() {
    const curr = document.getElementById('itemCurrency').value;
    const rateRow = document.getElementById('exchangeRateRow');
    const rateInput = document.getElementById('itemExchangeRate');

    if (curr === 'TWD') {
        rateRow.style.display = 'none';
        rateInput.value = 1;
    } else {
        rateRow.style.display = 'flex';
    }
    calculateTWD();
}

function calculateTWD() {
    const original = parseFloat(document.getElementById('itemOriginalAmount').value) || 0;
    const rate = parseFloat(document.getElementById('itemExchangeRate').value) || 1;
    const total = Math.round(original * rate);

    document.getElementById('itemAmountTWD').value = `NT$ ${total.toLocaleString()}`;
    document.getElementById('itemAmount').value = total; // Store TWD int
}

function editItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;

    populateCategorySelect();
    itemIdInput.value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemCategory').value = item.categoryId;

    document.getElementById('itemCurrency').value = item.currency || 'TWD';
    document.getElementById('itemOriginalAmount').value = item.originalAmount || item.amount;
    document.getElementById('itemExchangeRate').value = item.exchangeRate || 1;
    handleCurrencyChange(); // Show/Hide rate

    document.getElementById('itemCycle').value = item.cycle;
    document.getElementById('itemStartDate').value = item.startDate;
    document.getElementById('itemEndDate').value = item.endDate || '';
    document.getElementById('itemNote').value = item.note || '';

    document.getElementById('modalTitle').textContent = '編輯項目';
    openModal(true);
}

function handleFormSubmit(e) {
    e.preventDefault();

    // Ensure TWD calc is fresh
    calculateTWD();

    const data = {
        name: document.getElementById('itemName').value,
        categoryId: document.getElementById('itemCategory').value,
        currency: document.getElementById('itemCurrency').value,
        originalAmount: parseFloat(document.getElementById('itemOriginalAmount').value),
        exchangeRate: parseFloat(document.getElementById('itemExchangeRate').value),
        amount: parseInt(document.getElementById('itemAmount').value), // TWD
        cycle: document.getElementById('itemCycle').value,
        startDate: document.getElementById('itemStartDate').value,
        endDate: document.getElementById('itemEndDate').value,
        note: document.getElementById('itemNote').value
    };

    const id = itemIdInput.value;
    if (id) updateItem(id, data);
    else addItem(data);

    closeModal();
}

// --- Render Logic (Search & Filter) ---
function render() {
    // Stats
    const stats = calculateStats();
    document.getElementById('totalMonthly').textContent = `NT$ ${Math.round(stats.monthly).toLocaleString()}`;
    document.getElementById('totalYearly').textContent = `NT$ ${Math.round(stats.yearly).toLocaleString()}`;

    // Filter Items
    const search = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    const list = document.getElementById('itemsList');
    list.innerHTML = '';

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const filtered = items.filter(item => {
        // Search
        const matchText = item.name.toLowerCase().includes(search) || (item.note && item.note.toLowerCase().includes(search));
        if (!matchText) return false;

        // Status
        const endDate = item.endDate ? new Date(item.endDate) : null;
        const isEnded = endDate && endDate < now;

        if (status === 'active' && isEnded) return false;
        if (status === 'ended' && !isEnded) return false;

        return true;
    });

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><h3>沒有相符項目</h3></div>`;
        return;
    }

    filtered.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'item-card';
        el.setAttribute('draggable', 'true');
        el.dataset.id = item.id; // Use ID for drag
        el.dataset.index = items.indexOf(item); // Needs actual index for swap

        // Events
        el.addEventListener('dragstart', handleDragStart);
        el.addEventListener('dragover', handleDragOver);
        el.addEventListener('drop', handleDrop);
        el.addEventListener('dragenter', handleDragEnter);
        el.addEventListener('dragleave', handleDragLeave);
        el.addEventListener('dragend', handleDragEnd);

        // Display Logic
        const category = categories.find(c => c.id === item.categoryId) || categories[categories.length - 1]; // fallback
        const cycleLabel = getCycleLabel(item.cycle);

        // Status Check
        let statusHtml = '';
        const endDate = item.endDate ? new Date(item.endDate) : null;
        if (endDate && endDate < now) {
            statusHtml = '<span style="font-size:0.8rem; background:#fee2e2; color:#ef4444; padding:2px 6px; border-radius:4px; margin-left:8px;">已結束</span>';
            el.style.opacity = '0.7';
        }

        // Currency Display
        let amountDisplay = `NT$ ${item.amount.toLocaleString()}`;
        if (item.currency !== 'TWD') {
            amountDisplay = `${item.currency} ${item.originalAmount.toLocaleString()} <span style="font-size:0.8em; color:var(--text-muted);">(≈ NT$${item.amount.toLocaleString()})</span>`;
        }

        el.innerHTML = `
            <div class="item-header">
                <div class="item-name">${item.name} ${statusHtml}</div>
                <div class="item-amount">${amountDisplay}</div>
            </div>
            <div style="display:flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                <span class="item-cycle" style="background:${category.color}20; color:${category.color}">${category.name}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted);">${cycleLabel}</span>
            </div>
            <div class="item-meta">
                <div><i class="fa-regular fa-calendar"></i> 開始：${item.startDate}</div>
                ${item.endDate ? `<div><i class="fa-regular fa-calendar-xmark"></i> 結束：${item.endDate}</div>` : ''}
                ${item.note ? `<div><i class="fa-regular fa-comment"></i> ${item.note}</div>` : ''}
            </div>
            <div class="item-actions">
                <button class="icon-btn" onclick="editItem('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-btn delete" onclick="deleteItem('${item.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        list.appendChild(el);
    });
}

function getCycleLabel(cycle) {
    return {
        'monthly': '每月', 'quarterly': '每季', 'half-yearly': '每半年', 'yearly': '每年', 'fixed': '單次'
    }[cycle] || cycle;
}

// --- Calculation (Stats & Chart) ---
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
    now.setHours(0, 0, 0, 0);
    items.forEach(item => {
        if (item.endDate && new Date(item.endDate) < now) return;
        monthly += getMonthlyRate(item);
        yearly += getYearlyRate(item);
    });
    return { monthly, yearly };
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

    // Simplification for all cycles
    const increment = {
        'monthly': (d) => d.setMonth(d.getMonth() + 1),
        'quarterly': (d) => d.setMonth(d.getMonth() + 3),
        'half-yearly': (d) => d.setMonth(d.getMonth() + 6),
        'yearly': (d) => d.setFullYear(d.getFullYear() + 1),
        'fixed': (d) => d.setFullYear(d.getFullYear() + 100) // One shot
    }[item.cycle];

    // Fast forward to near year
    // Note: this brute force is fine for personal finance scales
    while (payDate <= activeEnd) {
        if (payDate >= activeStart && payDate <= activeEnd) {
            total += item.amount;
        }
        increment(payDate);
        if (item.cycle === 'fixed') break;
    }
    return total;
}

function initChartYearSelect() {
    const select = document.getElementById('chartYearSelect');
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

    // Group by Category
    const dataMap = {};
    items.forEach(item => {
        const cost = calculateExpenseForYear(item, currentChartYear);
        if (cost > 0) {
            const cat = categories.find(c => c.id === item.categoryId) || categories[categories.length - 1];
            if (!dataMap[cat.id]) dataMap[cat.id] = { label: cat.name, amount: 0, color: cat.color };
            dataMap[cat.id].amount += cost;
        }
    });

    const labels = [], data = [], colors = [];
    Object.values(dataMap).forEach(d => {
        labels.push(d.label); data.push(d.amount); colors.push(d.color);
    });

    if (chartInstance) chartInstance.destroy();

    if (data.length > 0) {
        chartInstance = new Chart(ctx, {
            type: 'pie',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 1 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: `${currentChartYear} 年度支出 (${labels.length} 分類)`, font: { size: 16 } }
                }
            }
        });
    }
}

// --- Timeline Logic ---
function renderTimeline() {
    const container = document.getElementById('timelineContainer');
    const picker = document.getElementById('timelineMonth');
    if (!container || !picker || !picker.value) return;

    const [year, month] = picker.value.split('-').map(Number); // 2026, 2 (1-based from input value usually? no input month is YYYY-MM)
    // Actually month is 1-12 from picker

    // Find all payments in this month
    const payments = [];
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    items.forEach(item => {
        const start = new Date(item.startDate);
        const end = item.endDate ? new Date(item.endDate) : new Date(9999, 11, 31);

        let payDate = new Date(start);

        // Advance logic similar to calc
        const increment = {
            'monthly': (d) => d.setMonth(d.getMonth() + 1),
            'quarterly': (d) => d.setMonth(d.getMonth() + 3),
            'half-yearly': (d) => d.setMonth(d.getMonth() + 6),
            'yearly': (d) => d.setFullYear(d.getFullYear() + 1),
            'fixed': (d) => d.setFullYear(d.getFullYear() + 100)
        }[item.cycle];

        while (payDate <= monthEnd) {
            if (payDate >= monthStart && payDate <= monthEnd && payDate <= end) {
                // Determine Category Color
                const cat = categories.find(c => c.id === item.categoryId) || categories[categories.length - 1];
                payments.push({
                    day: payDate.getDate(),
                    name: item.name,
                    amount: item.amount,
                    currency: item.currency,
                    orig: item.originalAmount,
                    color: cat.color
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

// --- Drag & Drop (Global for scope) ---
let dragSrcEl = null;

function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('dragging');
}
function handleDragOver(e) { if (e.preventDefault) e.preventDefault(); return false; }
function handleDragEnter(e) { this.classList.add('over'); }
function handleDragLeave(e) { this.classList.remove('over'); }
function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (dragSrcEl !== this) {
        // Use Index 
        const srcIndex = parseInt(dragSrcEl.dataset.index);
        const targetIndex = parseInt(this.dataset.index);

        // Swap
        const item = items[srcIndex];
        items.splice(srcIndex, 1);
        items.splice(targetIndex, 0, item);
        saveData(); // Re-renders
    }
    return false;
}
function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.item-card').forEach(col => col.classList.remove('over'));
}

// --- Misc ---
if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
if (catModalOverlay) catModalOverlay.addEventListener('click', (e) => { if (e.target === catModalOverlay) closeCategoryModal(); });
document.addEventListener('DOMContentLoaded', init); // Start
function showToast(msg) { /* Reuse logic */
    const t = document.getElementById('toast');
    t.innerHTML = `<i class="fa-solid fa-check"></i> ${msg}`; t.className = 'toast show success';
    setTimeout(() => t.className = 'toast', 3000);
}
function exportData() { /* Reuse */
    const dataStr = JSON.stringify({ items, categories }, null, 2); // Export with Categories!
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
            if (data.items && Array.isArray(data.items)) { // New format
                if (confirm('匯入備份？')) {
                    items = data.items;
                    categories = data.categories || DEFAULT_CATS;
                    saveData();
                    showToast('匯入成功');
                }
            } else if (Array.isArray(data)) { // Old format support
                if (confirm('匯入舊版備份？')) {
                    items = data;
                    saveData(); // Will migrate on load
                    showToast('匯入成功');
                }
            }
        } catch (err) { console.error(err); showToast('錯誤'); }
        input.value = '';
    };
    reader.readAsText(file);
}
