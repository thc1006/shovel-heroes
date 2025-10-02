#!/usr/bin/env node
/**
 * Shovel Heroes - 資料庫連線測試腳本
 *
 * 用途：
 * - 驗證 DATABASE_URL 配置正確
 * - 測試 PostgreSQL 連線
 * - 檢查資料庫版本和基本資訊
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入 .env
dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

async function testConnection() {
  log('blue', '🔍 Shovel Heroes - 資料庫連線測試');
  log('blue', '===================================');
  console.log();

  // 檢查環境變數
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log('red', '❌ 錯誤: DATABASE_URL 環境變數未設定');
    log('yellow', '💡 請檢查 .env 文件');
    process.exit(1);
  }

  log('green', '✓ DATABASE_URL 已設定');

  // 遮蔽密碼顯示
  const safeUrl = databaseUrl.replace(/:([^@]+)@/, ':****@');
  console.log(`  ${safeUrl}`);
  console.log();

  // 建立連線池
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    // 測試 1: 基本連線
    log('blue', '📡 測試 1: 基本連線');
    const client = await pool.connect();
    log('green', '✓ 連線成功');

    // 測試 2: PostgreSQL 版本
    log('blue', '\n📊 測試 2: PostgreSQL 資訊');
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version;
    log('green', `✓ PostgreSQL 版本: ${version.split(',')[0]}`);

    // 測試 3: 當前資料庫
    const dbResult = await client.query('SELECT current_database()');
    const dbName = dbResult.rows[0].current_database;
    log('green', `✓ 當前資料庫: ${dbName}`);

    // 測試 4: 資料庫大小
    const sizeResult = await client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    const dbSize = sizeResult.rows[0].size;
    log('green', `✓ 資料庫大小: ${dbSize}`);

    // 測試 5: 列出資料表
    log('blue', '\n📋 測試 3: 資料表檢查');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      log('yellow', '⚠️  沒有找到資料表');
      log('yellow', '💡 請執行資料庫遷移: npm run migrate:up');
    } else {
      log('green', `✓ 找到 ${tablesResult.rows.length} 個資料表:`);
      tablesResult.rows.forEach(row => {
        console.log(`    - ${row.table_name}`);
      });
    }

    // 測試 6: 連線池狀態
    log('blue', '\n🔌 測試 4: 連線池狀態');
    log('green', `✓ 總連線數: ${pool.totalCount}`);
    log('green', `✓ 閒置連線: ${pool.idleCount}`);
    log('green', `✓ 等待連線: ${pool.waitingCount}`);

    // 釋放連線
    client.release();

    // 總結
    console.log();
    log('green', '✅ 所有測試通過！資料庫連線正常');
    console.log();
    log('blue', '🎯 下一步操作:');
    console.log('  1. 確保已執行遷移: npm run migrate:up');
    console.log('  2. 啟動開發伺服器: npm run dev');
    console.log('  3. 測試健康檢查: curl http://localhost:8787/healthz');
    console.log();

  } catch (error) {
    log('red', '\n❌ 連線測試失敗');
    log('red', `錯誤訊息: ${error.message}`);
    console.log();

    if (error.code === 'ECONNREFUSED') {
      log('yellow', '💡 可能的原因:');
      console.log('  1. PostgreSQL 容器未啟動');
      console.log('  2. 連線埠設定錯誤');
      console.log();
      log('yellow', '🔧 建議操作:');
      console.log('  docker compose up -d db');
      console.log('  docker ps | grep postgres');
    } else if (error.code === 'ENOTFOUND') {
      log('yellow', '💡 主機名稱無法解析，請檢查 DATABASE_URL');
    } else if (error.code === '28P01') {
      log('yellow', '💡 認證失敗，請檢查使用者名稱和密碼');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 執行測試
testConnection().catch(error => {
  log('red', '❌ 未預期的錯誤:', error);
  process.exit(1);
});
