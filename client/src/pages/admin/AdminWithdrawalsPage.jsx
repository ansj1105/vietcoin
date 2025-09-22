// 📁 src/pages/admin/AdminWithdrawalsPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';
import AdminBadge from '../../components/admin/AdminBadge';

const TABS = [
  { key: 'PENDING', label: '대기중' },
  { key: 'SUCCESS', label: '완료' },
  { key: 'FAILED', label: '거절' },
];

export default function AdminWithdrawalsPage() {
  const [activeTab, setActiveTab] = useState('PENDING');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchItems();
  }, [activeTab, currentPage]);

  const fetchItems = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get('/api/withdrawals', {
        params: {
          status: activeTab,
          page: currentPage,
          limit: itemsPerPage,
          search: search
        },
        withCredentials: true
      });

      // 백엔드 응답 구조: { success: true, data: rows }
      if (response.data.success && response.data.data) {
        setItems(response.data.data);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('출금 요청 로드 실패:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    setLoading(true);

    try {
      const endpoint = status === 'SUCCESS' ? 'approve' : 'reject';
      const response = await axios.put(`/api/withdrawals/${id}/${endpoint}`, {}, { withCredentials: true });

      if (response.data.success) {
        setShowModal(false);
        setSelectedItem(null);
        fetchItems();
      } else {
        setError(response.data.error || '상태 변경에 실패했습니다.');
      }
    } catch (err) {
      console.error('상태 변경 실패:', err);
      setError('상태 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchItems();
  };

  const openModal = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setShowModal(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <AdminBadge variant="warning">대기중</AdminBadge>;
      case 'SUCCESS':
        return <AdminBadge variant="success">완료</AdminBadge>;
      case 'FAILED':
        return <AdminBadge variant="danger">거절</AdminBadge>;
      default:
        return <AdminBadge variant="secondary">{status}</AdminBadge>;
    }
  };

  const filteredItems = items.filter(item =>
    search === '' ||
    item.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    item.wallet_address?.toLowerCase().includes(search.toLowerCase()) ||
    item.id.toString().includes(search)
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">출금 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">사용자 출금 요청을 관리하세요</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Search */}
      <AdminCard title="검색" subtitle="출금 요청을 검색하세요">
        <form onSubmit={handleSearch} className="flex gap-4">
          <AdminInput
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="사용자 이메일, 지갑 주소, ID로 검색..."
            className="flex-1"
          />
          <AdminButton type="submit" disabled={loading}>
            {loading ? '검색 중...' : '검색'}
          </AdminButton>
        </form>
      </AdminCard>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setCurrentPage(1);
            }}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === tab.key
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Withdrawals List */}
      <AdminCard title={`${TABS.find(t => t.key === activeTab)?.label} 출금 요청`} subtitle="출금 요청 목록을 확인하세요">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">출금 요청이 없습니다</h3>
            <p className="text-gray-600 dark:text-gray-400">현재 상태에 해당하는 출금 요청이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['ID', '사용자', '금액', '주소', '상태', '요청일', '관리'].map(header => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      #{item.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.user_email}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {item.user_id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {Number(item.amount).toLocaleString()} {item.method || 'USDT'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        수수료: 0 {item.method || 'USDT'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-mono max-w-xs truncate">
                        {item.wallet_address}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <AdminButton
                        size="sm"
                        variant="secondary"
                        onClick={() => openModal(item)}
                      >
                        상세보기
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredItems.length)} / {filteredItems.length}개
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
      </AdminCard>

      {/* Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              출금 요청 상세 정보
            </h3>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">요청 ID</label>
                <p className="text-gray-900 dark:text-white">#{selectedItem.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">사용자</label>
                <p className="text-gray-900 dark:text-white">{selectedItem.user_email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">출금 금액</label>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {Number(selectedItem.amount).toLocaleString()} {selectedItem.method || 'USDT'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">지갑 주소</label>
                <p className="text-gray-900 dark:text-white font-mono text-sm break-all">
                  {selectedItem.wallet_address}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">현재 상태</label>
                <div className="mt-1">{getStatusBadge(selectedItem.status)}</div>
              </div>
            </div>

            {selectedItem.status === 'PENDING' && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">상태 변경</div>
                <div className="flex space-x-2">
                  <AdminButton
                    variant="success"
                    onClick={() => handleStatusChange(selectedItem.id, 'SUCCESS')}
                    disabled={loading}
                    className="flex-1"
                  >
                    승인
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    onClick={() => handleStatusChange(selectedItem.id, 'FAILED')}
                    disabled={loading}
                    className="flex-1"
                  >
                    거절
                  </AdminButton>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <AdminButton variant="secondary" onClick={closeModal}>
                닫기
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}