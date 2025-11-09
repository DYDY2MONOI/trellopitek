import React from 'react';
import './BoardTemplatesModal.css';

const templates = [
  {
    key: 'kanban',
    name: 'Kanban',
    description: 'Ideas → In Progress → Review → Done',
    columns: [
      { title: 'Ideas', accent: 'accent', cards: [
        { id: 'k1', title: 'Explore new feature ideas', badge: 'Product', color: 'accent' },
        { id: 'k2', title: 'Collect feedback from users', badge: 'Research', color: 'primary' }
      ]},
      { title: 'In Progress', accent: 'primary', cards: [
        { id: 'k3', title: 'Implement auth flow', badge: 'Dev', color: 'primary' }
      ]},
      { title: 'Review', accent: 'warning', cards: [
        { id: 'k4', title: 'QA for sprint items', badge: 'QA', color: 'warning' }
      ]},
      { title: 'Done', accent: 'success', cards: [
        { id: 'k5', title: 'Release v1.0.0', badge: 'Release', color: 'success' }
      ]},
    ],
  },
  {
    key: 'scrum',
    name: 'Scrum',
    description: 'Backlog → In Progress → Review → Done',
    columns: [
      { title: 'Backlog', accent: 'accent', cards: [
        { id: 's1', title: 'Story: user can reset password', badge: 'Story', color: 'accent' }
      ]},
      { title: 'In Progress', accent: 'primary', cards: [
        { id: 's2', title: 'Task: API endpoint', badge: 'Task', color: 'primary' }
      ]},
      { title: 'Review', accent: 'warning', cards: [
        { id: 's3', title: 'Code review', badge: 'Review', color: 'warning' }
      ]},
      { title: 'Done', accent: 'success', cards: [
        { id: 's4', title: 'Sprint demo', badge: 'Sprint', color: 'success' }
      ]},
    ],
  },
  {
    key: 'personal',
    name: 'Personal Tasks',
    description: 'To do → Doing → Done',
    columns: [
      { title: 'To do', accent: 'accent', cards: [
        { id: 'p1', title: 'Plan weekly goals', badge: 'Life', color: 'accent' }
      ]},
      { title: 'Doing', accent: 'primary', cards: [
        { id: 'p2', title: 'Work on portfolio', badge: 'Focus', color: 'primary' }
      ]},
      { title: 'Done', accent: 'success', cards: [
        { id: 'p3', title: 'Clean inbox', badge: 'Quick', color: 'success' }
      ]},
    ],
  },
  {
    key: 'bugs',
    name: 'Bug Tracker',
    description: 'New → Investigating → Fix → QA → Closed',
    columns: [
      { title: 'New', accent: 'accent', cards: [
        { id: 'b1', title: 'Crash when saving form', badge: 'P1', color: 'warning' }
      ]},
      { title: 'Investigating', accent: 'primary', cards: []},
      { title: 'Fix in Progress', accent: 'primary', cards: []},
      { title: 'QA', accent: 'warning', cards: []},
      { title: 'Closed', accent: 'success', cards: []},
    ],
  },
];

const BoardTemplatesModal = ({ open, onClose, onSelect }) => {
  if (!open) return null;

  return (
    <div className="btm-overlay" role="dialog" aria-modal="true" aria-labelledby="btm-title">
      <div className="btm-modal">
        <header className="btm-header">
          <h2 id="btm-title">Choose a template</h2>
          <button type="button" className="btm-close" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="btm-grid">
          {templates.map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              className="btm-tile"
              onClick={() => onSelect?.(tpl)}
            >
              <div className="btm-tile-name">{tpl.name}</div>
              <div className="btm-tile-desc">{tpl.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BoardTemplatesModal;

