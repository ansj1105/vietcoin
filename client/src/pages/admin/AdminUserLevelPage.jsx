import axios from 'axios';
import { useEffect, useState } from 'react';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

export default function AdminUserLevelPage() {
  const [levels, setLevels] = useState([]);
  const [editedLevels, setEditedLevels] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchLevels = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/vip-levels', { withCredentials: true });
      if (res.data.success) {
        setLevels(res.data.data || []);
      }
    } catch (err) {
      console.error('VIP 레벨 조회 실패:', err);
      setMessage({ type: 'error', text: 'VIP 레벨 정보를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (level, field, value) => {
    setEditedLevels(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [field]: value
      }
    }));
  };

  const handleSave = async (level) => {
    setLoading(true);
    try {
      const updateData = editedLevels[level];
      await axios.put(`/api/admin/vip-levels/${level}`, updateData, { withCredentials: true });
      await fetchLevels();
      setEditedLevels(prev => {
        const newData = { ...prev };
        delete newData[level];
        return newData;
      });
      setMessage({ type: 'success', text: 'VIP 레벨이 성공적으로 업데이트되었습니다.' });
    } catch (err) {
      console.error('VIP 레벨 업데이트 실패:', err);
      setMessage({ type: 'error', text: 'VIP 레벨 업데이트에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (level) => {
    setEditedLevels(prev => {
      const newData = { ...prev };
      delete newData[level];
      return newData;
    });
  };

  useEffect(() => {
    fetchLevels();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">VIP 레벨 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">VIP 레벨별 혜택과 조건을 설정하세요</p>
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

      {/* VIP Levels */}
      <AdminCard title="VIP 레벨 설정" subtitle="각 VIP 레벨의 혜택과 조건을 관리하세요">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
          </div>
        ) : levels.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">VIP 레벨 데이터가 없습니다</h3>
            <p className="text-gray-600 dark:text-gray-400">VIP 레벨 정보를 불러올 수 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {levels.map((level, index) => (
              <div key={level.level} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${level.level === 0
                      ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      : level.level === 1
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : level.level === 2
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : level.level === 3
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : level.level === 4
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                      {level.level === 0 ? '일반' : `VIP ${level.level}`}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {level.name || `VIP 레벨 ${level.level}`}
                    </h3>
                  </div>

                  {editedLevels[level.level] ? (
                    <div className="flex space-x-2">
                      <AdminButton
                        size="sm"
                        onClick={() => handleSave(level.level)}
                        disabled={loading}
                      >
                        {loading ? '저장 중...' : '저장'}
                      </AdminButton>
                      <AdminButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCancel(level.level)}
                      >
                        취소
                      </AdminButton>
                    </div>
                  ) : (
                    <AdminButton
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditedLevels(prev => ({ ...prev, [level.level]: { ...level } }))}
                    >
                      편집
                    </AdminButton>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      일일 거래 한도 (USDT)
                    </label>
                    {editedLevels[level.level] ? (
                      <AdminInput
                        type="number"
                        step="0.01"
                        value={editedLevels[level.level].daily_trade_limit || ''}
                        onChange={e => handleChange(level.level, 'daily_trade_limit', parseFloat(e.target.value) || 0)}
                        placeholder="일일 거래 한도를 입력하세요"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {Number(level.daily_trade_limit || 0).toLocaleString()} USDT
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      최소 수수료율 (%)
                    </label>
                    {editedLevels[level.level] ? (
                      <AdminInput
                        type="number"
                        step="0.01"
                        value={editedLevels[level.level].commission_min || ''}
                        onChange={e => handleChange(level.level, 'commission_min', parseFloat(e.target.value) || 0)}
                        placeholder="최소 수수료율을 입력하세요"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {Number(level.commission_min || 0).toFixed(2)}%
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      최대 수수료율 (%)
                    </label>
                    {editedLevels[level.level] ? (
                      <AdminInput
                        type="number"
                        step="0.01"
                        value={editedLevels[level.level].commission_max || ''}
                        onChange={e => handleChange(level.level, 'commission_max', parseFloat(e.target.value) || 0)}
                        placeholder="최대 수수료율을 입력하세요"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {Number(level.commission_max || 0).toFixed(2)}%
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      최대 투자금액 (USDT)
                    </label>
                    {editedLevels[level.level] ? (
                      <AdminInput
                        type="number"
                        step="0.01"
                        value={editedLevels[level.level].max_investment || ''}
                        onChange={e => handleChange(level.level, 'max_investment', parseFloat(e.target.value) || 0)}
                        placeholder="최대 투자금액을 입력하세요"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {Number(level.max_investment || 0).toLocaleString()} USDT
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      일일 수수료 한도 (USDT)
                    </label>
                    {editedLevels[level.level] ? (
                      <AdminInput
                        type="number"
                        step="0.01"
                        value={editedLevels[level.level].daily_commission_max || ''}
                        onChange={e => handleChange(level.level, 'daily_commission_max', parseFloat(e.target.value) || 0)}
                        placeholder="일일 수수료 한도를 입력하세요"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {Number(level.daily_commission_max || 0).toLocaleString()} USDT
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      최소 보유량 (USDT)
                    </label>
                    {editedLevels[level.level] ? (
                      <AdminInput
                        type="number"
                        step="0.01"
                        value={editedLevels[level.level].min_holdings || ''}
                        onChange={e => handleChange(level.level, 'min_holdings', parseFloat(e.target.value) || 0)}
                        placeholder="최소 보유량을 입력하세요"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {Number(level.min_holdings || 0).toLocaleString()} USDT
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      최소 A레벨 추천인 수
                    </label>
                    {editedLevels[level.level] ? (
                      <AdminInput
                        type="number"
                        value={editedLevels[level.level].min_A || ''}
                        onChange={e => handleChange(level.level, 'min_A', parseInt(e.target.value) || 0)}
                        placeholder="최소 A레벨 추천인 수를 입력하세요"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {Number(level.min_A || 0)}명
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      최소 B레벨 추천인 수
                    </label>
                    {editedLevels[level.level] ? (
                      <AdminInput
                        type="number"
                        value={editedLevels[level.level].min_B || ''}
                        onChange={e => handleChange(level.level, 'min_B', parseInt(e.target.value) || 0)}
                        placeholder="최소 B레벨 추천인 수를 입력하세요"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {Number(level.min_B || 0)}명
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      최소 C레벨 추천인 수
                    </label>
                    {editedLevels[level.level] ? (
                      <AdminInput
                        type="number"
                        value={editedLevels[level.level].min_C || ''}
                        onChange={e => handleChange(level.level, 'min_C', parseInt(e.target.value) || 0)}
                        placeholder="최소 C레벨 추천인 수를 입력하세요"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        {Number(level.min_C || 0)}명
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}