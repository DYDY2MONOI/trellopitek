import { useEffect, useState } from 'react';
import './App.css';
import LogoLoop from './components/LogoLoop';
import Login from './components/Login';
import Register from './components/Register';
import Icon from './components/Icon';
import {
  VisaLogo,
  CoinbaseLogo,
  ZoomLogo,
  StripeLogo,
  GitHubLogo,
  MicrosoftLogo,
  SlackLogo,
  AtlassianLogo
} from './components/CompanyLogos';
import { getAuthToken, setAuthToken, api } from './services/api';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import BoardsPage from './pages/BoardsPage';

const boardColumns = [
  {
    title: 'Ideas',
    accent: 'accent',
    cards: [
      { id: 1, title: 'Launch landing page', badge: 'Marketing', color: 'primary' },
      { id: 2, title: 'Create onboarding flow', badge: 'Product', color: 'accent' }
    ]
  },
  {
    title: 'In Progress',
    accent: 'primary',
    cards: [
      { id: 3, title: 'Design sprint planning', badge: 'Design', color: 'accent' },
      { id: 4, title: 'User feedback interviews', badge: 'Research', color: 'success' }
    ]
  },
  {
    title: 'Review',
    accent: 'warning',
    cards: [
      { id: 5, title: 'QA automation suite', badge: 'QA', color: 'warning' }
    ]
  },
  {
    title: 'Done',
    accent: 'success',
    cards: [
      { id: 6, title: 'Team retrospective', badge: 'Ops', color: 'success' },
      { id: 7, title: 'Release v1.4.2', badge: 'Release', color: 'primary' }
    ]
  }
];

const featureHighlights = [
  {
    title: 'Boards that adapt',
    description: 'Track work across teams with flexible lists, swimlanes, and checklists tailored to your process.'
  },
  {
    title: 'Automations built-in',
    description: 'Let rules move cards, send updates, and keep everyone aligned without manual effort.'
  },
  {
    title: 'Insights at a glance',
    description: 'Surface workloads, blockers, and trends instantly with dashboards driven by live board data.'
  }
];

const THEME_STORAGE_KEY = 'trellomirror-theme';

const getStoredTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
};

const companyLogos = [
  { 
    node: <VisaLogo />,
    title: 'Visa',
    href: 'https://www.visa.com'
  },
  { 
    node: <CoinbaseLogo />,
    title: 'Coinbase',
    href: 'https://www.coinbase.com'
  },
  { 
    node: <ZoomLogo />,
    title: 'Zoom',
    href: 'https://zoom.us'
  },
  { 
    node: <StripeLogo />,
    title: 'Stripe',
    href: 'https://stripe.com'
  },
  { 
    node: <GitHubLogo />,
    title: 'GitHub',
    href: 'https://github.com'
  },
  { 
    node: <MicrosoftLogo />,
    title: 'Microsoft',
    href: 'https://www.microsoft.com'
  },
  { 
    node: <SlackLogo />,
    title: 'Slack',
    href: 'https://slack.com'
  },
  { 
    node: <AtlassianLogo />,
    title: 'Atlassian',
    href: 'https://www.atlassian.com'
  }
];

function App() {
  const [theme, setTheme] = useState(() => getStoredTheme());
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState(null);
  const [authTokenState, setAuthTokenState] = useState(() => getAuthToken());
  const [columns] = useState(boardColumns);
  const navigate = useNavigate();
  const location = useLocation();
  const onBoardsRoute = location.pathname.startsWith('/user/boards');

  useEffect(() => {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
    }
  }, [theme]);

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
      const { api } = await import('./services/api');
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

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setIsAuthenticated(true);
    setAuthView(null);
    setAuthTokenState(authToken);
  };

  const handleRegister = (userData, authToken) => {
    setUser(userData);
    setIsAuthenticated(true);
    setAuthView(null);
    setAuthTokenState(authToken);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setAuthTokenState(null);
    setUser(null);
    setIsAuthenticated(false);
    setAuthView('login');
  };

  const openLoginPage = () => setAuthView('login');
  const openRegisterPage = () => setAuthView('register');
  const closeAuthPage = () => setAuthView(null);

  if (!isAuthenticated && authView) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden>EP</span>
            <span className="brand-name">Epitrello</span>
          </div>
          <nav className="nav-links">
            <Link to="/boards" className="ghost-button" style={{ textDecoration: 'none' }}>Boards</Link>
            <a href="#product">Product</a>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing</a>
            <a href="#resources">Resources</a>
          </nav>
          <div className="topbar-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            >
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
            <button type="button" className="ghost-button" onClick={closeAuthPage}>
              Back to site
            </button>
          </div>
        </header>
        <main className="auth-page">
          {authView === 'login' ? (
            <Login onLogin={handleLogin} onSwitchToRegister={openRegisterPage} />
          ) : (
            <Register onRegister={handleRegister} onSwitchToLogin={openLoginPage} />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {!onBoardsRoute && (
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden>EP</span>
            <span className="brand-name">Epitrello</span>
          </div>
          <nav className="nav-links">
            <Link to="/user/boards" className="ghost-button" style={{ textDecoration: 'none' }}>Boards</Link>
            <a href="#product">Product</a>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing</a>
            <a href="#resources">Resources</a>
          </nav>
          <div className="topbar-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            >
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
            {isAuthenticated ? (
              <>
                {user && (
                  <span className="user-email" style={{ marginRight: '1rem', opacity: 0.8 }}>
                    {user.email}
                  </span>
                )}
                <button type="button" className="ghost-button" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <button type="button" className="ghost-button" onClick={openLoginPage}>
                  Log in
                </button>
                <button type="button" className="primary-button" onClick={openRegisterPage}>
                  Sign up
                </button>
              </>
            )}
          </div>
        </header>
      )}

      <Routes>
        <Route
          path="/"
          element={
            <MarketingLanding
              columns={columns}
              onStartBoard={() => navigate('/user/boards')}
            />
          }
        />
        <Route
          path="/user/boards"
          element={
            <BoardsIndexPage
              authToken={authTokenState}
              theme={theme}
              onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            />
          }
        />
        <Route
          path="/user/boards/:boardId"
          element={<BoardRoute authToken={authTokenState} />}
        />
        <Route
          path="/user/boards/templates"
          element={
            <TemplatesGalleryPage
              theme={theme}
              onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              authToken={authTokenState}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <footer className="footer" id="resources">
        <p>© {new Date().getFullYear()} Epitrello. Inspired by the Kanban method.</p>
        <div className="footer-links">
          <a href="/status">Status</a>
          <a href="/docs">Docs</a>
          <a href="/support">Support</a>
        </div>
      </footer>
    </div>
  );
}

export default function AppWithRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}

function MarketingLanding({ columns, onStartBoard }) {
  return (
    <main className="page">
      <section className="hero" id="product">
        <div className="hero-copy">
          <div className="section-label">Project orchestration</div>
          <h1>Organize work the Epitrello way.</h1>
          <p>
            Build boards that keep every teammate aligned. Capture ideas, automate the busy work,
            and ship faster with a visual workspace inspired by Kanban.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={onStartBoard}>Start your board</button>
            <button type="button" className="ghost-button">Watch demo</button>
          </div>
          <div className="hero-meta">
            <span className="avatar-stack">
              <span className="avatar" aria-hidden>A</span>
              <span className="avatar" aria-hidden>B</span>
              <span className="avatar" aria-hidden>C</span>
            </span>
            <p><strong>250k+</strong> teams ship deliverables with Epitrello every week.</p>
          </div>
        </div>
        <div className="board-preview" aria-label="Trello style board preview">
          <div className="board">
            {columns.map((column) => (
              <article key={column.title} className={`board-column board-column--${column.accent}`}>
                <header className="column-header">
                  <span className="column-bullet" />
                  <h3>{column.title}</h3>
                  <span className="card-count">{column.cards.length}</span>
                </header>
                <div className="column-body">
                  {column.cards.map((card) => (
                    <div key={card.id} className="card">
                      <header className="card-header">
                        <span className={`badge badge--${card.color}`}>{card.badge}</span>
                      </header>
                      <p>{card.title}</p>
                      <footer className="card-footer">
                        <span className="card-checklist">
                          <Icon name="checklist" size={14} />
                          <span>3/5</span>
                        </span>
                        <span className="card-avatars">
                          <span className="mini-avatar" aria-hidden>JD</span>
                        </span>
                      </footer>
                    </div>
                  ))}
                </div>
                <button type="button" className="add-card">+ Add card</button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="features" id="solutions">
        {featureHighlights.map((feature) => (
          <article key={feature.title} className="feature-card">
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <button type="button" className="text-link">Learn more →</button>
          </article>
        ))}
      </section>

      <section className="logo-section">
        <h2 className="logo-section-title">They trust us</h2>
        <div className="logo-section-container">
          <LogoLoop
            logos={companyLogos}
            speed={80}
            direction="left"
            logoHeight={100}
            gap={64}
            pauseOnHover
            scaleOnHover
            fadeOut
            fadeOutColor="var(--color-bg)"
            ariaLabel="Trusted companies"
          />
        </div>
      </section>

      <section className="cta" id="pricing">
        <div className="cta-content">
          <h2>Power up your teamwork today.</h2>
          <p>
            Start free, upgrade when you need advanced security, admin controls, and workspace insights.
          </p>
        </div>
        <div className="cta-actions">
          <button type="button" className="primary-button">Create free account</button>
          <button type="button" className="ghost-button">Compare plans</button>
        </div>
      </section>
    </main>
  );
}

function BoardsIndexPage({ authToken, onToggleTheme, theme }) {
  const [boards, setBoards] = useState([]);
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
  }, [authToken]);

  const workspaceLinks = [
    { label: 'Boards', action: () => navigate('/user/boards') },
    { label: 'Templates', action: () => navigate('/user/boards/templates') },
    { label: 'Home', action: () => navigate('/') },
  ];

  const templatesPreview = [
    { title: 'Kanban launchpad', desc: 'Ideas → Doing → Done', gradient: 'linear-gradient(135deg,#a855f7,#3b82f6)' },
    { title: 'Weekly sprint', desc: 'Backlog → Sprint → QA', gradient: 'linear-gradient(135deg,#34d399,#0ea5e9)' },
    { title: 'Bug triage', desc: 'New → Investigating → Fixing', gradient: 'linear-gradient(135deg,#f97316,#facc15)' },
  ];

  return (
    <main className="boards-shell">
      <aside className="boards-nav">
        <div className="boards-nav-workspace">
          <span className="workspace-pill">EP</span>
          <div>
            <p className="boards-nav-label">Workspace</p>
            <p className="boards-nav-name">Epitrello</p>
          </div>
        </div>
        <div className="boards-nav-links">
          {workspaceLinks.map((link) => (
            <button type="button" key={link.label} onClick={link.action}>{link.label}</button>
          ))}
        </div>
        <div className="boards-nav-footer">
          <button type="button" className="ghost-button" onClick={onToggleTheme}>
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
      </aside>

      <section className="boards-content">
        <div className="boards-list-hero">
          <div>
            <p className="boards-list-kicker">Your workspace</p>
            <h1>Boards</h1>
            <p className="boards-list-subtitle">
              Group projects, plan sprints, or manage personal to-dos – all in one place.
            </p>
          </div>
          <div className="boards-list-hero-actions">
            <div className="boards-search">
              <input type="text" placeholder="Search boards" disabled />
            </div>
            <button type="button" className="primary-button" onClick={() => navigate('/user/boards/templates')} disabled={!authToken}>
              + New board
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!authToken ? (
          <div className="boards-list-empty">
            <h3>Please log in to access your boards.</h3>
          </div>
        ) : loading ? (
          <div className="boards-list-empty">
            <p>Loading boards…</p>
          </div>
        ) : (
          <div className="boards-section">
            <div className="boards-section-header">
              <h3>Your boards</h3>
              <button type="button" className="ghost-button" onClick={() => navigate('/user/boards/templates')}>Browse templates</button>
            </div>
            <div className="boards-grid">
              {boards.map((board, idx) => (
                <button
                  key={board.id}
                  type="button"
                  className={`boards-grid-item boards-grid-item--glass card-accent-${idx % 6}`}
                  onClick={() => navigate(`/user/boards/${board.id}`)}
                >
                  <div className="boards-grid-title">{board.title}</div>
                  <div className="boards-grid-meta">Created {new Date(board.created_at).toLocaleDateString()}</div>
                </button>
              ))}
              {boards.length === 0 && (
                <div className="boards-list-empty">
                  <p>No boards yet. Create one to get started!</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="boards-section">
          <div className="boards-section-header">
            <h3>Popular templates</h3>
            <button type="button" className="ghost-button" onClick={() => navigate('/user/boards/templates')}>
              View gallery
            </button>
          </div>
          <div className="boards-gallery">
            {templatesPreview.map((tpl) => (
              <div key={tpl.title} className="boards-gallery-card" style={{ background: tpl.gradient }}>
                <div>
                  <div className="boards-gallery-title">{tpl.title}</div>
                  <p>{tpl.desc}</p>
                </div>
                <button
                  type="button"
                  className="ghost-button ghost-button--inverted"
                  onClick={() => navigate('/user/boards/templates')}
                >
                  Explore
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function BoardRoute({ authToken }) {
  const { boardId } = useParams();
  return <BoardsPage authToken={authToken} boardId={boardId ? Number(boardId) : null} />;
}

function TemplatesGalleryPage({ authToken, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const handleUseTemplate = async (title) => {
    if (!authToken) {
      setError('Please log in first.');
      return;
    }
    try {
      setCreating(true);
      const board = await api.createBoard(title, authToken);
      navigate(`/user/boards/${board.id}`);
    } catch {
      setError('Unable to create board from template.');
    } finally {
      setCreating(false);
    }
  };

  const templates = [
    { title: 'Kanban', accent: 'accent', desc: 'Ideas → Doing → Review → Done', bg: 'linear-gradient(135deg,#a855f7,#3b82f6)' },
    { title: 'Sprint planning', accent: 'primary', desc: 'Backlog → Sprint → QA → Retro', bg: 'linear-gradient(135deg,#34d399,#3b82f6)' },
    { title: 'Bug triage', accent: 'warning', desc: 'New → Investigating → Fixing → Release', bg: 'linear-gradient(135deg,#f97316,#facc15)' },
    { title: 'Personal tasks', accent: 'success', desc: 'Today → This week → Someday', bg: 'linear-gradient(135deg,#22c55e,#14b8a6)' },
  ];

  return (
    <main className="boards-list-page">
      <div className="boards-list-hero">
        <div>
          <p className="boards-list-kicker">Templates</p>
          <h1>Pick a head start</h1>
          <p className="boards-list-subtitle">Choose a template to spin up a new board instantly.</p>
        </div>
        <div className="boards-list-hero-actions">
          <button type="button" className="ghost-button" onClick={onToggleTheme}>
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <button type="button" className="ghost-button" onClick={() => navigate('/user/boards')}>
            Back to boards
          </button>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="boards-grid">
        {templates.map((tpl) => (
          <div key={tpl.title} className="boards-grid-item boards-grid-item--template" style={{ background: tpl.bg }}>
            <div className="boards-grid-title">{tpl.title}</div>
            <p style={{ margin: '.35rem 0 1rem', opacity: .85 }}>{tpl.desc}</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => handleUseTemplate(tpl.title)}
              disabled={!authToken || creating}
            >
              Use template
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
