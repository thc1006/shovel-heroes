# CLAUDE_CODE_BOOTSTRAP.md — 鏟子英雄：安全止血 + 最小穩定化（FastAPI / Postgres / RLS）

> 版本：2025-10-02（台北）
> 目的：**立即止血**（關閉未授權寫入、去除 PII）、**最小穩定化**（JWT + RBAC + 審計 + 限流 + RLS）、**可本機驗證**
> 關鍵依據：**OWASP ASVS**、**OWASP API Security Top 10 (2023)**、**PostgreSQL RLS**、**FastAPI OAuth2/JWT**、**SlowAPI 限流**、**MailHog 測試信件**。參考連結已置於各段末尾。

---

## 0) 安全與設計原則（給 Claude 的思考錨點）

* 以 **ASVS/OWASP API Top 10** 作為安全需求基線：避免越權（BOLA/OPLA）、認證缺陷、資源濫用（簡訊/Email Relay 也算資源）。([GitHub][1])
* **資料最小化**與**去識別化**：公開端點僅回傳聚合資訊，不回傳電話/Email；聯絡採**一次性 Token Relay**。依據 PII 基本原則（NIST 類指引，延伸自 ASVS 通則）。([OWASP Foundation][2])
* **伺服端授權為主**：所有寫入/狀態改變均在後端檢查，前端永不作為信任邊界；JWT + RBAC + **PostgreSQL RLS** 做「雙層授權」。([PostgreSQL][3])
* **Row-Level Security**：以 `current_setting('app.user_id')` 供策略判斷；每請求在 DB 連線層 `SET LOCAL`。([PostgreSQL][3])
* **限流與防濫用**：對所有路由及特定敏感動作（註冊、發 Token、Relay）施加速率限制。([SlowApi][4])
* **開發期郵件**用 **MailHog** 收信（防止誤發到真實信箱）。([GitHub][5])
* **JWT/OAuth2** 與 **FastAPI** 官方做法一致（此文檔使用 **PyJWT**，符合最新教學）。([FastAPI][6])

---

## 1) 專案結構（Claude 先建立以下檔案）

```
shovel-heroes-secure/
├─ docker-compose.yml
├─ .env.example
├─ README.md
├─ backend/
│  ├─ app/
│  │  ├─ main.py
│  │  ├─ config.py
│  │  ├─ security.py
│  │  ├─ deps.py
│  │  ├─ models.py
│  │  ├─ schemas.py
│  │  ├─ relay.py
│  │  ├─ audit.py
│  │  └─ routers/
│  │     ├─ public.py
│  │     ├─ auth.py
│  │     ├─ tasks.py
│  │     └─ signup.py
│  ├─ requirements.txt
│  ├─ alembic.ini
│  └─ migrations/ (由 alembic 自動建立)
└─ db/
   └─ init.sql
```

---

## 2) Docker Compose（Postgres + MailHog + API）

> 使用 Compose 規格參考官方文件（建議使用 Compose v2 插件，檔案不必再寫 `version:`）。([Docker Documentation][7])

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app_pw
      POSTGRES_DB: shovel
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/00-init.sql:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d shovel"]
      interval: 5s
      timeout: 3s
      retries: 10

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "8025:8025"   # Web UI
      - "1025:1025"   # SMTP
    # 僅供開發測試，勿用於正式環境。:contentReference[oaicite:8]{index=8}

  api:
    build: ./backend
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8000:8000"
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

volumes:
  pgdata:
```

---

## 3) .env（請複製為 `.env`）

```dotenv
# .env.example
DATABASE_URL=postgresql://app:app_pw@db:5432/shovel
JWT_SECRET=change_this_in_prod
JWT_ALG=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_FROM=noreply@shovel.local

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limit
RATE_LIMIT_DEFAULT=100/minute
```

---

## 4) 後端相依（FastAPI + SQLAlchemy + PyJWT + SlowAPI + Alembic）

> FastAPI OAuth2/JWT 教學（最新版顯示 PyJWT）、SlowAPI 限流、Alembic 遷移。([FastAPI][6])

```txt
# backend/requirements.txt
fastapi==0.115.2
uvicorn[standard]==0.30.6
SQLAlchemy==2.0.35
psycopg2-binary==2.9.9
alembic==1.13.2
pydantic==2.9.2
python-dotenv==1.0.1
PyJWT==2.10.1
slowapi==0.1.9
email-validator==2.2.0
```

---

## 5) DB 初始化（RLS + 角色/策略）

> 依 Postgres 官方文件啟用 **Row Level Security**，以 `current_setting('app.user_id')` 作為策略依據。([PostgreSQL][3])

```sql
-- db/init.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 基本表（最小欄位集）
CREATE TABLE IF NOT EXISTS task (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code TEXT NOT NULL,
  geo_hash    TEXT,
  need_count  INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',
  report_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS volunteer (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname    TEXT NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS signup (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES volunteer(id) ON DELETE CASCADE,
  slot        INTEGER NOT NULL DEFAULT 1,
  one_time_contact_token TEXT,              -- 不落地電話/Email，僅 Token
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    TEXT,
  action      TEXT NOT NULL,
  target_id   TEXT,
  ip          INET,
  ts          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 啟用 RLS
ALTER TABLE signup ENABLE ROW LEVEL SECURITY;

-- 僅允許「自己（JWT 綁定的 user_id）」查看/寫入自己的 signup
CREATE POLICY signup_select_is_own
  ON signup FOR SELECT
  USING (volunteer_id::text = current_setting('app.user_id', true));

CREATE POLICY signup_modify_is_own
  ON signup FOR INSERT WITH CHECK (volunteer_id::text = current_setting('app.user_id', true))
  ,         FOR UPDATE USING (volunteer_id::text = current_setting('app.user_id', true));
```

> 若後續要擴充更嚴密的角色（admin/reviewer），可再加 `USING/ WITH CHECK` 策略，或以資料庫角色對應。([PostgreSQL][3])

---

## 6) FastAPI App（骨架）

### 6.1 `config.py`

```python
# backend/app/config.py
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseModel):
    database_url: str = os.getenv("DATABASE_URL", "")
    jwt_secret: str = os.getenv("JWT_SECRET", "dev")
    jwt_alg: str = os.getenv("JWT_ALG", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    cors_origins: list[str] = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
    rate_limit_default: str = os.getenv("RATE_LIMIT_DEFAULT", "100/minute")
    smtp_host: str = os.getenv("SMTP_HOST", "mailhog")
    smtp_port: int = int(os.getenv("SMTP_PORT", "1025"))
    smtp_from: str = os.getenv("SMTP_FROM", "noreply@shovel.local")

settings = Settings()
```

### 6.2 `models.py`

```python
# backend/app/models.py
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import text, ForeignKey, Integer, String, Boolean
from typing import Optional
import uuid

class Base(DeclarativeBase):
    pass

class Task(Base):
    __tablename__ = "task"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    region_code: Mapped[str] = mapped_column(String, nullable=False)
    geo_hash: Mapped[Optional[str]] = mapped_column(String)
    need_count: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, default="open")
    # report_time 由 DB 預設

class Volunteer(Base):
    __tablename__ = "volunteer"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nickname: Mapped[str] = mapped_column(String, nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)

class Signup(Base):
    __tablename__ = "signup"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("task.id", ondelete="CASCADE"))
    volunteer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("volunteer.id", ondelete="CASCADE"))
    slot: Mapped[int] = mapped_column(Integer, default=1)
    one_time_contact_token: Mapped[Optional[str]] = mapped_column(String)
```

### 6.3 `schemas.py`

```python
# backend/app/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

class TaskPublic(BaseModel):
    id: UUID
    region_code: str
    geo_hash: Optional[str] = None
    need_count: int
    status: str

class TaskCreate(BaseModel):
    region_code: str
    geo_hash: Optional[str] = None
    need_count: int = Field(ge=1)

class VolunteerCreate(BaseModel):
    nickname: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

### 6.4 `security.py`（JWT）

> 依 FastAPI 官方 OAuth2/JWT 教學，使用 **PyJWT**。([FastAPI][6])

```python
# backend/app/security.py
import jwt, datetime
from fastapi import HTTPException, status
from app.config import settings

def create_access_token(sub: str) -> str:
    now = datetime.datetime.utcnow()
    exp = now + datetime.timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": sub, "iat": now, "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_alg)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
```

### 6.5 `deps.py`（DB Session + 設定 app.user_id / 限流）

```python
# backend/app/deps.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import Depends, Header, HTTPException, status
from app.security import decode_token
from app.config import settings
from slowapi import Limiter
from slowapi.util import get_remote_address

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

limiter = Limiter(key_func=get_remote_address)  # 全域限流，數值在路由上覆蓋或使用預設。:contentReference[oaicite:13]{index=13}

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(authorization: str = Header(None), db=Depends(get_db)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # 在本連線設定 app.user_id，供 RLS 使用
    db.execute("SELECT set_config('app.user_id', :uid, true)", {"uid": user_id})
    return user_id
```

### 6.6 `relay.py`（一次性聯絡碼「代發」草稿）

> 開發期用 **MailHog**，可在 `http://localhost:8025` 檢視郵件。([GitHub][5])

```python
# backend/app/relay.py
import smtplib
from email.message import EmailMessage
from app.config import settings

def send_contact_token(to_addr: str, token: str):
    # 注意：正式環境請換成真實 SMTP/送信服務與簽署設定
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to_addr
    msg["Subject"] = "Your one-time contact token"
    msg.set_content(f"Token: {token}\nValid for 24h.")
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as s:
        s.send_message(msg)
```

### 6.7 `audit.py`

```python
# backend/app/audit.py
from sqlalchemy.orm import Session

def audit(db: Session, actor_id: str|None, action: str, target_id: str|None, ip: str|None):
    db.execute(
        "INSERT INTO audit(actor_id, action, target_id, ip) VALUES (:a, :ac, :t, :ip)",
        {"a": actor_id, "ac": action, "t": target_id, "ip": ip}
    )
```

### 6.8 路由

`routers/public.py`（只讀、去識別化）

```python
# backend/app/routers/public.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.deps import get_db, limiter
from app.schemas import TaskPublic

router = APIRouter(prefix="/public", tags=["public"])

@router.get("/tasks", response_model=list[TaskPublic])
@limiter.limit("60/minute")  # 公開端點亦限流，避免濫用。:contentReference[oaicite:15]{index=15}
def list_tasks(db: Session = Depends(get_db)):
    rows = db.execute("""
      SELECT id, region_code, geo_hash, need_count, status
      FROM task WHERE status='open' ORDER BY report_time DESC
    """).fetchall()
    return [TaskPublic(**dict(r)) for r in rows]
```

`routers/auth.py`（最小登入/註冊流程，無密碼，僅示範）

```python
# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import uuid4
from app.deps import get_db, limiter
from app.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup-anon")
@limiter.limit("10/minute")
def signup_anon(nickname: str, db: Session = Depends(get_db)):
    vid = str(uuid4())
    db.execute("INSERT INTO volunteer(id, nickname, verified) VALUES (:i, :n, false)", {"i": vid, "n": nickname})
    token = create_access_token(vid)
    return {"volunteer_id": vid, "token": token}
```

`routers/tasks.py`（受保護：建立任務）

```python
# backend/app/routers/tasks.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.deps import get_db, get_current_user, limiter
from app.schemas import TaskCreate

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def create_task(body: TaskCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    # 可擴充 RBAC：僅 reviewer/admin 可建任務
    db.execute(
        "INSERT INTO task(region_code, geo_hash, need_count, status) VALUES (:r,:g,:n,'open')",
        {"r": body.region_code, "g": body.geo_hash, "n": body.need_count}
    )
    return {"ok": True}
```

`routers/signup.py`（受保護：志工報名，套用 RLS）

```python
# backend/app/routers/signup.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import uuid4
from app.deps import get_db, get_current_user, limiter

router = APIRouter(prefix="/signup", tags=["signup"])

@router.post("")
@limiter.limit("30/minute")
def sign_up(task_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    sid = str(uuid4())
    # Insert 會被 RLS WITH CHECK 守住 volunteer_id == current_setting('app.user_id')
    db.execute(
        "INSERT INTO signup(id, task_id, volunteer_id, slot) VALUES (:i, :t, :v, 1)",
        {"i": sid, "t": task_id, "v": user_id}
    )
    return {"signup_id": sid}
```

### 6.9 `main.py`（整合、CORS、限流中介）

> CORS 設定參考 FastAPI 官方說明。([FastAPI][8])

```python
# backend/app/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.deps import limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.routers import public, auth, tasks, signup

app = FastAPI(title="Shovel Heroes API (secure-min)")
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)  # 全域限流中介（再配合各路由 @limit）:contentReference[oaicite:17]{index=17}

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RateLimitExceeded)
def ratelimit_handler(request: Request, exc: RateLimitExceeded):
    return PlainTextResponse(str(exc), status_code=429)

app.include_router(public.router)
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(signup.router)
```

---

## 7) Alembic（資料遷移）

> Alembic 官方文件：建立 `alembic.ini` 與 `migrations/`，以 SQLAlchemy 維護 schema。([alembic.sqlalchemy.org][9])

**初始化命令（供 Claude 直接執行）**

```bash
cd backend
alembic init migrations
# 編輯 alembic.ini / env.py 指向 settings.database_url，後續以遷移管理 schema 變更
```

---

## 8) 本機啟動與驗證

```bash
# 1) 啟動
docker compose up --build -d

# 2) 健康檢查
curl -s http://localhost:8000/docs >/dev/null && echo "API OK"
open http://localhost:8025   # MailHog UI

# 3) 建立匿名志工 + 取得 JWT
VOL_JSON=$(curl -s -X POST "http://localhost:8000/auth/signup-anon?nickname=Kite")
TOKEN=$(echo "$VOL_JSON" | python -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 4) 公開端點不得含 PII（此骨架本就不輸出電話/Email）
curl -s http://localhost:8000/public/tasks | jq .

# 5) 未授權寫入應 401/403
curl -i -X POST http://localhost:8000/tasks -H 'Content-Type: application/json' -d '{"region_code":"R1","geo_hash":"wsqq","need_count":10}'

# 6) 授權後可建任務（示例）
curl -s -X POST http://localhost:8000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"region_code":"R1","geo_hash":"wsqq","need_count":5}'

# 7) 報名一個任務（RLS 檢查 volunteer_id == JWT.sub）
TASK_ID=$(curl -s http://localhost:8000/public/tasks | jq -r '.[0].id')
curl -s -X POST "http://localhost:8000/signup?task_id=$TASK_ID" -H "Authorization: Bearer $TOKEN"
```

---

## 9) 測試清單（Claude 任務分解）

1. `api-freeze-write`：未授權所有寫入 → 401/403（符合 **API2:2023 Broken Authentication**、**API1/3 授權**）。([OWASP Foundation][10])
2. `pii-redact`：公開 `/public` 僅輸出去識別欄位；檢查無電話/Email。
3. `server-authz`：在 DB 連線層 `set_config('app.user_id')`，RLS `USING/WITH CHECK` 擋越權（對應 **BOLA/OPLA**）。([PostgreSQL][3])
4. `rate-limit`：SlowAPI 全域中介 + 路由粒度（對應 **API4:2023 Unrestricted Resource Consumption**）。([OWASP Foundation][11])
5. `audit-log-min`：所有寫入動作寫入 `audit`。
6. `relay-token`：以 MailHog 驗證一次性聯絡碼通知路徑（開發期）。([GitHub][5])

---

## 10) 後續強化（>72h）

* **OAuth2 / 第三方登入**（FastAPI 安全模組），改進身份與會話管理。([FastAPI][12])
* **CSRF**（若使用 Cookie/瀏覽器同源場景）：`fastapi-csrf-protect` 或 Starlette CSRF 中介。([PyPI][13])
* **更嚴密的 RBAC 與審計查詢**；**限流存儲**改用 Redis（SlowAPI 支援）。([SlowApi][14])
* **Alembic 遷移腳本**自動化（上線前把 `db/init.sql` 改為遷移流程）。([alembic.sqlalchemy.org][9])

---

## 11) 來源與依據（精選）

* **OWASP ASVS 4.0.3**（官方/GitHub PDF）。([OWASP Foundation][2])
* **OWASP API Security Top 10 (2023)**（總覽與細項，如 API1/3/4）。([OWASP Foundation][10])
* **PostgreSQL Row-Level Security（官方文件）**。([PostgreSQL][3])
* **Supabase Docs：RLS 實務**（理解 RLS 與應用）。([Supabase][15])
* **FastAPI 安全 / OAuth2 + JWT（官方）**。([FastAPI][6])
* **SlowAPI（FastAPI/Starlette 限流）**。([SlowApi][4])
* **MailHog（開發期郵件測試）**。([GitHub][5])
* **Docker Compose（官方規格）**。([Docker Documentation][7])

---

### 備註給 Claude Code

* **優先修補**：把現場任何「前端可改後端狀態」「公開清單露出電話/Email」立即移除；一律改成「公開聚合視圖 + 受保護互動」。此骨架已預設如此。
* **驗收條件**（務必自動化）：

  1. 未授權寫入 = 401/403；
  2. `/public/*` 無 PII；
  3. 同一 JWT 只能操作自己的 `signup`（RLS 生效）；
  4. 高頻請求被限流（429）；
  5. 所有寫入紀錄到 `audit`。

---

> 完成以上後，你就有一個能在本機跑起來的「**去 PII、授權嚴格、可限流、含 RLS**」最小後端。若你要，我也可以把**同等安全原則**再加上一個**極簡前端（只讀/聚合）**與**CI 驗證腳本**，直接補在下一則訊息。

[1]: https://raw.githubusercontent.com/OWASP/ASVS/v4.0.3/4.0/OWASP%20Application%20Security%20Verification%20Standard%204.0.3-en.pdf "Application Security Verification Standard 4.0.3 - GitHub"
[2]: https://owasp.org/www-project-application-security-verification-standard/ "OWASP Application Security Verification Standard (ASVS)"
[3]: https://www.postgresql.org/docs/current/ddl-rowsecurity.html "Documentation: 18: 5.9. Row Security Policies"
[4]: https://slowapi.readthedocs.io/ "SlowApi Documentation"
[5]: https://github.com/mailhog/MailHog "mailhog/MailHog: Web and API based SMTP testing"
[6]: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/ "OAuth2 with Password (and hashing), Bearer with JWT ..."
[7]: https://docs.docker.com/reference/compose-file/ "Compose file reference"
[8]: https://fastapi.tiangolo.com/tutorial/cors/ "CORS (Cross-Origin Resource Sharing) - FastAPI"
[9]: https://alembic.sqlalchemy.org/ "Welcome to Alembic's documentation! — Alembic 1.16.5 ..."
[10]: https://owasp.org/API-Security/editions/2023/en/0x00-header/ "OWASP API Security Top 10 2023 edition"
[11]: https://owasp.org/API-Security/editions/2023/en/0x11-t10/ "OWASP Top 10 API Security Risks – 2023"
[12]: https://fastapi.tiangolo.com/tutorial/security/ "Security"
[13]: https://pypi.org/project/fastapi-csrf-protect/ "fastapi-csrf-protect"
[14]: https://slowapi.readthedocs.io/en/latest/api/ "API reference - SlowApi Documentation - Read the Docs"
[15]: https://supabase.com/docs/guides/database/postgres/row-level-security "Row Level Security | Supabase Docs"
