-- 資料庫診斷腳本
-- 檢查所有表是否存在

\echo '========================================='
\echo '資料庫表檢查'
\echo '========================================='

SELECT 
  tablename,
  CASE 
    WHEN tablename IN ('volunteer_registrations', 'supply_donations', 'volunteers') 
    THEN '✅ 關鍵表'
    ELSE '  一般表'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

\echo ''
\echo '========================================='
\echo '關鍵表存在性檢查'
\echo '========================================='

SELECT 
  'volunteer_registrations' as table_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'volunteer_registrations') as exists
UNION ALL
SELECT 
  'supply_donations',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supply_donations')
UNION ALL
SELECT 
  'volunteers',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'volunteers');

\echo ''
\echo '========================================='
\echo 'RLS 政策檢查'
\echo '========================================='

SELECT 
  tablename,
  policyname,
  cmd as command,
  permissive
FROM pg_policies
WHERE tablename IN ('volunteer_registrations', 'supply_donations', 'volunteers')
ORDER BY tablename, policyname;

\echo ''
\echo '========================================='
\echo '遷移歷史'
\echo '========================================='

SELECT 
  id,
  name,
  run_on
FROM pgmigrations
ORDER BY run_on DESC
LIMIT 10;
