import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import BoardTemplatesModal from '../components/BoardTemplatesModal';
import './BoardsPage.css';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const activeColIndex = columns.findIndex(c => c.id === active.id);
    const overColIndex = columns.findIndex(c => c.id === over.id);
    if (activeColIndex !== -1 && overColIndex !== -1) {
      if (activeColIndex !== overColIndex) {
        setColumns((cols) => arrayMove(cols, activeColIndex, overColIndex));
      }
      return;
    }

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

  function ColumnSortable({ column, children, onOpenMenu }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    const overrides = loadOverrides();
    const colHex = overrides[column.id] ? normHex(overrides[column.id]) : null;
    const headerStyle = colHex ? { backgroundColor: colHex, color: textOn(colHex) } : undefined;
    const listClass = colHex ? 'list' : `list list--${column.accent}`;
    return (
      <article className={listClass} ref={setNodeRef} style={style} role="listitem">
        <header className="list-header" {...attributes} {...listeners} style={{ cursor: 'grab', ...headerStyle }}>
          <div className="list-title">
            <span className="list-title-text">{column.title}</span>
            <span className="list-count">{column.cards.length}</span>
          </div>
          <div className="list-actions">
            <button className="list-action" type="button" aria-label="More" onClick={() => onOpenMenu(column)}>⋯</button>
          </div>
        </header>
        {children}
        {openMenuFor === column.id && (
          <ListColorMenu
            column={column}
            presetMap={COLOR_MAP}
            onClose={() => setOpenMenuFor(null)}
            onSelectColor={(hexOrToken) => {
              const o = loadOverrides();
              if (isHex(hexOrToken)) {
                o[column.id] = normHex(hexOrToken);
              } else if (hexOrToken in COLOR_MAP) {
                // store hex to be generic and decouple from tokens
                o[column.id] = COLOR_MAP[hexOrToken];
              }
              saveOverrides(o);
              // trigger rerender
              setColumns([...columns]);
              setOpenMenuFor(null);
            }}
          />
        )}
      </article>
    );
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

  function CardSortable({ card, column }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: String(card.id) });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    const overrides = loadOverrides();
    const hexFromOverride = overrides[column.id] ? normHex(overrides[column.id]) : null;
    // Choose color: card token -> preset; else column override; fallback preset by column accent token
    const tokenHex = COLOR_MAP[card.color] || null;
    const columnTokenHex = COLOR_MAP[column.accent] || null;
    const finalHex = hexFromOverride || tokenHex || columnTokenHex || COLOR_MAP.primary;
    const badgeStyle = { backgroundColor: rgba(finalHex, 0.18), color: finalHex };
    return (
      <div className="tcard" ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <div className="tcard-badges">
          <span className={`tbadge tbadge--${card.color}`} style={badgeStyle}>{card.badge}</span>
        </div>
        <div className="tcard-title">{card.title}</div>
        <div className="tcard-meta">
          <span className="tmeta">👁️ 1</span>
          <span className="tmeta">📄 0/6</span>
        </div>
      </div>
    );
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
          <button type="button" className="sidebar-logo" aria-label="Workspace">▦</button>
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
            <button className="sidebar-icon" type="button" aria-label="Mail">✉️</button>
            <button className="sidebar-icon" type="button" aria-label="Chrome">🌐</button>
            <button className="sidebar-icon" type="button" aria-label="More">➕</button>
          </div>
          <div className="sidebar-privacy">A 100% private inbox</div>
        </div>
      </aside>

      <section className="boards-main">
        <header className="board-header">
          <div className="board-title-row">
            <h1 className="board-title" dir="ltr" contentEditable suppressContentEditableWarning onBlur={(e)=>setTitle(e.currentTarget.textContent || 'My Trello board')}>{title}</h1>
            <div className="board-actions">
              <button type="button" className="board-action">⋯</button>
              <button type="button" className="board-action">⭐</button>
              <button type="button" className="board-share">Share</button>
            </div>
          </div>
        </header>

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="lists-wrapper" role="list" aria-label="Board lists">
              {columns.map((col) => (
                <ColumnSortable key={col.id} column={col} onOpenMenu={(c)=> setOpenMenuFor(c.id)}>
                  <SortableContext items={col.cards.map(card => String(card.id))} strategy={verticalListSortingStrategy}>
                    <div className="list-cards">
                      {col.cards.map(card => (
                        <CardSortable key={card.id} card={card} column={col} />
                      ))}
                      {composerFor === col.id ? (
                        <CardComposer
                          onAdd={(value) => handleAddCardSubmit(col, value)}
                          onCancel={() => setComposerFor(null)}
                        />
                      ) : (
                        <button type="button" className="tadd-card" onClick={() => setComposerFor(col.id)}>+ Add a card</button>
                      )}
                    </div>
                  </SortableContext>
                </ColumnSortable>
              ))}
              <button type="button" className="list list--adder">+ Add a list</button>
            </div>
          </SortableContext>
        </DndContext>

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
