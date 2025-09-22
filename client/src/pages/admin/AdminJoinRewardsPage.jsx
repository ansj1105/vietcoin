// 📁 src/pages/admin/AdminJoinRewardsPage.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

export default function AdminJoinRewardsPage() {
  const [tab, setTab] = useState('rules'); // 'rules' or 'claims'
  const [rules, setRules] = useState([]);
  const [claims, setClaims] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ id: null, amount: '', required_balance: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchRules();
    if (tab === 'claims') fetchClaims();
  }, [tab]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/join-rewards', { withCredentials: true });
      // 백엔드 응답 구조: { success: true, data: rows }
      if (res.data.success && res.data.data) {
        setRules(res.data.data);
      } else {
        setRules([]);
      }
    } catch (err) {
      console.error('가입 보너스 규칙 조회 실패:', err);
      setMessage({ type: 'error', text: '가입 보너스 규칙을 불러오는데 실패했습니다.' });
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/join-rewards/claims', { withCredentials: true });
      // 백엔드 응답 구조: { success: true, data: rows }
      if (res.data.success && res.data.data) {
        setClaims(res.data.data);
      } else {
        setClaims([]);
      }
    } catch (err) {
      console.error('가입 보너스 신청 조회 실패:', err);
      setMessage({ type: 'error', text: '가입 보너스 신청을 불러오는데 실패했습니다.' });
      setClaims([]);
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
        response = await axios.put(`/api/admin/join-rewards/${form.id}`, form, { withCredentials: true });
      } else {
        response = await axios.post('/api/admin/join-rewards', form, { withCredentials: true });
      }

      if (response.data.success) {
        setMessage({ type: 'success', text: editing ? '가입 보너스 규칙이 성공적으로 수정되었습니다.' : '가입 보너스 규칙이 성공적으로 생성되었습니다.' });
        resetForm();
        fetchRules();
      } else {
        setMessage({ type: 'error', text: '가입 보너스 규칙 저장에 실패했습니다.' });
      }
    } catch (err) {
      console.error('가입 보너스 규칙 저장 실패:', err);
      setMessage({ type: 'error', text: '가입 보너스 규칙 저장에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule) => {
    setForm({ id: rule.id, amount: rule.amount, required_balance: rule.required_balance });
    setEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      const response = await axios.delete(`/api/admin/join-rewards/${id}`, { withCredentials: true });
      if (response.data.success) {
        setMessage({ type: 'success', text: '가입 보너스 규칙이 성공적으로 삭제되었습니다.' });
        fetchRules();
      } else {
        setMessage({ type: 'error', text: '가입 보너스 규칙 삭제에 실패했습니다.' });
      }
    } catch (err) {
      console.error('가입 보너스 규칙 삭제 실패:', err);
      setMessage({ type: 'error', text: '가입 보너스 규칙 삭제에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ id: null, amount: '', required_balance: '' });
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">가입 보너스 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">가입 보너스 규칙과 신청 내역을 관리하세요</p>
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
          { key: 'rules', label: '보너스 규칙' },
          { key: 'claims', label: '신청 내역' }
        ].map(tabItem => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${tab === tabItem.key
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Rules Tab */}
      {tab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rule Form */}
          <AdminCard
            title={editing ? "가입 보너스 규칙 수정" : "새 가입 보너스 규칙 생성"}
            subtitle={editing ? "기존 규칙을 수정하세요" : "새로운 가입 보너스 규칙을 생성하세요"}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <AdminInput
                label="보너스 금액 (USDT)"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="보너스 금액을 입력하세요"
                required
              />

              <AdminInput
                label="필요 잔액 (USDT)"
                type="number"
                step="0.01"
                value={form.required_balance}
                onChange={e => setForm({ ...form, required_balance: e.target.value })}
                placeholder="필요한 최소 잔액을 입력하세요"
                required
              />

              <div className="flex space-x-3">
                <AdminButton
                  type="submit"
                  disabled={loading || !form.amount || !form.required_balance}
                  className="flex-1"
                >
                  {loading ? '저장 중...' : (editing ? '수정 저장' : '규칙 생성')}
                </AdminButton>

                <AdminButton
                  type="button"
                  onClick={resetForm}
                  variant="secondary"
                  className="flex-1"
                >
                  {editing ? '취소' : '초기화'}
                </AdminButton>
              </div>
            </form>
          </AdminCard>

          {/* Rules List */}
          <AdminCard title="가입 보너스 규칙 목록" subtitle="현재 등록된 보너스 규칙">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-400">등록된 보너스 규칙이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map(rule => (
                  <div key={rule.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          보너스: {Number(rule.amount).toLocaleString()} USDT
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          필요 잔액: {Number(rule.required_balance).toLocaleString()} USDT
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <AdminButton
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEdit(rule)}
                        >
                          수정
                        </AdminButton>
                        <AdminButton
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(rule.id)}
                          disabled={loading}
                        >
                          삭제
                        </AdminButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      )}

      {/* Claims Tab */}
      {tab === 'claims' && (
        <AdminCard title="가입 보너스 신청 내역" subtitle="사용자들의 가입 보너스 신청을 확인하세요">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">신청 내역이 없습니다</h3>
              <p className="text-gray-600 dark:text-gray-400">가입 보너스 신청 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['ID', '사용자', '보너스 금액', '필요 잔액', '상태', '신청일'].map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {claims.map(claim => (
                    <tr key={claim.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        #{claim.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {claim.user_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                        {Number(claim.amount).toLocaleString()} USDT
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {Number(claim.required_balance).toLocaleString()} USDT
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${claim.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : claim.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                          {claim.status === 'approved' ? '승인됨' : claim.status === 'pending' ? '대기중' : '거절됨'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(claim.created_at).toLocaleDateString()}
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