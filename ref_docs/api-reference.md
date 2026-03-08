# API 與 Supabase 調用

本專案利用 Supabase 自動生成的 REST API 來管理信用卡與回饋規則。

## 基底 URL
`https://[YOUR_SUPABASE_PROJECT_ID].supabase.co/rest/v1`

## 認證
請求必須包含：
- `apikey`：Supabase 公開 Anon Key。
- `Authorization`：`Bearer [YOUR_ANON_KEY]`。

---

## 獲取所有信用卡 (GET /CreditCards)
獲取信用卡清單。

**範例 Curl**：
```bash
curl -X GET 'https://[URL]/rest/v1/CreditCards?select=*' \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]"
```

---

## 獲取特定通路的優質卡片 (GET /Rewards)
獲取特定類別（Category）的回饋規則，通常與卡片表聯查。

**範例查詢語法 (Supabase JS)**：
```typescript
const { data, error } = await supabase
  .from('Rewards')
  .select(`
    *,
    CreditCards (*)
  `)
  .eq('Category', 'LINE Pay')
  .order('RewardRate', { ascending: false });
```

---

## 新增信用卡 (POST /CreditCards)
**Request Body**：
```json
{
  "BankName": "台新銀行",
  "CardName": "@GoGo 卡",
  "IsDirectDeduct": false,
  "RequireSwitch": false
}
```

## 批次更新回饋 (POST /Rewards)
**Request Body**：
```json
[
  { "CardID": 1, "Category": "國內一般", "RewardRate": 2.5 },
  { "CardID": 1, "Category": "LINE Pay", "RewardRate": 2.5 }
]
```

---

## 錯誤處理
常見錯誤代碼：
- `401`：Anon Key 無效。
- `403`：違反 RLS 權益策略。
- `404`：資料不存在。
- `409`：唯一性約束衝突（如 Duplicate ID）。
