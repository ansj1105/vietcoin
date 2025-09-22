import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

export default function TeamManagementPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newVipLevel, setNewVipLevel] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState(null);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/referral/admin/my-team', { withCredentials: true });
      if (response.data.success) {
        // 백엔드 응답 구조에 맞게 데이터 변환
        // {S, A, B, C} 구조를 단일 배열로 변환
        const allUsers = [];
        const teamsData = response.data.data || [];

        teamsData.forEach(team => {
          // S는 단일 객체이므로 직접 추가
          if (team.S) {
            allUsers.push({
              ...team.S,
              level: 'S'
            });
          }
          // A, B, C는 배열이므로 spread operator 사용
          if (team.A && Array.isArray(team.A)) {
            allUsers.push(...team.A.map(user => ({ ...user, level: 'A' })));
          }
          if (team.B && Array.isArray(team.B)) {
            allUsers.push(...team.B.map(user => ({ ...user, level: 'B' })));
          }
          if (team.C && Array.isArray(team.C)) {
            allUsers.push(...team.C.map(user => ({ ...user, level: 'C' })));
          }
        });

        setTeams(allUsers);
      }
    } catch (err) {
      console.error('팀 관리 불러오기 실패', err);
      setMessage({ type: 'error', text: '팀 데이터를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVipLevelChange = async (userId, newLevel) => {
    setLoading(true);
    try {
      await axios.patch(`/api/admin/users/${userId}/vip`, {
        vip_level: newLevel
      }, { withCredentials: true });

      setMessage({ type: 'success', text: 'VIP 레벨이 성공적으로 업데이트되었습니다.' });
      setEditingUserId(null);
      fetchTeams();
    } catch (err) {
      console.error('VIP 레벨 업데이트 실패', err);
      setMessage({ type: 'error', text: 'VIP 레벨 업데이트에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const filteredTeams = teams.filter(team =>
    searchTerm === '' ||
    team.id?.toString().includes(searchTerm) ||
    team.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTeams = filteredTeams.slice(startIndex, startIndex + itemsPerPage);

  const getVipLevelBadge = (level) => {
    const levels = {
      0: { label: '일반', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' },
      1: { label: 'VIP 1', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
      2: { label: 'VIP 2', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
      3: { label: 'VIP 3', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
      4: { label: 'VIP 4', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
      5: { label: 'VIP 5', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' }
    };

    const vipInfo = levels[level] || levels[0];

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${vipInfo.color}`}>
        {vipInfo.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">팀 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">팀 구성원과 리더보드를 관리하세요</p>
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
      <AdminCard title="검색" subtitle="팀 구성원을 검색하세요">
        <form onSubmit={handleSearch} className="flex gap-4">
          <AdminInput
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="사용자 ID, 이메일, 추천코드로 검색..."
            className="flex-1"
          />
          <AdminButton type="submit" disabled={loading}>
            {loading ? '검색 중...' : '검색'}
          </AdminButton>
        </form>
      </AdminCard>

      {/* Teams List */}
      {loading ? (
        <AdminCard title="팀 목록" subtitle="팀 구성원을 로딩 중입니다">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
          </div>
        </AdminCard>
      ) : teams.length === 0 ? (
        <AdminCard title="팀 관리" subtitle="현재 등록된 팀 구성원이 없습니다">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">팀 구성원이 없습니다</h3>
            <p className="text-gray-600 dark:text-gray-400">조회 가능한 팀 구성원이 없습니다.</p>
          </div>
        </AdminCard>
      ) : (
        <AdminCard title="팀 목록" subtitle="현재 등록된 팀 구성원 목록">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['사용자 ID', '이메일', '추천코드', '레벨', 'VIP 레벨', '추천인 수', '가입일', '관리'].map(header => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currentTeams.map(team => (
                  <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {team.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {team.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {team.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${team.level === 'S' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                        team.level === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          team.level === 'B' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            team.level === 'C' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}>
                        {team.level || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUserId === team.id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={newVipLevel}
                            onChange={e => setNewVipLevel(parseInt(e.target.value))}
                            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {[0, 1, 2, 3, 4, 5].map(level => (
                              <option key={level} value={level}>
                                {level === 0 ? '일반' : `VIP ${level}`}
                              </option>
                            ))}
                          </select>
                          <AdminButton
                            size="sm"
                            onClick={() => handleVipLevelChange(team.id, newVipLevel)}
                            disabled={loading}
                          >
                            저장
                          </AdminButton>
                          <AdminButton
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingUserId(null)}
                          >
                            취소
                          </AdminButton>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          {getVipLevelBadge(team.vip_level || 0)}
                          <AdminButton
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingUserId(team.id);
                              setNewVipLevel(team.vip_level || 0);
                            }}
                          >
                            수정
                          </AdminButton>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {team.team_count || 0}명
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(team.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <AdminButton
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          // 팀 구성원 상세 정보 모달 열기
                          console.log('상세 정보:', team);
                        }}
                      >
                        상세보기
                      </AdminButton>
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
                {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTeams.length)} / {filteredTeams.length}개
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
      )}
    </div>
  );
}