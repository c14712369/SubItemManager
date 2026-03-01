# 📊 收支與生活管理系統 (Expense & Life Manager)

![PWA Support](https://img.shields.io/badge/PWA-Supported-green)
![Vanilla JS](https://img.shields.io/badge/Javascript-Vanilla-yellow)
![Supabase](https://img.shields.io/badge/Backend-Supabase-blue)

一個專為個人財務規劃設計的輕量級 Web 應用。整合了固定支出管理、日常生活記帳、資產增長試算與專案預算管理，並支援雲端同步與離線使用 (PWA)。

## ✨ 核心特色

- 📱 **PWA 支援**：可直接安裝於手機或桌面，支援離線啟動，存取速度快且穩定。
- ☁️ **雲端同步**：串接 Supabase Auth 與 Database，資料即時備份與還原，更換裝置不間斷。
- 📈 **資產試算**：強大的複利試算模組，支援台美股動態報酬率搜尋 (CAGR) 與成長曲線圖。
- 🖼️ **現代介面**：全站支援原生深色/淺色模式切換，並針對電腦版提供 2x2 效能網格佈局。
- 📁 **資料匯出**：完整記錄隨時可匯出為 CSV 格式進行後續處理。

## 🚀 快速開始

### 環境需求
- 一個靜態網頁伺服器 (如 Live Server, Vercel, 或直接開啟 `index.html`)。
- 若需使用雲端功能，需配置 Supabase 專案參數。

### 配置雲端同步 (選配)
1. 在 Supabase 建立一個 `user_backups` 資料表 (JSONB 欄位)。
2. 修改 `js/supabase-config.js` 填入您的 `SUPABASE_URL` 與 `SUPABASE_ANON_KEY`。

## 📂 檔案結構

- `/index.html`: 入口點與 UI 骨架。
- `/style.css`: 主題變數與所有樣式。
- `/js/`: 模組化邏輯。
    - `state.js` & `data.js`: 核心狀態與 LocalStorage 處理。
    - `ui-*.js`: 各分頁獨立邏輯。
    - `supabase-sync.js`: Auth 與備份同步。
- `/sw.js`: PWA Service Worker。

## 📝 系統文件
更詳細的技術架構與功能說明，請參閱 [system_documentation.md](./system_documentation.md)。

---
*Created by [c1471](https://github.com/c14712369)*
