import { useEffect, useState } from 'react';
import './App.css';

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

function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  }, [theme]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>EP</span>
          <span className="brand-name">Epitrello</span>
        </div>
        <nav className="nav-links">
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
          <button type="button" className="ghost-button">Log in</button>
          <button type="button" className="primary-button">Sign up free</button>
        </div>
      </header>

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
              <button type="button" className="primary-button">Start your board</button>
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
              {boardColumns.map((column) => (
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
                            <span aria-hidden>☑</span> 3/5
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

      <footer className="footer" id="resources">
        <p>© {new Date().getFullYear()} Epitrello. Inspired by the Kanban method.</p>
        <div className="footer-links">
          <a href="#">Status</a>
          <a href="#">Docs</a>
          <a href="#">Support</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
