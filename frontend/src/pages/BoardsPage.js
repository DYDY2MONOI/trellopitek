import { useEffect, useMemo, useState } from 'react';
import BoardTemplatesModal from '../components/BoardTemplatesModal';
import './BoardsPage.css';

const STORAGE_KEY = 'trellomirror-board-columns';

const defaultKanban = [
  {
    title: 'Ideas',
    accent: 'accent',
    cards: [
      { id: 'd1', title: 'Explore new feature ideas', badge: 'Product', color: 'accent' },
      { id: 'd2', title: 'Collect feedback from users', badge: 'Research', color: 'primary' }
    ]
  },
  {
    title: 'In Progress',
    accent: 'primary',
    cards: [
      { id: 'd3', title: 'Implement auth flow', badge: 'Dev', color: 'primary' }
    ]
  },
  {
    title: 'Review',
    accent: 'warning',
    cards: [
      { id: 'd4', title: 'QA for sprint items', badge: 'QA', color: 'warning' }
    ]
  },
  {
    title: 'Done',
    accent: 'success',
    cards: [
      { id: 'd5', title: 'Release v1.0.0', badge: 'Release', color: 'success' }
    ]
  }
];

export default function BoardsPage() {
  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultKanban;
    } catch {
      return defaultKanban;
    }
  });
  const [showTemplates, setShowTemplates] = useState(false);
  const [title, setTitle] = useState('Mon tableau Trello');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    } catch {}
  }, [columns]);

  useMemo(() => columns.length, [columns]);

  return (
    <div className="boards-layout">
      <aside className="boards-sidebar" aria-label="Sidebar">
        <div className="sidebar-header">
          <button type="button" className="sidebar-logo" aria-label="Workspace">▦</button>
          <div className="sidebar-title">Boîte de réception</div>
        </div>
        <div className="sidebar-add">
          <button type="button" className="sidebar-add-btn">+ Ajouter une carte</button>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-title">Regroupez vos tâches</div>
          <p className="sidebar-section-text">
            Une idée ? Envoyez-la par e-mail, transférez-la — peu importe comment elle surgit
          </p>
          <div className="sidebar-icons">
            <button className="sidebar-icon" type="button" aria-label="Mail">✉️</button>
            <button className="sidebar-icon" type="button" aria-label="Chrome">🌐</button>
            <button className="sidebar-icon" type="button" aria-label="Plus">➕</button>
          </div>
          <div className="sidebar-privacy">Une boîte de réception 100 % privée</div>
        </div>
      </aside>

      <section className="boards-main">
        <header className="board-header">
          <div className="board-title-row">
            <h1 className="board-title" contentEditable suppressContentEditableWarning onBlur={(e)=>setTitle(e.currentTarget.textContent || 'Mon tableau Trello')}>{title}</h1>
            <div className="board-actions">
              <button type="button" className="board-action">⋯</button>
              <button type="button" className="board-action">⭐</button>
              <button type="button" className="board-share">Partager</button>
            </div>
          </div>
        </header>

        <div className="lists-wrapper" role="list" aria-label="Board lists">
          {columns.map((col) => (
            <article key={col.title} className={`list list--${col.accent}`} role="listitem">
              <header className="list-header">
                <div className="list-title">
                  <span className="list-title-text">{col.title}</span>
                  <span className="list-count">{col.cards.length}</span>
                </div>
                <div className="list-actions">
                  <button className="list-action" type="button" aria-label="Plus">⋯</button>
                </div>
              </header>
              <div className="list-cards">
                {col.cards.map((card) => (
                  <div key={card.id} className="tcard">
                    <div className="tcard-badges">
                      <span className={`tbadge tbadge--${card.color}`}>{card.badge}</span>
                    </div>
                    <div className="tcard-title">{card.title}</div>
                    <div className="tcard-meta">
                      <span className="tmeta">👁️ 1</span>
                      <span className="tmeta">📄 0/6</span>
                    </div>
                  </div>
                ))}
                <button type="button" className="tadd-card">+ Ajouter une carte</button>
              </div>
            </article>
          ))}
          <button type="button" className="list list--adder">+ Ajouter une liste</button>
        </div>

        <div className="boards-toolbar" role="toolbar" aria-label="Board toolbar">
          <button type="button" className="toolbar-btn toolbar-btn--active">Boîte de réception</button>
          <button type="button" className="toolbar-btn">Agenda</button>
          <button type="button" className="toolbar-btn">Tableau</button>
          <button type="button" className="toolbar-btn">Changer de tableau</button>
        </div>

        <BoardTemplatesModal
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          onSelect={(tpl) => {
            setColumns(tpl.columns);
            setShowTemplates(false);
          }}
        />
      </section>
    </div>
  );
}
