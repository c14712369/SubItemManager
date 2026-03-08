# CreditCardAnalyzer 專案文件

本專案是一個信用卡回饋比較與分析工具，旨在幫助使用者分析不同信用卡的消費回饋、回饋率以及每月上限，從而找出特定消費情境下的最優卡片。

## 系統概覽
- **專案名稱**：CreditCardAnalyzer (信用卡回饋分析工具)
- **技術棧**：React 19, Vite, TypeScript, Supabase, Zustand.
- **主要功能**：
  - 信用卡管理：新增、編輯、刪除信用卡。
  - 回饋規則管理：設定不同通路 (Category) 的回饋率 (RewardRate) 與上限 (MonthlyLimit)。
  - 即時計算：根據消費金額即時計算各卡片的回饋點數。
  - 權益切換提示：提示卡片是否需要手動切換權益 (RequireSwitch)。

## 快速開始
1. **安裝依賴**：`npm install`
2. **設定環境變數**：複製 `.env.example` 為 `.env` 並填入 Supabase URL 與 Anon Key。
3. **啟動開發伺服器**：`npm run dev`
4. **構建專案**：`npm run build`

## 文件清單
- [系統架構](./system-architecture.md)
- [資料庫設計](./database-schema.md)
- [狀態管理](./state-management.md)
- [API 與 Supabase 調用](./api-reference.md)
