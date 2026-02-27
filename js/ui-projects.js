// ====== js/ui-projects.js ======

function loadProjectsData() {
    var stored = localStorage.getItem(PROJECTS_KEY);
    projects = stored ? JSON.parse(stored) : [];

    var storedExp = localStorage.getItem(PROJECT_EXP_KEY);
    projectExpenses = storedExp ? JSON.parse(storedExp) : [];

    var storedCat = localStorage.getItem(PROJECT_CAT_KEY);
    if (storedCat) {
        projectCategories = JSON.parse(storedCat);
    } else {
        projectCategories = JSON.parse(JSON.stringify(DEFAULT_PROJECT_CATS));
        saveProjectsData();
    }
}

function saveProjectsData() {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    localStorage.setItem(PROJECT_EXP_KEY, JSON.stringify(projectExpenses));
    localStorage.setItem(PROJECT_CAT_KEY, JSON.stringify(projectCategories));
    if (typeof triggerCloudSync === 'function') triggerCloudSync();
}

function openProjectModal(id) {
    document.getElementById('projectModalOverlay').classList.add('active');
    if (id) {
        var p = projects.find(function (x) { return x.id === id; });
        if (p) {
            document.getElementById('projectModalTitle').innerText = '編輯企劃專案';
            document.getElementById('projectId').value = p.id;
            document.getElementById('projectName').value = p.name;
            document.getElementById('projectBudget').value = p.budget;
            document.getElementById('projectStartDate').value = p.startDate || '';
            document.getElementById('projectEndDate').value = p.endDate || '';
            document.getElementById('projectStatus').value = p.status || 'active';
        }
    } else {
        document.getElementById('projectModalTitle').innerText = '新增企劃專案';
        document.getElementById('projectId').value = '';
        document.getElementById('projectName').value = '';
        document.getElementById('projectBudget').value = '';
        document.getElementById('projectStartDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('projectEndDate').value = '';
        document.getElementById('projectStatus').value = 'active';
    }
}

function closeProjectModal() {
    document.getElementById('projectModalOverlay').classList.remove('active');
}

function handleProjectSubmit(e) {
    e.preventDefault();
    var id = document.getElementById('projectId').value;
    var name = document.getElementById('projectName').value;
    var budget = parseFloat(document.getElementById('projectBudget').value) || 0;
    var start = document.getElementById('projectStartDate').value;
    var end = document.getElementById('projectEndDate').value;
    var status = document.getElementById('projectStatus').value;

    if (id) {
        var idx = projects.findIndex(function (x) { return x.id === id; });
        if (idx > -1) {
            projects[idx].name = name;
            projects[idx].budget = budget;
            projects[idx].startDate = start;
            projects[idx].endDate = end;
            projects[idx].status = status;
        }
        showToast('專案已更新');
    } else {
        projects.push({
            id: crypto.randomUUID(),
            name: name,
            budget: budget,
            startDate: start,
            endDate: end,
            status: status,
            createdAt: new Date().toISOString()
        });
        showToast('專案已建立');
    }
    saveProjectsData();
    closeProjectModal();
    renderProjects();
}

function renderProjects() {
    var container = document.getElementById('projectList');
    if (!container) return;
    container.innerHTML = '';

    var filter = document.getElementById('projectStatusFilter').value;
    var filtered = projects.filter(function (p) {
        if (filter === 'all') return true;
        return (p.status || 'active') === filter;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:var(--text-muted);">目前沒有專案。點擊上方「新增企劃專案」開始建立。</div>';
        return;
    }

    // Sort by latest created/started
    filtered.sort(function (a, b) {
        return new Date(b.startDate || b.createdAt) - new Date(a.startDate || a.createdAt);
    });

    filtered.forEach(function (p) {
        var exps = projectExpenses.filter(function (e) { return e.projectId === p.id; });
        var spent = exps.reduce(function (sum, item) { return sum + item.amount; }, 0);
        var remain = p.budget - spent;
        var pct = p.budget > 0 ? Math.min(100, (spent / p.budget) * 100) : 0;
        var statusBadge = (p.status === 'ended') ? '<span class="status-badge ended">已結束</span>' : '<span class="status-badge">進行中</span>';

        container.innerHTML += `
            <div class="stat-card category-card" style="cursor: pointer; position:relative;" onclick="openProjectDetailModal('${p.id}')">
                <div style="position:absolute; top:12px; right:12px;">
                    <button class="icon-btn" onclick="event.stopPropagation(); openProjectModal('${p.id}')" title="編輯" style="margin-right:4px;"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-btn" onclick="event.stopPropagation(); deleteProject('${p.id}')" title="刪除"><i class="fa-solid fa-trash-can" style="color:var(--danger-color)"></i></button>
                </div>
                <div class="stat-title" style="margin-bottom:8px; font-size:1.1rem; color:var(--text-color); font-weight:bold;">
                    ${p.name} ${statusBadge}
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">
                    ${p.startDate || ''} ${p.endDate ? ' ~ ' + p.endDate : ''}
                </div>
                
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.9rem;">
                    <span>已花費: <b>NT$ ${spent.toLocaleString()}</b></span>
                    <span style="color:var(--text-muted);">總預算: NT$ ${p.budget.toLocaleString()}</span>
                </div>
                <div class="progress-bar-wrap" style="margin-bottom:0;">
                    <div class="progress-bar" style="height:6px;">
                        <div class="progress-fill" style="width:${pct}%; background: ${pct > 100 ? 'var(--danger-color)' : 'var(--primary-color)'}"></div>
                    </div>
                </div>
                <div style="text-align:right; font-size:0.8rem; margin-top:4px; color:${remain < 0 ? 'var(--danger-color)' : 'var(--text-muted)'}">
                    剩餘: NT$ ${remain.toLocaleString()}
                </div>
            </div>
        `;
    });
}

function deleteProject(id) {
    if (confirm('確定要刪除此專案嗎？相關的支出明細也會一併刪除。')) {
        projects = projects.filter(function (p) { return p.id !== id; });
        projectExpenses = projectExpenses.filter(function (e) { return e.projectId !== id; });
        saveProjectsData();
        renderProjects();
        showToast('專案已刪除');
    }
}

// ---- Project Details & Expenses ----

function openProjectDetailModal(projectId) {
    var p = projects.find(function (x) { return x.id === projectId; });
    if (!p) return;

    document.getElementById('projectDetailModalOverlay').classList.add('active');
    document.getElementById('projectDetailTitle').innerText = p.name + ' - 專案明細';
    document.getElementById('projectExpParentId').value = p.id;

    // reset form
    document.getElementById('projectExpId').value = '';
    document.getElementById('projectExpName').value = '';
    document.getElementById('projectExpAmount').value = '';
    document.getElementById('projectExpDate').value = new Date().toISOString().split('T')[0];

    // populate categories
    var catSelect = document.getElementById('projectExpCat');
    if (catSelect) {
        catSelect.innerHTML = '';
        projectCategories.forEach(function (c) {
            catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }

    renderProjectDetails(projectId);
}

function closeProjectDetailModal() {
    document.getElementById('projectDetailModalOverlay').classList.remove('active');
    renderProjects(); // refresh card stats when closing
}

function renderProjectDetails(projectId) {
    var p = projects.find(function (x) { return x.id === projectId; });
    if (!p) return;

    var exps = projectExpenses.filter(function (e) { return e.projectId === projectId; });
    var spent = exps.reduce(function (sum, item) { return sum + item.amount; }, 0);
    var remain = p.budget - spent;
    var pct = p.budget > 0 ? Math.min(100, (spent / p.budget) * 100) : 0;

    document.getElementById('detailProjectBudget').innerText = 'NT$ ' + p.budget.toLocaleString();
    document.getElementById('detailProjectSpent').innerText = 'NT$ ' + spent.toLocaleString();

    var remEl = document.getElementById('detailProjectRemain');
    remEl.innerText = 'NT$ ' + remain.toLocaleString();
    remEl.style.color = remain < 0 ? 'var(--danger-color)' : 'var(--text-color)';

    document.getElementById('detailProjectPct').innerText = '支出 ' + Math.round((spent / (p.budget || 1)) * 100) + '%';
    document.getElementById('detailProjectProgress').style.width = pct + '%';
    document.getElementById('detailProjectProgress').style.backgroundColor = pct > 100 ? 'var(--danger-color)' : 'var(--primary-color)';

    var list = document.getElementById('projectDetailExpList');
    list.innerHTML = '';

    if (exps.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">尚無明細支出</div>';
        return;
    }

    exps.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    exps.forEach(function (e) {
        var cat = projectCategories.find(function (c) { return c.id === e.categoryId; });
        var catName = cat ? cat.name : '未分類';
        var catColor = cat ? cat.color : 'var(--text-muted)';

        list.innerHTML += `
            <div class="list-item">
                <div class="item-info">
                    <div class="item-name">${e.name}</div>
                    <div class="item-tags">
                        <span class="tag" style="background:var(--bg-color); color:${catColor};"><i class="fa-solid fa-circle" style="font-size:8px; margin-right:4px;"></i>${catName}</span>
                        <span class="tag" style="background:var(--bg-color)"><i class="fa-regular fa-calendar" style="margin-right:4px;"></i>${e.date}</span>
                    </div>
                </div>
                <div class="item-cost" style="text-align:right;">
                    <div class="amount" style="color:var(--danger-color); font-size:1.1rem;">NT$ ${e.amount.toLocaleString()}</div>
                    <button class="icon-btn" onclick="deleteProjectExp('${e.id}', '${p.id}')" title="刪除"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
    });
}

function handleProjectExpSubmit(e) {
    e.preventDefault();
    var pid = document.getElementById('projectExpParentId').value;
    var name = document.getElementById('projectExpName').value;
    var amount = parseFloat(document.getElementById('projectExpAmount').value) || 0;
    var date = document.getElementById('projectExpDate').value;
    var catId = document.getElementById('projectExpCat') ? document.getElementById('projectExpCat').value : '';

    projectExpenses.push({
        id: crypto.randomUUID(),
        projectId: pid,
        categoryId: catId,
        name: name,
        amount: amount,
        date: date,
        createdAt: new Date().toISOString()
    });

    saveProjectsData();
    showToast('明細已新增');

    document.getElementById('projectExpName').value = '';
    document.getElementById('projectExpAmount').value = '';
    document.getElementById('projectExpName').focus();

    renderProjectDetails(pid);
}

function deleteProjectExp(expId, projectId) {
    if (confirm('確定要刪除這筆明細嗎？')) {
        projectExpenses = projectExpenses.filter(function (e) { return e.id !== expId; });
        saveProjectsData();
        renderProjectDetails(projectId);
    }
}

// ==== Project Categories Management ====

function openProjectCatModal() {
    document.getElementById('projectCatModalOverlay').classList.add('active');
    cancelProjectCatEdit();
    renderProjectCategories();
}

function closeProjectCatModal() {
    document.getElementById('projectCatModalOverlay').classList.remove('active');
}

function renderProjectCategories() {
    var list = document.getElementById('projectCategoryList');
    if (!list) return;
    list.innerHTML = '';

    projectCategories.forEach(function (cat) {
        list.innerHTML += `
            <div class="category-item">
                <div style="display:flex; align-items:center;">
                    <div class="color-dot" style="background-color: ${cat.color}"></div>
                    <span style="font-weight:500;">${cat.name}</span>
                </div>
                <div>
                    <button class="icon-btn" onclick="editProjectCategory('${cat.id}')" title="編輯"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-btn delete" onclick="deleteProjectCategory('${cat.id}')" title="刪除"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
    });

    // Also update the select dropdown in the Add Expense form
    var catSelect = document.getElementById('projectExpCat');
    var currentVal = catSelect ? catSelect.value : '';
    if (catSelect) {
        catSelect.innerHTML = '';
        projectCategories.forEach(function (c) {
            catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        if (currentVal && projectCategories.find(c => c.id === currentVal)) {
            catSelect.value = currentVal;
        }
    }
}

function saveProjectCategory() {
    var id = document.getElementById('editProjectCatId').value;
    var name = document.getElementById('newProjectCatName').value.trim();
    var color = document.getElementById('newProjectCatColor').value;

    if (!name) { alert('請輸入分類名稱'); return; }

    if (id) {
        var idx = projectCategories.findIndex(function (c) { return c.id === id; });
        if (idx > -1) {
            projectCategories[idx].name = name;
            projectCategories[idx].color = color;
        }
    } else {
        projectCategories.push({ id: 'pcat_' + Date.now(), name: name, color: color });
    }

    saveProjectsData();
    cancelProjectCatEdit();
    renderProjectCategories();
    // Re-render project details if opened to reflect new colors/names
    var parentId = document.getElementById('projectExpParentId').value;
    if (parentId) {
        renderProjectDetails(parentId);
    }
}

function editProjectCategory(id) {
    var cat = projectCategories.find(function (c) { return c.id === id; });
    if (!cat) return;
    document.getElementById('editProjectCatId').value = cat.id;
    document.getElementById('newProjectCatName').value = cat.name;
    document.getElementById('newProjectCatColor').value = cat.color;
    document.getElementById('cancelProjectCatBtn').style.display = 'inline-flex';
}

function cancelProjectCatEdit() {
    document.getElementById('editProjectCatId').value = '';
    document.getElementById('newProjectCatName').value = '';
    document.getElementById('newProjectCatColor').value = '#2A6475';
    document.getElementById('cancelProjectCatBtn').style.display = 'none';
}

function deleteProjectCategory(id) {
    var inUse = projectExpenses.some(function (e) { return e.categoryId === id; });
    if (inUse) {
        alert('此分類目前有明細正在使用，無法刪除。\\n請先修改相關明細的分類。');
        return;
    }
    if (confirm('確定要刪除這個分類標籤嗎？')) {
        projectCategories = projectCategories.filter(function (c) { return c.id !== id; });
        saveProjectsData();
        renderProjectCategories();
    }
}
