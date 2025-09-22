import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

export default function AdminUserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState(null);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('사용자 목록 조회 실패:', err);
      setMessage({ type: 'error', text: '사용자 목록을 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    setLoading(true);
    try {
      await axios.patch(`/api/admin/users/${id}/status`, { is_active: !currentStatus });
      setMessage({ type: 'success', text: '사용자 상태가 성공적으로 변경되었습니다.' });
      fetchUsers();
    } catch (err) {
      console.error('사용자 상태 변경 실패:', err);
      setMessage({ type: 'error', text: '사용자 상태 변경에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = async (id, currentStatus) => {
    setLoading(true);
    try {
      await axios.patch(`/api/admin/users/${id}/block`, { is_blocked: !currentStatus });
      setMessage({ type: 'success', text: '사용자 차단 상태가 성공적으로 변경되었습니다.' });
      fetchUsers();
    } catch (err) {
      console.error('사용자 차단 상태 변경 실패:', err);
      setMessage({ type: 'error', text: '사용자 차단 상태 변경에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const filteredUsers = users.filter(user =>
    searchTerm === '' ||
    user.id?.toString().includes(searchTerm) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (user) => {
    if (user.is_blocked) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">차단됨</span>;
    } else if (!user.is_active) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">비활성</span>;
    } else {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">활성</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">사용자 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">사용자 정보와 상태를 관리하세요</p>
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
      <AdminCard title="검색" subtitle="사용자를 검색하세요">
        <form onSubmit={handleSearch} className="flex gap-4">
          <AdminInput
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="사용자 ID, 이메일, 사용자명으로 검색..."
            className="flex-1"
          />
          <AdminButton type="submit" disabled={loading}>
            {loading ? '검색 중...' : '검색'}
          </AdminButton>
        </form>
      </AdminCard>

      {/* Users Table */}
      <AdminCard title="사용자 목록" subtitle="등록된 사용자 목록을 확인하세요">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
          </div>
        ) : currentUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">사용자가 없습니다</h3>
            <p className="text-gray-600 dark:text-gray-400">조회된 사용자가 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['ID', '이메일', '사용자명', '상태', 'VIP 레벨', '가입일', '관리'].map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {currentUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.username || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          VIP {user.vip_level || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <AdminButton
                            size="sm"
                            variant={user.is_active ? "warning" : "success"}
                            onClick={() => toggleStatus(user.id, user.is_active)}
                            disabled={loading}
                          >
                            {user.is_active ? '비활성화' : '활성화'}
                          </AdminButton>
                          <AdminButton
                            size="sm"
                            variant={user.is_blocked ? "success" : "danger"}
                            onClick={() => toggleBlock(user.id, user.is_blocked)}
                            disabled={loading}
                          >
                            {user.is_blocked ? '차단해제' : '차단'}
                          </AdminButton>
                        </div>
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
                  {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredUsers.length)} / {filteredUsers.length}개
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
    </div>
  );
}