import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Download,
  Filter,
  Shield,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  FileText
} from 'lucide-react';
import { http } from '@/api/client';

/**
 * Audit Logs Page
 *
 * Features:
 * - Timeline view of security events
 * - Filters by user, action, date range, risk level
 * - Export to CSV
 */
export default function AuditLogs() {
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [actionFilter, setActionFilter] = React.useState('all');
  const [riskFilter, setRiskFilter] = React.useState('all');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [userFilter, setUserFilter] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 50;

  React.useEffect(() => {
    loadLogs();
  }, [currentPage, actionFilter, riskFilter, startDate, endDate]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      const params = {
        page: currentPage,
        limit: pageSize,
      };

      if (actionFilter !== 'all') params.action = actionFilter;
      if (riskFilter !== 'all') params.risk_level = riskFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (userFilter) params.user = userFilter;

      // TODO: Replace with actual admin endpoint
      const response = await http.get('/admin/audit-logs', { params }).catch(() => []);

      setLogs(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // TODO: Implement CSV export
      const params = {
        action: actionFilter !== 'all' ? actionFilter : undefined,
        risk_level: riskFilter !== 'all' ? riskFilter : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      const response = await http.get('/admin/audit-logs/export', { params });

      // Create download link
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export logs:', error);
      alert('匯出失敗');
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      login_success: CheckCircle,
      login_failed: XCircle,
      logout: User,
      user_created: User,
      user_updated: User,
      user_suspended: Shield,
      user_deleted: XCircle,
      permission_changed: Shield,
      data_accessed: Info,
      data_modified: AlertTriangle,
      security_alert: AlertTriangle
    };
    return icons[action] || Info;
  };

  const getActionLabel = (action) => {
    const labels = {
      login_success: '登入成功',
      login_failed: '登入失敗',
      logout: '登出',
      user_created: '用戶創建',
      user_updated: '用戶更新',
      user_suspended: '用戶停用',
      user_deleted: '用戶刪除',
      permission_changed: '權限變更',
      data_accessed: '資料存取',
      data_modified: '資料修改',
      security_alert: '安全警報'
    };
    return labels[action] || action;
  };

  const getRiskBadge = (level) => {
    const badges = {
      low: { color: 'bg-green-100 text-green-800', label: '低風險', icon: CheckCircle },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: '中風險', icon: Info },
      high: { color: 'bg-orange-100 text-orange-800', label: '高風險', icon: AlertTriangle },
      critical: { color: 'bg-red-600 text-white', label: '危急', icon: Shield }
    };
    return badges[level] || badges.low;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">審計日誌</h2>
          <p className="text-gray-600 mt-1">系統安全事件與操作記錄</p>
        </div>
        <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          匯出 CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="所有操作" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有操作</SelectItem>
                <SelectItem value="login_success">登入成功</SelectItem>
                <SelectItem value="login_failed">登入失敗</SelectItem>
                <SelectItem value="user_created">用戶創建</SelectItem>
                <SelectItem value="user_suspended">用戶停用</SelectItem>
                <SelectItem value="permission_changed">權限變更</SelectItem>
                <SelectItem value="security_alert">安全警報</SelectItem>
              </SelectContent>
            </Select>

            {/* Risk Level Filter */}
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger>
                <SelectValue placeholder="所有風險等級" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有風險等級</SelectItem>
                <SelectItem value="low">低風險</SelectItem>
                <SelectItem value="medium">中風險</SelectItem>
                <SelectItem value="high">高風險</SelectItem>
                <SelectItem value="critical">危急</SelectItem>
              </SelectContent>
            </Select>

            {/* Start Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10"
                placeholder="開始日期"
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10"
                placeholder="結束日期"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>顯示 {logs.length} 筆記錄</span>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">沒有找到審計日誌</p>
              <p className="text-sm mt-2">調整篩選條件以查看更多記錄</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>事件時間軸</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logs.map((log, index) => {
                const ActionIcon = getActionIcon(log.action);
                const riskBadge = getRiskBadge(log.risk_level);
                const RiskIcon = riskBadge.icon;

                return (
                  <div
                    key={log.id || index}
                    className="flex gap-4 pb-4 border-b last:border-0 last:pb-0"
                  >
                    {/* Timeline Dot */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        log.risk_level === 'critical' || log.risk_level === 'high'
                          ? 'bg-red-100'
                          : log.risk_level === 'medium'
                          ? 'bg-yellow-100'
                          : 'bg-blue-100'
                      }`}>
                        <ActionIcon className={`w-5 h-5 ${
                          log.risk_level === 'critical' || log.risk_level === 'high'
                            ? 'text-red-600'
                            : log.risk_level === 'medium'
                            ? 'text-yellow-600'
                            : 'text-blue-600'
                        }`} />
                      </div>
                      {index < logs.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 mt-2" />
                      )}
                    </div>

                    {/* Log Content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {getActionLabel(log.action)}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {log.user_name || log.user_email || '系統'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(log.timestamp).toLocaleString('zh-TW')}
                            </span>
                          </div>
                        </div>
                        {log.risk_level && log.risk_level !== 'low' && (
                          <Badge className={riskBadge.color}>
                            <RiskIcon className="w-3 h-3 mr-1" />
                            {riskBadge.label}
                          </Badge>
                        )}
                      </div>

                      {/* Details */}
                      <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                        {log.description && (
                          <p className="text-gray-700">{log.description}</p>
                        )}
                        {log.resource_type && (
                          <div className="text-gray-600">
                            資源類型: <span className="font-medium">{log.resource_type}</span>
                            {log.resource_id && ` (ID: ${log.resource_id})`}
                          </div>
                        )}
                        {log.ip_address && (
                          <div className="text-gray-600">
                            IP 位址: <span className="font-mono">{log.ip_address}</span>
                          </div>
                        )}
                        {log.user_agent && (
                          <div className="text-gray-600 truncate">
                            User-Agent: <span className="font-mono text-xs">{log.user_agent}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More */}
            {logs.length >= pageSize && (
              <div className="text-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  載入更多
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
