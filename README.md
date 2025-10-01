# Base44 App


This app was created automatically by Base44.
It's a Vite+React app that communicates with the Base44 API.

## Running the app

```bash
npm install
npm run dev
```

### 切換離開 Base44 SDK（使用純 REST API）

專案預設使用 `@base44/sdk`。若後端已提供對應 REST 端點，可在根目錄建立 `.env.local` 並加入：

```
VITE_USE_REST=true
VITE_API_BASE=https://your.api.server
```

然後把原本從 `@/api/entities` 匯入的路徑改成：

```
import { Grid, DisasterArea } from '@/api/rest';
```

或是直接在原始碼中批次搜尋 `@/api/entities` / `@/api/functions` 進行替換。

已新增的 REST 替代檔案位置：

- `src/api/rest/client.js`：最小 fetch 包裝器
- `src/api/rest/entities.js`：提供 list/create/update/delete
- `src/api/rest/functions.js`：原本 functions 的 HTTP 對應
- `src/api/rest/index.js`：依 `VITE_USE_REST` 動態選擇 Base44 或 REST

如果希望「不改 import 路徑」也能切換，可把現有程式碼中的：

```
import { Grid } from '@/api/entities';
```

改為：

```
import { Grid } from '@/api/rest';
```

當 `VITE_USE_REST !== 'true'` 時會回退到原本 Base44 行為。

> 注意：`functions.js` 目前仍直接指向 Base44；若要完全移除 Base44，可將檔案內容改為 re-export `src/api/rest/functions.js` 中的實作。

## Building the app

```bash
npm run build
```

For more information and support, please contact Base44 support at app@base44.com.