// 📁 src/pages/admin/QuantLeaderboardPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

export default function QuantLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // 'day', 'week', 'month'

  const itemsPerPage = 20;

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedPeriod]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');

    try {
      // quant_profits 데이터를 사용해서 리더보드 생성
      const response = await axios.get('/api/admin/dashboard/quant-profits/users', {
        withCredentials: true
      });

      if (response.data.success) {
        // 사용자별 수익 데이터를 리더보드 형태로 변환
        const leaderboardData = response.data.users
          .map(user => ({
            user_id: user.user_id,
            name: `User ${user.user_id}`, // 실제로는 사용자 정보를 가져와야 함
            total_amount: user.total_amount,
            trade_amount: user.trade_amount,
            referral_amount: user.referral_amount
          }))
          .sort((a, b) => b.total_amount - a.total_amount)
          .slice(0, 50); // 상위 50명만 표시

        setLeaderboard(leaderboardData);
      }
    } catch (err) {
      console.error('퀀트 리더보드 불러오기 실패:', err);
      setError('리더보드 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const filteredLeaderboard = leaderboard.filter(item =>
    searchTerm === '' ||
    item.user_id?.toString().includes(searchTerm) ||
    item.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredLeaderboard.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredLeaderboard.slice(startIndex, startIndex + itemsPerPage);

  const getRankBadge = (index) => {
    if (index === 0) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">🥇 1위</span>;
    } else if (index === 1) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">🥈 2위</span>;
    } else if (index === 2) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">🥉 3위</span>;
    } else {
      return <span className="text-sm font-medium text-gray-600 dark:text-gray-400">#{index + 1}</span>;
    }
  };

  const getProfitColor = (profit) => {
    if (profit > 0) {
      return 'text-green-600 dark:text-green-400';
    } else if (profit < 0) {
      return 'text-red-600 dark:text-red-400';
    } else {
      return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">퀀트 트레이딩 리더보드</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">퀀트 트레이딩 성과를 확인하세요</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Period Selection */}
      <AdminCard title="기간 선택" subtitle="리더보드 기간을 선택하세요">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {[
            { key: 'day', label: '일간' },
            { key: 'week', label: '주간' },
            { key: 'month', label: '월간' }
          ].map(period => (
            <button
              key={period.key}
              onClick={() => setSelectedPeriod(period.key)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${selectedPeriod === period.key
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </AdminCard>

      {/* Search */}
      <AdminCard title="검색" subtitle="사용자를 검색하세요">
        <form onSubmit={handleSearch} className="flex gap-4">
          <AdminInput
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="사용자 ID 또는 이메일로 검색..."
            className="flex-1"
          />
          <AdminButton type="submit" disabled={loading}>
            {loading ? '검색 중...' : '검색'}
          </AdminButton>
        </form>
      </AdminCard>

      {/* Leaderboard */}
      <AdminCard title={`${selectedPeriod === 'day' ? '일간' : selectedPeriod === 'week' ? '주간' : '월간'} 리더보드`} subtitle="퀀트 트레이딩 성과 순위">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">리더보드 데이터가 없습니다</h3>
            <p className="text-gray-600 dark:text-gray-400">선택한 기간에 해당하는 데이터가 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['순위', '사용자 ID', '이메일', '총 수익', '거래 횟수', '승률'].map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {currentItems.map((item, idx) => (
                    <tr key={item.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRankBadge(startIndex + idx)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {item.user_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${getProfitColor(item.total_profit || 0)}`}>
                          {Number(item.total_profit || 0).toLocaleString()} USDT
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.trade_count || 0}회
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${(item.win_rate || 0) >= 70
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : (item.win_rate || 0) >= 50
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                          {(item.win_rate || 0).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredLeaderboard.length)} / {filteredLeaderboard.length}개
                </div>
                <div className="flex space-x-2">
                  <AdminButton
                    size="sm"
                    variant="secondary"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    이전
                  </AdminButton>
                  <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                    {currentPage} / {totalPages}
                  </span>
                  <AdminButton
                    size="sm"
                    variant="secondary"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    다음
                  </AdminButton>
                </div>
              </div>
            )}
          </>
        )}
      </AdminCard>

      {/* Statistics */}
      {currentItems.length > 0 && (
        <AdminCard title="통계" subtitle="리더보드 통계 정보">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">총 참여자</h4>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {filteredLeaderboard.length}명
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">최고 수익</h4>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.max(...filteredLeaderboard.map(item => item.total_profit || 0)).toLocaleString()} USDT
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h4 className="font-medium text-purple-900 dark:text-purple-300 mb-2">평균 수익</h4>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {(filteredLeaderboard.reduce((sum, item) => sum + (item.total_profit || 0), 0) / filteredLeaderboard.length).toFixed(2)} USDT
              </p>
            </div>
          </div>
        </AdminCard>
      )}
    </div>
  );
}