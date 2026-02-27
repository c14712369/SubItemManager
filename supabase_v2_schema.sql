-- ==========================================
-- Supabase Schema Version 2: Simple Cloud Sync
-- 
-- 由於您希望「有登入就存KEY的資料到資料庫，每次到網頁都能帶出來」，
-- 我們改用一個最簡單的全站備份資料表，將整個 localStorage 的資料打包成 JSON 存入。
-- 這樣未來新增任何功能都不需要修改資料庫表結構！
-- ==========================================

-- 1. Create the backup table
CREATE TABLE user_backups (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    app_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS) for data privacy
ALTER TABLE user_backups ENABLE ROW LEVEL SECURITY;

-- 3. Create policies so users can only read and write their OWN backup data
CREATE POLICY "Users can view own backup" ON user_backups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own backup" ON user_backups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own backup" ON user_backups FOR UPDATE USING (auth.uid() = user_id);
