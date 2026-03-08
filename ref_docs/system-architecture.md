# 系統架構與技術棧

本文件介紹 CreditCardAnalyzer 的整體架構設計。

## 系統架構
本專案採用典型的現代單頁應用程式 (SPA) 架構，並與 Supabase 進行後端整合。

1. **前端 (Client)**：React 19 (Vite)
2. **後端 (Backend-as-a-Service)**：Supabase (提供 PostgreSQL 資料庫、API、Auth)。
3. **狀態管理 (State Management)**：Zustand。
4. **樣式 (Styling)**：CSS Modules 或全局 CSS。

## 技術棧詳解
| 組件 | 技術 | 說明 |
| :--- | :--- | :--- |
| 框架 | React 19 | 最新版本，利用其性能與組件化開發優勢。 |
| 建置工具 | Vite | 提供極速的開發體驗與構建速度。 |
| 程式語言 | TypeScript | 強類型系統，降低代碼出錯率。 |
| 資料庫 | Supabase (PostgreSQL) | 自動生成 REST API，並提供 RLS (Row Level Security)。 |
| 狀態管理 | Zustand | 輕量且易於使用的狀態管理，處理應用程式的核心邏輯。 |
| 代碼規範 | ESLint | 使用 `eslint.config.js` 確保代碼風格統一。 |

## 資料流 (Data Flow)
1. **讀取**：組件加載時，由 `useCardStore.ts` 調用 `supabase` 客戶端從 `CreditCards` 與 `Rewards` 資料表獲取資料。
2. **存儲**：獲取的資料將緩存在 Zustand Store 中，並分發給各 UI 組件。
3. **更新**：用戶執行新增、修改、刪除動作時，Store 同步向 Supabase 發送請求，並在成功後更新本地狀態。
