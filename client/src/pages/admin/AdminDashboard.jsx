// 📁 src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalProfit: 0,
    pendingWithdrawals: 0
  });
  const [chartData, setChartData] = useState(null);
  const [chartTab, setChartTab] = useState('daily'); // 'daily' | 'cumulative'
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 실제 백엔드 API 엔드포인트 사용
      const [usersRes, withdrawalsRes, quantTodayRes, quantTotalRes, fundingTodayRes, fundingTotalRes, chartRes] = await Promise.all([
        axios.get('/api/admin/dashboard/users', { withCredentials: true }),
        axios.get('/api/admin/dashboard/withdrawals', { withCredentials: true }),
        axios.get('/api/admin/dashboard/quant-profits/today', { withCredentials: true }),
        axios.get('/api/admin/dashboard/quant-profits/total', { withCredentials: true }),
        axios.get('/api/admin/dashboard/funding-investments/today', { withCredentials: true }),
        axios.get('/api/admin/dashboard/funding-investments/total', { withCredentials: true }),
        axios.get('/api/admin/dashboard/stats/daily', { withCredentials: true })
      ]);

      // 데이터 조합 - 백엔드 응답 구조 확인
      const usersData = usersRes.data.success ? usersRes.data : usersRes.data;
      const withdrawalsData = withdrawalsRes.data.success ? withdrawalsRes.data : withdrawalsRes.data;
      const quantTodayData = quantTodayRes.data.success ? quantTodayRes.data.today : quantTodayRes.data.today;
      const quantTotalData = quantTotalRes.data.success ? quantTotalRes.data.total : quantTotalRes.data.total;
      const fundingTodayData = fundingTodayRes.data.success ? fundingTodayRes.data.today : fundingTodayRes.data.today;
      const fundingTotalData = fundingTotalRes.data.success ? fundingTotalRes.data.total : fundingTotalRes.data.total;
      const chartData = chartRes.data.success ? chartRes.data : chartRes.data;

      setStats({
        totalUsers: usersData.total || 0,
        activeUsers: usersData.today || 0,
        totalDeposits: withdrawalsData.total?.total_deposit || 0,
        totalWithdrawals: withdrawalsData.total?.total_withdrawal || 0,
        totalProfit: (quantTotalData?.total_amount || 0) + (fundingTotalData?.total_profit || 0),
        pendingWithdrawals: 0 // 이 데이터는 별도 API가 필요할 수 있음
      });

      setChartData(chartData);
    } catch (err) {
      console.error('대시보드 데이터 로드 실패:', err);
      setMessage({ type: 'error', text: '대시보드 데이터를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const getCumulative = (data) => {
    let cumulative = 0;
    return data.map(value => {
      cumulative += value;
      return cumulative;
    });
  };

  // 차트 탭 정보 - label/data/color
  const chartTabInfo = {
    signup: { label: chartTab === 'daily' ? '일별 가입' : '누적 가입', color: '#60a5fa', data: chartData ? (chartTab === 'daily' ? chartData.signup : getCumulative(chartData.signup)) : [] },
    deposit: { label: chartTab === 'daily' ? '일별 입금' : '누적 입금', color: '#34d399', data: chartData ? (chartTab === 'daily' ? chartData.deposit : getCumulative(chartData.deposit)) : [] },
    withdrawal: { label: chartTab === 'daily' ? '일별 출금' : '누적 출금', color: '#f87171', data: chartData ? (chartTab === 'daily' ? chartData.withdrawal : getCumulative(chartData.withdrawal)) : [] },
    profit: { label: chartTab === 'daily' ? '일별 수익' : '누적 수익', color: '#fbbf24', data: chartData ? (chartTab === 'daily' ? chartData.profit : getCumulative(chartData.profit)) : [] }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">관리자 대시보드</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">시스템 현황과 통계를 확인하세요</p>
        </div>
        <AdminButton onClick={fetchDashboardData} disabled={loading}>
          {loading ? '새로고침 중...' : '새로고침'}
        </AdminButton>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success'
          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AdminCard title="총 사용자" subtitle="전체 등록 사용자 수">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {loading ? '...' : stats.totalUsers.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                활성 사용자: {loading ? '...' : stats.activeUsers.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="총 입금" subtitle="전체 입금 금액">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {loading ? '...' : `$${stats.totalDeposits.toLocaleString()}`}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">USDT</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="총 출금" subtitle="전체 출금 금액">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {loading ? '...' : `$${stats.totalWithdrawals.toLocaleString()}`}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">USDT</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="총 수익" subtitle="전체 수익 금액">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {loading ? '...' : `$${stats.totalProfit.toLocaleString()}`}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">USDT</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="대기 중인 출금" subtitle="승인 대기 중인 출금">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {loading ? '...' : stats.pendingWithdrawals.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">건</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="시스템 상태" subtitle="현재 시스템 상태">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                정상 운영
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                모든 서비스 정상
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Chart Section */}
      <AdminCard title="통계 차트" subtitle="일별 및 누적 통계를 확인하세요">
        <div className="space-y-4">
          {/* Chart Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {[
              { key: 'daily', label: '일별 통계' },
              { key: 'cumulative', label: '누적 통계' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setChartTab(tab.key)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${chartTab === tab.key
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chart Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">차트 로딩 중...</span>
            </div>
          ) : chartData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(chartTabInfo).map(([key, info]) => (
                <div key={key} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">{info.label}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">최근 7일 평균</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {info.data.length > 0 ? Math.round(info.data.reduce((a, b) => a + b, 0) / info.data.length).toLocaleString() : 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">총계</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {info.data.length > 0 ? info.data.reduce((a, b) => a + b, 0).toLocaleString() : 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: info.data.length > 0 ? `${Math.min(100, (info.data[info.data.length - 1] / Math.max(...info.data)) * 100)}%` : '0%',
                          backgroundColor: info.color
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">차트 데이터가 없습니다</h3>
              <p className="text-gray-600 dark:text-gray-400">통계 데이터를 불러올 수 없습니다.</p>
            </div>
          )}
        </div>
      </AdminCard>

      {/* Quick Actions */}
      <AdminCard title="빠른 작업" subtitle="자주 사용하는 관리 기능">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminButton
            variant="secondary"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => window.location.hash = '#/admin/users'}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <span className="text-sm">사용자 관리</span>
          </AdminButton>

          <AdminButton
            variant="secondary"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => window.location.hash = '#/admin/withdrawals'}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <span className="text-sm">출금 관리</span>
          </AdminButton>

          <AdminButton
            variant="secondary"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => window.location.hash = '#/admin/wallets'}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-sm">지갑 관리</span>
          </AdminButton>

          <AdminButton
            variant="secondary"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => window.location.hash = '#/admin/settings'}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm">설정 관리</span>
          </AdminButton>
        </div>
      </AdminCard>
    </div>
  );
}