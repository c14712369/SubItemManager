// ====== js/ui-fixed.js ======
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
function openCategoryModal() {
    const catModalOverlay = document.getElementById('categoryModalOverlay');
    if (catModalOverlay) catModalOverlay.classList.add('active');
    renderCategoryList();
}

function closeCategoryModal() {
    const catModalOverlay = document.getElementById('categoryModalOverlay');
    if (catModalOverlay) catModalOverlay.classList.remove('active');
    populateCategorySelect();
}

function renderCategoryList() {
    const list = document.getElementById('categoryList');
    if (!list) return;
    list.innerHTML = '';

    categories.forEach((cat, index) => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.draggable = true;
        item.dataset.index = index;

        item.innerHTML = `
            <div style="display:flex; align-items:center; pointer-events: none;">
                <i class="fa-solid fa-grip-lines handle" style="color:var(--text-muted); margin-right:10px; cursor:grab; pointer-events: auto;"></i>
                <div class="color-dot" style="background:${cat.color}"></div>
                <span>${cat.name}</span>
            </div>
            <div style="gap:5px; display:flex;">
                <button class="icon-btn" onclick="editCategory('${cat.id}')"><i class="fa-solid fa-pen"></i></button>
                ${DEFAULT_CATS.find(d => d.id === cat.id) ? '' :
                `<button class="icon-btn delete" onclick="deleteCategory('${cat.id}')"><i class="fa-solid fa-trash"></i></button>`
            }
            </div>
        `;

        item.addEventListener('dragstart', handleCatDragStart);
        item.addEventListener('dragover', handleCatDragOver);
        item.addEventListener('drop', handleCatDrop);
        item.addEventListener('dragenter', handleCatDragEnter);
        item.addEventListener('dragleave', handleCatDragLeave);
        item.addEventListener('dragend', handleCatDragEnd);
        list.appendChild(item);
    });
}

function saveCategory() {
    const idInput = document.getElementById('editCatId');
    const nameInput = document.getElementById('newCatName');
    const colorInput = document.getElementById('newCatColor');

    const name = nameInput.value.trim();
    if (!name) return;
    const id = idInput.value;

    if (id) {
        const cat = categories.find(c => c.id === id);
        if (cat) {
            cat.name = name;
            cat.color = colorInput.value;
            showToast('分類已更新');
        }
    } else {
        categories.push({ id: 'cat_' + Date.now(), name: name, color: colorInput.value });
        showToast('分類已新增');
    }

    saveData();
    renderCategoryList();
    cancelCatEdit();
}

function editCategory(id) {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    document.getElementById('editCatId').value = cat.id;
    document.getElementById('newCatName').value = cat.name;
    document.getElementById('newCatColor').value = cat.color;

    document.getElementById('saveCatBtn').innerHTML = '<i class="fa-solid fa-check"></i>';
    document.getElementById('cancelCatBtn').style.display = 'inline-block';
    document.getElementById('newCatName').focus();
}

function cancelCatEdit() {
    const idInput = document.getElementById('editCatId');
    if (!idInput) return;
    document.getElementById('editCatId').value = '';
    document.getElementById('newCatName').value = '';
    document.getElementById('newCatColor').value = '#4f46e5';

    document.getElementById('saveCatBtn').innerHTML = '<i class="fa-solid fa-plus"></i>';
    document.getElementById('cancelCatBtn').style.display = 'none';
}

function deleteCategory(id) {
    if (confirm('刪除此分類？關聯的項目將變為「其他」。')) {
        categories = categories.filter(c => c.id !== id);
        items.forEach(i => {
            if (i.categoryId === id) i.categoryId = 'cat_other';
        });
        saveData();
        renderCategoryList();
        if (document.getElementById('editCatId').value === id) cancelCatEdit();
    }
}

function handleCatDragStart(e) {
    const item = e.target.closest('.category-item');
    if (!item) return;
    const index = item.dataset.index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    setTimeout(() => item.classList.add('dragging'), 0);
}
function handleCatDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; }
function handleCatDragEnter(e) { const item = e.target.closest('.category-item'); if (item) item.classList.add('over'); }
function handleCatDragLeave(e) { const item = e.target.closest('.category-item'); if (item && !item.contains(e.relatedTarget)) item.classList.remove('over'); }
function handleCatDrop(e) {
    e.stopPropagation(); e.preventDefault();
    const targetItem = e.target.closest('.category-item');
    const srcIndexStr = e.dataTransfer.getData('text/plain');
    if (srcIndexStr !== '' && targetItem) {
        const srcIndex = parseInt(srcIndexStr, 10);
        const targetIndex = parseInt(targetItem.dataset.index, 10);
        if (!isNaN(srcIndex) && !isNaN(targetIndex) && srcIndex !== targetIndex) {
            const item = categories.splice(srcIndex, 1)[0];
            categories.splice(targetIndex, 0, item);
            saveData();
            renderCategoryList();
        }
    }
    document.querySelectorAll('.category-item').forEach(el => { el.classList.remove('over', 'dragging'); });
    return false;
}
function handleCatDragEnd(e) {
    const el = e.target.closest('.category-item');
    if (el) el.classList.remove('dragging');
    document.querySelectorAll('.category-item').forEach(el => el.classList.remove('over'));
}

function populateCategorySelect() {
    const select = document.getElementById('itemCategory');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (currentVal && categories.find(c => c.id === currentVal)) select.value = currentVal;
}

function openModal(editMode = false) {
    populateCategorySelect();
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.classList.add('active');

    if (!editMode) {
        const form = document.getElementById('itemForm');
        if (form) form.reset();
        document.getElementById('itemId').value = '';
        document.getElementById('modalTitle').textContent = '新增項目';
        document.getElementById('itemStartDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('itemCurrency').value = 'TWD';
        document.getElementById('itemExchangeRate').value = 1;
        handleCurrencyChange();
    }
}

function closeModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.classList.remove('active');
}

async function handleCurrencyChange() {
    const curr = document.getElementById('itemCurrency').value;
    const rateRow = document.getElementById('exchangeRateRow');
    const rateInput = document.getElementById('itemExchangeRate');
    if (!rateRow || !rateInput) return;

    if (curr === 'TWD') {
        rateRow.style.display = 'none';
        rateInput.value = 1;
        calculateTWD();
    } else {
        rateRow.style.display = 'flex';

        // Show loading state
        rateInput.placeholder = '抓取即時匯率中...';

        try {
            // Fetch live exchange rates against TWD
            const response = await fetch('https://open.er-api.com/v6/latest/' + curr);
            if (response.ok) {
                const data = await response.json();
                if (data && data.rates && data.rates.TWD) {
                    // Pre-fill with the fetched rate, but do not override if the modal is in edit mode and rate already exists
                    const currentModalTitle = document.getElementById('modalTitle').textContent;
                    if (currentModalTitle === '新增項目' || !rateInput.value || rateInput.value == "1") {
                        rateInput.value = data.rates.TWD.toFixed(4);
                    }
                }
            }
        } catch (error) {
            console.error('匯率 API 抓取失敗:', error);
            showToast('即時匯率抓取失敗，請手動輸入');
        } finally {
            rateInput.placeholder = '請手動輸入';
            calculateTWD();
        }
    }
}

function calculateTWD() {
    const original = parseFloat(document.getElementById('itemOriginalAmount').value) || 0;
    const rate = parseFloat(document.getElementById('itemExchangeRate').value) || 1;
    const total = Math.round(original * rate);
    const twdInput = document.getElementById('itemAmountTWD');
    const amountHidden = document.getElementById('itemAmount');
    if (twdInput) twdInput.value = `NT$ ${total.toLocaleString()}`;
    if (amountHidden) amountHidden.value = total;
}

function editItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;

    populateCategorySelect();
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemCategory').value = item.categoryId;
    document.getElementById('itemCurrency').value = item.currency || 'TWD';
    document.getElementById('itemOriginalAmount').value = item.originalAmount || item.amount;
    document.getElementById('itemExchangeRate').value = item.exchangeRate || 1;
    handleCurrencyChange();

    document.getElementById('itemCycle').value = item.cycle;
    document.getElementById('itemStartDate').value = item.startDate;
    document.getElementById('itemEndDate').value = item.endDate || '';
    document.getElementById('itemNote').value = item.note || '';

    document.getElementById('modalTitle').textContent = '編輯項目';
    openModal(true);
}

function handleFormSubmit(e) {
    e.preventDefault();
    calculateTWD();
    const data = {
        name: document.getElementById('itemName').value,
        categoryId: document.getElementById('itemCategory').value,
        currency: document.getElementById('itemCurrency').value, // added to match
        originalAmount: parseFloat(document.getElementById('itemOriginalAmount').value),
        exchangeRate: parseFloat(document.getElementById('itemExchangeRate').value),
        amount: parseInt(document.getElementById('itemAmount').value),
        cycle: document.getElementById('itemCycle').value,
        startDate: document.getElementById('itemStartDate').value,
        endDate: document.getElementById('itemEndDate').value,
        note: document.getElementById('itemNote').value
    };

    const id = document.getElementById('itemId').value;
    if (id) updateItem(id, data);
    else addItem(data);
    closeModal();
}

function render() {
    const stats = calculateStats();
    document.getElementById('totalMonthly').textContent = `NT$ ${Math.round(stats.monthly).toLocaleString()}`;
    document.getElementById('totalYearly').textContent = `NT$ ${Math.round(stats.yearly).toLocaleString()}`;
    updateBudgetCalc();

    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const status = statusFilter ? statusFilter.value : 'all';

    const list = document.getElementById('itemsList');
    if (!list) return;
    list.innerHTML = '';

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const filtered = items.filter(item => {
        const matchText = item.name.toLowerCase().includes(search) || (item.note && item.note.toLowerCase().includes(search));
        if (!matchText) return false;
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

    filtered.sort((a, b) => {
        const catIndexA = categories.findIndex(c => c.id === a.categoryId);
        const catIndexB = categories.findIndex(c => c.id === b.categoryId);
        const idxA = catIndexA === -1 ? 999 : catIndexA;
        const idxB = catIndexB === -1 ? 999 : catIndexB;
        return idxA - idxB;
    });

    filtered.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'item-card';
        el.setAttribute('draggable', 'true');
        el.dataset.id = item.id;
        el.dataset.index = items.indexOf(item);

        el.addEventListener('dragstart', handleDragStart);
        el.addEventListener('dragover', handleDragOver);
        el.addEventListener('drop', handleDrop);
        el.addEventListener('dragenter', handleDragEnter);
        el.addEventListener('dragleave', handleDragLeave);
        el.addEventListener('dragend', handleDragEnd);

        const category = categories.find(c => c.id === item.categoryId) || categories[categories.length - 1];
        const cycleLabel = getCycleLabel(item.cycle);

        let statusHtml = '';
        const endDate = item.endDate ? new Date(item.endDate) : null;
        if (endDate && endDate < now) {
            statusHtml = '<span style="font-size:0.8rem; background:#fee2e2; color:#ef4444; padding:2px 6px; border-radius:4px; margin-left:8px;">已結束</span>';
            el.style.opacity = '0.7';
        }

        let amountDisplay = `NT$ ${item.amount.toLocaleString()}`;
        if (item.currency && item.currency !== 'TWD') {
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
        const srcIndex = parseInt(dragSrcEl.dataset.index);
        const targetIndex = parseInt(this.dataset.index);
        const item = items[srcIndex];
        items.splice(srcIndex, 1);
        items.splice(targetIndex, 0, item);
        saveData();
    }
    return false;
}
function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.item-card').forEach(col => col.classList.remove('over'));
}
