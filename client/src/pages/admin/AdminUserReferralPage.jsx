// 📁 src/pages/admin/AdminUserReferralPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

export default function AdminUserReferralPage() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [teams, setTeams] = useState([]);
  const [settings, setSettings] = useState({ levelA: 0, levelB: 0, levelC: 0 });
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'teams' | 'settings'

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, []);

  // 사용자 목록 조회 (관리자용)
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/users', { withCredentials: true });
      setUsers(res.data || []);
    } catch (err) {
      console.error('사용자 목록 조회 실패:', err);
      setMessage({ type: 'error', text: '사용자 목록을 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 추천 설정 조회
  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/referral/reward-settings', { withCredentials: true });
      if (res.data.success && res.data.data) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('추천 설정 조회 실패:', err);
    }
  };

  // 사용자별 팀 조회
  const fetchUserTeams = async (userId) => {
    try {
      const res = await axios.get(`/api/referral/users/${userId}/invitation-status`, { withCredentials: true });
      if (res.data.success) {
        // 백엔드 응답 구조에 맞게 데이터 변환
        const teamData = res.data.data.invites || [];
        setTeams(teamData);
      }
    } catch (err) {
      console.error('팀 조회 실패:', err);
      setMessage({ type: 'error', text: '팀 정보를 불러오는데 실패했습니다.' });
    }
  };

  // 추천코드 생성
  const generateCode = async () => {
    if (!selectedUserId) {
      setMessage({ type: 'error', text: '사용자를 선택해주세요.' });
      return;
    }

    try {
      const { data } = await axios.post(
        `/api/referral/users/${selectedUserId}/code`,
        {},
        { withCredentials: true }
      );
      setReferralCode(data.data.referral_code);
      setMessage({ type: 'success', text: '추천코드가 성공적으로 생성되었습니다.' });
    } catch (err) {
      console.error('추천코드 생성 실패:', err);
      setMessage({ type: 'error', text: '추천코드 생성 중 오류가 발생했습니다.' });
    }
  };

  // 추천코드 저장 (생성과 동일한 API 사용)
  const saveCode = async () => {
    if (!selectedUserId || !referralCode) {
      setMessage({ type: 'error', text: '사용자와 추천코드를 모두 입력해주세요.' });
      return;
    }

    try {
      await axios.post(
        `/api/referral/users/${selectedUserId}/code`,
        { referral_code: referralCode },
        { withCredentials: true }
      );
      setMessage({ type: 'success', text: '추천코드가 성공적으로 저장되었습니다.' });
    } catch (err) {
      console.error('추천코드 저장 실패:', err);
      setMessage({ type: 'error', text: '추천코드 저장에 실패했습니다.' });
    }
  };

  // 추천 설정 저장
  const saveSettings = async () => {
    try {
      await axios.put('/api/referral/reward-settings', settings, { withCredentials: true });
      setMessage({ type: 'success', text: '추천 설정이 성공적으로 저장되었습니다.' });
    } catch (err) {
      console.error('추천 설정 저장 실패:', err);
      setMessage({ type: 'error', text: '추천 설정 저장에 실패했습니다.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">사용자 추천 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">사용자 추천 시스템을 관리하세요</p>
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
          { key: 'users', label: '사용자 관리' },
          { key: 'teams', label: '팀 조회' },
          { key: 'settings', label: '추천 설정' }
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

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Selection */}
          <AdminCard title="사용자 선택" subtitle="관리할 사용자를 선택하세요">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  사용자 선택
                </label>
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">사용자를 선택하세요</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.email} (ID: {user.id})
                    </option>
                  ))}
                </select>
              </div>

              <AdminButton
                onClick={generateCode}
                disabled={!selectedUserId || loading}
                className="w-full"
              >
                {loading ? '생성 중...' : '추천코드 생성'}
              </AdminButton>
            </div>
          </AdminCard>

          {/* Referral Code Management */}
          <AdminCard title="추천코드 관리" subtitle="추천코드를 생성하고 관리하세요">
            <div className="space-y-4">
              <AdminInput
                label="추천코드"
                value={referralCode}
                onChange={e => setReferralCode(e.target.value)}
                placeholder="추천코드를 입력하세요"
              />

              <div className="flex space-x-3">
                <AdminButton
                  onClick={saveCode}
                  disabled={!selectedUserId || !referralCode || loading}
                  className="flex-1"
                >
                  {loading ? '저장 중...' : '코드 저장'}
                </AdminButton>

                <AdminButton
                  variant="secondary"
                  onClick={() => setReferralCode('')}
                  className="flex-1"
                >
                  초기화
                </AdminButton>
              </div>
            </div>
          </AdminCard>
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <AdminCard title="팀 조회" subtitle="선택한 사용자의 팀 정보를 확인하세요">
          <div className="space-y-4">
            <div className="flex gap-4">
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">사용자를 선택하세요</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.email} (ID: {user.id})
                  </option>
                ))}
              </select>

              <AdminButton
                onClick={() => fetchUserTeams(selectedUserId)}
                disabled={!selectedUserId || loading}
              >
                {loading ? '조회 중...' : '팀 조회'}
              </AdminButton>
            </div>

            {teams.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {['사용자 ID', '이름', '이메일', '가입일'].map(header => (
                        <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {teams.map(team => (
                      <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {team.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {team.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {team.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(team.invited_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AdminCard>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <AdminCard title="추천 설정" subtitle="추천 시스템 설정을 관리하세요">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AdminInput
                label="Level A 수수료 (%)"
                type="number"
                step="0.01"
                value={settings.levelA}
                onChange={e => setSettings({ ...settings, levelA: parseFloat(e.target.value) || 0 })}
                placeholder="Level A 수수료율"
              />

              <AdminInput
                label="Level B 수수료 (%)"
                type="number"
                step="0.01"
                value={settings.levelB}
                onChange={e => setSettings({ ...settings, levelB: parseFloat(e.target.value) || 0 })}
                placeholder="Level B 수수료율"
              />

              <AdminInput
                label="Level C 수수료 (%)"
                type="number"
                step="0.01"
                value={settings.levelC}
                onChange={e => setSettings({ ...settings, levelC: parseFloat(e.target.value) || 0 })}
                placeholder="Level C 수수료율"
              />
            </div>

            <AdminButton
              onClick={saveSettings}
              disabled={loading}
              className="w-full"
            >
              {loading ? '저장 중...' : '설정 저장'}
            </AdminButton>
          </div>
        </AdminCard>
      )}
    </div>
  );
}