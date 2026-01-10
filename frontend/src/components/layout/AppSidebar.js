import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { ProgressCircle } from '../ui/ProgressCircle';
import { SearchInput } from '../ui/Input';
import './AppSidebar.css';

// Icons (using inline SVG for simplicity)
const Icons = {
    Inbox: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
    ),
    CheckSquare: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
    ),
    Folder: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
    ),
    Users: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    ChartBar: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
    ),
    Settings: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    ),
    Layout: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
    ),
    Help: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    ChevronRight: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    ),
    ChevronUpDown: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="7 15 12 20 17 15" />
            <polyline points="7 9 12 4 17 9" />
        </svg>
    ),
    MoreHorizontal: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
        </svg>
    ),
    Home: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    ),
};

// Navigation items
const navItems = [
    { id: 'inbox', label: 'Inbox', icon: Icons.Inbox, badge: 3 },
    { id: 'my-tasks', label: 'My Tasks', icon: Icons.CheckSquare, badge: null },
    { id: 'boards', label: 'Boards', icon: Icons.Folder, path: '/user/boards' },
    { id: 'members', label: 'Members', icon: Icons.Users, badge: null },
    { id: 'analytics', label: 'Analytics', icon: Icons.ChartBar, badge: null },
];

const footerItems = [
    { id: 'settings', label: 'Settings', icon: Icons.Settings },
    { id: 'templates', label: 'Templates', icon: Icons.Layout, path: '/user/boards/templates' },
    { id: 'help', label: 'Help & Support', icon: Icons.Help },
];

/**
 * App Sidebar Component - Like project-dashboard
 */
export function AppSidebar({
    user,
    boards = [],
    onLogout,
    onToggleTheme,
    theme = 'light',
    collapsed = false,
    onToggleCollapse,
}) {
    const navigate = useNavigate();
    const location = useLocation();

    // Active projects - take first 5 boards with fake progress
    const activeProjects = boards.slice(0, 5).map((board, idx) => ({
        id: board.id,
        name: board.title,
        progress: Math.floor(Math.random() * 100),
        color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'][idx % 5],
    }));

    const isActive = (path) => {
        if (path === '/user/boards') {
            return location.pathname === '/user/boards' || location.pathname.startsWith('/user/boards/');
        }
        return location.pathname === path;
    };

    return (
        <aside className={`app-sidebar ${collapsed ? 'app-sidebar--collapsed' : ''}`}>
            {/* Header - Workspace */}
            <div className="sidebar-header">
                <div className="sidebar-header__workspace">
                    <div className="workspace-logo">
                        <span className="workspace-logo__text">EP</span>
                    </div>
                    <div className="workspace-info">
                        <span className="workspace-info__name">Workspace</span>
                        <span className="workspace-info__plan">Pro plan</span>
                    </div>
                </div>
                <button className="sidebar-header__toggle" onClick={onToggleCollapse}>
                    <Icons.ChevronUpDown />
                </button>
            </div>

            {/* Search */}
            <div className="sidebar-search">
                <SearchInput placeholder="Search" />
                <kbd className="sidebar-search__kbd">⌘K</kbd>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <ul className="sidebar-nav__list">
                    {navItems.map((item) => {
                        const ItemIcon = item.icon;
                        const active = item.path ? isActive(item.path) : false;
                        return (
                            <li key={item.id}>
                                <button
                                    className={`sidebar-nav__item ${active ? 'sidebar-nav__item--active' : ''}`}
                                    onClick={() => item.path && navigate(item.path)}
                                >
                                    <ItemIcon />
                                    <span className="sidebar-nav__label">{item.label}</span>
                                    {item.badge && (
                                        <span className="sidebar-nav__badge">{item.badge}</span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Active Projects */}
            {activeProjects.length > 0 && (
                <div className="sidebar-section">
                    <h3 className="sidebar-section__title">Active Projects</h3>
                    <ul className="sidebar-projects">
                        {activeProjects.map((project) => (
                            <li key={project.id}>
                                <button
                                    className="sidebar-project"
                                    onClick={() => navigate(`/user/boards/${project.id}`)}
                                >
                                    <ProgressCircle
                                        progress={project.progress}
                                        size={18}
                                        strokeWidth={2}
                                        color={project.color}
                                    />
                                    <span className="sidebar-project__name">{project.name}</span>
                                    <span className="sidebar-project__more">
                                        <Icons.MoreHorizontal />
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Spacer */}
            <div className="sidebar-spacer" />

            {/* Footer Navigation */}
            <nav className="sidebar-footer-nav">
                <ul className="sidebar-nav__list">
                    {footerItems.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                            <li key={item.id}>
                                <button
                                    className="sidebar-nav__item"
                                    onClick={() => item.path && navigate(item.path)}
                                >
                                    <ItemIcon />
                                    <span className="sidebar-nav__label">{item.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Theme Toggle */}
            <button className="sidebar-theme-toggle" onClick={onToggleTheme}>
                {theme === 'light' ? '🌙 Dark mode' : '☀️ Light mode'}
            </button>

            {/* User Profile */}
            {user && (
                <div className="sidebar-user">
                    <Avatar
                        alt={user.email}
                        fallback={user.email?.slice(0, 2)}
                        size="default"
                    />
                    <div className="sidebar-user__info">
                        <span className="sidebar-user__name">{user.email?.split('@')[0] || 'User'}</span>
                        <span className="sidebar-user__email">{user.email}</span>
                    </div>
                    <button className="sidebar-user__action" onClick={onLogout}>
                        <Icons.ChevronRight />
                    </button>
                </div>
            )}
        </aside>
    );
}

export default AppSidebar;
