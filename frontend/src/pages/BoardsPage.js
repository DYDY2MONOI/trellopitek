import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import BoardTemplatesModal from '../components/BoardTemplatesModal';
import Icon from '../components/Icon';
import './BoardsPage.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getAuthToken, api } from '../services/api';

const STORAGE_KEY = 'trellomirror-board-columns-v2';

const defaultKanban = [
  {
    id: 'col-ideas',
    title: 'Ideas',
    accent: 'accent',
    cards: []
  },
  {
    id: 'col-progress',
    title: 'In Progress',
    accent: 'primary',
    cards: []
  },
  {
    id: 'col-review',
    title: 'Review',
    accent: 'warning',
    cards: []
  },
  {
    id: 'col-done',
    title: 'Done',
    accent: 'success',
    cards: []
  }
];

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
  const [title, setTitle] = useState('My Trello board');
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [composerFor, setComposerFor] = useState(null);

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
    // Relative luminance
    const srgb = [r / 255, g / 255, b / 255].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    return L > 0.5 ? '#0b1324' : '#ffffff';
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    } catch {}
  }, [columns]);

  useMemo(() => columns.length, [columns]);

  const overridesByColumn = loadOverrides();

  function parseListId(colId) {
    const m = String(colId).match(/^col-(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }

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

  async function handleAddCardSubmit(column, draftTitle) {
    const title = (draftTitle || '').trim();
    if (!title) return;
    const token = getAuthToken();
    const listId = parseListId(column.id);
    const newCardLocal = {
      id: String(Date.now()),
      title,
      badge: column.title,
      color: column.accent || 'primary',
    };
    if (!token || !listId) {
      // Local-only fallback
      setColumns((cols) => cols.map((c) => c.id === column.id ? { ...c, cards: [...c.cards, newCardLocal] } : c));
      setComposerFor(null);
      return;
    }
    try {
      const created = await api.createCard(listId, { title, badge: column.title, color: column.accent }, token);
      const card = { id: String(created.id), title: created.title, badge: created.badge, color: created.color || (column.accent || 'primary') };
      setColumns((cols) => cols.map((c) => c.id === column.id ? { ...c, cards: [...c.cards, card] } : c));
      setComposerFor(null);
    } catch (e) {
      // Fallback to local on error to keep UX responsive
      setColumns((cols) => cols.map((c) => c.id === column.id ? { ...c, cards: [...c.cards, newCardLocal] } : c));
      setComposerFor(null);
    }
  }

  function CardComposer({ onAdd, onCancel }) {
    const inputRef = useRef(null);
    const [value, setValue] = useState('');
    useEffect(() => { inputRef.current?.focus(); }, []);
    const handleSubmit = async () => {
      const next = value.trim();
      if (!next) return;
      try {
        await onAdd?.(next);
      } catch {
        // keep value so user can retry
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
    const token = getAuthToken();
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
        const mapped = (detail.lists || []).map((l) => ({
          id: `col-${l.id}`,
          title: l.title,
          accent: l.accent || 'primary',
          cards: (l.cards || []).map((c) => ({ id: String(c.id), title: c.title, badge: c.badge, color: c.color || 'primary' }))
        }));
        setColumns(mapped);
      } catch (e) {
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
                                          {...cardProvided.dragHandleProps}
                                          style={cardProvided.draggableProps.style}
                                        >
                                          <div className="tcard-badges">
                                            <span className={`tbadge tbadge--${card.color}`} style={badgeStyle}>{card.badge}</span>
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
                                    onCancel={() => setComposerFor(null)}
                                  />
                                ) : (
                                  <button type="button" className="tadd-card" onClick={() => setComposerFor(col.id)}>+ Add a card</button>
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
            setColumns(tpl.columns);
            setShowTemplates(false);
          }}
        />
      </section>
    </div>
  );
}
