// 📁 src/pages/admin/TokenLogsPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

export default function TokenLogsPage() {
  const [activeTab, setActiveTab] = useState('purchases'); // 'purchases' | 'redeems'
  const [purchases, setPurchases] = useState([]);
  const [redeemLogs, setRedeemLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState(null);

  // 구매내역 조회
  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/token/token-purchases');
      setPurchases(res.data.data || []);
    } catch (err) {
      console.error('구매내역 로드 실패:', err);
      setMessage({ type: 'error', text: '구매내역을 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 환매로그 조회
  const fetchRedeems = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/tokens/wallet-logs/exchange');
      if (res.data.success) setRedeemLogs(res.data.data);
    } catch (err) {
      console.error('환매로그 로드 실패:', err);
      setMessage({ type: 'error', text: '환매로그를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 탭 변경 시 데이터로드
  useEffect(() => {
    if (activeTab === 'purchases') {
      fetchPurchases();
    } else {
      fetchRedeems();
    }
  }, [activeTab]);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const filteredPurchases = purchases.filter(purchase =>
    searchTerm === '' ||
    purchase.id?.toString().includes(searchTerm) ||
    purchase.user_id?.toString().includes(searchTerm) ||
    purchase.token_id?.toString().includes(searchTerm) ||
    purchase.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRedeemLogs = redeemLogs.filter(log =>
    searchTerm === '' ||
    log.id?.toString().includes(searchTerm) ||
    log.user_id?.toString().includes(searchTerm) ||
    log.direction?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const statusMap = {
      'completed': { label: '완료', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
      'pending': { label: '대기중', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
      'failed': { label: '실패', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
      'cancelled': { label: '취소', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' }
    };

    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">토큰 로그 조회</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">토큰 구매 및 환매 내역을 확인하세요</p>
        </div>
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

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {[
          { key: 'purchases', label: '구매내역' },
          { key: 'redeems', label: '환매내역' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <AdminCard title="검색" subtitle="로그를 검색하세요">
        <form onSubmit={handleSearch} className="flex gap-4">
          <AdminInput
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ID, 사용자 ID, 상태 등으로 검색..."
            className="flex-1"
          />
          <AdminButton type="submit" disabled={loading}>
            {loading ? '검색 중...' : '검색'}
          </AdminButton>
        </form>
      </AdminCard>

      {/* Purchases Tab */}
      {activeTab === 'purchases' && (
        <AdminCard title="전체 주문 목록" subtitle="토큰 구매 주문 내역을 확인하세요">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">주문 내역이 없습니다</h3>
              <p className="text-gray-600 dark:text-gray-400">토큰 구매 주문 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['ID', '사용자', '토큰', '판매', '수량', '총 가격', '상태', '락업 기한', '생성일'].map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPurchases.map(purchase => (
                    <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {purchase.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {purchase.user_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {purchase.token_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {purchase.sale_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {Number(purchase.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        ${Number(purchase.total_price).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(purchase.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {purchase.lockup_until
                          ? new Date(purchase.lockup_until).toLocaleDateString()
                          : 'N/A'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(purchase.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      )}

      {/* Redeems Tab */}
      {activeTab === 'redeems' && (
        <AdminCard title="환매(교환) 내역" subtitle="토큰 환매 및 교환 내역을 확인하세요">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
            </div>
          ) : filteredRedeemLogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">환매 내역이 없습니다</h3>
              <p className="text-gray-600 dark:text-gray-400">토큰 환매 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['로그 ID', '사용자 ID', '날짜', '방향', '수량', '잔액', '참조 ID', '설명'].map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRedeemLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {log.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {log.user_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(log.log_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${log.direction === 'in'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                          {log.direction === 'in' ? '입금' : '출금'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {parseFloat(log.amount).toFixed(6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {parseFloat(log.balance_after).toFixed(6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {log.reference_id || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {log.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      )}
    </div>
  );
}