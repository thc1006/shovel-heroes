# CLAUDE.md — 鏟子英雄（Shovel Heroes）安全修補與可持續化開發計畫

> 版本：2025-10-02T00:XX+08:00（台北）
> 負責範疇：快速止血（資安修補）、資料保護、基礎架構穩定化、與民間互補工具協同
> 適用對象：Claude Code、維運工程師、產品/社群協作志工

---

## 0) TL;DR

* 「鏟子英雄」為**民間自發的志工/物資媒合平台**，用於 2025-09-23 馬太鞍堰塞湖溢流後的**花蓮光復**災後復原。媒體稱開發者為「數位超人」，平台能將**救援任務、人力與資源需求**清楚對接，快速擴散。([Yahoo奇摩新聞][1])
* 官方站點目前可見內容（**公告中心/任務列表/地點**等）。([shovel-heroes.com][2])
* **資安事件**：媒體與社群指出**可未授權 CRUD、人員電話/Email 外洩、前端可改後端狀態**等嚴重風險；部分報導稱**網站已下線/關閉**或有道歉訊息。需立即「止血→修補→復用」。([東森新聞][3])
* **互補生態**：同時存在「光復救災資訊整合網（Google Sites）」與公民地圖（江明宗 `tainan.olc.tw`），可互相鏡接與備援。([Google Sites][4])

---

## 1) 背景與脈絡（Why）

* 災情與動員：9/23 堰塞湖溢流、光復重創；全台大量志工（外媒稱「Shovel Heroes」）進場清淤，並由慈濟/中央志工站協調分流。([Tzu Chi Foundation][5])
* 平台定位：**臨時快速成形**的自助媒合系統，將「任務/需求/地點」結構化並圖像化（救援區域、志工總數、已完成、急需支援、任務列表、集合地址、報名按鈕、淤泥暫置點、物資/餐食/住宿等）。([TVBS][6])

---

## 2) 當前資源（What exists）

* **鏟子英雄官網（公告中心/任務）**：`https://shovel-heroes.com/`（需 JS；內容包含任務地址與清單）。([shovel-heroes.com][2])
* **媒體與英文概述**：RTI 英文專題（「數位超人」建站、改善對接效率）。([中央廣播電臺][7])
* **光復救災資訊整合網**（Google Sites；遠端志工團隊）：志工/物資/聯繫、隱私政策與服務條款聲明。([Google Sites][4])
* **公民地圖**（江明宗）：多圖層（志工/物資/政府設施/優先級 1–6 等）。（*貼文線索*）([Threads][8])
* **主流媒體輿情**（Yahoo/TVBS/NowNews/SETN）：介紹平台四大類別、任務列表、一鍵報名等。([Yahoo奇摩新聞][1])

---

## 3) 主要風險（資安/法遵/營運）

### 3.1 資安風險

* **未授權操作（越權 CRUD）**、**前端可改後端狀態**、**志工個資（電話/Email）暴露**。([東森新聞][3])

### 3.2 個資/法遵

* 公開頁面**直接呈現 PII**（電話/Email/住址）→ 高風險；應**最小化蒐集**、**去識別化**、**短期保存與刪除機制**。可參照整合網的**隱私/條款**作法。([Google Sites][4])

### 3.3 營運與協同

* 高峰流量/輿情導流→容易擁擠；可利用**整合網/公民地圖**作鏡接或備援跳轉。([Google Sites][4])

---

## 4) 目標與非目標（Goals / Non-Goals）

**本輪（72 小時）目標**

1. **止血**：關閉/保護所有寫入端點、移除/遮蔽 PII、加上伺服端授權、審計 Log。
2. **復用**：以最小改動恢復「只讀聚合」功能（不暴露 PII），保留救援資訊可讀性。
3. **備援**：與整合網/公民地圖相互連結，提供替代路徑。

**非目標（此輪不做）**

* 大改 UI/UX；重寫前端框架；資料倉儲與 BI；長期志工管理 CRM。

---

## 5) 修補策略（How）— 由快到穩的技術路線

### 5.1 緊急止血（T0–T24h）

* **封鎖寫入**：暫時關閉所有 POST/PUT/PATCH/DELETE；或僅允許白名單 IP。
* **去識別化**：任務列表預設僅顯示「區域/需求量/集合點（模糊化）」；**移除電話/Email** 改為「系統代發一次性聯絡碼（簡訊/Email Relay）」。
* **伺服端授權**：RBAC（角色：發案者/審核者/志工/閱覽者）；**後端二次檢查**權限，拒絕前端偽造。
* **審計/追蹤**：最小化 Audit Log（誰、何時、對哪筆、做了什麼）。
* **對外公告**：發布「資安快訊 + 風險說明 + 負責任揭露信箱」，並暫引導志工走**官方分配站/慈濟**。([Yahoo奇摩新聞][9])

### 5.2 最小穩定化（T24–T72h）

* **保留現有資料源**但加閘：

  * 若後端為 Google Sheet：以 **Apps Script Web App** 封裝 API（驗來源/Token/欄位白名單/速率限制），移除公開分享。
  * 或遷移 **Supabase（Postgres + RLS）/Cloud Run + Firestore**：以 **RLS/Policies** 管控列級讀寫、匿名只讀視圖。
* **只讀端**：公開頁僅供**聚合資料/去識別清單**；敏感資訊置於**登入區**（到期即焚、僅一次可視）。
* **備援鏡接**：首頁明確提供整合網/公民地圖之連結（流量分散）。([Google Sites][4])

---

## 6) 架構建議（Reference Architecture）

```
[Browser]
   │
   ├─ Public Read (No PII) → CDN/Static Hosting (Cache-Control, noindex)
   │
   └─ Auth Wall (志工/審核者 SSO: OAuth/Email Link/OTP)
          │
          ├─ API Gateway (Rate-limit, JWT, CORS, CSRF, IP allowlist)
          │      └─ Service (Cloud Run/Fly.io/Node-FASTAPI)
          │             ├─ DB (Supabase Postgres + RLS / Firestore)
          │             ├─ Audit Log (append-only)
          │             └─ Secrets (KMS/Secrets Manager)
          │
          └─ Notifications (SMS/Email Relay w/ one-time tokens)
```

* **重點**：

  * **RLS/Policies**：使用者只能讀/寫自己提交的資料。
  * **一次性聯絡**：用 Token 代替電話/Email 直接顯示。
  * **到期即焚**：任務結束後自動清除 PII（Data Retention ≤ 7–14 天）。
  * **審計**：異常行為警示（大量刪改/連續失敗）。

---

## 7) 資料模型（最小欄位與保護）

| 實體          | 主要欄位（最小集）                                                  | PII          | 策略                         |
| ----------- | ---------------------------------------------------------- | ------------ | -------------------------- |
| `Task`      | id, region_code, geo_hash, need_count, status, report_time | 否            | 公開顯示（聚合/模糊定位）              |
| `Signup`    | id, task_id, volunteer_id, slot, one_time_contact_token    | **是（Token）** | 不存電話/Email；Token 24–48h 到期 |
| `Volunteer` | id, nickname, verified (Y/N)                               | 可選           | 真實聯絡方式**不落地**（由 Relay 代發）  |
| `Audit`     | id, actor_id, action, target_id, ts, ip                    | 否            | Append-only、7–30 天保存       |

---

## 8) 使用流程（User Flows）

1. **志工找任務（公開頁）**：只看區域與需求量 → 按「我要參加」→ 簡易驗證（Email Link/OTP）。
2. **領取一次性聯絡碼**：系統以簡訊/Email Relay 生成 `one_time_contact_token`，**不展示電話/Email**。
3. **帶隊者收件匣**：在受控後台看到匿名代碼清單，點擊「聯絡」即透過 Relay 傳訊。
4. **任務結束**：`Signup` 與聯絡 Token 到期清除；保留聚合統計與匿名 KPI。

---

## 9) 產品營運（與外部資源協同）

* 首頁固定提供：

  * **官方志工分配站/慈濟**動線（避免人潮誤流）。([Yahoo奇摩新聞][9])
  * **光復救災資訊整合網**、**公民地圖**鏡接（備援/分流/在地資訊）。([Google Sites][4])

---

## 10) 風險登錄（Risk Register）

| 風險                  | 等級 | 緩解                                   |
| ------------------- | -- | ------------------------------------ |
| PII 外洩（電話/Email/地址） | 高  | 預設不顯示；Relay 聯絡；Retention；審計          |
| 未授權 CRUD/前端改後端      | 高  | API Gate + RBAC + 伺服端授權 + Rate Limit |
| 媒體放大與輿情衝擊           | 中  | 公告/說明頁；第三方審查進度透明化                    |
| 高峰流量                | 中  | CDN/Cache；鏡接外部互補頁                    |
| 志工誤導/安全             | 中  | 首頁強制導向官方報到站流程與時段。([GVM][10])         |

---

## 11) 專為 Claude Code 的工作分解（可直接使用）

> 建議配合你常用的工作流（如 **pimzino/claude-code-spec-workflow** 的 Spec/Bug 流或 **ruvnet/claude-flow** 的 swarm/hive-mind）。以下提供**可貼上就跑**的命令與任務說明（不需開 PR 也能本地驗證）。

### 11.1 規格（Spec 流）

```
/spec-create shovel-heroes-secure-core "72h 安全止血 + 最小穩定化：關閉寫入、PII 去識別、RBAC、審計、Relay 聯絡、備援鏡接"
```

**關鍵子任務**

1. `api-freeze-write`: 關閉或白名單所有寫入端點
2. `pii-redact`: 任務列表移除電話/Email，改 Token Relay
3. `server-authz`: 後端加 RBAC + 權限檢核（拒前端偽造）
4. `audit-log-min`: 實作 append-only 審計
5. `backup-links`: 首頁新增整合網/公民地圖/志工分配站連結

```
/spec-execute 1 shovel-heroes-secure-core
```

### 11.2 修補（Bug 流）

```
/bug-create shovel-heroes-pii-leak "志工電話/Email 可於公開頁擷取"
/bug-analyze
/bug-fix
/bug-verify
```

**驗收條件（必過）**

* 未登入狀態抓不到任何電話/Email（自動化測試驗證）。
* 所有寫入請求未經授權一律 401/403；前端改參數無效。
* 任務頁僅顯示模糊地點與需求數；無個資欄位。
* 新增/修改/刪除操作都寫入 Audit Log。

### 11.3 本地驗證腳本（示例）

* 針對公開頁：以 `curl`/Playwright 斷言**無 PII**、任務欄位**皆匿名化**。
* 針對 API：未授權寫入 → `403`；權限正確 → 正常。
* 針對 Token Relay：Token 過期後不可再用（`410 Gone`）。

---

## 12) 可觀測性與維運（Ops）

* **警報**：多次 403/429 疊加 → 速率攻擊/暴力猜測；PII 模式檢測（避免誤上線）。
* **日誌**：`audit.log` 與 `access.log` 分離；查詢面板以「行為 → 主體 → 來源 IP」為主。
* **備援**：主站異常時自動切換到「整合網/公民地圖」告示頁（系統維護中）。([Google Sites][4])

---

## 13) 對外溝通（Comms）

* 首頁/社群釋出「**資安快訊**」：說明已採取之**遮蔽與保護**，與**負責任揭露**窗口（Email）。
* 公佈路線圖：T0–T24h（止血）、T24–T72h（最小穩定化）、>T72h（長期化）。
* 同步引導：**官方志工分配站**報到流程與時段。([GVM][10])

---

## 14) 後續里程碑（> 72h）

* SSO（Google/Email Link/OTP）
* 權限與資料瀏覽稽核報表
* SMS/Email Relay 正規化（供帶隊批量使用）
* 任務生命週期與 KPI（匿名聚合）
* 安全測試：SAST/DAST + Bug Bounty（小額回饋/公開致謝）

---

## 15) 參考與來源（持續更新）

* **官網/介面**：shovel-heroes.com（公告中心/任務）— 站點目前可見任務清單與地點資訊。([shovel-heroes.com][2])
* **平台介紹（媒體）**：Yahoo/TVBS/NowNews/SETN（平台四大區塊、一鍵報名、任務列表）。([Yahoo奇摩新聞][1])
* **英文專題**：RTI（「數位超人」建站、改善對接效率描述）。([中央廣播電臺][7])
* **志工分流**：行政與媒體對「志工分配站/慈濟」之說明。([Yahoo奇摩新聞][9])
* **整合資源頁**：光復救災資訊整合網（Google Sites；含隱私/條款）。([Google Sites][4])
* **公民地圖**：江明宗貼文線索（`tainan.olc.tw` 地圖）。([Threads][8])
* **資安事件**：東森新聞（EBC）與社群串流（Threads）、Dcard（未授權 CRUD/個資裸奔/前端改後端）。([東森新聞][3])

---

## 16) 附錄：最小政策文本草稿（可直接貼站）

**隱私保護（節錄）**

* 我們僅蒐集任務媒合所必要之資訊；公開頁面**不展示任何 PII**。
* 志工聯繫採**一次性聯絡碼（Token）**，避免電話/Email 外流。
* 任務結束後，相關可識別資訊將於 **7–14 天內自動刪除**。
* 若發現任何漏洞，請以「負責任揭露」方式回報：`security@shovel-heroes.com`。

**服務條款（節錄）**

* 禁止未授權存取、嘗試取得他人個資或干擾系統運作之行為。
* 本站得隨時暫停寫入功能以維護資訊安全。
* 本站為民間自助平台，不取代官方災防指揮；請優先遵循**官方志工分配站**動線。([GVM][10])

## 改進建議
- 提升使用體驗的錯誤處理與提示：目前多處直接使用 alert() 通知使用者，例如匯入／匯出或捐贈失敗。建議改用全域 Toaster 統一顯示成功或錯誤訊息，並為 API 錯誤提供更具體指引。
- 優化前端資料流與效能：
  - 長列表（如志工報名、物資清單）可採用 虛擬滾動 或 分頁 減少 DOM 負荷。
  - GridMonitor 與 Volunteers 頁面每次都重新抓取所有資料，可考慮使用 WebSocket 或 Server‑Sent Events 提供即時更新，減少輪詢與重複請求。

### 表單驗證與使用者輸入：
- AddGridModal、AddAreaModal 等目前僅在提交時檢查必填欄位，建議使用 react-hook-form 提供即時驗證與錯誤訊息提示。
- 可以加入 字串格式驗證（如電話號碼、Email）避免傳送無效資訊。

### 地理資訊功能加強：
- 地圖搜尋使用 Nominatim API 但未設定使用者代理或地點範圍，建議加入錯誤重試與節流機制，並支援點擊結果後自動標記和調整地圖縮放等互動。
- 網格邊界預設為 0.001° × 0.001°，可以加入 自訂網格大小 的選項或自動根據災區設定適當大小。

### 安全與權限：
- 前端對角色權限限制仍有邏輯，例如只有管理員能看到電話或編輯公告，但在程式中依賴前端屬性判斷。建議後端 API 回傳資料時根據權限篩選欄位，避免透過瀏覽器竄改顯示隱藏數據。
- 登入使用者資訊存於本地變數 User.me()，若逾時或權限變更未即時反映，可在頁面進入時再次驗證。
- 國際化與可及性：目前 UI 全以中文呈現，若考慮外部志工，可加入 i18n 支援；同時可以為按鈕、圖示添加 aria-label 增強無障礙體驗。

### 測試與建置：
- 建議新增 單元測試與端對端測試，涵蓋 API 呼叫、表單驗證與地圖互動。
- 在 CI/CD 流程中加入 lint 與 test 步驟，確保未來貢獻者的程式質量。
---



### END


[1]: https://tw.news.yahoo.com/%E6%95%B8%E4%BD%8D%E8%B6%85%E4%BA%BA%E4%BE%86%E4%BA%86-%E8%87%AA%E8%A3%BD-%E9%8F%9F%E5%AD%90%E8%8B%B1%E9%9B%84%E5%9C%B0%E5%9C%96-%E5%85%89%E5%BE%A9%E6%95%91%E6%8F%B4%E9%9C%80%E6%B1%82-%E6%AC%A1%E7%9C%8B-061318606.html?utm_source=chatgpt.com "數位超人來了！自製「鏟子英雄地圖」 光復救援需求一次看"
[2]: https://shovel-heroes.com/?utm_source=chatgpt.com "公告中心(Bulletin Hub)"
[3]: https://news.ebc.net.tw/news/living/514938?utm_source=chatgpt.com "不要用！「鏟子英雄」網站爆資安問題電話、郵件全看光"
[4]: https://sites.google.com/view/guangfu250923/home?utm_source=chatgpt.com "光復救災資訊整合網"
[5]: https://global.tzuchi.org/massive-community-relief-effort-after-typhoon-ragasa-landslides?utm_source=chatgpt.com "Massive Community Relief Effort After Typhoon Ragasa ..."
[6]: https://news.tvbs.com.tw/life/3003074?utm_source=chatgpt.com "一鍵報名加入救援！「鏟子英雄地圖」生成網讚：高手在民間"
[7]: https://www.rti.org.tw/en/news?pid=167517&uid=3&utm_source=chatgpt.com "Tech worker builds online platform to aid Hualian disaster ..."
[8]: https://www.threads.com/%40finjon_kiang/post/DPGptnukfRb/%E8%8A%B1%E8%93%AE%E5%85%89%E5%BE%A9%E6%95%91%E7%81%BD%E5%9C%B0%E5%9C%96%E4%B8%8A%E7%B7%9Ahttpstainanolctwpguangfu250923%E8%8A%B1%E8%93%AE%E7%B8%A3%E5%85%89%E5%BE%A9%E9%84%89%E5%9B%A0%E7%82%BA%E9%A6%AC%E5%A4%AA%E9%9E%8D%E6%BA%AA%E5%A0%B0%E5%A1%9E%E6%B9%96%E9%80%A0%E6%88%90%E7%81%BD%E5%AE%B3%E6%96%B0%E8%81%9E%E5%BC%95%E7%99%BC%E8%A8%B1%E5%A4%9A%E4%BA%BA%E5%89%8D%E5%BE%80%E5%8D%94%E5%8A%A9%E6%95%91%E7%81%BD%E4%BD%86%E7%BC%BA%E4%B9%8F%E6%AF%94%E8%BC%83%E6%9C%89%E6%95%88%E7%9A%84?utm_source=chatgpt.com "花蓮光復救災地圖上線https://tainan. ..."
[9]: https://tw.news.yahoo.com/%E6%95%B8%E4%BD%8D%E8%B6%85%E4%BA%BA%E4%BE%86%E4%BA%86-%E7%B6%B2%E8%87%AA%E8%A3%BD-%E9%8F%9F%E5%AD%90%E8%8B%B1%E9%9B%84%E5%9C%B0%E5%9C%96-%E7%9C%BE%E4%BA%BA%E9%A9%9A%E5%91%86-%E5%8F%B0%E7%81%A3%E4%BA%BA%E8%A1%8C%E5%8B%95%E5%8A%9B%E5%A4%AA%E5%BC%B7-235200133.html?utm_source=chatgpt.com "網自製「鏟子英雄地圖」！一鍵看哪需要志工眾人驚"
[10]: https://www.gvm.com.tw/article/124703?utm_source=chatgpt.com "花蓮光復「鏟子超人」必看》哪裡還收志工？交通地圖與正確報到"
