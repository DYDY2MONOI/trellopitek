import { useEffect, useMemo, useState } from 'react';
import BoardTemplatesModal from '../components/BoardTemplatesModal';
import './BoardsPage.css';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const STORAGE_KEY = 'trellomirror-board-columns';

const defaultKanban = [
  {
    id: 'col-ideas',
    title: 'Ideas',
    accent: 'accent',
    cards: [
      { id: 'd1', title: 'Explore new feature ideas', badge: 'Product', color: 'accent' },
      { id: 'd2', title: 'Collect feedback from users', badge: 'Research', color: 'primary' }
    ]
  },
  {
    id: 'col-progress',
    title: 'In Progress',
    accent: 'primary',
    cards: [
      { id: 'd3', title: 'Implement auth flow', badge: 'Dev', color: 'primary' }
    ]
  },
  {
    id: 'col-review',
    title: 'Review',
    accent: 'warning',
    cards: [
      { id: 'd4', title: 'QA for sprint items', badge: 'QA', color: 'warning' }
    ]
  },
  {
    id: 'col-done',
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
      const data = saved ? JSON.parse(saved) : defaultKanban;
      return ensureIds(data);
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function ensureIds(cols) {
    return cols.map((c, idx) => ({
      id: c.id || `col-${idx}-${c.title?.toLowerCase().replace(/\s+/g, '-')}`,
      title: c.title,
      accent: c.accent || 'primary',
      cards: (c.cards || []).map((card, i) => ({
        id: String(card.id ?? `${c.title}-${i}`),
        title: card.title,
        badge: card.badge,
        color: card.color || 'primary',
      })),
    }));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    // Column drag
    const activeColIndex = columns.findIndex(c => c.id === active.id);
    const overColIndex = columns.findIndex(c => c.id === over.id);
    if (activeColIndex !== -1 && overColIndex !== -1) {
      if (activeColIndex !== overColIndex) {
        setColumns((cols) => arrayMove(cols, activeColIndex, overColIndex));
      }
      return;
    }

    // Card drag
    const fromColIndex = columns.findIndex(c => c.cards.some(card => String(card.id) === String(active.id)));
    if (fromColIndex === -1) return;
    const toColIndexCandidate = columns.findIndex(c => c.cards.some(card => String(card.id) === String(over.id)) || c.id === over.id);
    const toColIndex = toColIndexCandidate === -1 ? fromColIndex : toColIndexCandidate;

    const fromCol = columns[fromColIndex];
    const toCol = columns[toColIndex];
    const fromIndex = fromCol.cards.findIndex(card => String(card.id) === String(active.id));
    let toIndex = toCol.cards.findIndex(card => String(card.id) === String(over.id));
    if (toIndex === -1) toIndex = toCol.cards.length;

    if (fromColIndex === toColIndex) {
      if (fromIndex !== toIndex) {
        const newCards = arrayMove(fromCol.cards, fromIndex, toIndex);
        const updated = [...columns];
        updated[fromColIndex] = { ...fromCol, cards: newCards };
        setColumns(updated);
      }
    } else {
      const moving = fromCol.cards[fromIndex];
      const newFrom = Array.from(fromCol.cards);
      newFrom.splice(fromIndex, 1);
      const newTo = Array.from(toCol.cards);
      newTo.splice(toIndex, 0, moving);
      const updated = [...columns];
      updated[fromColIndex] = { ...fromCol, cards: newFrom };
      updated[toColIndex] = { ...toCol, cards: newTo };
      setColumns(updated);
    }
  }

  function ColumnSortable({ column, children }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    return (
      <article className={`list list--${column.accent}`} ref={setNodeRef} style={style} role="listitem">
        <header className="list-header" {...attributes} {...listeners} style={{ cursor: 'grab' }}>
          <div className="list-title">
            <span className="list-title-text">{column.title}</span>
            <span className="list-count">{column.cards.length}</span>
          </div>
          <div className="list-actions">
            <button className="list-action" type="button" aria-label="Plus">⋯</button>
          </div>
        </header>
        {children}
      </article>
    );
  }

  function CardSortable({ card }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: String(card.id) });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    return (
      <div className="tcard" ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <div className="tcard-badges">
          <span className={`tbadge tbadge--${card.color}`}>{card.badge}</span>
        </div>
        <div className="tcard-title">{card.title}</div>
        <div className="tcard-meta">
          <span className="tmeta">👁️ 1</span>
          <span className="tmeta">📄 0/6</span>
        </div>
      </div>
    );
  }

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

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="lists-wrapper" role="list" aria-label="Board lists">
              {columns.map((col) => (
                <ColumnSortable key={col.id} column={col}>
                  <SortableContext items={col.cards.map(card => String(card.id))} strategy={verticalListSortingStrategy}>
                    <div className="list-cards">
                      {col.cards.map(card => (
                        <CardSortable key={card.id} card={card} />
                      ))}
                      <button type="button" className="tadd-card">+ Ajouter une carte</button>
                    </div>
                  </SortableContext>
                </ColumnSortable>
              ))}
              <button type="button" className="list list--adder">+ Ajouter une liste</button>
            </div>
          </SortableContext>
        </DndContext>

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
