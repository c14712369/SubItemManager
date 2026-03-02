// ====== js/main.js ======

// --- Privacy Mode ---
window.isPrivacyMode = localStorage.getItem('privacy_mode') === 'true';

function togglePrivacy() {
    window.isPrivacyMode = !window.isPrivacyMode;
    localStorage.setItem('privacy_mode', window.isPrivacyMode);

    const icon = document.getElementById('privacyIcon');
    if (icon) {
        icon.className = window.isPrivacyMode ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    }

    // Only re-render the currently active tab to avoid unnecessary work
    const activeTabEl = document.querySelector('.tab-content.active');
    const activeTabId = activeTabEl ? activeTabEl.id.replace('tab-', '') : null;

    if (activeTabId === 'life') {
        if (typeof renderLifeTab === 'function') renderLifeTab();
    } else if (activeTabId === 'analysis') {
        if (typeof renderChart === 'function') renderChart();
        if (typeof renderLifeCategoryChart === 'function') renderLifeCategoryChart();
        if (typeof renderTrendChart === 'function') renderTrendChart();
        if (typeof updateBudgetCalc === 'function') updateBudgetCalc();
    } else if (activeTabId === 'annual') {
        if (typeof renderAnnualReport === 'function') renderAnnualReport();
    } else if (activeTabId === 'fixed') {
        if (typeof render === 'function') render();
    } else if (activeTabId === 'projects') {
        if (typeof renderProjects === 'function') renderProjects();
    } else if (activeTabId === 'wealth') {
        if (typeof renderHoldings === 'function') renderHoldings();
        if (typeof renderBankAccounts === 'function') renderBankAccounts();
        if (typeof calculateWealth === 'function') calculateWealth();
    }
}

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
    // Robust cross-browser scroll reset
    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;

        // Force the header into view as a fallback for strict mobile containers
        const header = document.querySelector('header');
        if (header) {
            header.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }, 10);

    document.querySelectorAll('.tab-btn, .nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(`switchTab('${tabId}')`));
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
        });
    }
    if (tabId === 'annual') {
        requestAnimationFrame(() => {
            initAnnualReport();
            renderAnnualReport();
        });
    }
    if (tabId === 'life') {
        requestAnimationFrame(() => renderLifeTab());
    }
    if (tabId === 'wealth') {
        requestAnimationFrame(() => initWealthTab());
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

    // Apply App Identity (Icon/Theme)
    applyAppIdentity();
    applyDynamicManifest();

    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('itemStartDate');
    if (startDateInput) startDateInput.value = today;

    const timelinePicker = document.getElementById('timelineMonth');
    if (timelinePicker) timelinePicker.value = today.slice(0, 7);

    const analysisGlobalMonth = document.getElementById('analysisGlobalMonth');
    if (analysisGlobalMonth) analysisGlobalMonth.value = today.slice(0, 7);

    lifeCurrentMonth = today.slice(0, 7);

    initChartYearSelect();
    initWealthTab();

    // Only default to 'life' tab if no tab is active (initial load)
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) {
        switchTab('life');
    }

    // Restore fixed sort select state
    const fixedSortSelect = document.getElementById('fixedSortSelect');
    if (fixedSortSelect && typeof _fixedSortMode !== 'undefined') {
        fixedSortSelect.value = _fixedSortMode;
    }

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
    projectDetailModalLocal.addEventListener('click', function (e) {
        if (e.target === projectDetailModalLocal) closeProjectDetailModal();
    });
}

const identityModalLocal = document.getElementById('identityModalOverlay');
if (identityModalLocal) {
    identityModalLocal.addEventListener('click', function (e) {
        if (e.target === identityModalLocal) closeIdentityModal();
    });
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

// ── App Identity & Icon Management ──
let currentAppIdentity = {
    themeColor: '#c17b2e',
    customIcon: null
};

function openIdentityModal() {
    const stored = localStorage.getItem(APP_IDENTITY_KEY);
    if (stored) {
        currentAppIdentity = JSON.parse(stored);
    }

    const colorValue = (currentAppIdentity.themeColor || '#c17b2e').toUpperCase();
    document.getElementById('identityThemeColor').value = currentAppIdentity.themeColor || '#c17b2e';
    document.getElementById('identityColorValue').textContent = colorValue;

    updateIdentityPreview();
    document.getElementById('identityModalOverlay').classList.add('active');
}

function closeIdentityModal() {
    document.getElementById('identityModalOverlay').classList.remove('active');
}

function updateIdentityPreview() {
    const color = document.getElementById('identityThemeColor').value;
    document.getElementById('identityColorValue').textContent = color.toUpperCase();

    const previewBox = document.getElementById('iconPreview');
    if (currentAppIdentity.customIcon) {
        previewBox.innerHTML = `<img src="${currentAppIdentity.customIcon}" style="width:100%; height:100%; object-fit:cover;">`;
    } else {
        previewBox.innerHTML = `<i class="fa-solid fa-vault" style="font-size:40px; color:${color};"></i>`;
    }
}

function handleIconUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
        showToast('圖片太大 (限 500KB 以內)');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        currentAppIdentity.customIcon = e.target.result;
        updateIdentityPreview();
    };
    reader.readAsDataURL(file);
}

function resetIdentity() {
    currentAppIdentity = {
        themeColor: '#C17B2E',
        customIcon: null
    };
    document.getElementById('identityThemeColor').value = '#C17B2E';
    updateIdentityPreview();
}

async function saveIdentitySettings() {
    currentAppIdentity.themeColor = document.getElementById('identityThemeColor').value;
    localStorage.setItem(APP_IDENTITY_KEY, JSON.stringify(currentAppIdentity));

    applyAppIdentity();

    const stats = await applyDynamicManifest();

    if (typeof triggerCloudSync === 'function') triggerCloudSync();

    showToast('系統設置已儲存並套用');
    closeIdentityModal();
}

function applyAppIdentity() {
    const stored = localStorage.getItem(APP_IDENTITY_KEY);
    if (!stored) return;
    const identity = JSON.parse(stored);

    // 1. Update Theme Color Meta
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', identity.themeColor);

    // 2. Generate and Apply Favicon
    generateDynamicIcon(identity);

    // 3. Update CSS Variable for Primary Color if needed (Optional, we already have it in style.css but can override)
    // document.documentElement.style.setProperty('--primary-color', identity.themeColor);
}

function generateDynamicIcon(identity) {
    const SIZE = 192;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    if (identity.customIcon) {
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, SIZE, SIZE);
            ctx.beginPath();
            ctx.roundRect(0, 0, SIZE, SIZE, 40);
            ctx.clip();

            // "cover" 模式：等比縮放填滿畫布，多餘部分裁切（不拉伸）
            const scale = Math.max(SIZE / img.width, SIZE / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const dx = (SIZE - w) / 2;
            const dy = (SIZE - h) / 2;
            ctx.drawImage(img, dx, dy, w, h);

            const dataUrl = canvas.toDataURL('image/png');
            updateIconLinks(dataUrl);
            _updateManifestWithIcon(dataUrl);
        };
        img.src = identity.customIcon;
    } else {
        ctx.clearRect(0, 0, SIZE, SIZE);
        drawVaultPath(ctx, SIZE / 2, SIZE / 2, 110, identity.themeColor);
        const dataUrl = canvas.toDataURL('image/png');
        updateIconLinks(dataUrl);
        _updateManifestWithIcon(dataUrl);
    }
}

/** 將動態產生的圖示寫入 manifest icons，確保 Android 主畫面也使用正確圖示 */
function _updateManifestWithIcon(dataUrl) {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) return;
    try {
        fetch(manifestLink.href)
            .then(r => r.json())
            .then(manifest => {
                manifest.icons = [
                    { src: dataUrl, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
                    { src: dataUrl, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
                ];
                const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
                manifestLink.setAttribute('href', URL.createObjectURL(blob));
            })
            .catch(() => {});
    } catch (e) {}
}

function drawVaultPath(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x - size / 2, y - size / 2);
    ctx.scale(size / 512, size / 512);
    ctx.fillStyle = color;
    // Simplified Vault Path (similar to FA vault)
    const p = new Path2D("M448 80c8.8 0 16 7.2 16 16V416c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16H448zM0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64C28.7 32 0 60.7 0 96zM192 256a64 64 0 1 0 128 0 64 64 0 1 0 -128 0zm64-32c17.7 0 32 14.3 32 32s-14.3 32-32 32s-32-14.3-32-32s14.3-32 32-32z");
    ctx.fill(p);
    ctx.restore();
}

function updateIconLinks(dataUrl) {
    const icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.href = dataUrl;

    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleIcon) appleIcon.href = dataUrl;
}

async function applyDynamicManifest() {
    const stored = localStorage.getItem(APP_IDENTITY_KEY);
    if (!stored) return;
    const identity = JSON.parse(stored);

    // Fetch base manifest
    try {
        const response = await fetch('manifest.json');
        const manifest = await response.json();

        // Update manifest
        manifest.theme_color = identity.themeColor;
        // Note: Real manifestation of icon update for home screen depends on browser/OS
        // We can't easily change the installed PWA icon without a re-install or specialized logic
        // but this works for future installs and browser-side PWA representation.

        const stringManifest = JSON.stringify(manifest);
        const blob = new Blob([stringManifest], { type: 'application/json' });
        const manifestURL = URL.createObjectURL(blob);

        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) manifestLink.setAttribute('href', manifestURL);
    } catch (e) { }
}
