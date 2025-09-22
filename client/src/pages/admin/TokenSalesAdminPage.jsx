// 📁 src/pages/admin/TokenSalesAdminPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

export default function TokenSalesAdminPage() {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'purchases'
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [tokensList, setTokensList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    id: '',
    token_id: '',
    name: '',
    total_supply: '',
    price: '',
    fee_rate: '',
    start_time: '',
    end_time: '',
    is_active: false,
    minimum_purchase: '',
    maximum_purchase: '',
    lockup_period: ''
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchSales();
    fetchPurchases();
    fetchTokens();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await axios.get('/api/token/token-sales');
      // 백엔드 응답 구조: { success: true, data: rows }
      if (res.data.success && res.data.data) {
        setSales(res.data.data);
      } else {
        setSales([]);
      }
    } catch (err) {
      console.error('토큰 판매 목록 로드 실패:', err);
      setSales([]);
    }
  };

  const fetchPurchases = async () => {
    try {
      const res = await axios.get('/api/token/token-purchases');
      // 백엔드 응답 구조: { success: true, data: rows }
      if (res.data.success && res.data.data) {
        setPurchases(res.data.data);
      } else {
        setPurchases([]);
      }
    } catch (err) {
      console.error('토큰 구매 목록 로드 실패:', err);
      setPurchases([]);
    }
  };

  const fetchTokens = async () => {
    try {
      const res = await axios.get('/api/admin/tokens');
      // 백엔드 응답 구조: { success: true, data: rows }
      if (res.data.success && res.data.data) {
        setTokensList(res.data.data);
      } else {
        setTokensList([]);
      }
    } catch (err) {
      console.error('토큰 목록 로드 실패:', err);
      setTokensList([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (editing) {
        response = await axios.put(`/api/token/token-sales/${form.id}`, form);
      } else {
        response = await axios.post('/api/token/token-sales', form);
      }

      if (response.data.success) {
        alert(editing ? '토큰 판매가 성공적으로 수정되었습니다.' : '토큰 판매가 성공적으로 등록되었습니다.');
        resetForm();
        fetchSales();
      } else {
        alert('토큰 판매 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('토큰 판매 저장 실패:', err);
      alert('토큰 판매 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sale) => {
    setForm(sale);
    setEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await axios.delete(`/api/token/token-sales/${id}`);
      if (response.data.success) {
        alert('토큰 판매가 성공적으로 삭제되었습니다.');
        fetchSales();
      } else {
        alert('토큰 판매 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('토큰 판매 삭제 실패:', err);
      alert('토큰 판매 삭제에 실패했습니다.');
    }
  };

  const resetForm = () => {
    setForm({
      id: '',
      token_id: '',
      name: '',
      total_supply: '',
      price: '',
      fee_rate: '',
      start_time: '',
      end_time: '',
      is_active: false,
      minimum_purchase: '',
      maximum_purchase: '',
      lockup_period: ''
    });
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">토큰 판매 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">토큰 판매 및 구매 내역을 관리하세요</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {[
          { key: 'sales', label: '판매 관리' },
          { key: 'purchases', label: '구매 내역' }
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

      {/* Sales Tab */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Sales Form */}
          <AdminCard
            title={editing ? "토큰 판매 수정" : "새 토큰 판매 등록"}
            subtitle={editing ? "기존 토큰 판매 정보를 수정하세요" : "새로운 토큰 판매를 등록하세요"}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    토큰 선택
                  </label>
                  <select
                    value={form.token_id}
                    onChange={e => setForm({ ...form, token_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">토큰을 선택하세요</option>
                    {tokensList.map(token => (
                      <option key={token.id} value={token.id}>
                        {token.name} ({token.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <AdminInput
                  label="판매명"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="판매명을 입력하세요"
                  required
                />

                <AdminInput
                  label="총 공급량"
                  type="number"
                  value={form.total_supply}
                  onChange={e => setForm({ ...form, total_supply: e.target.value })}
                  placeholder="총 공급량을 입력하세요"
                  required
                />

                <AdminInput
                  label="가격 (USDT)"
                  type="number"
                  step="0.000001"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  placeholder="토큰 가격을 입력하세요"
                  required
                />

                <AdminInput
                  label="수수료율 (%)"
                  type="number"
                  step="0.01"
                  value={form.fee_rate}
                  onChange={e => setForm({ ...form, fee_rate: e.target.value })}
                  placeholder="수수료율을 입력하세요"
                  required
                />

                <AdminInput
                  label="최소 구매량"
                  type="number"
                  value={form.minimum_purchase}
                  onChange={e => setForm({ ...form, minimum_purchase: e.target.value })}
                  placeholder="최소 구매량을 입력하세요"
                  required
                />

                <AdminInput
                  label="최대 구매량"
                  type="number"
                  value={form.maximum_purchase}
                  onChange={e => setForm({ ...form, maximum_purchase: e.target.value })}
                  placeholder="최대 구매량을 입력하세요"
                  required
                />

                <AdminInput
                  label="락업 기간 (일)"
                  type="number"
                  value={form.lockup_period}
                  onChange={e => setForm({ ...form, lockup_period: e.target.value })}
                  placeholder="락업 기간을 입력하세요"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    판매 시작일
                  </label>
                  <input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={e => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    판매 종료일
                  </label>
                  <input
                    type="datetime-local"
                    value={form.end_time}
                    onChange={e => setForm({ ...form, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  활성 상태
                </label>
              </div>

              <div className="flex space-x-3">
                <AdminButton
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? '저장 중...' : (editing ? '수정 저장' : '판매 등록')}
                </AdminButton>

                <AdminButton
                  type="button"
                  onClick={resetForm}
                  variant="secondary"
                  className="flex-1"
                >
                  초기화
                </AdminButton>
              </div>
            </form>
          </AdminCard>

          {/* Sales List */}
          <AdminCard title="토큰 판매 목록" subtitle="현재 등록된 토큰 판매 목록">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['판매명', '토큰', '가격', '공급량', '상태', '시작일', '종료일', '관리'].map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {sale.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {sale.token_symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                        ${sale.price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {Number(sale.total_supply).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sale.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                          {sale.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(sale.start_time).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(sale.end_time).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <AdminButton
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEdit(sale)}
                          >
                            수정
                          </AdminButton>
                          <AdminButton
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(sale.id)}
                          >
                            삭제
                          </AdminButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>
      )}

      {/* Purchases Tab */}
      {activeTab === 'purchases' && (
        <AdminCard title="토큰 구매 내역" subtitle="사용자들의 토큰 구매 내역을 확인하세요">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['ID', '사용자', '토큰', '구매량', '가격', '총액', '상태', '구매일'].map(header => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {purchases.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {purchase.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {purchase.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {purchase.token_symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {Number(purchase.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                      ${purchase.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 dark:text-blue-400">
                      ${purchase.total_amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${purchase.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : purchase.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                        {purchase.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  );
}