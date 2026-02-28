// ====== js/supabase-sync.js ======
let currentUser = null;
let lastSyncTime = 0;

// Listen for auth state changes (login, logout, refresh)
supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();

    if (event === 'SIGNED_IN') {
        fetchFromServer();
    } else if (event === 'SIGNED_OUT') {
        showToast('已登出，切換為本地端模式');
    }
});

// Check initial session on load
async function checkSession(skipFetch = false) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;
    updateAuthUI();
    if (currentUser && !skipFetch) {
        // Automatically fetch latest on fresh reload if logged in
        await fetchFromServer();
    }
}

// Update UI based on auth state
function updateAuthUI() {
    const loginBtn = document.getElementById('authLoginBtn');
    const userEmailSpan = document.getElementById('authUserEmail');

    if (loginBtn && userEmailSpan) {
        if (currentUser) {
            loginBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> 登出';
            loginBtn.onclick = handleLogout;
            userEmailSpan.textContent = currentUser.email;
            userEmailSpan.style.display = 'inline';
        } else {
            loginBtn.innerHTML = '<i class="fa-solid fa-user"></i> 登入 / 註冊';
            loginBtn.onclick = openAuthModal;
            userEmailSpan.style.display = 'none';
        }
    }
}

// Auth Actions
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;

    // First try login
    let { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    // If user not found or invalid, maybe they want to sign up? (Simplified for now)
    if (error && error.message.includes('Invalid login credentials')) {
        if (confirm('找不到帳號或密碼錯誤。請問您要用這個信箱與密碼直接「註冊」一個新帳號嗎？')) {
            const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({ email, password });
            if (signUpError) {
                alert('註冊失敗：' + signUpError.message);
                return;
            }
            alert('註冊成功！請檢查您的信箱以驗證帳號，或直接登入（視 Supabase 設定而定）。');
            closeAuthModal();
            return;
        } else {
            alert('登入失敗：' + error.message);
            return;
        }
    } else if (error) {
        alert('登入發生錯誤：' + error.message);
        return;
    }

    closeAuthModal();
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
}

// -----------------------------------------
// Data Synchronization
// -----------------------------------------

// Pack current state data into a JSON structure
function exportStateAsJSON() {
    var storedIncome = localStorage.getItem(INCOME_KEY);
    var storedWealth = localStorage.getItem(WEALTH_PARAMS_KEY);

    return {
        items: items || [],
        categories: categories || [],
        lifeExpenses: lifeExpenses || [],
        lifeCategories: lifeCategories || [],
        lifeIncomeCategories: lifeIncomeCategories || [],
        lifeBudgets: lifeBudgets || {},
        projects: projects || [],
        projectExpenses: projectExpenses || [],
        projectCategories: projectCategories || [],
        settings: {
            estimatedIncome: storedIncome,
            wealthParams: storedWealth ? JSON.parse(storedWealth) : null
        }
    };
}

// Upload current state to Supabase matching `user_backups` table schema
async function syncToServer(force = false) {
    if (!currentUser) return; // Only sync if logged in (Offline mode fallback)

    // Prevent spamming the server
    const now = Date.now();
    if (!force && now - lastSyncTime < 2000) return;
    lastSyncTime = now;

    const exportData = exportStateAsJSON();

    const { error } = await supabaseClient
        .from('user_backups')
        .upsert({
            user_id: currentUser.id,
            app_data: exportData,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error('雲端同步失敗:', error.message);
        // showToast('雲端同步失敗', 'error'); // Optional
    } else {
        console.log('雲端同步成功', new Date().toLocaleTimeString());
    }
}

// Debounced version for frequent local saves
let syncTimeout = null;
function triggerCloudSync() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        syncToServer();
    }, 1500); // Wait 1.5 seconds of inactivity before syncing
}

// Download state from Supabase and overwrite localStorage
async function fetchFromServer() {
    if (!currentUser) return;

    const loadingOverlay = document.getElementById('syncLoading');
    if (loadingOverlay) loadingOverlay.classList.add('active');

    try {
        const { data, error } = await supabaseClient
            .from('user_backups')
            .select('app_data, updated_at')
            .eq('user_id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
            console.error('讀取雲端資料失敗:', error.message);
            showToast('讀取雲端資料失敗');
            return;
        }

        if (data && data.app_data) {
            const cloudTimestamp = new Date(data.updated_at).getTime();
            const localTimestampRaw = localStorage.getItem('last_local_update');
            const localTimestamp = localTimestampRaw ? parseInt(localTimestampRaw, 10) : 0;

            // Conflict Resolution:
            // Only push local over cloud if the user actually has real fixed subscription data locally.
            // A single auto-applied salary entry (lifeExpenses=1, items=0) does NOT count as real local data
            // and should never override what's in the cloud.
            var localHasRealData = (items && items.length > 0) || (projects && projects.length > 0);

            if (localHasRealData && localTimestamp > cloudTimestamp) {
                console.log('本地資料較新，將本地資料推上雲端覆蓋');
                if (loadingOverlay) loadingOverlay.classList.remove('active');
                await syncToServer(true); // Force push local to cloud
                return;
            }

            const appData = data.app_data;
            // Overwrite JS variables & LocalStorage
            items = appData.items || [];
            categories = appData.categories || DEFAULT_CATS;
            lifeExpenses = appData.lifeExpenses || [];
            lifeCategories = appData.lifeCategories || DEFAULT_LIFE_CATS;
            lifeIncomeCategories = appData.lifeIncomeCategories || DEFAULT_LIFE_INC_CATS;
            lifeBudgets = appData.lifeBudgets || {};
            projects = appData.projects || [];
            projectExpenses = appData.projectExpenses || [];

            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            localStorage.setItem(CAT_KEY, JSON.stringify(categories));
            localStorage.setItem(LIFE_EXP_KEY, JSON.stringify(lifeExpenses));
            localStorage.setItem(LIFE_CAT_KEY, JSON.stringify(lifeCategories));
            localStorage.setItem(LIFE_INC_CAT_KEY, JSON.stringify(lifeIncomeCategories));
            localStorage.setItem(LIFE_BDG_KEY, JSON.stringify(lifeBudgets));
            localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
            localStorage.setItem(PROJECT_EXP_KEY, JSON.stringify(projectExpenses));

            if (appData.projectCategories) {
                projectCategories = appData.projectCategories;
                localStorage.setItem(PROJECT_CAT_KEY, JSON.stringify(projectCategories));
            }

            if (appData.settings) {
                if (appData.settings.estimatedIncome !== undefined) {
                    localStorage.setItem(INCOME_KEY, appData.settings.estimatedIncome);
                    const incInput = document.getElementById('monthlyIncomeInput');
                    if (incInput) incInput.value = appData.settings.estimatedIncome;
                }
                if (appData.settings.wealthParams) {
                    localStorage.setItem(WEALTH_PARAMS_KEY, JSON.stringify(appData.settings.wealthParams));
                }
            }
            // showToast('已載入雲端最新資料'); // Removed per request

            // Refresh all UI — use init(true) to ensure every tab renders correctly
            init(true); // skipCloudFetch=true prevents infinite re-fetch loop
            // showToast('已載入雲端最新資料'); // Removed to reduce notification clutter

        } else {
            // First log in, no cloud data. Push current local data to cloud to initialize.
            showToast('首次登入，將本地資料同步至雲端...');
            await syncToServer(true);
        }
    } catch (err) {
        console.error('Fetch error:', err);
    } finally {
        if (loadingOverlay) loadingOverlay.classList.remove('active');
    }
}

// Modal UI Controls
function openAuthModal() {
    document.getElementById('authModalOverlay').classList.add('active');
}
function closeAuthModal() {
    document.getElementById('authModalOverlay').classList.remove('active');
}

// Initial check on load
// WE DO NOT auto-run checkSession here anymore.
// It is explicitly called at the end of `init()` in main.js to prevent race conditions
// with data.js initializing defaults.
