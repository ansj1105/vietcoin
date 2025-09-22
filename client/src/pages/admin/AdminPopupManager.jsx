import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

export default function AdminPopupManager() {
  const [messages, setMessages] = useState([]);
  const [newPopup, setNewPopup] = useState({ title: '', content: '', type: 'info', is_active: true });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '', type: 'info', is_active: true });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/popups');
      setMessages(res.data || []);
    } catch (err) {
      console.error('팝업 메시지 조회 실패:', err);
      setMessage({ type: 'error', text: '팝업 메시지를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newPopup.title || !newPopup.content) {
      setMessage({ type: 'error', text: '제목과 내용을 모두 입력해주세요.' });
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/popups', newPopup);
      setNewPopup({ title: '', content: '', type: 'info', is_active: true });
      setMessage({ type: 'success', text: '팝업 메시지가 성공적으로 생성되었습니다.' });
      fetchMessages();
    } catch (err) {
      console.error('팝업 메시지 생성 실패:', err);
      setMessage({ type: 'error', text: '팝업 메시지 생성에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (popup) => {
    setEditingId(popup.id);
    setEditForm({
      title: popup.title,
      content: popup.content,
      type: popup.type || 'info',
      is_active: popup.is_active
    });
  };

  const handleUpdate = async () => {
    if (!editForm.title || !editForm.content) {
      setMessage({ type: 'error', text: '제목과 내용을 모두 입력해주세요.' });
      return;
    }

    setLoading(true);
    try {
      await axios.put(`/api/popups/${editingId}`, editForm);
      setEditingId(null);
      setMessage({ type: 'success', text: '팝업 메시지가 성공적으로 수정되었습니다.' });
      fetchMessages();
    } catch (err) {
      console.error('팝업 메시지 수정 실패:', err);
      setMessage({ type: 'error', text: '팝업 메시지 수정에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      await axios.delete(`/api/popups/${id}`);
      setMessage({ type: 'success', text: '팝업 메시지가 성공적으로 삭제되었습니다.' });
      fetchMessages();
    } catch (err) {
      console.error('팝업 메시지 삭제 실패:', err);
      setMessage({ type: 'error', text: '팝업 메시지 삭제에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    setLoading(true);
    try {
      await axios.patch(`/api/popups/${id}/status`, { is_active: !currentStatus });
      setMessage({ type: 'success', text: '팝업 메시지 상태가 변경되었습니다.' });
      fetchMessages();
    } catch (err) {
      console.error('팝업 메시지 상태 변경 실패:', err);
      setMessage({ type: 'error', text: '팝업 메시지 상태 변경에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = (type) => {
    const types = {
      info: { label: '정보', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
      warning: { label: '경고', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
      error: { label: '오류', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
      success: { label: '성공', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' }
    };

    const typeInfo = types[type] || types.info;

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeInfo.color}`}>
        {typeInfo.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">팝업 메시지 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">사용자에게 표시할 팝업 메시지를 관리하세요</p>
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

      {/* Create New Popup */}
      <AdminCard title="새 팝업 메시지 생성" subtitle="새로운 팝업 메시지를 등록하세요">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminInput
              label="제목"
              value={newPopup.title}
              onChange={e => setNewPopup({ ...newPopup, title: e.target.value })}
              placeholder="팝업 메시지 제목을 입력하세요"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                메시지 타입
              </label>
              <select
                value={newPopup.type}
                onChange={e => setNewPopup({ ...newPopup, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="info">정보</option>
                <option value="warning">경고</option>
                <option value="error">오류</option>
                <option value="success">성공</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              내용
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newPopup.content}
              onChange={e => setNewPopup({ ...newPopup, content: e.target.value })}
              placeholder="팝업 메시지 내용을 입력하세요"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={newPopup.is_active}
              onChange={e => setNewPopup({ ...newPopup, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
              활성 상태
            </label>
          </div>

          <AdminButton
            onClick={handleCreate}
            disabled={loading || !newPopup.title || !newPopup.content}
            className="w-full"
          >
            {loading ? '생성 중...' : '팝업 메시지 생성'}
          </AdminButton>
        </div>
      </AdminCard>

      {/* Popup Messages List */}
      <AdminCard title="팝업 메시지 목록" subtitle="등록된 팝업 메시지 목록을 확인하세요">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">팝업 메시지가 없습니다</h3>
            <p className="text-gray-600 dark:text-gray-400">새로운 팝업 메시지를 생성해보세요.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(popup => (
              <div key={popup.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {editingId === popup.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AdminInput
                        label="제목"
                        value={editForm.title}
                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="팝업 메시지 제목"
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          메시지 타입
                        </label>
                        <select
                          value={editForm.type}
                          onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="info">정보</option>
                          <option value="warning">경고</option>
                          <option value="error">오류</option>
                          <option value="success">성공</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        내용
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.content}
                        onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                        placeholder="팝업 메시지 내용"
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`edit_active_${popup.id}`}
                          checked={editForm.is_active}
                          onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`edit_active_${popup.id}`} className="ml-2 block text-sm text-gray-900 dark:text-white">
                          활성 상태
                        </label>
                      </div>

                      <div className="flex space-x-2">
                        <AdminButton
                          size="sm"
                          onClick={handleUpdate}
                          disabled={loading}
                        >
                          {loading ? '저장 중...' : '저장'}
                        </AdminButton>
                        <AdminButton
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingId(null)}
                        >
                          취소
                        </AdminButton>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {popup.title}
                          </h3>
                          {getTypeBadge(popup.type)}
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${popup.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                            {popup.is_active ? '활성' : '비활성'}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          {popup.content}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          생성일: {new Date(popup.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <AdminButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(popup)}
                      >
                        수정
                      </AdminButton>
                      <AdminButton
                        size="sm"
                        variant={popup.is_active ? "warning" : "success"}
                        onClick={() => handleToggleStatus(popup.id, popup.is_active)}
                        disabled={loading}
                      >
                        {popup.is_active ? '비활성화' : '활성화'}
                      </AdminButton>
                      <AdminButton
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(popup.id)}
                        disabled={loading}
                      >
                        삭제
                      </AdminButton>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}