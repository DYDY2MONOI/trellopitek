import React, { useState } from 'react';
import { PageHeader, PageContent } from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import './SettingsPage.css';

/**
 * Settings Page - User preferences and account settings
 */
function SettingsPage({ user, theme, onToggleTheme, onLogout }) {
    const [activeTab, setActiveTab] = useState('profile');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Form state for profile
    const [displayName, setDisplayName] = useState(user?.email?.split('@')[0] || '');
    const [email] = useState(user?.email || '');

    const handleSaveProfile = async () => {
        setSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: '👤' },
        { id: 'appearance', label: 'Appearance', icon: '🎨' },
        { id: 'notifications', label: 'Notifications', icon: '🔔' },
        { id: 'security', label: 'Security', icon: '🔒' },
    ];

    return (
        <>
            <PageHeader
                title="Settings"
                description="Manage your account preferences and workspace settings."
                kicker="Configuration"
            />
            <PageContent>
                <div className="settings-layout">
                    {/* Sidebar Navigation */}
                    <nav className="settings-nav">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`settings-nav__item ${activeTab === tab.id ? 'settings-nav__item--active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className="settings-nav__icon">{tab.icon}</span>
                                <span className="settings-nav__label">{tab.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Content Area */}
                    <div className="settings-content">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <Card className="settings-card">
                                <CardHeader>
                                    <CardTitle>Profile Settings</CardTitle>
                                    <CardDescription>Update your personal information</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="settings-form">
                                        {/* Avatar Section */}
                                        <div className="settings-avatar-section">
                                            <Avatar
                                                alt={user?.email}
                                                fallback={user?.email?.slice(0, 2)?.toUpperCase()}
                                                size="lg"
                                            />
                                            <div className="settings-avatar-info">
                                                <h4>{displayName || 'Your Name'}</h4>
                                                <p>{email}</p>
                                                <Button variant="outline" size="sm">
                                                    Change avatar
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Form Fields */}
                                        <div className="settings-field">
                                            <label className="settings-field__label">Display Name</label>
                                            <Input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                placeholder="Enter your display name"
                                            />
                                        </div>

                                        <div className="settings-field">
                                            <label className="settings-field__label">Email Address</label>
                                            <Input
                                                type="email"
                                                value={email}
                                                disabled
                                                placeholder="Email address"
                                            />
                                            <span className="settings-field__hint">
                                                Email cannot be changed. Contact support for assistance.
                                            </span>
                                        </div>

                                        <div className="settings-actions">
                                            <Button
                                                variant="primary"
                                                onClick={handleSaveProfile}
                                                loading={saving}
                                                disabled={saving}
                                            >
                                                {saved ? '✓ Saved!' : 'Save Changes'}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Appearance Tab */}
                        {activeTab === 'appearance' && (
                            <Card className="settings-card">
                                <CardHeader>
                                    <CardTitle>Appearance</CardTitle>
                                    <CardDescription>Customize how Epitrello looks</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="settings-form">
                                        {/* Theme Selector */}
                                        <div className="settings-field">
                                            <label className="settings-field__label">Theme</label>
                                            <div className="theme-selector">
                                                <button
                                                    className={`theme-option ${theme === 'light' ? 'theme-option--active' : ''}`}
                                                    onClick={() => theme !== 'light' && onToggleTheme()}
                                                >
                                                    <span className="theme-option__icon">☀️</span>
                                                    <span className="theme-option__label">Light</span>
                                                    <span className="theme-option__preview theme-option__preview--light" />
                                                </button>
                                                <button
                                                    className={`theme-option ${theme === 'dark' ? 'theme-option--active' : ''}`}
                                                    onClick={() => theme !== 'dark' && onToggleTheme()}
                                                >
                                                    <span className="theme-option__icon">🌙</span>
                                                    <span className="theme-option__label">Dark</span>
                                                    <span className="theme-option__preview theme-option__preview--dark" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Density Option */}
                                        <div className="settings-field">
                                            <label className="settings-field__label">Display Density</label>
                                            <div className="density-options">
                                                <button className="density-option density-option--active">
                                                    <span>Comfortable</span>
                                                </button>
                                                <button className="density-option">
                                                    <span>Compact</span>
                                                </button>
                                            </div>
                                            <span className="settings-field__hint">
                                                Controls spacing throughout the interface
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === 'notifications' && (
                            <Card className="settings-card">
                                <CardHeader>
                                    <CardTitle>Notifications</CardTitle>
                                    <CardDescription>Control how you receive updates</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="settings-form">
                                        <div className="notification-options">
                                            <div className="notification-option">
                                                <div className="notification-option__info">
                                                    <strong>Email notifications</strong>
                                                    <p>Receive updates about board activity via email</p>
                                                </div>
                                                <label className="toggle-switch">
                                                    <input type="checkbox" defaultChecked />
                                                    <span className="toggle-switch__slider" />
                                                </label>
                                            </div>

                                            <div className="notification-option">
                                                <div className="notification-option__info">
                                                    <strong>Card assignments</strong>
                                                    <p>Get notified when you're assigned to a card</p>
                                                </div>
                                                <label className="toggle-switch">
                                                    <input type="checkbox" defaultChecked />
                                                    <span className="toggle-switch__slider" />
                                                </label>
                                            </div>

                                            <div className="notification-option">
                                                <div className="notification-option__info">
                                                    <strong>Comments & mentions</strong>
                                                    <p>Get notified when someone mentions you</p>
                                                </div>
                                                <label className="toggle-switch">
                                                    <input type="checkbox" defaultChecked />
                                                    <span className="toggle-switch__slider" />
                                                </label>
                                            </div>

                                            <div className="notification-option">
                                                <div className="notification-option__info">
                                                    <strong>Due date reminders</strong>
                                                    <p>Receive reminders before cards are due</p>
                                                </div>
                                                <label className="toggle-switch">
                                                    <input type="checkbox" />
                                                    <span className="toggle-switch__slider" />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <Card className="settings-card">
                                <CardHeader>
                                    <CardTitle>Security</CardTitle>
                                    <CardDescription>Manage your account security</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="settings-form">
                                        <div className="security-section">
                                            <h4>Password</h4>
                                            <p>Change your password to keep your account secure</p>
                                            <Button variant="outline">Change Password</Button>
                                        </div>

                                        <div className="security-section">
                                            <h4>Active Sessions</h4>
                                            <p>Manage devices where you're currently logged in</p>
                                            <div className="session-list">
                                                <div className="session-item session-item--current">
                                                    <span className="session-item__icon">💻</span>
                                                    <div className="session-item__info">
                                                        <strong>Current Session</strong>
                                                        <p>This device • Active now</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="security-section security-section--danger">
                                            <h4>Danger Zone</h4>
                                            <p>Irreversible and destructive actions</p>
                                            <div className="danger-actions">
                                                <Button variant="outline" onClick={onLogout}>
                                                    Log out everywhere
                                                </Button>
                                                <Button variant="destructive">
                                                    Delete Account
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </PageContent>
        </>
    );
}

export default SettingsPage;
