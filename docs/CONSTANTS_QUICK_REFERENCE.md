# Constants Quick Reference Card
# 常量快速參考卡

> **快速查找常用常量與函數**

---

## 📦 Import

```javascript
import * as constants from '@/constants';
// 或
import { GRID_TYPES, canViewPhone } from '@/constants';
```

---

## 🗂️ Grid Types

```javascript
// Types
GRID_TYPES.MUD_DISPOSAL      // 'mud_disposal' - 污泥暫置場
GRID_TYPES.MANPOWER          // 'manpower' - 人力任務
GRID_TYPES.SUPPLY_STORAGE    // 'supply_storage' - 物資停放處
GRID_TYPES.ACCOMMODATION     // 'accommodation' - 住宿地點
GRID_TYPES.FOOD_AREA         // 'food_area' - 領吃食區域

// Statuses
GRID_STATUSES.OPEN           // 'open' - 開放中
GRID_STATUSES.CLOSED         // 'closed' - 已關閉
GRID_STATUSES.COMPLETED      // 'completed' - 已完成
GRID_STATUSES.PENDING        // 'pending' - 準備中

// Functions
isValidGridType(type)
isValidGridStatus(status)
getGridTypeLabel(type)          // → 中文標籤
getGridStatusLabel(status)      // → 中文標籤
getGridStatusColor(status)      // → 顏色字串
```

---

## 👥 Volunteer Statuses

```javascript
// Statuses
VOLUNTEER_STATUSES.PENDING       // 'pending' - 待確認
VOLUNTEER_STATUSES.CONFIRMED     // 'confirmed' - 已確認
VOLUNTEER_STATUSES.ARRIVED       // 'arrived' - 已到場
VOLUNTEER_STATUSES.COMPLETED     // 'completed' - 已完成
VOLUNTEER_STATUSES.CANCELLED     // 'cancelled' - 已取消

// Flow: pending → confirmed → arrived → completed
//         ↓            ↓
//      cancelled    cancelled

// Functions
isValidVolunteerStatus(status)
getVolunteerStatusLabel(status)
getVolunteerStatusColor(status)
canCancelVolunteer(status)         // 是否可取消
isVolunteerFinalized(status)       // 是否已結束
getNextVolunteerStatuses(status)   // 下一步狀態[]
```

---

## 📦 Supply & Donation

```javascript
// Delivery Methods
DELIVERY_METHODS.DIRECT              // 'direct' - 直接送達
DELIVERY_METHODS.PICKUP_POINT        // 'pickup_point' - 轉運點
DELIVERY_METHODS.VOLUNTEER_PICKUP    // 'volunteer_pickup' - 志工取貨

// Donation Statuses
DONATION_STATUSES.PLEDGED        // 'pledged' - 已承諾
DONATION_STATUSES.CONFIRMED      // 'confirmed' - 已確認
DONATION_STATUSES.IN_TRANSIT     // 'in_transit' - 運送中
DONATION_STATUSES.DELIVERED      // 'delivered' - 已送達
DONATION_STATUSES.CANCELLED      // 'cancelled' - 已取消

// Supply Categories
SUPPLY_CATEGORIES.FOOD           // 'food' - 食物
SUPPLY_CATEGORIES.WATER          // 'water' - 飲用水
SUPPLY_CATEGORIES.CLOTHING       // 'clothing' - 衣物
SUPPLY_CATEGORIES.TOOLS          // 'tools' - 工具
SUPPLY_CATEGORIES.MEDICAL        // 'medical' - 醫療用品
SUPPLY_CATEGORIES.HYGIENE        // 'hygiene' - 衛生用品
SUPPLY_CATEGORIES.SHELTER        // 'shelter' - 住宿用品
SUPPLY_CATEGORIES.OTHER          // 'other' - 其他

// Functions
isValidDeliveryMethod(method)
isValidDonationStatus(status)
isValidSupplyCategory(category)
getDeliveryMethodLabel(method)
getDonationStatusLabel(status)
getDonationStatusColor(status)
getSupplyCategoryLabel(category)
canCancelDonation(status)
isDonationFinalized(status)
getNextDonationStatuses(status)
```

---

## 👤 User Roles & Permissions

```javascript
// Roles
USER_ROLES.ADMIN                 // 'admin' - 管理員
USER_ROLES.GRID_MANAGER          // 'grid_manager' - 網格管理員
USER_ROLES.USER                  // 'user' - 一般使用者

// Priorities
USER_ROLE_PRIORITIES.ADMIN       // 100
USER_ROLE_PRIORITIES.GRID_MANAGER // 50
USER_ROLE_PRIORITIES.USER        // 10

// Basic Functions
isValidUserRole(role)
getUserRoleLabel(role)
getUserRolePriority(role)
hasHigherRole(roleA, roleB)

// Role Checks
isAdmin(user)                    // 是否為管理員
isGridManager(user, grid)        // 是否為(該)網格管理員

// Permission Checks
canViewPhone(user, grid)         // 可否查看電話
canViewEmail(user, grid)         // 可否查看 Email
canEditGrid(user, grid)          // 可否編輯網格
canDeleteGrid(user, grid)        // 可否刪除網格
canManageVolunteers(user, grid)  // 可否管理志工
canManageSupplies(user, grid)    // 可否管理物資
canViewAuditLogs(user)          // 可否查看審計日誌
canExportData(user)             // 可否匯出資料

// Get All Permissions
getUserPermissions(user, grid)   // → { isAdmin, canViewPhone, ... }
```

---

## 🔐 Permission Matrix

| 權限 | Admin | Grid Mgr (own) | Grid Mgr (other) | User |
|------|:-----:|:--------------:|:----------------:|:----:|
| 查看電話/Email | ✅ | ✅ | ❌ | ❌ |
| 編輯網格 | ✅ | ✅ | ❌ | ❌ |
| 刪除網格 | ✅ | ❌ | ❌ | ❌ |
| 管理志工 | ✅ | ✅ | ❌ | ❌ |
| 管理物資 | ✅ | ✅ | ❌ | ❌ |
| 查看審計 | ✅ | ❌ | ❌ | ❌ |
| 匯出資料 | ✅ | ✅ | ❌ | ❌ |

---

## 💡 Common Patterns

### Pattern 1: Status Badge
```javascript
import { getGridStatusLabel, getGridStatusColor } from '@/constants';

<span className={`badge badge-${getGridStatusColor(grid.status)}`}>
  {getGridStatusLabel(grid.status)}
</span>
```

### Pattern 2: Conditional Render by Permission
```javascript
import { canViewPhone } from '@/constants';

{canViewPhone(user, grid) ? (
  <a href={`tel:${volunteer.phone}`}>{volunteer.phone}</a>
) : (
  <span>***-***-****</span>
)}
```

### Pattern 3: Action Buttons by Next Status
```javascript
import { getNextVolunteerStatuses, getVolunteerStatusLabel } from '@/constants';

{getNextVolunteerStatuses(volunteer.status).map(nextStatus => (
  <button key={nextStatus} onClick={() => updateStatus(nextStatus)}>
    {getVolunteerStatusLabel(nextStatus)}
  </button>
))}
```

### Pattern 4: API Validation
```javascript
import { isValidGridStatus } from '@/constants';

if (!isValidGridStatus(req.body.status)) {
  return res.status(400).json({ error: 'Invalid status' });
}
```

### Pattern 5: Permission Middleware
```javascript
import { canEditGrid } from '@/constants';

async function requireGridEdit(req, res, next) {
  const grid = await getGrid(req.params.id);
  if (!canEditGrid(req.user, grid)) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  next();
}
```

---

## 📚 Full Documentation

For complete documentation, see:
- 📖 [CONSTANTS_GUIDE.md](./CONSTANTS_GUIDE.md) - 完整使用指南
- 📝 [CONSTANTS_IMPLEMENTATION_SUMMARY.md](./CONSTANTS_IMPLEMENTATION_SUMMARY.md) - 實作總結

---

## 🧪 Testing

```bash
# Run all constants tests
npm test tests/constants

# Run specific test
npm test tests/constants/user-roles.test.js
```

---

**Quick Tip**: 使用 IDE 的自動完成功能快速查找常量！

```javascript
import * as C from '@/constants';
C.GRID_TYPES.  // ← IDE 會顯示所有選項
C.canView      // ← IDE 會顯示所有 canView* 函數
```
