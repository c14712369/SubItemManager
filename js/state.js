// ====== js/state.js ======
const STORAGE_KEY = 'subscription_manager_data';
const THEME_KEY = 'subscription_manager_theme';
const CAT_KEY = 'subscription_manager_categories';
const INCOME_KEY = 'subscription_manager_income';
const LIFE_EXP_KEY = 'sub_mgr_life_expenses';
const LIFE_CAT_KEY = 'sub_mgr_life_categories';
const LIFE_INC_CAT_KEY = 'sub_mgr_life_inc_categories';
const LIFE_BDG_KEY = 'sub_mgr_life_budgets';
const WEALTH_PARAMS_KEY = 'sub_mgr_wealth_params';

let items = [];
let categories = [];
let lifeExpenses = [];
let lifeCategories = [];
let lifeIncomeCategories = [];
let lifeBudgets = {};
let lifeCurrentMonth = '';
let chartInstance = null;
let lifeCatChartInstance = null;
let trendChartInstance = null;
let wealthChartInstance = null;
let currentChartYear = new Date().getFullYear();

// Default Categories
const DEFAULT_CATS = [
    { id: 'cat_ent', name: '娛樂', color: '#8b5cf6' },
    { id: 'cat_work', name: '工作', color: '#3b82f6' },
    { id: 'cat_life', name: '生活', color: '#10b981' },
    { id: 'cat_ins', name: '保險', color: '#f59e0b' },
    { id: 'cat_other', name: '其他', color: '#94a3b8' }
];

const DEFAULT_LIFE_CATS = [
    { id: 'lc_food', name: '飲食', color: '#C17B2E' },
    { id: 'lc_trans', name: '交通', color: '#2A6475' },
    { id: 'lc_util', name: '水電費', color: '#5A9E7A' },
    { id: 'lc_ent', name: '娛樂', color: '#8B5CF6' },
    { id: 'lc_health', name: '醫療', color: '#D46060' },
    { id: 'lc_other', name: '其他', color: '#8A8A8A' }
];

const DEFAULT_LIFE_INC_CATS = [
    { id: 'lc_inc_salary', name: '薪資', color: '#5A9E7A' },
    { id: 'lc_inc_bonus', name: '獎金', color: '#C17B2E' },
    { id: 'lc_inc_invest', name: '投資', color: '#2A6475' },
    { id: 'lc_inc_other', name: '其他', color: '#8A8A8A' }
];

let dragSrcEl = null;
let _currentCatManageType = 'expense';
