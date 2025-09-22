// 📁 src/pages/admin/TokensAdminPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

export default function TokensAdminPage() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    id: '',
    name: '',
    symbol: '',
    description: '',
    total_supply: '',
    circulating_supply: '',
    decimals: ''
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/tokens');
      // 백엔드 응답 구조: { success: true, data: rows }
      if (res.data.success && res.data.data) {
        setTokens(res.data.data);
      } else {
        setTokens([]);
      }
    } catch (err) {
      console.error('토큰 목록 로드 실패:', err);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (editing) {
        response = await axios.put(`/api/admin/tokens/${form.id}`, form);
      } else {
        response = await axios.post('/api/admin/tokens', form);
      }

      if (response.data.success) {
        alert(editing ? '토큰이 성공적으로 수정되었습니다.' : '토큰이 성공적으로 등록되었습니다.');
        resetForm();
        fetchTokens();
      } else {
        alert('토큰 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('토큰 저장 실패:', err);
      alert('토큰 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (token) => {
    setForm(token);
    setEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await axios.delete(`/api/admin/tokens/${id}`);
      if (response.data.success) {
        alert('토큰이 성공적으로 삭제되었습니다.');
        fetchTokens();
      } else {
        alert('토큰 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('토큰 삭제 실패:', err);
      alert('토큰 삭제에 실패했습니다.');
    }
  };

  const resetForm = () => {
    setForm({
      id: '',
      name: '',
      symbol: '',
      description: '',
      total_supply: '',
      circulating_supply: '',
      decimals: ''
    });
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">토큰 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">토큰 정보를 관리하고 설정하세요</p>
        </div>
      </div>

      {/* Token Form */}
      <AdminCard
        title={editing ? "토큰 수정" : "새 토큰 등록"}
        subtitle={editing ? "기존 토큰 정보를 수정하세요" : "새로운 토큰을 등록하세요"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminInput
              label="토큰 이름"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="토큰 이름을 입력하세요"
              required
            />

            <AdminInput
              label="토큰 심볼"
              value={form.symbol}
              onChange={e => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
              placeholder="예: BTC, ETH"
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
              label="유통 공급량"
              type="number"
              value={form.circulating_supply}
              onChange={e => setForm({ ...form, circulating_supply: e.target.value })}
              placeholder="유통 공급량을 입력하세요"
              required
            />

            <AdminInput
              label="소수점 자릿수"
              type="number"
              value={form.decimals}
              onChange={e => setForm({ ...form, decimals: e.target.value })}
              placeholder="예: 18"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              토큰 설명
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="토큰에 대한 설명을 입력하세요"
              required
            />
          </div>

          <div className="flex space-x-3">
            <AdminButton
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? '저장 중...' : (editing ? '수정 저장' : '토큰 등록')}
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

      {/* Token List */}
      <AdminCard title="등록된 토큰 목록" subtitle="현재 등록된 모든 토큰을 확인하세요">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">등록된 토큰이 없습니다</h3>
            <p className="text-gray-600 dark:text-gray-400">새로운 토큰을 등록해보세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['이름', '심볼', '총 공급량', '유통 공급량', '소수점', '설명', '관리'].map(header => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tokens.map(token => (
                  <tr key={token.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {token.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {token.symbol}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {Number(token.total_supply).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {Number(token.circulating_supply).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {token.decimals}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {token.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <AdminButton
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEdit(token)}
                        >
                          수정
                        </AdminButton>
                        <AdminButton
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(token.id)}
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
        )}
      </AdminCard>
    </div>
  );
}