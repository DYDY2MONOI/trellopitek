import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

// Design System & Components
import './index.css';
import './App.css';

// Layout Components
import { AppSidebar } from './components/layout/AppSidebar';
import { MainLayout, PageHeader, PageContent } from './components/layout/MainLayout';
import { Button } from './components/ui/Button';
import { SearchInput } from './components/ui/Input';
import { Card, CardContent } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { Avatar, AvatarGroup } from './components/ui/Avatar';
import { ClipboardIcon, ZapIcon, BarChartIcon, SunIcon, MoonIcon, UsersIcon } from './components/ui/Icons';

// Pages
import BoardsPage from './pages/BoardsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

// Services
import { getAuthToken, setAuthToken, api } from './services/api';

// Auth Components
import Login from './components/Login';
import Register from './components/Register';

// Constants
const THEME_STORAGE_KEY = 'epitrello-theme';

const getStoredTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
};

// ============ Main App ============
function App() {
  const [theme, setTheme] = useState(() => getStoredTheme());
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState(null);
  const [authTokenState, setAuthTokenState] = useState(() => getAuthToken());
  const [boards, setBoards] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Theme handling
  useEffect(() => {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      // Ignore storage errors
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // JWT decode helper
  const decodeJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  // Verify token on mount
  useEffect(() => {
    const savedToken = getAuthToken();
    if (savedToken) {
      setAuthTokenState(savedToken);
      const claims = decodeJwt(savedToken);
      if (claims && claims.email) {
        setUser({ id: claims.user_id, email: claims.email });
        setIsAuthenticated(true);
      }
      verifyToken(savedToken);
    }
  }, []);

  const verifyToken = async (authToken) => {
    try {
      const userData = await api.getMe(authToken);
      setUser(userData);
      setIsAuthenticated(true);
      setAuthTokenState(authToken);
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        setAuthToken(null);
        setAuthTokenState(null);
        setIsAuthenticated(false);
      }
    }
  };

  // Fetch boards when authenticated
  useEffect(() => {
    if (!authTokenState) {
      setBoards([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getBoards(authTokenState);
        if (!cancelled) setBoards(data || []);
      } catch (e) {
        // Silently fail
      }
    })();
    return () => { cancelled = true; };
  }, [authTokenState]);

  // Auth handlers
  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setIsAuthenticated(true);
    setAuthView(null);
    setAuthTokenState(authToken);
    navigate('/user/boards');
  };

  const handleRegister = (userData, authToken) => {
    setUser(userData);
    setIsAuthenticated(true);
    setAuthView(null);
    setAuthTokenState(authToken);
    navigate('/user/boards');
  };

  const handleLogout = () => {
    setAuthToken(null);
    setAuthTokenState(null);
    setUser(null);
    setIsAuthenticated(false);
    setBoards([]);
    navigate('/');
  };

  const openLoginPage = () => setAuthView('login');
  const openRegisterPage = () => setAuthView('register');
  const closeAuthPage = () => setAuthView(null);

  // Check if we're in the app section (needs sidebar)
  const isAppSection = location.pathname.startsWith('/user/');

  // Auth pages (Login/Register)
  if (!isAuthenticated && authView) {
    return (
      <div className="auth-wrapper">
        <div className="auth-container">
          <button
            className="auth-back-btn"
            onClick={closeAuthPage}
          >
            ← Back to home
          </button>
          {authView === 'login' ? (
            <Login onLogin={handleLogin} onSwitchToRegister={openRegisterPage} />
          ) : (
            <Register onRegister={handleRegister} onSwitchToLogin={openLoginPage} />
          )}
        </div>
      </div>
    );
  }

  // App section with sidebar
  if (isAppSection) {
    return (
      <MainLayout
        className={sidebarCollapsed ? 'main-layout--collapsed' : ''}
        sidebar={
          <AppSidebar
            user={user}
            boards={boards}
            onLogout={handleLogout}
            onToggleTheme={toggleTheme}
            theme={theme}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        }
      >
        <Routes>
          <Route
            path="/user/boards"
            element={
              <BoardsIndexPage
                authToken={authTokenState}
                boards={boards}
                setBoards={setBoards}
                user={user}
              />
            }
          />
          <Route
            path="/user/boards/:boardId"
            element={
              <BoardsPage authToken={authTokenState} user={user} />
            }
          />
          <Route
            path="/user/boards/templates"
            element={
              <TemplatesGalleryPage authToken={authTokenState} />
            }
          />
          <Route
            path="/user/analytics"
            element={<AnalyticsPage authToken={authTokenState} />}
          />
          <Route
            path="/user/settings"
            element={
              <SettingsPage
                user={user}
                theme={theme}
                onToggleTheme={toggleTheme}
                onLogout={handleLogout}
              />
            }
          />
          <Route path="*" element={<Navigate to="/user/boards" replace />} />
        </Routes>
      </MainLayout>
    );
  }

  // Landing page
  return (
    <div className="landing-wrapper">
      <LandingPage
        theme={theme}
        onToggleTheme={toggleTheme}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
        onLogin={openLoginPage}
        onRegister={openRegisterPage}
        onGoToBoards={() => navigate('/user/boards')}
      />
    </div>
  );
}

// ============ Landing Page ============
function LandingPage({
  theme,
  onToggleTheme,
  isAuthenticated,
  user,
  onLogout,
  onLogin,
  onRegister,
  onGoToBoards
}) {
  const features = [
    {
      title: 'Boards that adapt',
      description: 'Track work across teams with flexible lists, swimlanes, and checklists tailored to your process.',
      icon: <ClipboardIcon size={28} />,
    },
    {
      title: 'Automations built-in',
      description: 'Let rules move cards, send updates, and keep everyone aligned without manual effort.',
      icon: <ZapIcon size={28} />,
    },
    {
      title: 'Insights at a glance',
      description: 'Surface workloads, blockers, and trends instantly with dashboards driven by live board data.',
      icon: <BarChartIcon size={28} />,
    },
  ];

  return (
    <>
      {/* Header */}
      <header className="landing-header">
        <div className="landing-header__brand">
          <div className="landing-logo">
            <span>EP</span>
          </div>
          <span className="landing-brand-name">Epitrello</span>
        </div>

        <nav className="landing-nav">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <div className="landing-header__actions">
          <Button variant="ghost" size="sm" onClick={onToggleTheme}>
            {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
          </Button>
          {isAuthenticated ? (
            <>
              <span className="landing-user-email">{user?.email}</span>
              <Button variant="ghost" onClick={onLogout}>Log out</Button>
              <Button variant="primary" onClick={onGoToBoards}>Go to Boards</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onLogin}>Log in</Button>
              <Button variant="primary" onClick={onRegister}>Sign up</Button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero__content">
          <Badge variant="primary" size="lg">Project orchestration</Badge>
          <h1>Organize work the<br />Epitrello way.</h1>
          <p>
            Build boards that keep every teammate aligned. Capture ideas, automate the busy work,
            and ship faster with a visual workspace inspired by Kanban.
          </p>
          <div className="landing-hero__actions">
            <Button variant="primary" size="lg" onClick={isAuthenticated ? onGoToBoards : onRegister}>
              {isAuthenticated ? 'Go to Boards' : 'Start your board'}
            </Button>
            <Button variant="outline" size="lg">Watch demo</Button>
          </div>
          <div className="landing-hero__meta">
            <AvatarGroup max={3}>
              <Avatar fallback="JD" size="default" />
              <Avatar fallback="AK" size="default" />
              <Avatar fallback="MR" size="default" />
              <Avatar fallback="TS" size="default" />
            </AvatarGroup>
            <p><strong>250k+</strong> teams ship deliverables with Epitrello every week.</p>
          </div>
        </div>

        <div className="landing-hero__preview">
          <BoardPreview />
        </div>
      </section>

      {/* Features */}
      <section className="landing-features" id="features">
        <h2>Built for modern teams</h2>
        <div className="landing-features__grid">
          {features.map((feature) => (
            <Card key={feature.title} hoverable className="landing-feature-card">
              <CardContent>
                <span className="landing-feature-icon">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <Button variant="link">Learn more →</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta" id="pricing">
        <div className="landing-cta__content">
          <h2>Power up your teamwork today.</h2>
          <p>
            Start free, upgrade when you need advanced security, admin controls, and workspace insights.
          </p>
        </div>
        <div className="landing-cta__actions">
          <Button variant="primary" size="lg" onClick={isAuthenticated ? onGoToBoards : onRegister}>
            Create free account
          </Button>
          <Button variant="outline" size="lg">Compare plans</Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} Epitrello. Inspired by the Kanban method.</p>
        <div className="landing-footer__links">
          <a href="/status">Status</a>
          <a href="/docs">Docs</a>
          <a href="/support">Support</a>
        </div>
      </footer>
    </>
  );
}

// ============ Board Preview (for landing page) ============
function BoardPreview() {
  const columns = [
    { title: 'Ideas', color: 'accent', cards: ['Launch landing page', 'Create onboarding flow'] },
    { title: 'In Progress', color: 'primary', cards: ['Design sprint planning', 'User feedback'] },
    { title: 'Review', color: 'warning', cards: ['QA automation suite'] },
    { title: 'Done', color: 'success', cards: ['Team retrospective', 'Release v1.4.2'] },
  ];

  return (
    <div className="board-preview">
      <div className="board-preview__header">
        <div className="board-preview__dots">
          <span className="dot dot--red" />
          <span className="dot dot--yellow" />
          <span className="dot dot--green" />
        </div>
        <span className="board-preview__title">My Project Board</span>
      </div>
      <div className="board-preview__content">
        {columns.map((col) => (
          <div key={col.title} className={`preview-column preview-column--${col.color}`}>
            <div className="preview-column__header">
              <span className="preview-column__dot" />
              <span>{col.title}</span>
              <span className="preview-column__count">{col.cards.length}</span>
            </div>
            <div className="preview-column__cards">
              {col.cards.map((card, i) => (
                <div key={i} className="preview-card">
                  <Badge variant={col.color} size="sm">{col.title}</Badge>
                  <p>{card}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Boards Index Page ============
function BoardsIndexPage({ authToken, boards, setBoards, user }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authToken) {
      setBoards([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await api.getBoards(authToken);
        if (!cancelled) setBoards(data || []);
      } catch (e) {
        if (!cancelled) setError('Unable to load boards.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authToken, setBoards]);

  const templates = [
    { title: 'Kanban', desc: 'Ideas → Doing → Done', colorClass: 'template-card--purple' },
    { title: 'Sprint Planning', desc: 'Backlog → Sprint → QA', colorClass: 'template-card--teal' },
    { title: 'Bug Triage', desc: 'New → Investigating → Fixing', colorClass: 'template-card--orange' },
  ];

  if (!authToken) {
    return (
      <>
        <PageHeader
          title="Boards"
          description="Please log in to access your boards."
          kicker="Your workspace"
        />
        <PageContent>
          <div className="boards-empty-state">
            <p>Log in to get started with your boards.</p>
          </div>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Boards"
        description="Group projects, plan sprints, or manage personal to-dos – all in one place."
        kicker="Your workspace"
        actions={
          <>
            <SearchInput placeholder="Search boards" disabled />
            <Button variant="primary" onClick={() => navigate('/user/boards/templates')}>
              + New board
            </Button>
          </>
        }
      />
      <PageContent>
        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="boards-loading">
            <div className="app-loading__spinner" />
            <p>Loading boards...</p>
          </div>
        ) : (
          <>
            {/* Your boards section */}
            <section className="boards-section">
              <div className="boards-section__header">
                <h3>Your boards</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/user/boards/templates')}>
                  Browse templates
                </Button>
              </div>

              {boards.length === 0 ? (
                <div className="boards-empty-state">
                  <p>No boards yet. Create one to get started!</p>
                  <Button variant="primary" onClick={() => navigate('/user/boards/templates')}>
                    Create your first board
                  </Button>
                </div>
              ) : (
                <>
                  {/* Owned boards */}
                  <div className="boards-grid">
                    {boards.filter(b => b.user_id === (user?.id)).map((board, idx) => (
                      <Card
                        key={board.id}
                        hoverable
                        className={`board-card board-card--accent-${idx % 6}`}
                        onClick={() => navigate(`/user/boards/${board.id}`)}
                      >
                        <CardContent>
                          <h4 className="board-card__title">{board.title}</h4>
                          <p className="board-card__meta">
                            Created {new Date(board.created_at).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Shared boards */}
                  {boards.filter(b => b.user_id !== (user?.id)).length > 0 && (
                    <>
                      <div className="boards-section__header" style={{ marginTop: '24px' }}>
                        <h3>Shared with me</h3>
                      </div>
                      <div className="boards-grid">
                        {boards.filter(b => b.user_id !== (user?.id)).map((board, idx) => (
                          <Card
                            key={board.id}
                            hoverable
                            className={`board-card board-card--accent-${(idx + 3) % 6}`}
                            onClick={() => navigate(`/user/boards/${board.id}`)}
                          >
                            <CardContent>
                              <h4 className="board-card__title">{board.title}</h4>
                              <p className="board-card__meta">
                                Created {new Date(board.created_at).toLocaleDateString()}
                              </p>
                              <span className="board-card__shared-badge"><UsersIcon size={14} /> Shared</span>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </section>

            {/* Templates section */}
            <section className="boards-section">
              <div className="boards-section__header">
                <h3>Popular templates</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/user/boards/templates')}>
                  View gallery
                </Button>
              </div>
              <div className="templates-grid">
                {templates.map((tpl) => (
                  <div
                    key={tpl.title}
                    className={`template-card ${tpl.colorClass}`}
                  >
                    <div className="template-card__content">
                      <h4>{tpl.title}</h4>
                      <p>{tpl.desc}</p>
                    </div>
                    <Button
                      variant="ghost"
                      className="template-card__btn"
                      onClick={() => navigate('/user/boards/templates')}
                    >
                      Explore
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </PageContent>
    </>
  );
}

// ============ Templates Gallery Page ============
function TemplatesGalleryPage({ authToken }) {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [namingTemplate, setNamingTemplate] = useState(null);
  const [boardName, setBoardName] = useState('');

  const handleUseTemplate = async () => {
    if (!authToken) {
      setError('Please log in first.');
      return;
    }
    const name = boardName.trim();
    if (!name) {
      setError('Please enter a board name.');
      return;
    }
    try {
      setCreating(true);
      const board = await api.createBoard(name, authToken);
      navigate(`/user/boards/${board.id}`);
    } catch {
      setError('Unable to create board from template.');
    } finally {
      setCreating(false);
    }
  };

  const handleStartNaming = (tpl) => {
    setNamingTemplate(tpl.title);
    setBoardName(tpl.title);
    setError(null);
  };

  const handleCancelNaming = () => {
    setNamingTemplate(null);
    setBoardName('');
    setError(null);
  };

  const templates = [
    { title: 'Kanban', desc: 'Ideas → Doing → Review → Done', colorClass: 'template-card--purple' },
    { title: 'Sprint Planning', desc: 'Backlog → Sprint → QA → Retro', colorClass: 'template-card--teal' },
    { title: 'Bug Triage', desc: 'New → Investigating → Fixing → Release', colorClass: 'template-card--orange' },
    { title: 'Personal Tasks', desc: 'Today → This week → Someday', colorClass: 'template-card--cyan' },
  ];

  return (
    <>
      <PageHeader
        title="Pick a head start"
        description="Choose a template to spin up a new board instantly."
        kicker="Templates"
        actions={
          <Button variant="ghost" onClick={() => navigate('/user/boards')}>
            ← Back to boards
          </Button>
        }
      />
      <PageContent>
        {error && <div className="error-banner">{error}</div>}

        <div className="templates-gallery">
          {templates.map((tpl) => (
            <div
              key={tpl.title}
              className={`template-gallery-card ${tpl.colorClass}`}
            >
              <div className="template-gallery-card__content">
                <h3>{tpl.title}</h3>
                <p>{tpl.desc}</p>
              </div>
              {namingTemplate === tpl.title ? (
                <div className="template-naming">
                  <input
                    className="template-naming__input"
                    type="text"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUseTemplate();
                      if (e.key === 'Escape') handleCancelNaming();
                    }}
                    placeholder="Enter board name..."
                    autoFocus
                  />
                  <div className="template-naming__actions">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleUseTemplate}
                      disabled={!boardName.trim() || creating}
                      loading={creating}
                    >
                      Create
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelNaming}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => handleStartNaming(tpl)}
                  disabled={!authToken || creating}
                >
                  Use template
                </Button>
              )}
            </div>
          ))}
        </div>
      </PageContent>
    </>
  );
}

// ============ App with Router ============
export default function AppWithRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}
