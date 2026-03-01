# 📊 收支與生活管理系統 (Expense & Life Manager) 系統文件

這是一份針對 **收支與生活管理工具** 的系統分析與開發文件。本系統為前端主導之應用程式，結合 localStorage 與 Supabase 輕量雲端備份，旨在協助用戶輕鬆管理固定支出、日常生活費、專案預算以及資產規劃。

---

## 1. 系統架構圖 (System Architecture)

```mermaid
graph TD
    User((使用者)) -->|操作介面| HTML[index.html]
    HTML -->|樣式渲染| CSS[style.css]
    HTML -->|事件與邏輯| JS[js/*.js 模組]
    
    subgraph Browser [瀏覽器環境]
        JS <-->|讀寫目前狀態| LS[(LocalStorage)]
        JS -->|繪製統計圖| ChartJS[Chart.js]
    end
    
    subgraph Cloud [Supabase 雲端服務]
        JS <-->|Auth 登入/註冊| SupabaseAuth[Authentication]
        JS <-->|全站狀態備份 / 還原| SupabaseDB[(PostgreSQL user_backups)]
    end

    style User fill:#f9f,stroke:#333,stroke-width:2px
    style LS fill:#eee,stroke:#333,stroke-dasharray: 5 5
    style SupabaseDB fill:#4ade80,stroke:#333
```

---

## 2. 技術堆疊 (Tech Stack)

| 類別 | 技術/工具 | 說明 |
| :--- | :--- | :--- |
| **核心語言** | HTML5, CSS3, Vanilla JavaScript (ES6+) | 無採用大型前端框架，使用原生 JS 進行模組化開發 |
| **樣式設計** | Native CSS (Variables) | 透過 CSS 變數實現深色/淺色模式切換及 RWD 響應式設計 |
| **資料儲存 (地端)** | Web Storage API (LocalStorage) | 應用程式核心狀態，提供離線與快速存取體驗 |
| **資料儲存 (雲端)** | [Supabase](https://supabase.com/) | 提供使用者認證 (Auth) 及 PostgreSQL (備份 JSON 狀態) |
| **圖表繪製** | [Chart.js](https://www.chartjs.org/) | 繪製各分類支出圓餅圖、長條圖及近 6 個月趨勢圖 |
| **字體與圖示** | Google Fonts, Font Awesome | 提供 Noto Sans TC / Noto Serif TC 字體與 SVG 圖示 |

---

## 3. 功能模組詳解 (Features)

系統劃分為五大核心模組（分頁），涵蓋多面向的財務與生活管理：

### 3.1 生活費記帳 (Life Expenses)
*   **收支明細管理**：記錄每日支出與收入，依月份自由切換查看。
*   **分類預算控制**：可自訂收入/支出分類，並對單一分類設定「月預算」。
*   **月度總覽**：自動計算本月實際收入、支出與結餘，並透過進度條顯示花費比例。

### 3.2 收支分析 (Analysis)
*   **財務儀表板**：設定預估月收入，系統自動計算扣除固定與生活支出後的「每月結餘」。可選擇是否扣除專案預定金。
*   **圖表視覺化**：
    *   **訂閱分類分析**：包含年度預估總支出，圓餅圖/長條圖，支援按年/按月檢視固定支出。
    *   **生活費分類分析**：依月份檢視生活費各分類的佔比圓餅圖。
    *   **趨勢圖**：近 6 個月的總收支折線趨勢圖。

### 3.3 固定支出 (Fixed Expenses / Management)
*   **訂閱與分期管理**：新增、編輯、刪除(CRUD)固定支出或訂閱項目。
*   **多幣別與週期**：支援 TWD, USD, JPY 等自動轉換匯率，並可設定每月、每季、每半年、每年或單次繳費。狀態區分「進行中」或「已結束」。
*   **資料備份/匯出**：提供手動匯出/匯入全站備份 JSON 檔及清除所有資料功能。

### 3.4 資產試算 (Wealth Calculator)
*   **多部位試算模型**：將資產劃分為「投資(股市/標的)」與「現金(銀行存款)」兩大部位，支援個別設定月投入金額、年化報酬率與活定存利率。
*   **動態報酬率搜尋 (CAGR)**：支援搜尋台美股標的並自動帶入過去 1Y/5Y/10Y 的年化報酬率作為試算基準。
*   **自動連動月結餘**：可選擇自動帶入「生活費記帳」模組計算出的每月實際結餘作為現金存款投入額。
*   **2x2 電腦版佈局**：在桌面環境提供緊湊的四格版面，可同時檢視持股細節、銀行帳戶、試算參數與圖表預測結果。
*   **資產增長趨勢圖**：繪製資產成長曲線，並自動標註達成目標金額的預估時間。

### 3.5 專案預算 (Projects / Events)
*   **獨立預算專案**：例如旅遊、購車等特定目標，可設定總預算與起訖日期。
*   **專案明細記帳**：在專案內獨立記錄各項花費，支援子分類，並顯示已花費與剩餘預算百分比。
*   **預備金扣除連動**：在分析看板中可連動扣除每月應存下的「專案預定金」，以反映真實的剩餘可用資金。

### 3.6 雲端同步 (Cloud Sync)
*   **簡單帳戶系統**：提供 Email 與密碼登入/註冊功能。
*   **自動備份與還原**：有登入的狀態下，任何資料或設定變更皆會自動打包 LocalStorage JSON 並上傳至 Supabase `user_backups` 表；登入時自動載入最新備份覆蓋本地。

---

## 4. 資料流流程圖 (Data Flow)

以下展示 **「登入並同步雲端資料」** 時處理流程：

```mermaid
sequenceDiagram
    participant User as 👤 使用者
    participant UI as 🖥️ 介面 (Auth)
    participant JS as ⚙️ supabase-sync.js
    participant LS as 💾 LocalStorage
    participant DB as ☁️ Supabase DB

    User->>UI: 輸入 Email / 密碼登入
    UI->>JS: signInWithPassword()
    JS->>DB: 驗證帳密並取得 Session (JWT)
    JS->>DB: 查詢 user_backups 資料表
    DB-->>JS: 回傳最新的 JSONB (app_data)
    JS->>LS: 將 app_data 解析並寫入 LocalStorage
    JS->>UI: 觸發 renderAll() 重新渲染畫面
    UI-->>User: 顯示雲端覆蓋後的最新資料並提示成功
```

---

## 5. 資料結構定義 (Data Schema)

### 5.1 Supabase Schema (PostgreSQL)
```sql
CREATE TABLE user_backups (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    app_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 並設定 Row Level Security (RLS) 確保用戶只能存取自己的備份
```

### 5.2 LocalStorage 狀態結構 (State)
系統的核心狀態 (即備份至雲端的 JSONB 內容) 大致包含以下結構：
```json
{
  "items": [ /* 固定支出項目陣列 (包含 name, category, amount, currency, cycle 等) */ ],
  "categories": [ /* 固定支出分類陣列 */ ],
  "lifeItems": [ /* 生活費收支紀錄陣列 (含 type: income/expense) */ ],
  "lifeCategories": [ /* 生活費分類陣列 (含 type, budget(月預算上限)) */ ],
  "projects": [ /* 獨立企劃專案陣列 (包含 budget, startDate, endDate, status) */ ],
  "projectItems": [ /* 專案明細紀錄陣列 (對照 project.id) */ ],
  "projectCategories": [ /* 專案明細分類陣列 */ ],
  "wealthParams": { /* 資產試算參數: investRate, cashCurrent, target 等 */ },
  "monthlyIncome": 50000, /* 預估月本薪/收入 */
  "deductProjectSavings": true /* 分析看板是否扣除專案預定金 */
}
```

---

## 6. 專案檔案結構 (File Structure)

```text
Project Root
├── index.html               # 應用程式入口 (包含 UI 骨架、分頁導航、Modals)
├── style.css                # 樣式機制 (包含 CSS 變數主題、RWD、組件樣式)
└── js/                      # 拆分模組化 JavaScript
    ├── state.js             # 應用程式狀態管理 (全域 state 物件宣告)
    ├── data.js              # LocalStorage 讀取/儲存、CRUD 核心資料處理
    ├── utils.js             # 共用工具函式 (UUID 生成、金額格式化)
    ├── supabase-config.js   # Supabase 初始化設定
    ├── supabase-sync.js     # Auth 認證與雲端備份同步邏輯
    ├── ui-fixed.js          # 「固定支出」分頁邏輯
    ├── ui-life.js           # 「生活費記帳」分頁邏輯
    ├── ui-analysis.js       # 「收支分析」分頁邏輯與 Chart.js 圖表繪製
    ├── ui-wealth.js         # 「資產試算」分頁邏輯
    ├── ui-projects.js       # 「專案預算」分頁邏輯
    ├── ui-annual.js         # 「年度結算」分頁邏輯
    └── main.js              # 全域事件綁定、初始化 (Tab 切換、主題切換、快取檢查等)
```

---

## 7. 未來擴充建議 (Possible Enhancements)
*   **PWA (Progressive Web App)**：已支援安裝為桌面/手機應用程式，配置 Service Worker 實施資源快取與離線啟動。
*   **高效能快取機制**：針對匯率與股票搜尋提供 6-24 小時的快取機制，大幅減少 API 調用次數與載入延遲。
*   **資料導出 (CSV)**：支援將固定支出與生活費明細匯出為標準 CSV 格式，方便用戶進行二次分析。
*   **暗黑模式 (Dark Mode)**：全站支援原生深色模式，依據系統偏好或手動切換。
