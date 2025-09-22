import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    Bars3Icon,
    XMarkIcon,
    ChartBarIcon,
    UserGroupIcon,
    Cog6ToothIcon,
    WalletIcon,
    GiftIcon,
    CurrencyDollarIcon,
    BellIcon,
    ChatBubbleLeftRightIcon,
    PhotoIcon,
    CubeIcon,
    TrophyIcon,
    ArrowRightOnRectangleIcon
} from "@heroicons/react/24/outline";

export default function AdminSidebar({ onLogout, isCollapsed, setIsCollapsed, isMobile, setIsMobileOpen }) {
    const location = useLocation();
    const [expandedMenus, setExpandedMenus] = useState({});

    const toggleMenu = (menuKey) => {
        setExpandedMenus(prev => ({
            ...prev,
            [menuKey]: !prev[menuKey]
        }));
    };

    const menuItems = [
        {
            key: 'dashboard',
            label: '대시보드',
            icon: ChartBarIcon,
            path: '/dashboard'
        },
        {
            key: 'chat',
            label: '채팅 관리',
            icon: ChatBubbleLeftRightIcon,
            path: '/chat-admin'
        },
        {
            key: 'content',
            label: '콘텐츠 관리',
            icon: PhotoIcon,
            path: '/content'
        },
        {
            key: 'users',
            label: '사용자 관리',
            icon: UserGroupIcon,
            children: [
                { label: '사용자 정보 조회 및 수정', path: '/users/info' },
                { label: '레벨업 시스템 관리', path: '/users/level' },
                { label: '초대 및 레퍼럴 시스템 관리', path: '/users/referral' }
            ]
        },
        {
            key: 'trading',
            label: '거래 관리',
            icon: Cog6ToothIcon,
            children: [
                { label: '리워드 시스템', path: '/quantpage' },
                { label: '팀 리더보드', path: '/quantrank' },
                { label: '재무 관리', path: '/wallet-admin' }
            ]
        },
        {
            key: 'tokens',
            label: '토큰 관리',
            icon: CubeIcon,
            children: [
                { label: '토큰', path: '/token' },
                { label: '토큰 판매 관리', path: '/tokensales' },
                { label: '토큰 구매/환매 내역', path: '/tokenlogs' }
            ]
        },
        {
            key: 'rewards',
            label: '보상센터',
            icon: GiftIcon,
            children: [
                { label: '초대 보상 관리', path: '/invite-rewards' },
                { label: '가입 보상 관리', path: '/admin-rewards' }
            ]
        },
        {
            key: 'wallet',
            label: '지갑 관리',
            icon: WalletIcon,
            children: [
                { label: '입금 관리', path: '/wallet-deposits' },
                { label: '출금 관리', path: '/wallet-withdraw' },
                { label: '지갑 관리', path: '/wallet-withdrawals' },
                { label: '이더리움 지갑 관리', path: '/bnb-wallet' },
                { label: '출입금 수수료 및 기타설정', path: '/wallet-settings' }
            ]
        },
        {
            key: 'notifications',
            label: '팝업 알림 관리',
            icon: BellIcon,
            path: '/popup'
        }
    ];

    const isActive = (path) => location.pathname === path;

    const MenuItem = ({ item, level = 0 }) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedMenus[item.key];
        const Icon = item.icon;

        if (hasChildren) {
            return (
                <div className="mb-1">
                    <button
                        onClick={() => toggleMenu(item.key)}
                        className={`
              w-full flex items-center justify-between rounded-lg text-sm font-medium transition-all duration-200
              hover:bg-gray-700 hover:text-white group
              ${isExpanded ? 'text-white bg-gray-700' : 'text-gray-300'}
              ${isCollapsed ? 'px-2 py-2' : 'px-3 py-2.5'}
            `}
                    >
                        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
                            <Icon className={`${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'} ${isExpanded ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`} />
                            {!isCollapsed && <span>{item.label}</span>}
                        </div>
                        {!isCollapsed && (
                            <ChevronRightIcon
                                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            />
                        )}
                    </button>

                    {!isCollapsed && isExpanded && (
                        <div className="ml-8 mt-1 space-y-1">
                            {item.children.map((child, index) => (
                                <Link
                                    key={index}
                                    to={child.path}
                                    onClick={() => isMobile && setIsMobileOpen(false)}
                                    className={`
                    block px-3 py-2 rounded-lg text-sm transition-all duration-200
                    ${isActive(child.path)
                                            ? 'text-blue-400 bg-blue-900/30 border-l-2 border-blue-400'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                        }
                  `}
                                >
                                    {child.label}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <Link
                to={item.path}
                onClick={() => isMobile && setIsMobileOpen(false)}
                className={`
          flex items-center rounded-lg text-sm font-medium transition-all duration-200
          hover:bg-gray-700 hover:text-white group mb-1
          ${isActive(item.path)
                        ? 'text-white bg-gray-700 border-l-2 border-blue-400'
                        : 'text-gray-300'
                    }
          ${isCollapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2.5 space-x-3'}
        `}
            >
                <Icon className={`${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'} ${isActive(item.path) ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`} />
                {!isCollapsed && <span>{item.label}</span>}
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobile && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
        fixed top-0 left-0 h-full bg-gray-900 border-r border-gray-700 z-50 transition-all duration-300
        ${isCollapsed ? 'w-14' : 'w-64'}
        ${isMobile ? (setIsMobileOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        lg:translate-x-0
      `}>
                {/* Header */}
                <div className={`flex items-center justify-between border-b border-gray-700 ${isCollapsed ? 'p-2' : 'p-4'}`}>
                    {!isCollapsed && (
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">A</span>
                            </div>
                            <span className="text-white font-semibold text-lg">Admin</span>
                        </div>
                    )}

                    {isCollapsed && (
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center mx-auto">
                            <span className="text-white font-bold text-xs">A</span>
                        </div>
                    )}

                    {/* Toggle Button */}
                    <button
                        onClick={() => {
                            if (isMobile) {
                                setIsMobileOpen(false);
                            } else {
                                setIsCollapsed(!isCollapsed);
                            }
                        }}
                        className={`rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors ${isCollapsed ? 'p-1' : 'p-2'}`}
                    >
                        {isMobile ? (
                            <XMarkIcon className="h-5 w-5" />
                        ) : (
                            isCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-5 w-5" />
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className={`flex-1 space-y-1 overflow-y-auto ${isCollapsed ? 'p-2' : 'p-4'}`}>
                    {menuItems.map((item) => (
                        <MenuItem key={item.key} item={item} />
                    ))}
                </nav>

                {/* Footer */}
                <div className={`border-t border-gray-700 ${isCollapsed ? 'p-2' : 'p-4'}`}>
                    <button
                        onClick={onLogout}
                        className={`
              w-full flex items-center rounded-lg text-sm font-medium text-gray-300 hover:bg-red-900/30 hover:text-red-400 transition-all duration-200 group
              ${isCollapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2.5 space-x-3'}
            `}
                    >
                        <ArrowRightOnRectangleIcon className={`${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'} text-gray-400 group-hover:text-red-400`} />
                        {!isCollapsed && <span>로그아웃</span>}
                    </button>
                </div>
            </div>
        </>
    );
}
