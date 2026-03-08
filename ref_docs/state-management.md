# 狀態管理 (Zustand Store)

本專案使用 [Zustand](https://github.com/pmndrs/zustand) 作為全局狀態管理工具。狀態定義與邏輯封裝在 `src/store/useCardStore.ts`。

## 核心狀態 (State)
| 狀態名 | 類型 | 說明 |
| :--- | :--- | :--- |
| `cards` | `Card[]` | 儲存從 `CreditCards` 載入的卡片列表。 |
| `rewards` | `Reward[]` | 儲存從 `Rewards` 載入的回饋規則。 |
| `isLoading` | `boolean` | 記錄資料是否正在載入中。 |
| `error` | `string | null` | 記錄最後發生的錯誤訊息。 |

## 主要動作 (Actions)
Store 中封裝了非同步請求邏輯與狀態變更邏輯。

### 1. `fetchCardsAndRewards()`
從 Supabase 異步獲取所有卡片與回饋規則，並更新 Store。

### 2. `addCard(card: NewCard)`
在 Supabase 新增一張卡片，成功後同步更新本地 Store。

### 3. `deleteCard(cardID: number)`
從 Supabase 移除卡片，並透過 Filter 移除本地 Store 裡的對應資料。

## 計算屬性 (Derived State / Utility)
雖然 Zustand 鼓勵在組件內計算，但常用的邏輯可以封裝在 Store 中。
- **回饋計算**：根據 `Category` 過濾並根據 `RewardRate` 排序。
- **上限檢查**：計算已獲得的回饋是否超過 `MonthlyLimit`。

## 使用範例
```typescript
import { useCardStore } from './store/useCardStore';

function CardList() {
  const { cards, fetchCardsAndRewards } = useCardStore();

  useEffect(() => {
    fetchCardsAndRewards();
  }, []);

  return (
    <ul>
      {cards.map(card => <li key={card.CardID}>{card.CardName}</li>)}
    </ul>
  );
}
```
