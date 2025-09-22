// 📁 src/pages/admin/AdminInviteRewardsPage.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

export default function AdminInviteRewardsPage() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({
    id: null,
    referral_level: '',
    required_referrals: '',
    reward_amount: ''
  });
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('rewards'); // 'rewards' | 'logs'
  const [inviteLogs, setInviteLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/invite-rewards', { withCredentials: true });
      setList(res.data.data || []);
    } catch (err) {
      console.error('리스트 로딩 실패', err);
      setMessage({ type: 'error', text: '초대 보상 목록을 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setForm({ id: null, referral_level: '', required_referrals: '', reward_amount: '' });
    setEditing(true);
  };

  const openEdit = item => {
    setForm(item);
    setEditing(true);
  };

  const handleDelete = async id => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      await axios.delete(`/api/admin/invite-rewards/${id}`, { withCredentials: true });
      setMessage({ type: 'success', text: '초대 보상이 성공적으로 삭제되었습니다.' });
      fetchList();
    } catch (err) {
      console.error('초대 보상 삭제 실패:', err);
      setMessage({ type: 'error', text: '초대 보상 삭제에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        referral_level: Number(form.referral_level),
        required_referrals: Number(form.required_referrals),
        reward_amount: parseFloat(form.reward_amount)
      };

      if (form.id) {
        await axios.put(`/api/admin/invite-rewards/${form.id}`, payload, { withCredentials: true });
        setMessage({ type: 'success', text: '초대 보상이 성공적으로 수정되었습니다.' });
      } else {
        await axios.post('/api/admin/invite-rewards', payload, { withCredentials: true });
        setMessage({ type: 'success', text: '초대 보상이 성공적으로 생성되었습니다.' });
      }

      setEditing(false);
      fetchList();
    } catch (err) {
      console.error('초대 보상 저장 실패:', err);
      setMessage({ type: 'error', text: '초대 보상 저장에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 초대보상 로그 불러오기
  const fetchInviteLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/logs/admin/wallets-log', { withCredentials: true });
      // invite_rewards 로그만 필터링
      const logs = (res.data.data || []).filter(log => log.referenceType === 'invite_rewards');
      setInviteLogs(logs);
    } catch (err) {
      console.error('로그 로딩 실패', err);
      setMessage({ type: 'error', text: '초대 보상 로그를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 탭 변경시 로그 불러오기
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchInviteLogs();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">초대 보상 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">초대 보상 규칙과 지급 내역을 관리하세요</p>
        </div>
        <AdminButton onClick={openNew} disabled={editing}>
          추가
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

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {[
          { key: 'rewards', label: '보상 목록' },
          { key: 'logs', label: '초대보상 로그' }
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

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rewards List */}
          <AdminCard title="보상 목록" subtitle="현재 설정된 초대 보상 목록">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
              </div>
            ) : list.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-400">등록된 보상이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {list.map((item, idx) => (
                  <div key={item.id} className={`p-3 rounded-lg ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          레벨 {item.referral_level}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          필요 추천인: {item.required_referrals}명
                        </p>
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                          보상: {parseFloat(item.reward_amount || 0).toFixed(2)} USDT
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <AdminButton
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(item)}
                        >
                          수정
                        </AdminButton>
                        <AdminButton
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(item.id)}
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

          {/* Add/Edit Form */}
          {editing && (
            <AdminCard
              title={form.id ? "초대 보상 수정" : "새 초대 보상 추가"}
              subtitle={form.id ? "기존 보상을 수정하세요" : "새로운 초대 보상을 추가하세요"}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <AdminInput
                  label="추천 레벨"
                  type="number"
                  min="1"
                  value={form.referral_level}
                  onChange={e => setForm(f => ({ ...f, referral_level: e.target.value }))}
                  placeholder="추천 레벨을 입력하세요"
                  required
                />

                <AdminInput
                  label="필요 추천인 수"
                  type="number"
                  min="1"
                  value={form.required_referrals}
                  onChange={e => setForm(f => ({ ...f, required_referrals: e.target.value }))}
                  placeholder="필요한 추천인 수를 입력하세요"
                  required
                />

                <AdminInput
                  label="보상 금액 (USDT)"
                  type="number"
                  step="0.000001"
                  min="0"
                  value={form.reward_amount}
                  onChange={e => setForm(f => ({ ...f, reward_amount: e.target.value }))}
                  placeholder="보상 금액을 입력하세요"
                  required
                />

                <div className="flex space-x-3">
                  <AdminButton
                    type="submit"
                    disabled={loading || !form.referral_level || !form.required_referrals || !form.reward_amount}
                    className="flex-1"
                  >
                    {loading ? '저장 중...' : (form.id ? '수정 저장' : '추가')}
                  </AdminButton>

                  <AdminButton
                    type="button"
                    onClick={() => setEditing(false)}
                    variant="secondary"
                    className="flex-1"
                  >
                    취소
                  </AdminButton>
                </div>
              </form>
            </AdminCard>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <AdminCard title="초대보상 로그" subtitle="초대 보상 지급 내역을 확인하세요">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
            </div>
          ) : inviteLogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">초대 보상 로그가 없습니다</h3>
              <p className="text-gray-600 dark:text-gray-400">초대 보상 지급 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['사용자 ID', '이메일', '금액', '날짜', '설명'].map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {inviteLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {log.user_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {log.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                        {Number(log.amount).toLocaleString()} USDT
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(log.logDate).toLocaleDateString()}
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