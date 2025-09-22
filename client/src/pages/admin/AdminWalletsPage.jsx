// 📁 src/pages/admin/AdminWalletsPage.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

// 주소를 축약하고 클릭 시 전체 주소를 보여주는 컴포넌트
const ShortenedAddress = ({ address }) => {
  const [showFull, setShowFull] = useState(false);

  if (!address) return null;

  const shortened = `${address.slice(0, 5)}...${address.slice(-5)}`;

  return (
    <div
      className="cursor-pointer hover:text-blue-500 transition-colors"
      onClick={() => setShowFull(!showFull)}
      title="Click to show/hide full address"
    >
      <span className="font-mono text-sm">
        {showFull ? address : shortened}
      </span>
    </div>
  );
};

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState(null);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/dashboard/wallets', { withCredentials: true });
      // 백엔드 응답 구조: { success: true, data: rows }
      if (response.data.success && response.data.data) {
        setWallets(response.data.data);
      } else {
        setWallets([]);
      }
    } catch (error) {
      console.error('지갑 데이터 로드 실패:', error);
      setMessage({ type: 'error', text: '지갑 데이터를 불러오는데 실패했습니다.' });
      setWallets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const filteredWallets = wallets.filter(wallet =>
    searchTerm === '' ||
    wallet.user_id?.toString().includes(searchTerm) ||
    wallet.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredWallets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentWallets = filteredWallets.slice(startIndex, startIndex + itemsPerPage);

  const openModal = (wallet) => {
    setSelectedWallet(wallet);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedWallet(null);
    setShowModal(false);
  };

  const handleWalletAction = async (walletId, action) => {
    setLoading(true);
    try {
      const response = await axios.post(`/api/admin/dashboard/wallets/${walletId}/${action}`, {}, { withCredentials: true });
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message || '작업이 완료되었습니다.' });
        fetchWallets();
        closeModal();
      } else {
        setMessage({ type: 'error', text: response.data.message || '작업에 실패했습니다.' });
      }
    } catch (error) {
      console.error('지갑 작업 실패:', error);
      setMessage({ type: 'error', text: '작업에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">지갑 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">사용자 지갑 정보를 관리하세요</p>
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

      {/* Search */}
      <AdminCard title="검색" subtitle="지갑 정보를 검색하세요">
        <form onSubmit={handleSearch} className="flex gap-4">
          <AdminInput
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="사용자 ID, 이메일, 주소로 검색..."
            className="flex-1"
          />
          <AdminButton type="submit" disabled={loading}>
            {loading ? '검색 중...' : '검색'}
          </AdminButton>
        </form>
      </AdminCard>

      {/* Wallets Table */}
      <AdminCard title="지갑 목록" subtitle="사용자 지갑 정보를 확인하세요">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['사용자 ID', '이메일', '지갑 주소', '펀드 잔액', '실제 금액', '퀀트 잔액', '생성일', '관리'].map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {currentWallets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        조회된 지갑이 없습니다
                      </td>
                    </tr>
                  ) : (
                    currentWallets.map(wallet => (
                      <tr key={wallet.wallet_id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {wallet.user_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {wallet.user_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <ShortenedAddress address={wallet.address} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {Number(wallet.fund_balance || 0).toLocaleString()} USDT
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {Number(wallet.real_amount || 0).toLocaleString()} USDT
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {Number(wallet.quant_balance || 0).toLocaleString()} USDT
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(wallet.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <AdminButton
                            size="sm"
                            variant="secondary"
                            onClick={() => openModal(wallet)}
                          >
                            상세보기
                          </AdminButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredWallets.length)} / {filteredWallets.length}개
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

      {/* Modal */}
      {showModal && selectedWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              지갑 상세 정보
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">사용자 ID</label>
                <p className="text-gray-900 dark:text-white">{selectedWallet.user_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">이메일</label>
                <p className="text-gray-900 dark:text-white">{selectedWallet.user_email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">지갑 주소</label>
                <p className="text-gray-900 dark:text-white font-mono text-sm break-all">
                  {selectedWallet.address || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">펀드 잔액</label>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {Number(selectedWallet.fund_balance || 0).toLocaleString()} USDT
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">실제 금액</label>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {Number(selectedWallet.real_amount || 0).toLocaleString()} USDT
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">퀀트 잔액</label>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {Number(selectedWallet.quant_balance || 0).toLocaleString()} USDT
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">생성일</label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(selectedWallet.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <AdminButton
                variant="warning"
                onClick={() => handleWalletAction(selectedWallet.wallet_id, 'freeze')}
                disabled={loading}
              >
                {loading ? '처리 중...' : '지갑 동결'}
              </AdminButton>
              <AdminButton
                variant="danger"
                onClick={() => handleWalletAction(selectedWallet.wallet_id, 'reset')}
                disabled={loading}
              >
                {loading ? '처리 중...' : '지갑 리셋'}
              </AdminButton>
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