import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import BoardTemplatesModal from '../components/BoardTemplatesModal';
import Icon from '../components/Icon';
import './BoardsPage.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../services/api';

const defaultKanban = [
  {
    id: 'col-ideas',
    listId: null,
    title: 'Ideas',
    accent: 'accent',
    cards: []
  },
  {
    id: 'col-progress',
    listId: null,
    title: 'In Progress',
    accent: 'primary',
    cards: []
  },
  {
    id: 'col-review',
    listId: null,
    title: 'Review',
    accent: 'warning',
    cards: []
  },
  {
    id: 'col-done',
    listId: null,
    title: 'Done',
    accent: 'success',
    cards: []
  }
];

function parseListId(colId) {
  const m = String(colId).match(/^col-(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function ensureIds(cols) {
  return cols.map((c, idx) => {
    const generatedId = c.id || `col-${idx}-${c.title?.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id: generatedId,
      listId: c.listId ?? parseListId(generatedId) ?? null,
      title: c.title,
      accent: c.accent || 'primary',
      cards: (c.cards || []).map((card, i) => ({
        id: String(card.id ?? `${c.title}-${i}`),
        title: card.title,
        badge: card.badge,
        color: card.color || 'primary',
      })),
    };
  });
}

function reorder(list, startIndex, endIndex) {
  if (startIndex === endIndex) return list;
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  if (!removed) return list;
  result.splice(endIndex, 0, removed);
  return result;
}

function moveCardBetweenColumns(columns, sourceColIndex, destColIndex, sourceIndex, destIndex) {
  if (sourceColIndex === destColIndex) {
    const column = columns[sourceColIndex];
    if (!column) return columns;
    const reordered = reorder(column.cards, sourceIndex, destIndex);
    if (reordered === column.cards) return columns;
    const updated = [...columns];
    updated[sourceColIndex] = { ...column, cards: reordered };
    return updated;
  }

  const sourceCol = columns[sourceColIndex];
  const destCol = columns[destColIndex];
  if (!sourceCol || !destCol) return columns;

  const sourceCards = Array.from(sourceCol.cards);
  const [moved] = sourceCards.splice(sourceIndex, 1);
  if (!moved) return columns;

  const destCards = Array.from(destCol.cards);
  const movedIntoDest = {
    ...moved,
    badge: destCol.title,
    color: destCol.accent || moved.color,
  };
  destCards.splice(destIndex, 0, movedIntoDest);

  const updated = [...columns];
  updated[sourceColIndex] = { ...sourceCol, cards: sourceCards };
  updated[destColIndex] = { ...destCol, cards: destCards };
  return updated;
}

export default function BoardsPage({ authToken }) {
  const [columns, setColumns] = useState(() => ensureIds(defaultKanban));
  const [showTemplates, setShowTemplates] = useState(false);
  const [title, setTitle] = useState('My Trello board');
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [composerFor, setComposerFor] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingError, setEditingError] = useState('');
  const [editingSaving, setEditingSaving] = useState(false);
  const [composerError, setComposerError] = useState(null);

  const COLOR_MAP = {
    accent: '#8B5CF6',
    primary: '#2563EB',
    warning: '#EAB308',
    success: '#059669',
    inbox: '#475569',
  };

  const colorOverridesKey = 'trellomirror-column-colors-v1';

  const loadOverrides = useCallback(() => {
    try {
      const raw = localStorage.getItem(colorOverridesKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const saveOverrides = useCallback((overrides) => {
    try { localStorage.setItem(colorOverridesKey, JSON.stringify(overrides)); } catch {}
  }, []);

  function isHex(v) {
    return typeof v === 'string' && /^#?[0-9a-fA-F]{6}$/.test(v);
  }

  function normHex(v) {
    if (!isHex(v)) return null;
    return v.startsWith('#') ? v : `#${v}`;
  }

  function hexToRgb(hex) {
    const h = normHex(hex);
    if (!h) return null;
    const bigint = parseInt(h.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  }

  function rgba(hex, a) {
    const rgb = hexToRgb(hex);
    if (!rgb) return undefined;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
  }

  function textOn(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '#fff';
    const { r, g, b } = rgb;
    const srgb = [r / 255, g / 255, b / 255].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    return L > 0.5 ? '#0b1324' : '#ffffff';
  }

  useMemo(() => columns.length, [columns]);

  const overridesByColumn = loadOverrides();

  function handleDragEnd(result) {
    const { destination, source, type } = result;
    if (!destination) return;

    if (type === 'COLUMN') {
      if (destination.index === source.index) return;
      setColumns((cols) => reorder(cols, source.index, destination.index));
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    setColumns((cols) => {
      const sourceColIndex = cols.findIndex((col) => col.id === source.droppableId);
      const destColIndex = cols.findIndex((col) => col.id === destination.droppableId);
      if (sourceColIndex === -1 || destColIndex === -1) return cols;
      return moveCardBetweenColumns(cols, sourceColIndex, destColIndex, source.index, destination.index);
    });
  }

  const openComposer = useCallback((columnId) => {
    setComposerError(null);
    setComposerFor(columnId);
  }, []);

  const closeComposer = useCallback(() => {
    setComposerError(null);
    setComposerFor(null);
  }, []);

  async function handleAddCardSubmit(column, draftTitle) {
    const title = (draftTitle || '').trim();
    if (!title) return;
    const token = authToken;
    const listId = column.listId ?? parseListId(column.id);
    if (!listId) {
      setComposerError('Unable to determine list. Please refresh.');
      return;
    }
    if (!token) {
      setComposerError('Please log in to add cards to this board.');
      return;
    }
    try {
      const created = await api.createCard(listId, { title, badge: column.title, color: column.accent }, token);
      const card = { id: String(created.id), title: created.title, badge: created.badge, color: created.color || (column.accent || 'primary') };
      setColumns((cols) => cols.map((c) => c.id === column.id ? { ...c, cards: [...c.cards, card] } : c));
      closeComposer();
      setComposerError(null);
    } catch (e) {
      setComposerError(e?.message || 'Failed to save card.');
    }
  }

  function openCardEditor(card, columnId) {
    setEditingCard({ cardId: card.id, columnId });
    setEditingTitle(card.title);
    setEditingError('');
  }

  function closeCardEditor() {
    setEditingCard(null);
    setEditingTitle('');
    setEditingError('');
    setEditingSaving(false);
  }

  async function handleEditCardSave() {
    if (!editingCard) return;
    const nextTitle = (editingTitle || '').trim();
    if (!nextTitle) {
      setEditingError('Title is required');
      return;
    }

    const token = authToken;
    if (token) {
      try {
        setEditingSaving(true);
        await api.updateCard(editingCard.cardId, { title: nextTitle }, token);
      } catch (err) {
        setEditingError(err?.message || 'Failed to update card');
        setEditingSaving(false);
        return;
      }
    }

    setColumns((cols) => cols.map((col) => {
      if (col.id !== editingCard.columnId) return col;
      return {
        ...col,
        cards: col.cards.map((card) => (card.id === editingCard.cardId ? { ...card, title: nextTitle } : card)),
      };
    }));

    setEditingSaving(false);
    closeCardEditor();
  }

  function CardComposer({ onAdd, onCancel, error }) {
    const inputRef = useRef(null);
    const [value, setValue] = useState('');
    useEffect(() => { inputRef.current?.focus(); }, []);
    const handleSubmit = async () => {
      const next = value.trim();
      if (!next) return;
      try {
        await onAdd?.(next);
      } catch {
      }
    };
    const handleCancel = () => {
      setValue('');
      onCancel?.();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    return (
      <div className="tadd-composer">
        <textarea
          ref={inputRef}
          className="tadd-input"
          dir="ltr"
          placeholder="Enter a title for this card..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
        />
        <div className="tadd-actions">
          <button type="button" className="tadd-confirm" onClick={handleSubmit}>Add card</button>
          <button type="button" className="tadd-cancel" onClick={handleCancel}>Cancel</button>
        </div>
        {error ? <div className="tadd-error">{error}</div> : null}
      </div>
    );
  }

  function CardEditModal({ title, onChange, onSave, onClose, saving, error }) {
    const ref = useRef(null);
    useEffect(() => {
      function onDocClick(e) {
        if (ref.current && !ref.current.contains(e.target)) onClose?.();
      }
      function onKey(e) {
        if (e.key === 'Escape') onClose?.();
      }
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('mousedown', onDocClick);
        document.removeEventListener('keydown', onKey);
      };
    }, [onClose]);
    return (
      <div className="card-edit-overlay" role="dialog" aria-modal="true">
        <div className="card-edit-modal" ref={ref}>
          <h3 className="card-edit-title">Edit card</h3>
          <textarea
            className="card-edit-input"
            value={title}
            onChange={(e) => onChange?.(e.target.value)}
            rows={4}
            autoFocus
          />
          {error ? <div className="card-edit-error">{error}</div> : null}
          <div className="card-edit-actions">
            <button type="button" className="card-edit-save" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="card-edit-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  function ListColorMenu({ column, presetMap, onClose, onSelectColor }) {
    const ref = useRef(null);
    useEffect(() => {
      function onDocClick(e) {
        if (ref.current && !ref.current.contains(e.target)) onClose?.();
      }
      document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }, [onClose]);

    const presets = Object.entries(presetMap);
    return (
      <div className="list-menu" ref={ref} role="dialog" aria-label="Choose column color">
        <div className="list-menu-row">
          {presets.map(([key, hex]) => (
            <button
              key={key}
              className="color-swatch"
              style={{ backgroundColor: hex }}
              title={`${column.title} – ${key}`}
              onClick={() => onSelectColor?.(key)}
            />
          ))}
        </div>
        <div className="list-menu-row">
          <input
            type="color"
            aria-label="Custom color"
            className="color-input"
            defaultValue="#8B5CF6"
            onChange={(e) => onSelectColor?.(e.target.value)}
          />
          <button className="menu-close" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const token = authToken;
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const boards = await api.getBoards(token);
        let boardId;
        if (boards && boards.length > 0) {
          boardId = boards[0].id;
        } else {
          const created = await api.createBoard('My Trello board', token);
          boardId = created.id;
        }
        const detail = await api.getBoard(boardId, token);
        if (cancelled) return;
        setTitle(detail.title || 'My Trello board');
        const mapped = ensureIds((detail.lists || []).map((l) => ({
          id: `col-${l.id}`,
          listId: l.id,
          title: l.title,
          accent: l.accent || 'primary',
          cards: (l.cards || []).map((c) => ({ id: String(c.id), title: c.title, badge: c.badge, color: c.color || 'primary' }))
        })));
        setColumns(mapped);
      } catch (e) {
      }
    })();
    return () => { cancelled = true; };
  }, [authToken]);

  return (
    <div className="boards-layout">
      <aside className="boards-sidebar" aria-label="Sidebar">
        <div className="sidebar-header">
          <button type="button" className="sidebar-logo" aria-label="Workspace">
            <Icon name="workspace" size={18} />
          </button>
          <div className="sidebar-title">Inbox</div>
        </div>
        <div className="sidebar-add">
          <button type="button" className="sidebar-add-btn">+ Add a card</button>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-title">Group your tasks</div>
          <p className="sidebar-section-text">
            Have an idea? Email it, forward it — however it pops up
          </p>
          <div className="sidebar-icons">
            <button className="sidebar-icon" type="button" aria-label="Mail">
              <Icon name="mail" size={18} />
            </button>
            <button className="sidebar-icon" type="button" aria-label="Web clipper">
              <Icon name="globe" size={18} />
            </button>
            <button className="sidebar-icon" type="button" aria-label="Add integration">
              <Icon name="plus" size={18} />
            </button>
          </div>
          <div className="sidebar-privacy">A 100% private inbox</div>
        </div>
      </aside>

      <section className="boards-main">
        <header className="board-header">
          <div className="board-title-row">
            <h1 className="board-title" dir="ltr" contentEditable suppressContentEditableWarning onBlur={(e)=>setTitle(e.currentTarget.textContent || 'My Trello board')}>{title}</h1>
            <div className="board-actions">
              <button type="button" className="board-action" aria-label="Board options">⋯</button>
              <button type="button" className="board-action" aria-label="Star board">
                <Icon name="star" size={16} />
              </button>
              <button type="button" className="board-share">Share</button>
            </div>
          </div>
        </header>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="COLUMN">
            {(boardProvided) => (
              <div
                className="lists-wrapper"
                role="list"
                aria-label="Board lists"
                ref={boardProvided.innerRef}
                {...boardProvided.droppableProps}
              >
                {columns.map((col, colIndex) => {
                  const colOverrideHex = overridesByColumn[col.id] ? normHex(overridesByColumn[col.id]) : null;
                  const headerStyle = colOverrideHex ? { backgroundColor: colOverrideHex, color: textOn(colOverrideHex) } : undefined;
                  const listClass = colOverrideHex ? 'list' : `list list--${col.accent}`;
                  return (
                    <Draggable draggableId={col.id} index={colIndex} key={col.id}>
                      {(colProvided) => (
                        <article
                          className={listClass}
                          ref={colProvided.innerRef}
                          role="listitem"
                          {...colProvided.draggableProps}
                          style={colProvided.draggableProps.style}
                        >
                          <header className="list-header" style={{ cursor: 'grab', ...headerStyle }} {...colProvided.dragHandleProps}>
                            <div className="list-title">
                              <span className="list-title-text">{col.title}</span>
                              <span className="list-count">{col.cards.length}</span>
                            </div>
                            <div className="list-actions">
                              <button className="list-action" type="button" aria-label="More" onClick={() => setOpenMenuFor(col.id)}>⋯</button>
                            </div>
                          </header>
                          <Droppable droppableId={col.id} type="CARD">
                            {(listProvided) => (
                              <div className="list-cards" ref={listProvided.innerRef} {...listProvided.droppableProps}>
                                {col.cards.map((card, cardIndex) => {
                                  const tokenHex = COLOR_MAP[card.color] || null;
                                  const columnTokenHex = COLOR_MAP[col.accent] || null;
                                  const finalHex = colOverrideHex || tokenHex || columnTokenHex || COLOR_MAP.primary;
                                  const badgeStyle = { backgroundColor: rgba(finalHex, 0.18), color: finalHex };
                                  return (
                                    <Draggable key={card.id} draggableId={String(card.id)} index={cardIndex}>
                                      {(cardProvided) => (
                                        <div
                                          className="tcard"
                                          ref={cardProvided.innerRef}
                                          {...cardProvided.draggableProps}
                                          style={cardProvided.draggableProps.style}
                                        >
                                          <div className="tcard-head" {...cardProvided.dragHandleProps}>
                                            <div className="tcard-badges">
                                              <span className={`tbadge tbadge--${card.color}`} style={badgeStyle}>{card.badge}</span>
                                            </div>
                                            <button
                                              type="button"
                                              className="tcard-edit"
                                              aria-label={`Edit ${card.title}`}
                                              onClick={(e) => { e.stopPropagation(); openCardEditor(card, col.id); }}
                                              onMouseDown={(e) => e.stopPropagation()}
                                              onTouchStart={(e) => e.stopPropagation()}
                                            >
                                              <Icon name="edit" size={12} />
                                            </button>
                                          </div>
                                          <div className="tcard-title">{card.title}</div>
                                          <div className="tcard-meta">
                                            <span className="tmeta">
                                              <Icon name="eye" size={14} />
                                              <span>1</span>
                                            </span>
                                            <span className="tmeta">
                                              <Icon name="document" size={14} />
                                              <span>0/6</span>
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {listProvided.placeholder}
                                {composerFor === col.id ? (
                                  <CardComposer
                                    onAdd={(value) => handleAddCardSubmit(col, value)}
                                    onCancel={closeComposer}
                                    error={composerError}
                                  />
                                ) : (
                                  <button type="button" className="tadd-card" onClick={() => openComposer(col.id)}>+ Add a card</button>
                                )}
                              </div>
                            )}
                          </Droppable>
                          {openMenuFor === col.id && (
                            <ListColorMenu
                              column={col}
                              presetMap={COLOR_MAP}
                              onClose={() => setOpenMenuFor(null)}
                              onSelectColor={(hexOrToken) => {
                                const o = loadOverrides();
                                if (isHex(hexOrToken)) {
                                  o[col.id] = normHex(hexOrToken);
                                } else if (hexOrToken in COLOR_MAP) {
                                  o[col.id] = COLOR_MAP[hexOrToken];
                                }
                                saveOverrides(o);
                                setColumns([...columns]);
                                setOpenMenuFor(null);
                              }}
                            />
                          )}
                        </article>
                      )}
                    </Draggable>
                  );
                })}
                {boardProvided.placeholder}
                <button type="button" className="list list--adder">+ Add a list</button>
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div className="boards-toolbar" role="toolbar" aria-label="Board toolbar">
          <button type="button" className="toolbar-btn toolbar-btn--active">Inbox</button>
          <button type="button" className="toolbar-btn">Calendar</button>
          <button type="button" className="toolbar-btn">Board</button>
          <button type="button" className="toolbar-btn">Switch board</button>
        </div>

        <BoardTemplatesModal
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          onSelect={(tpl) => {
            setColumns(ensureIds(tpl.columns));
            setShowTemplates(false);
          }}
        />
        {editingCard && (
          <CardEditModal
            title={editingTitle}
            onChange={setEditingTitle}
            onSave={handleEditCardSave}
            onClose={closeCardEditor}
            saving={editingSaving}
            error={editingError}
          />
        )}
      </section>
    </div>
  );
}
