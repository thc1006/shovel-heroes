# API Constants Guide
# API 常量使用指南

> **版本**: 1.0.0
> **創建日期**: 2025-10-02
> **用途**: 提供型別安全的 API 常量定義與文件化

---

## 📋 目錄

1. [概述](#概述)
2. [檔案結構](#檔案結構)
3. [使用方式](#使用方式)
4. [常量定義](#常量定義)
   - [Grid Types 網格類型](#grid-types-網格類型)
   - [Volunteer Statuses 志工狀態](#volunteer-statuses-志工狀態)
   - [Supply & Donation 物資與捐贈](#supply--donation-物資與捐贈)
   - [User Roles 使用者角色](#user-roles-使用者角色)
5. [最佳實踐](#最佳實踐)
6. [測試](#測試)

---

## 概述

本專案提供了一套完整的 API 常量定義系統，用於：

- ✅ **型別安全**: 避免字串硬編碼錯誤
- ✅ **中文化**: 提供中文標籤對照
- ✅ **驗證函數**: 快速驗證資料有效性
- ✅ **權限檢查**: 統一的使用者權限邏輯
- ✅ **狀態流轉**: 定義狀態轉換規則

---

## 檔案結構

```
src/constants/
├── grid-types.js           # 網格類型與狀態
├── volunteer-statuses.js   # 志工狀態定義
├── supply-donation.js      # 物資與捐贈常量
├── user-roles.js          # 使用者角色與權限
└── index.js               # 統一導出入口

tests/constants/
├── grid-types.test.js
├── volunteer-statuses.test.js
├── supply-donation.test.js
├── user-roles.test.js
└── index.test.js
```

---

## 使用方式

### 基本導入

```javascript
// 方式 1: 導入所有常量（建議）
import * as constants from '@/constants';

// 方式 2: 按需導入
import { GRID_TYPES, GRID_STATUSES } from '@/constants/grid-types';
import { USER_ROLES, canViewPhone } from '@/constants/user-roles';

// 方式 3: 從主入口導入
import {
  GRID_TYPES,
  VOLUNTEER_STATUSES,
  canEditGrid
} from '@/constants';
```

### 在元件中使用

```javascript
import { GRID_TYPES, getGridTypeLabel } from '@/constants';

function GridCard({ grid }) {
  return (
    <div>
      <h3>{getGridTypeLabel(grid.type)}</h3>
      {grid.type === GRID_TYPES.MANPOWER && (
        <VolunteerList gridId={grid.id} />
      )}
    </div>
  );
}
```

### 在 API 中使用

```javascript
import { GRID_STATUSES, isValidGridStatus } from '@/constants';

export async function updateGridStatus(gridId, newStatus) {
  // 驗證狀態
  if (!isValidGridStatus(newStatus)) {
    throw new Error('Invalid grid status');
  }

  // 更新資料庫
  return await db.grids.update(gridId, {
    status: newStatus
  });
}
```

---

## 常量定義

### Grid Types 網格類型

#### 類型常量

```javascript
GRID_TYPES = {
  MUD_DISPOSAL: 'mud_disposal',      // 污泥暫置場
  MANPOWER: 'manpower',              // 人力任務
  SUPPLY_STORAGE: 'supply_storage',  // 物資停放處
  ACCOMMODATION: 'accommodation',     // 住宿地點
  FOOD_AREA: 'food_area'             // 領吃食區域
}
```

#### 狀態常量

```javascript
GRID_STATUSES = {
  OPEN: 'open',           // 開放中
  CLOSED: 'closed',       // 已關閉
  COMPLETED: 'completed', // 已完成
  PENDING: 'pending'      // 準備中
}
```

#### 可用函數

| 函數 | 描述 | 範例 |
|------|------|------|
| `isValidGridType(type)` | 驗證網格類型 | `isValidGridType('manpower') // true` |
| `isValidGridStatus(status)` | 驗證網格狀態 | `isValidGridStatus('open') // true` |
| `getGridTypeLabel(type)` | 取得類型標籤 | `getGridTypeLabel('manpower') // "人力任務"` |
| `getGridStatusLabel(status)` | 取得狀態標籤 | `getGridStatusLabel('open') // "開放中"` |
| `getGridStatusColor(status)` | 取得狀態顏色 | `getGridStatusColor('open') // "green"` |

#### 使用範例

```javascript
import { GRID_TYPES, getGridTypeLabel, getGridStatusColor } from '@/constants';

// 顯示網格資訊
function GridInfo({ grid }) {
  const typeLabel = getGridTypeLabel(grid.type);
  const statusColor = getGridStatusColor(grid.status);

  return (
    <div className={`grid-card border-${statusColor}`}>
      <h3>{typeLabel}</h3>
      <p>狀態: {grid.status}</p>
    </div>
  );
}

// 篩選特定類型的網格
const manpowerGrids = grids.filter(g => g.type === GRID_TYPES.MANPOWER);
```

---

### Volunteer Statuses 志工狀態

#### 狀態常量

```javascript
VOLUNTEER_STATUSES = {
  PENDING: 'pending',       // 待確認
  CONFIRMED: 'confirmed',   // 已確認
  ARRIVED: 'arrived',       // 已到場
  COMPLETED: 'completed',   // 已完成
  CANCELLED: 'cancelled'    // 已取消
}
```

#### 可用函數

| 函數 | 描述 | 範例 |
|------|------|------|
| `isValidVolunteerStatus(status)` | 驗證狀態 | `isValidVolunteerStatus('pending') // true` |
| `getVolunteerStatusLabel(status)` | 取得標籤 | `getVolunteerStatusLabel('pending') // "待確認"` |
| `getVolunteerStatusColor(status)` | 取得顏色 | `getVolunteerStatusColor('confirmed') // "blue"` |
| `canCancelVolunteer(status)` | 是否可取消 | `canCancelVolunteer('pending') // true` |
| `isVolunteerFinalized(status)` | 是否已結束 | `isVolunteerFinalized('completed') // true` |
| `getNextVolunteerStatuses(status)` | 下一步狀態 | `getNextVolunteerStatuses('pending') // ['confirmed', 'cancelled']` |

#### 狀態流轉圖

```
pending → confirmed → arrived → completed
   ↓           ↓
cancelled   cancelled
```

#### 使用範例

```javascript
import {
  VOLUNTEER_STATUSES,
  canCancelVolunteer,
  getNextVolunteerStatuses
} from '@/constants';

function VolunteerActions({ volunteer }) {
  const canCancel = canCancelVolunteer(volunteer.status);
  const nextStatuses = getNextVolunteerStatuses(volunteer.status);

  return (
    <div>
      {canCancel && (
        <button onClick={handleCancel}>取消報名</button>
      )}
      {nextStatuses.map(status => (
        <button key={status} onClick={() => updateStatus(status)}>
          更新為 {getVolunteerStatusLabel(status)}
        </button>
      ))}
    </div>
  );
}
```

---

### Supply & Donation 物資與捐贈

#### 配送方式

```javascript
DELIVERY_METHODS = {
  DIRECT: 'direct',                    // 直接送達
  PICKUP_POINT: 'pickup_point',        // 轉運點
  VOLUNTEER_PICKUP: 'volunteer_pickup' // 志工取貨
}
```

#### 捐贈狀態

```javascript
DONATION_STATUSES = {
  PLEDGED: 'pledged',       // 已承諾
  CONFIRMED: 'confirmed',   // 已確認
  IN_TRANSIT: 'in_transit', // 運送中
  DELIVERED: 'delivered',   // 已送達
  CANCELLED: 'cancelled'    // 已取消
}
```

#### 物資類別

```javascript
SUPPLY_CATEGORIES = {
  FOOD: 'food',           // 食物
  WATER: 'water',         // 飲用水
  CLOTHING: 'clothing',   // 衣物
  TOOLS: 'tools',         // 工具
  MEDICAL: 'medical',     // 醫療用品
  HYGIENE: 'hygiene',     // 衛生用品
  SHELTER: 'shelter',     // 住宿用品
  OTHER: 'other'          // 其他
}
```

#### 可用函數

| 函數 | 描述 |
|------|------|
| `isValidDeliveryMethod(method)` | 驗證配送方式 |
| `isValidDonationStatus(status)` | 驗證捐贈狀態 |
| `isValidSupplyCategory(category)` | 驗證物資類別 |
| `getDeliveryMethodLabel(method)` | 取得配送方式標籤 |
| `getDonationStatusLabel(status)` | 取得捐贈狀態標籤 |
| `getDonationStatusColor(status)` | 取得捐贈狀態顏色 |
| `getSupplyCategoryLabel(category)` | 取得物資類別標籤 |
| `canCancelDonation(status)` | 是否可取消捐贈 |
| `isDonationFinalized(status)` | 捐贈是否已結束 |
| `getNextDonationStatuses(status)` | 下一步狀態 |

#### 使用範例

```javascript
import {
  SUPPLY_CATEGORIES,
  DONATION_STATUSES,
  canCancelDonation
} from '@/constants';

function DonationForm({ onSubmit }) {
  const [category, setCategory] = useState(SUPPLY_CATEGORIES.FOOD);
  const [deliveryMethod, setDeliveryMethod] = useState(DELIVERY_METHODS.DIRECT);

  return (
    <form onSubmit={onSubmit}>
      <select value={category} onChange={e => setCategory(e.target.value)}>
        {Object.entries(SUPPLY_CATEGORY_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      {/* ... */}
    </form>
  );
}
```

---

### User Roles 使用者角色

#### 角色常量

```javascript
USER_ROLES = {
  ADMIN: 'admin',               // 管理員
  GRID_MANAGER: 'grid_manager', // 網格管理員
  USER: 'user'                  // 一般使用者
}
```

#### 角色優先級

```javascript
USER_ROLE_PRIORITIES = {
  ADMIN: 100,        // 最高權限
  GRID_MANAGER: 50,  // 中等權限
  USER: 10           // 基本權限
}
```

#### 權限檢查函數

| 函數 | 描述 | 範例 |
|------|------|------|
| `isAdmin(user)` | 是否為管理員 | `isAdmin(user) // true/false` |
| `isGridManager(user, grid)` | 是否為網格管理員 | `isGridManager(user, grid)` |
| `canViewPhone(user, grid)` | 可否查看電話 | `canViewPhone(user, grid)` |
| `canViewEmail(user, grid)` | 可否查看 Email | `canViewEmail(user, grid)` |
| `canEditGrid(user, grid)` | 可否編輯網格 | `canEditGrid(user, grid)` |
| `canDeleteGrid(user, grid)` | 可否刪除網格 | `canDeleteGrid(user, grid)` |
| `canManageVolunteers(user, grid)` | 可否管理志工 | `canManageVolunteers(user, grid)` |
| `canManageSupplies(user, grid)` | 可否管理物資 | `canManageSupplies(user, grid)` |
| `canViewAuditLogs(user)` | 可否查看審計日誌 | `canViewAuditLogs(user)` |
| `canExportData(user)` | 可否匯出資料 | `canExportData(user)` |
| `getUserPermissions(user, grid)` | 取得所有權限 | `getUserPermissions(user, grid)` |

#### 權限矩陣

| 權限 | Admin | Grid Manager (自己的網格) | Grid Manager (其他網格) | User |
|------|-------|--------------------------|------------------------|------|
| 查看電話/Email | ✅ | ✅ | ❌ | ❌ |
| 編輯網格 | ✅ | ✅ | ❌ | ❌ |
| 刪除網格 | ✅ | ❌ | ❌ | ❌ |
| 管理志工 | ✅ | ✅ | ❌ | ❌ |
| 管理物資 | ✅ | ✅ | ❌ | ❌ |
| 查看審計日誌 | ✅ | ❌ | ❌ | ❌ |
| 匯出資料 | ✅ | ✅ | ❌ | ❌ |

#### 使用範例

```javascript
import { canViewPhone, canEditGrid, getUserPermissions } from '@/constants';

// 條件渲染
function VolunteerContact({ user, grid, volunteer }) {
  if (canViewPhone(user, grid)) {
    return <a href={`tel:${volunteer.phone}`}>{volunteer.phone}</a>;
  }
  return <span>***-***-****</span>;
}

// 按鈕權限控制
function GridActions({ user, grid }) {
  const permissions = getUserPermissions(user, grid);

  return (
    <div>
      {permissions.canEditGrid && (
        <button onClick={handleEdit}>編輯</button>
      )}
      {permissions.canDeleteGrid && (
        <button onClick={handleDelete}>刪除</button>
      )}
    </div>
  );
}

// API 中使用
export async function deleteGrid(gridId, userId) {
  const user = await getUser(userId);
  const grid = await getGrid(gridId);

  if (!canDeleteGrid(user, grid)) {
    throw new Error('Permission denied');
  }

  return await db.grids.delete(gridId);
}
```

---

## 最佳實踐

### 1. 永遠使用常量，不要硬編碼

❌ **錯誤做法**:
```javascript
if (grid.type === 'manpower') { ... }
if (user.role === 'admin') { ... }
```

✅ **正確做法**:
```javascript
import { GRID_TYPES, USER_ROLES } from '@/constants';

if (grid.type === GRID_TYPES.MANPOWER) { ... }
if (user.role === USER_ROLES.ADMIN) { ... }
```

### 2. 使用驗證函數確保資料有效性

❌ **錯誤做法**:
```javascript
function updateStatus(status) {
  // 直接使用未驗證的狀態
  grid.status = status;
}
```

✅ **正確做法**:
```javascript
import { isValidGridStatus } from '@/constants';

function updateStatus(status) {
  if (!isValidGridStatus(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  grid.status = status;
}
```

### 3. 使用權限函數而非手動檢查角色

❌ **錯誤做法**:
```javascript
if (user.role === 'admin' || (user.role === 'grid_manager' && user.id === grid.grid_manager_id)) {
  // 顯示電話
}
```

✅ **正確做法**:
```javascript
import { canViewPhone } from '@/constants';

if (canViewPhone(user, grid)) {
  // 顯示電話
}
```

### 4. 使用輔助函數取得標籤

❌ **錯誤做法**:
```javascript
const label = grid.type === 'manpower' ? '人力任務' :
              grid.type === 'mud_disposal' ? '污泥暫置場' : '未知';
```

✅ **正確做法**:
```javascript
import { getGridTypeLabel } from '@/constants';

const label = getGridTypeLabel(grid.type);
```

### 5. 狀態流轉使用 getNext 函數

❌ **錯誤做法**:
```javascript
const nextStatuses = volunteer.status === 'pending' ? ['confirmed', 'cancelled'] :
                    volunteer.status === 'confirmed' ? ['arrived', 'cancelled'] : [];
```

✅ **正確做法**:
```javascript
import { getNextVolunteerStatuses } from '@/constants';

const nextStatuses = getNextVolunteerStatuses(volunteer.status);
```

---

## 測試

### 執行測試

```bash
# 執行所有常量測試
npm test tests/constants

# 執行特定測試檔案
npm test tests/constants/grid-types.test.js
npm test tests/constants/user-roles.test.js

# 監聽模式
npm test tests/constants -- --watch

# 產生覆蓋率報告
npm test tests/constants -- --coverage
```

### 測試覆蓋範圍

所有常量模組都有完整的測試覆蓋：

- ✅ **常量值測試**: 確保所有常量有正確的值
- ✅ **標籤測試**: 驗證所有標籤存在且為字串
- ✅ **驗證函數測試**: 測試有效與無效輸入
- ✅ **輔助函數測試**: 測試所有輔助函數邏輯
- ✅ **權限函數測試**: 完整的權限矩陣測試
- ✅ **狀態流轉測試**: 驗證狀態轉換邏輯
- ✅ **整合測試**: 確保模組間無衝突

### 範例測試

```javascript
import { describe, it, expect } from 'vitest';
import { GRID_TYPES, isValidGridType } from '@/constants';

describe('Grid Types', () => {
  it('should validate grid types correctly', () => {
    expect(isValidGridType(GRID_TYPES.MANPOWER)).toBe(true);
    expect(isValidGridType('invalid')).toBe(false);
  });
});
```

---

## 版本歷史

### v1.0.0 (2025-10-02)
- ✨ 初始版本發布
- ✅ Grid Types 常量定義
- ✅ Volunteer Statuses 常量定義
- ✅ Supply & Donation 常量定義
- ✅ User Roles & Permissions 常量定義
- ✅ 完整測試覆蓋
- 📝 完整文件

---

## 貢獻指南

### 新增常量

1. 在對應的常量檔案中新增常量
2. 更新對應的 LABELS 對照
3. 如需要，新增驗證或輔助函數
4. 在測試檔案中新增測試
5. 更新本文件

### 新增權限檢查

1. 在 `user-roles.js` 中新增權限函數
2. 更新權限矩陣表格
3. 新增測試案例
4. 更新使用範例

---

## 參考資源

- [BACKEND_API_INTEGRATION_GUIDE.md](../BACKEND_API_INTEGRATION_GUIDE.md) - API 整合指南
- [SECURITY.md](../SECURITY.md) - 安全性指南
- [CLAUDE.md](../CLAUDE.md) - 專案規範

---

**維護者**: Shovel Heroes 開發團隊
**最後更新**: 2025-10-02
**常量版本**: 1.0.0
