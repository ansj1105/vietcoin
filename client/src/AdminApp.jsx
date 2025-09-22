import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
//import AdminChat from './pages/admin/AdminChat';
import AdminLogin from './pages/admin/AdminLogin';
import AdminInviteRewardsPage from './pages/admin/AdminInviteRewardsPage';
import AdminJoinRewardsPage from './pages/admin/AdminJoinRewardsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminContentManager from './pages/admin/AdminContentManager';
import AdminUserManager from './pages/admin/AdminUserManager';
import AdminPopupManager from './pages/admin/AdminPopupManager';
import AdminWalletSettings from './pages/admin/AdminWalletSettings';
import AdminUserInfoPage from './pages/admin/AdminUserInfoPage';
import AdminUserLevelPage from './pages/admin/AdminUserLevelPage';
import AdminUserReferralPage from './pages/admin/AdminUserReferralPage';
import TeamManagementPage from './pages/admin/TeamManagementPage';
import QuantLeaderboardPage from './pages/admin/QuantLeaderboardPage';
import WalletAdminPage from './pages/admin/WalletAdminPage';
import AdminWalletsPage from './pages/admin/AdminWalletsPage';
import AdminWalletPage from './pages/admin/AdminWalletPage';
import AdminWithdrawalsPage from './pages/admin/AdminWithdrawalsPage';
import AdminBNBWalletPage from './pages/admin/AdminBNBWalletPage';
import TokenSalesAdminPage from './pages/admin/TokenSalesAdminPage';
import TokensAdminPage from './pages/admin/TokensAdminPage';
import TokenLogsPage from './pages/admin/TokenLogsPage';
import ChatAdminLoginPage from './pages/chat/ChatAdminLoginPage';
import ChatAdminUserListPage from './pages/chat/ChatAdminUserListPage';
import AdminLayout from './components/admin/AdminLayout';

import axios from 'axios';

axios.defaults.withCredentials = true;

function AdminAppInner() {
  const [admin, setAdmin] = useState(null);
  const navigate = useNavigate();

  // location을 사용해서 현재 경로 확인
  const location = window.location.hash.replace(/^#/, '');

  // 세션 체크가 필요 없는 경로
  const noSessionCheckRoutes = [
    '/login',
    '/chat-admin/login',
    '/chat-admin/users',
    '/chat-admin',
    '/chat/admin/login'  // 추가: 실제 요청되는 경로
  ];

  if (location === '/chat-admin') {
    return <ChatAdminUserListPage />;
  }

  if (noSessionCheckRoutes.includes(location)) {
    return (
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/chat-admin/login" element={<ChatAdminLoginPage />} />
        <Route path="/chat/admin/login" element={<ChatAdminLoginPage />} />
        <Route path="/chat-admin/users" element={<ChatAdminUserListPage />} />
      </Routes>
    );
  }

  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/admin-logout");
      setAdmin(null);
      window.location.href = "/admin.html#/login";
    } catch (err) {
      console.error("관리자 로그아웃 실패:", err);
      setAdmin(null);
      window.location.href = "/admin.html#/login";
    }
  };

  return (
    <AdminLayout onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<AdminLogin />} />
        {/* Chat Admin Routes */}
        <Route path="/chat-admin/login" element={<ChatAdminLoginPage />} />
        <Route path="/chat/admin/login" element={<ChatAdminLoginPage />} />
        <Route path="/chat-admin/users" element={<ChatAdminUserListPage />} />

        <Route path="/popup" element={<AdminPopupManager />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/quantpage" element={<TeamManagementPage />} />
        <Route path="/quantrank" element={<QuantLeaderboardPage />} />
        <Route path="/content" element={<AdminContentManager />} />
        <Route path="/invite-rewards" element={<AdminInviteRewardsPage />} />
        <Route path="/token" element={<TokensAdminPage />} />
        <Route path="/tokensales" element={<TokenSalesAdminPage />} />
        <Route path="/tokenlogs" element={<TokenLogsPage />} />
        <Route path="/admin-rewards" element={<AdminJoinRewardsPage />} />
        <Route path="/users/info" element={<AdminUserInfoPage />} />
        <Route path="/users/level" element={<AdminUserLevelPage />} />
        <Route path="/users/referral" element={<AdminUserReferralPage />} />
        <Route path="/wallet-admin" element={<WalletAdminPage />} />
        <Route path="/wallet-settings" element={<AdminWalletSettings />} />
        <Route path="/wallet-deposits" element={<AdminWalletsPage />} />
        <Route path="/wallet-withdrawals" element={<AdminWalletPage />} />
        <Route path="/bnb-wallet" element={<AdminBNBWalletPage />} />
        <Route path="/wallet-withdraw" element={<AdminWithdrawalsPage />} />
        <Route path="/users" element={<AdminUserManager />} />
      </Routes>
    </AdminLayout>
  );
}

export default function AdminApp() {
  return (
    <Router>
      <AdminAppInner />
    </Router>
  );
}
