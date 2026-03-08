// ====== js/credit-card-service.js ======
// 串接 CreditCardAnalyzer Supabase，抓取信用卡與回饋資料

const CC_ANALYZER_CONFIG_KEY = 'sub_mgr_cc_analyzer_config';

// 生活費類別 -> 信用卡 Category 關鍵字對應表
const LIFE_CAT_TO_CC_CATEGORY = {
    'lc_food':   ['餐飲', '餐廳', '美食', '飲食', '國內一般'],
    'lc_trans':  ['交通', '加油', '捷運', '停車', '國內一般'],
    'lc_util':   ['帳單', '繳費', '水電', '公用事業', '國內一般'],
    'lc_ent':    ['娛樂', '電影', '購物', '國內一般'],
    'lc_health': ['醫療', '健康', '藥妝', '國內一般'],
    'lc_other':  ['國內一般'],
};

const CreditCardService = {
    _cards: null,
    _rewards: null,
    _fetchedAt: 0,
    CACHE_MS: 5 * 60 * 1000, // 5 分鐘快取

    getConfig() {
        const raw = localStorage.getItem(CC_ANALYZER_CONFIG_KEY);
        if (raw) return JSON.parse(raw);
        // Default fallback
        return {
            url: 'https://rfgrvrbghdzihcgvunbw.supabase.co',
            anonKey: 'sb_publishable_CtZgegRojQQWZ0Ph3tGbyQ_6eB7Oixr'
        };
    },

    saveConfig(url, anonKey) {
        localStorage.setItem(CC_ANALYZER_CONFIG_KEY, JSON.stringify({ url, anonKey }));
        // 清快取
        this._cards = null;
        this._rewards = null;
        this._fetchedAt = 0;
    },

    isConfigured() {
        const cfg = this.getConfig();
        return !!(cfg && cfg.url && cfg.anonKey);
    },

    async _fetchFromSupabase(table, query) {
        const cfg = this.getConfig();
        if (!cfg) throw new Error('CreditCardAnalyzer 尚未設定');
        const url = `${cfg.url}/rest/v1/${table}${query}`;
        const resp = await fetch(url, {
            headers: {
                'apikey': cfg.anonKey,
                'Authorization': `Bearer ${cfg.anonKey}`,
            }
        });
        if (!resp.ok) throw new Error(`Supabase 錯誤: ${resp.status}`);
        return resp.json();
    },

    async fetchAll() {
        const now = Date.now();
        if (this._cards && (now - this._fetchedAt) < this.CACHE_MS) return;

        const [cards, rewards] = await Promise.all([
            this._fetchFromSupabase('CreditCards', '?select=*&order=BankName'),
            this._fetchFromSupabase('Rewards', '?select=*&order=RewardRate.desc'),
        ]);

        this._cards = cards;
        this._rewards = rewards;
        this._fetchedAt = now;
    },

    async getCards() {
        await this.fetchAll();
        return this._cards || [];
    },

    async getRewardsForCard(cardId) {
        await this.fetchAll();
        return (this._rewards || []).filter(r => r.CardID === cardId);
    },

    // 依生活費類別 ID 找出指定卡片最佳回饋率
    async getBestRewardRate(cardId, lifeCatId, planName = null) {
        const rewards = await this.getRewardsForCard(cardId);
        if (!rewards.length) return { rate: 0, category: '' };

        // 過濾方案 (如果卡片需要切換)
        let filtered = rewards;
        if (planName) {
            filtered = rewards.filter(r => !r.PlanName || r.PlanName === planName);
        }

        const keywords = LIFE_CAT_TO_CC_CATEGORY[lifeCatId] || ['國內一般'];

        for (const kw of keywords) {
            const matched = filtered
                .filter(r => r.Category && r.Category.includes(kw))
                .sort((a, b) => b.RewardRate - a.RewardRate);
            if (matched.length) return { rate: matched[0].RewardRate, category: matched[0].Category };
        }

        // Fallback: 回傳最高的一般回饋
        const general = filtered.sort((a, b) => b.RewardRate - a.RewardRate);
        return general.length ? { rate: general[0].RewardRate, category: general[0].Category } : { rate: 0, category: '' };
    },

    // 找出所有卡片中最佳回饋（用於推薦）
    async getBestCardForCategory(lifeCatId) {
        await this.fetchAll();
        const cards = this._cards || [];
        const results = [];

        for (const card of cards) {
            const best = await this.getBestRewardRate(card.CardID, lifeCatId);
            if (best.rate > 0) {
                results.push({ card, rate: best.rate, category: best.category });
            }
        }

        return results.sort((a, b) => b.rate - a.rate);
    }
};