import React from 'react';
import Icon from './Icon';
import './BoardTemplatesModal.css';

const templates = [
  {
    key: 'kanban',
    name: 'Kanban',
    description: 'Ideas → In Progress → Review → Done',
    columns: [
      { title: 'Ideas', accent: 'accent', cards: [] },
      { title: 'In Progress', accent: 'primary', cards: [] },
      { title: 'Review', accent: 'warning', cards: [] },
      { title: 'Done', accent: 'success', cards: [] },
    ],
  },
  {
    key: 'scrum',
    name: 'Scrum',
    description: 'Backlog → In Progress → Review → Done',
    columns: [
      { title: 'Backlog', accent: 'accent', cards: [] },
      { title: 'In Progress', accent: 'primary', cards: [] },
      { title: 'Review', accent: 'warning', cards: [] },
      { title: 'Done', accent: 'success', cards: [] },
    ],
  },
  {
    key: 'personal',
    name: 'Personal Tasks',
    description: 'To do → Doing → Done',
    columns: [
      { title: 'To do', accent: 'accent', cards: [] },
      { title: 'Doing', accent: 'primary', cards: [] },
      { title: 'Done', accent: 'success', cards: [] },
    ],
  },
  {
    key: 'bugs',
    name: 'Bug Tracker',
    description: 'New → Investigating → Fix → QA → Closed',
    columns: [
      { title: 'New', accent: 'accent', cards: [] },
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
          <button type="button" className="btm-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
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
