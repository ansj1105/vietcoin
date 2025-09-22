// 📁 src/pages/admin/WalletAdminPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';
import AdminInput from '../../components/admin/AdminInput';

import FundingProjectList from '../../components/admin/FundingProjectList';
import FundingProjectForm from '../../components/admin/FundingProjectForm';
import FundingInvestorList from '../../components/admin/FundingInvestorList';
import FundingMonitoring from '../../components/admin/FundingMonitoring';

export default function WalletAdminPage() {
  const [settings, setSettings] = useState(null);
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('settings');
  const [fundingTab, setFundingTab] = useState('list');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    deposit_fee_rate: '',
    withdraw_fee_rate: '',
    auto_approve: 'manual',
  });

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/wallet/settings');
      setSettings(res.data);
      setForm(res.data);
    } catch (err) {
      console.error('설정 로드 실패:', err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await axios.get('/api/wallet/requests');
      setRequests(res.data);
    } catch (err) {
      console.error('요청 로드 실패:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/wallet/projects');
      setProjects(res.data);
    } catch (err) {
      console.error('프로젝트 로드 실패:', err);
    }
  };

  const handleSettingsSave = async () => {
    setLoading(true);
    try {
      await axios.post('/api/wallet/settings', form);
      alert('설정이 저장되었습니다.');
      fetchSettings();
    } catch (err) {
      console.error('설정 저장 실패:', err);
      alert('설정 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    if (!confirm('이 출금 요청을 승인하시겠습니까?')) return;

    setLoading(true);
    try {
      await axios.put(`/api/admin/withdrawals/${requestId}/approve`, {}, { withCredentials: true });
      alert('출금 요청이 승인되었습니다.');
      fetchRequests();
    } catch (err) {
      console.error('출금 승인 실패:', err);
      alert('출금 승인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!confirm('이 출금 요청을 거부하시겠습니까?')) return;

    setLoading(true);
    try {
      await axios.put(`/api/admin/withdrawals/${requestId}/reject`, {}, { withCredentials: true });
      alert('출금 요청이 거부되었습니다.');
      fetchRequests();
    } catch (err) {
      console.error('출금 거부 실패:', err);
      alert('출금 거부에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchRequests();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">재무 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">지갑 설정과 펀딩 프로젝트를 관리하세요</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {['settings', 'requests', 'projects'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === tab
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            {tab === 'settings' ? '설정' : tab === 'requests' ? '요청' : '프로젝트'}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <AdminCard title="지갑 설정" subtitle="입출금 수수료 및 승인 설정을 관리하세요">
          <div className="space-y-4">
            <AdminInput
              label="입금 수수료율 (%)"
              type="number"
              step="0.01"
              value={form.deposit_fee_rate}
              onChange={e => setForm({ ...form, deposit_fee_rate: e.target.value })}
              placeholder="0.00"
            />

            <AdminInput
              label="출금 수수료율 (%)"
              type="number"
              step="0.01"
              value={form.withdraw_fee_rate}
              onChange={e => setForm({ ...form, withdraw_fee_rate: e.target.value })}
              placeholder="0.00"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                자동 승인 설정
              </label>
              <select
                value={form.auto_approve}
                onChange={e => setForm({ ...form, auto_approve: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">자동</option>
                <option value="manual">수동</option>
              </select>
            </div>

            <AdminButton
              onClick={handleSettingsSave}
              disabled={loading}
              className="w-full"
            >
              {loading ? '저장 중...' : '저장'}
            </AdminButton>
          </div>
        </AdminCard>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <AdminCard title="출금 요청" subtitle="사용자의 출금 요청을 관리하세요">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['ID', '사용자', '금액', '주소', '상태', '요청일', '관리'].map(header => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {requests.map(request => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {request.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {request.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                      ${request.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                      {request.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${request.status === 'SUCCESS' || request.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : request.status === 'PENDING' || request.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                        {request.status === 'PENDING' ? 'pending' :
                          request.status === 'SUCCESS' ? 'completed' :
                            request.status === 'FAILED' ? 'rejected' :
                              request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        {(request.status === 'PENDING' || request.status === 'pending') && (
                          <>
                            <AdminButton
                              size="sm"
                              variant="success"
                              onClick={() => handleApproveRequest(request.id)}
                              disabled={loading}
                            >
                              승인
                            </AdminButton>
                            <AdminButton
                              size="sm"
                              variant="danger"
                              onClick={() => handleRejectRequest(request.id)}
                              disabled={loading}
                            >
                              거부
                            </AdminButton>
                          </>
                        )}
                        {(request.status !== 'PENDING' && request.status !== 'pending') && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            처리완료
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          {/* Funding Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {['list', 'create', 'investors', 'monitoring'].map(tab => (
              <button
                key={tab}
                onClick={() => setFundingTab(tab)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${fundingTab === tab
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                {tab === 'list' ? '목록' : tab === 'create' ? '생성' : tab === 'investors' ? '투자자' : '모니터링'}
              </button>
            ))}
          </div>

          {/* Funding Content */}
          {fundingTab === 'list' && <FundingProjectList />}
          {fundingTab === 'create' && <FundingProjectForm />}
          {fundingTab === 'investors' && <FundingInvestorList />}
          {fundingTab === 'monitoring' && <FundingMonitoring />}
        </div>
      )}
    </div>
  );
}