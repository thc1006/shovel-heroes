import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  UserCheck,
  Shield,
  Activity,
  TrendingUp,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import { http } from '@/api/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Admin Dashboard Overview
 *
 * Displays statistics, charts, and recent activity
 */
export default function AdminDashboard() {
  const [stats, setStats] = React.useState({
    totalUsers: 0,
    activeVolunteers: 0,
    pendingVictims: 0,
    recentLogins: 0,
    usersByRole: {},
    userGrowth: []
  });
  const [recentActivity, setRecentActivity] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual admin API endpoints when available
      // For now, using mock data structure
      const statsData = await http.get('/admin/stats').catch(() => ({
        totalUsers: 0,
        activeVolunteers: 0,
        pendingVictims: 0,
        recentLogins: 0,
        usersByRole: {
          volunteer: 0,
          victim: 0,
          ngo_coordinator: 0,
          admin: 0
        },
        userGrowth: []
      }));

      const activityData = await http.get('/admin/recent-activity').catch(() => []);

      setStats(statsData);
      setRecentActivity(Array.isArray(activityData) ? activityData : []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: '總用戶數',
      value: stats.totalUsers,
      icon: Users,
      color: 'blue',
      trend: '+12%',
      trendUp: true
    },
    {
      title: '活躍志工',
      value: stats.activeVolunteers,
      icon: UserCheck,
      color: 'green',
      trend: '+8%',
      trendUp: true
    },
    {
      title: '待審核受災戶',
      value: stats.pendingVictims,
      icon: Shield,
      color: 'orange',
      trend: '-3%',
      trendUp: false
    },
    {
      title: '近7天登入',
      value: stats.recentLogins,
      icon: Activity,
      color: 'purple',
      trend: '+5%',
      trendUp: true
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600 border-l-blue-500',
      green: 'bg-green-100 text-green-600 border-l-green-500',
      orange: 'bg-orange-100 text-orange-600 border-l-orange-500',
      purple: 'bg-purple-100 text-purple-600 border-l-purple-500'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">儀表板總覽</h2>
        <p className="text-gray-600 mt-1">系統使用統計與最近活動</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = getColorClasses(stat.color);

          return (
            <Card key={stat.title} className={`border-l-4 ${colorClasses.split(' ')[2]}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${colorClasses.split(' ').slice(0, 2).join(' ')}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${
                    stat.trendUp ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <TrendingUp className={`w-4 h-4 ${!stat.trendUp && 'rotate-180'}`} />
                    <span className="font-medium">{stat.trend}</span>
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-600 mt-1">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">用戶成長趨勢</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">圖表數據載入中...</p>
                <p className="text-xs mt-1">Chart component will be integrated here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users by Role Pie Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">用戶角色分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">圖表數據載入中...</p>
                <p className="text-xs mt-1">Pie chart component will be integrated here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">最近活動</CardTitle>
          <Link to="/admin/audit">
            <Button variant="ghost" size="sm">
              查看全部
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.slice(0, 10).map((activity, index) => (
                <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">暫無最近活動</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/admin/victims">
              <Button className="w-full bg-orange-600 hover:bg-orange-700" size="lg">
                <Shield className="w-5 h-5 mr-2" />
                審核受災戶
              </Button>
            </Link>
            <Link to="/admin/users">
              <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                <Users className="w-5 h-5 mr-2" />
                管理用戶
              </Button>
            </Link>
            <Link to="/admin/audit">
              <Button className="w-full bg-purple-600 hover:bg-purple-700" size="lg">
                <AlertCircle className="w-5 h-5 mr-2" />
                查看日誌
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
