import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

export default function AdminWalletPage() {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [trxBalance, setTrxBalance] = useState(null);
  const [usdtBalance, setUsdtBalance] = useState(null);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [transferType, setTransferType] = useState('trx');
  const [message, setMessage] = useState(null);
  const [newWallet, setNewWallet] = useState(null);
  const [activeTab, setActiveTab] = useState('manage'); // 'manage' | 'transactions' | 'reclaim'
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Admin settings
  const [adminAddress, setAdminAddress] = useState('');
  const [threshold, setThreshold] = useState('');
  const [selectedAdminWallet, setSelectedAdminWallet] = useState(null);

  useEffect(() => {
    loadWallets();
    loadAdminSettings();
  }, []);

  const loadWallets = async () => {
    try {
      const res = await axios.get('/api/tron/admin/wallets', { withCredentials: true });
      setWallets(res.data || []);
    } catch (err) {
      console.error('지갑 로드 실패:', err);
    }
  };

  const loadAdminSettings = async () => {
    try {
      const res = await axios.get('/api/tron/admin/settings', { withCredentials: true });
      if (res.data) {
        setAdminAddress(res.data.admin_address || '');
        setThreshold(res.data.threshold || '');
        setSelectedAdminWallet(res.data.admin_wallet_id || null);
      }
    } catch (err) {
      console.error('관리자 설정 로드 실패:', err);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/tron/admin/transactions', { withCredentials: true });
      setTransactions(res.data || []);
    } catch (err) {
      console.error('트랜잭션 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/tron/admin/create-wallet', {}, { withCredentials: true });
      setNewWallet(res.data);
      setMessage({ type: 'success', text: '새 지갑이 생성되었습니다.' });
      loadWallets();
    } catch (err) {
      console.error('지갑 생성 실패:', err);
      setMessage({ type: 'error', text: '지갑 생성에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedWallet || !toAddress || !amount) {
      setMessage({ type: 'error', text: '모든 필드를 입력해주세요.' });
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/tron/admin/transfer', {
        from_wallet_id: selectedWallet.id,
        to_address: toAddress,
        amount: amount,
        type: transferType
      }, { withCredentials: true });

      setMessage({ type: 'success', text: '전송이 완료되었습니다.' });
      setToAddress('');
      setAmount('');
      loadWallets();
    } catch (err) {
      console.error('전송 실패:', err);
      setMessage({ type: 'error', text: '전송에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await axios.post('/api/tron/reclaim-settings', {
        admin_address: adminAddress,
        threshold: threshold,
        admin_wallet_id: selectedAdminWallet
      }, { withCredentials: true });

      setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
    } catch (err) {
      console.error('설정 저장 실패:', err);
      setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReclaim = async (walletId) => {
    if (!window.confirm('정말 회수하시겠습니까?')) return;

    setLoading(true);
    try {
      await axios.post('/api/tron/admin/reclaim', { wallet_id: walletId }, { withCredentials: true });
      setMessage({ type: 'success', text: '회수가 완료되었습니다.' });
      loadWallets();
    } catch (err) {
      console.error('회수 실패:', err);
      setMessage({ type: 'error', text: '회수에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleWalletSelect = async (wallet) => {
    setSelectedWallet(wallet);
    try {
      const [trxRes, usdtRes] = await Promise.all([
        axios.get(`/api/tron/admin/balance/${wallet.address}/trx`, { withCredentials: true }),
        axios.get(`/api/tron/admin/balance/${wallet.address}/usdt`, { withCredentials: true })
      ]);
      setTrxBalance(trxRes.data.balance);
      setUsdtBalance(usdtRes.data.balance);
    } catch (err) {
      console.error('잔액 조회 실패:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tron 지갑 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Tron 지갑과 트랜잭션을 관리하세요</p>
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
          { key: 'manage', label: '지갑 관리' },
          { key: 'transactions', label: '트랜잭션' },
          { key: 'reclaim', label: '회수 관리' }
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

      {/* Manage Tab */}
      {activeTab === 'manage' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Wallet */}
          <AdminCard title="Tron 지갑 생성" subtitle="새로운 Tron 지갑을 생성하세요">
            <div className="space-y-4">
              <AdminButton
                onClick={handleCreateWallet}
                disabled={loading}
                className="w-full"
              >
                {loading ? '생성 중...' : '지갑 생성'}
              </AdminButton>

              {newWallet && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-600 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">새 지갑 정보</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-green-800 dark:text-green-400">주소:</span>
                      <p className="font-mono text-green-700 dark:text-green-300 break-all">{newWallet.address}</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-800 dark:text-green-400">Private Key:</span>
                      <p className="font-mono text-green-700 dark:text-green-300 break-all">{newWallet.privateKey}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AdminCard>

          {/* Transfer Form */}
          <AdminCard title="Tron 전송" subtitle="TRX 또는 USDT를 다른 주소로 전송하세요">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  출금 지갑
                </label>
                <select
                  value={selectedWallet?.id || ''}
                  onChange={e => {
                    const wallet = wallets.find(w => w.id === parseInt(e.target.value));
                    handleWalletSelect(wallet);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">지갑을 선택하세요</option>
                  {wallets.map(wallet => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.address}
                    </option>
                  ))}
                </select>
              </div>

              {selectedWallet && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">잔액 정보</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">TRX:</span>
                      <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                        {trxBalance !== null ? trxBalance.toLocaleString() : '로딩 중...'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">USDT:</span>
                      <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                        {usdtBalance !== null ? usdtBalance.toLocaleString() : '로딩 중...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  전송 타입
                </label>
                <select
                  value={transferType}
                  onChange={e => setTransferType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="trx">TRX</option>
                  <option value="usdt">USDT</option>
                </select>
              </div>

              <AdminInput
                label="받는 주소"
                value={toAddress}
                onChange={e => setToAddress(e.target.value)}
                placeholder="Tron 주소를 입력하세요"
              />

              <AdminInput
                label={`전송량 (${transferType.toUpperCase()})`}
                type="number"
                step="0.000001"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={`전송할 ${transferType.toUpperCase()} 양을 입력하세요`}
              />

              <AdminButton
                onClick={handleTransfer}
                disabled={loading || !selectedWallet || !toAddress || !amount}
                className="w-full"
              >
                {loading ? '전송 중...' : `${transferType.toUpperCase()} 전송`}
              </AdminButton>
            </div>
          </AdminCard>
        </div>
      )}

      {/* Wallet List */}
      {activeTab === 'manage' && (
        <AdminCard title="지갑 목록" subtitle="현재 등록된 Tron 지갑 목록">
          <div className="space-y-3">
            {wallets.map(wallet => (
              <div key={wallet.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                      {wallet.address}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      생성일: {new Date(wallet.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <AdminButton
                    size="sm"
                    variant="danger"
                    onClick={() => handleReclaim(wallet.id)}
                    disabled={loading}
                  >
                    회수
                  </AdminButton>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <AdminCard title="트랜잭션 내역" subtitle="Tron 트랜잭션 내역을 확인하세요">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['ID', '타입', '주소', '금액', '상태', '날짜'].map(header => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
                      </div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      트랜잭션 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  transactions.map(transaction => (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {transaction.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${transaction.type === 'send'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                          {transaction.type === 'send' ? '전송' : '수신'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                        {transaction.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {transaction.amount} {transaction.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${transaction.status === 'confirmed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : transaction.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      {/* Reclaim Tab */}
      {activeTab === 'reclaim' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Admin Settings */}
          <AdminCard title="관리자 설정" subtitle="Tron 수수료 관리 설정">
            <div className="space-y-4">
              <AdminInput
                label="관리자 주소"
                value={adminAddress}
                onChange={e => setAdminAddress(e.target.value)}
                placeholder="관리자 Tron 주소를 입력하세요"
              />

              <AdminInput
                label="임계값 (TRX)"
                type="number"
                step="0.001"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                placeholder="자동 회수 임계값을 입력하세요"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  관리자 지갑
                </label>
                <select
                  value={selectedAdminWallet || ''}
                  onChange={e => setSelectedAdminWallet(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">지갑을 선택하세요</option>
                  {wallets.map(wallet => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.address}
                    </option>
                  ))}
                </select>
              </div>

              <AdminButton
                onClick={handleSaveSettings}
                disabled={loading}
                className="w-full"
              >
                {loading ? '저장 중...' : '설정 저장'}
              </AdminButton>
            </div>
          </AdminCard>

          {/* Reclaim Actions */}
          <AdminCard title="회수 작업" subtitle="Tron 회수 작업을 수행하세요">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">자동 회수</h4>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                  설정된 임계값을 초과하는 지갑의 TRX를 자동으로 회수합니다.
                </p>
                <AdminButton variant="secondary" className="w-full">
                  자동 회수 실행
                </AdminButton>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">전체 회수</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                  모든 지갑의 TRX를 관리자 지갑으로 회수합니다.
                </p>
                <AdminButton variant="warning" className="w-full">
                  전체 회수 실행
                </AdminButton>
              </div>
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  );
}