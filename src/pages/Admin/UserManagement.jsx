import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  UserX,
  UserCheck,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { http } from '@/api/client';

/**
 * User Management Page
 *
 * Features:
 * - User list with search and filters
 * - Pagination
 * - User actions (view, suspend, activate)
 */
export default function UserManagement() {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [verifiedFilter, setVerifiedFilter] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalUsers, setTotalUsers] = React.useState(0);
  const pageSize = 20;

  React.useEffect(() => {
    loadUsers();
  }, [currentPage, roleFilter, statusFilter, verifiedFilter]);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        loadUsers();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      const params = {
        page: currentPage,
        limit: pageSize,
      };

      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (verifiedFilter !== 'all') params.verified = verifiedFilter === 'verified';
      if (searchQuery) params.search = searchQuery;

      // TODO: Replace with actual admin endpoint
      const response = await http.get('/admin/users', { params }).catch(() => ({
        data: [],
        total: 0,
        page: 1,
        totalPages: 1
      }));

      setUsers(Array.isArray(response.data) ? response.data : []);
      setTotalUsers(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId, action) => {
    try {
      let endpoint = '';
      let method = 'post';

      switch (action) {
        case 'suspend':
          endpoint = `/admin/users/${userId}/suspend`;
          break;
        case 'activate':
          endpoint = `/admin/users/${userId}/activate`;
          break;
        case 'view-details':
          // Navigate to user details page
          alert(`查看用戶詳情: ${userId}\n功能開發中...`);
          return;
        case 'view-audit':
          // Navigate to audit logs for this user
          alert(`查看用戶審計日誌: ${userId}\n功能開發中...`);
          return;
        default:
          return;
      }

      if (endpoint) {
        await http[method](endpoint);
        loadUsers(); // Reload users after action
      }
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      alert(`操作失敗: ${error.message}`);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      super_admin: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      regional_admin: 'bg-indigo-100 text-indigo-800',
      ngo_coordinator: 'bg-teal-100 text-teal-800',
      volunteer: 'bg-green-100 text-green-800',
      victim: 'bg-orange-100 text-orange-800',
      user: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || colors.user;
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.inactive;
  };

  const getRoleLabel = (role) => {
    const labels = {
      super_admin: '超級管理員',
      admin: '管理員',
      regional_admin: '區域管理',
      ngo_coordinator: 'NGO協調',
      volunteer: '志工',
      victim: '受災戶',
      user: '一般用戶'
    };
    return labels[role] || role;
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: '活躍',
      suspended: '停用',
      inactive: '未激活'
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">用戶管理</h2>
        <p className="text-gray-600 mt-1">搜尋、篩選和管理系統用戶</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜尋姓名、電郵、電話..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="所有角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有角色</SelectItem>
                <SelectItem value="volunteer">志工</SelectItem>
                <SelectItem value="victim">受災戶</SelectItem>
                <SelectItem value="ngo_coordinator">NGO協調</SelectItem>
                <SelectItem value="admin">管理員</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="所有狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有狀態</SelectItem>
                <SelectItem value="active">活躍</SelectItem>
                <SelectItem value="suspended">停用</SelectItem>
                <SelectItem value="inactive">未激活</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Info */}
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>
              顯示 {users.length} / {totalUsers} 個用戶
              {roleFilter !== 'all' && ` · 角色: ${getRoleLabel(roleFilter)}`}
              {statusFilter !== 'all' && ` · 狀態: ${getStatusLabel(statusFilter)}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>用戶列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>未找到符合條件的用戶</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>聯絡方式</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>已驗證</TableHead>
                    <TableHead>最後登入</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || user.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.email && <div>{user.email}</div>}
                          {user.phone && <div className="text-gray-500">{user.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(user.status)}>
                          {getStatusLabel(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.verified ? (
                          <UserCheck className="w-5 h-5 text-green-600" />
                        ) : (
                          <UserX className="w-5 h-5 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString('zh-TW') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleAction(user.id, 'view-details')}>
                              <Eye className="w-4 h-4 mr-2" />
                              查看詳情
                            </DropdownMenuItem>
                            {user.status === 'active' ? (
                              <DropdownMenuItem
                                onClick={() => handleAction(user.id, 'suspend')}
                                className="text-red-600"
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                停用帳號
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleAction(user.id, 'activate')}
                                className="text-green-600"
                              >
                                <UserCheck className="w-4 h-4 mr-2" />
                                啟用帳號
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleAction(user.id, 'view-audit')}>
                              <FileText className="w-4 h-4 mr-2" />
                              審計日誌
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600">
                    第 {currentPage} / {totalPages} 頁
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      上一頁
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      下一頁
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
