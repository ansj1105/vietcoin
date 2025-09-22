// 📁 src/pages/admin/AdminWalletSettings.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

export default function AdminWalletSettings() {
  const [activeTab, setActiveTab] = useState('wallet'); // 'wallet' | 'withdrawal'

  // 지갑 설정 상태
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    deposit_fee_rate: '',
    withdraw_fee_rate: '',
    real_withdraw_fee: '',
    auto_approve: 'auto',
    token_to_quant_rate: '',
    minimum_deposit_amount: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/wallet/admin/wallet-settings');
      const data = response.data || {};
      setSettings(data);
      setForm({
        deposit_fee_rate: data.deposit_fee_rate || '',
        withdraw_fee_rate: data.withdraw_fee_rate || '',
        real_withdraw_fee: data.real_withdraw_fee || '',
        auto_approve: data.auto_approve || 'auto',
        token_to_quant_rate: data.token_to_quant_rate || '',
        minimum_deposit_amount: data.minimum_deposit_amount || ''
      });
    } catch (err) {
      console.error('지갑 설정 로드 실패:', err);
      setMessage({ type: 'error', text: '지갑 설정을 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put('/api/wallet/admin/wallet-settings', form);
      setMessage({ type: 'success', text: '지갑 설정이 성공적으로 저장되었습니다.' });
      await fetchSettings();
    } catch (err) {
      console.error('지갑 설정 저장 실패:', err);
      setMessage({ type: 'error', text: '지갑 설정 저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    if (settings) {
      setForm({
        deposit_fee_rate: settings.deposit_fee_rate || '',
        withdraw_fee_rate: settings.withdraw_fee_rate || '',
        real_withdraw_fee: settings.real_withdraw_fee || '',
        auto_approve: settings.auto_approve || 'auto',
        token_to_quant_rate: settings.token_to_quant_rate || '',
        minimum_deposit_amount: settings.minimum_deposit_amount || ''
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">지갑 설정</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">지갑 관련 설정을 관리하세요</p>
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
          { key: 'wallet', label: '지갑 설정' },
          { key: 'withdrawal', label: '출금 설정' }
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

      {/* Wallet Settings Tab */}
      {activeTab === 'wallet' && (
        <AdminCard title="지갑 설정" subtitle="지갑 관련 기본 설정을 관리하세요">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">로딩 중...</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AdminInput
                  label="입금 수수료율 (%)"
                  type="number"
                  step="0.01"
                  value={form.deposit_fee_rate}
                  onChange={e => handleChange('deposit_fee_rate', e.target.value)}
                  placeholder="입금 수수료율을 입력하세요"
                />

                <AdminInput
                  label="토큰 대 퀀트 비율"
                  type="number"
                  step="0.000001"
                  value={form.token_to_quant_rate}
                  onChange={e => handleChange('token_to_quant_rate', e.target.value)}
                  placeholder="토큰 대 퀀트 비율을 입력하세요"
                />

                <AdminInput
                  label="최소 입금 금액 (USDT)"
                  type="number"
                  step="0.01"
                  value={form.minimum_deposit_amount}
                  onChange={e => handleChange('minimum_deposit_amount', e.target.value)}
                  placeholder="최소 입금 금액을 입력하세요"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    자동 승인 설정
                  </label>
                  <select
                    value={form.auto_approve}
                    onChange={e => handleChange('auto_approve', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">자동 승인</option>
                    <option value="manual">수동 승인</option>
                    <option value="threshold">임계값 기반</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3">
                <AdminButton
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? '저장 중...' : '설정 저장'}
                </AdminButton>

                <AdminButton
                  variant="secondary"
                  onClick={resetForm}
                  className="flex-1"
                >
                  초기화
                </AdminButton>
              </div>
            </div>
          )}
        </AdminCard>
      )}

      {/* Withdrawal Settings Tab */}
      {activeTab === 'withdrawal' && (
        <AdminCard title="출금 설정" subtitle="출금 관련 설정을 관리하세요">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AdminInput
                label="출금 수수료율 (%)"
                type="number"
                step="0.01"
                value={form.withdraw_fee_rate}
                onChange={e => handleChange('withdraw_fee_rate', e.target.value)}
                placeholder="출금 수수료율을 입력하세요"
              />

              <AdminInput
                label="실제 출금 수수료 (USDT)"
                type="number"
                step="0.01"
                value={form.real_withdraw_fee}
                onChange={e => handleChange('real_withdraw_fee', e.target.value)}
                placeholder="실제 출금 수수료를 입력하세요"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">출금 수수료 안내</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• 출금 수수료율: 전체 출금 금액에 대한 비율</li>
                <li>• 실제 출금 수수료: 고정 수수료 (네트워크 수수료 포함)</li>
                <li>• 최종 수수료 = (출금 금액 × 수수료율) + 실제 수수료</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <AdminButton
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? '저장 중...' : '설정 저장'}
              </AdminButton>

              <AdminButton
                variant="secondary"
                onClick={resetForm}
                className="flex-1"
              >
                초기화
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      )}

      {/* Current Settings Display */}
      {settings && (
        <AdminCard title="현재 설정" subtitle="현재 적용된 설정을 확인하세요">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">입금 설정</h4>
              <div className="space-y-1 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  수수료율: <span className="font-semibold text-gray-900 dark:text-white">{settings.deposit_fee_rate || 0}%</span>
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  최소 금액: <span className="font-semibold text-gray-900 dark:text-white">{Number(settings.minimum_deposit_amount || 0).toLocaleString()} USDT</span>
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">출금 설정</h4>
              <div className="space-y-1 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  수수료율: <span className="font-semibold text-gray-900 dark:text-white">{settings.withdraw_fee_rate || 0}%</span>
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  실제 수수료: <span className="font-semibold text-gray-900 dark:text-white">{Number(settings.real_withdraw_fee || 0).toLocaleString()} USDT</span>
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">기타 설정</h4>
              <div className="space-y-1 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  승인 방식: <span className="font-semibold text-gray-900 dark:text-white">
                    {settings.auto_approve === 'auto' ? '자동' : settings.auto_approve === 'manual' ? '수동' : '임계값 기반'}
                  </span>
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  토큰 비율: <span className="font-semibold text-gray-900 dark:text-white">{settings.token_to_quant_rate || 0}</span>
                </p>
              </div>
            </div>
          </div>
        </AdminCard>
      )}
    </div>
  );
}