# 資料庫設計與 RLS

本專案使用 Supabase 提供 PostgreSQL 資料庫，並啟用了 Row Level Security (RLS) 保護資料存取權限。

## 資料表結構 (Database Schema)

### 1. `CreditCards` (信用卡表)
存儲卡片的基本屬性。
| 欄位名 | 類型 | 說明 |
| :--- | :--- | :--- |
| `CardID` | `SERIAL PRIMARY KEY` | 自動增量 ID。 |
| `BankName` | `VARCHAR(50)` | 銀行名稱（如：玉山銀行）。 |
| `CardName` | `VARCHAR(100)` | 卡片名稱（如：Pi 拍錢包信用卡）。 |
| `IsDirectDeduct` | `BOOLEAN` | 是否直接折抵（帳單直接扣抵）。 |
| `RequireSwitch` | `BOOLEAN` | 是否需切換權益（如：國泰世華 CUBE 卡）。 |

### 2. `Rewards` (回饋規則表)
存儲卡片在不同通路的回饋規則。
| 欄位名 | 類型 | 說明 |
| :--- | :--- | :--- |
| `RewardID` | `SERIAL PRIMARY KEY` | 自動增量 ID。 |
| `CardID` | `INTEGER REFERENCES` | 關聯到 `CreditCards` 表。 |
| `Category` | `VARCHAR(50)` | 消費通路類別（如：國內一般、LINE Pay）。 |
| `RewardRate` | `NUMERIC(5,2)` | 回饋率（如：2.50 代表 2.5%）。 |
| `MonthlyLimit` | `INTEGER` | 每月回饋上限（金額，可為空）。 |

## 索引設計 (Indexes)
為了優化通路與卡片的聯表查詢效率，系統建立了以下索引：
- `idx_rewards_cardid`：對 `CardID` 建立索引。
- `idx_rewards_category`：對 `Category` 建立索引。

## 安全性策略 (Row Level Security - RLS)
目前系統設計為公開讀取模式。
- `Allow public read CreditCards`：允許所有用戶讀取卡片清單。
- `Allow public read Rewards`：允許所有用戶讀取回饋規則。

*注意：在正式發布或多用戶環境下，應將寫入操作限制為 `authenticated` 用戶，並透過 `uid()` 來限制用戶僅能修改自定義卡片。*
