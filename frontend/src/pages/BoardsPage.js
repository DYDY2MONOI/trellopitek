import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageHeader, PageContent } from '../components/layout/MainLayout';
import './BoardsPage.css';

// Icons
const Icons = {
  Star: ({ filled }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  MoreHorizontal: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  ),
  Eye: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  CheckSquare: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Edit: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
};

// Column color mapping
const ACCENT_COLORS = {
  accent: { bg: 'hsl(263 70% 50% / 0.15)', color: 'hsl(263 70% 50%)', border: 'hsl(263 70% 50%)' },
  primary: { bg: 'hsl(217 91% 60% / 0.15)', color: 'hsl(217 91% 60%)', border: 'hsl(217 91% 60%)' },
  warning: { bg: 'hsl(45 93% 47% / 0.15)', color: 'hsl(38 92% 40%)', border: 'hsl(45 93% 47%)' },
  success: { bg: 'hsl(160 84% 39% / 0.15)', color: 'hsl(160 84% 39%)', border: 'hsl(160 84% 39%)' },
  destructive: { bg: 'hsl(0 84% 60% / 0.15)', color: 'hsl(0 84% 60%)', border: 'hsl(0 84% 60%)' },
};

// Default columns
const defaultKanban = [
  { id: 'col-ideas', listId: null, title: 'Ideas', accent: 'accent', cards: [] },
  { id: 'col-progress', listId: null, title: 'In Progress', accent: 'primary', cards: [] },
  { id: 'col-review', listId: null, title: 'Review', accent: 'warning', cards: [] },
  { id: 'col-done', listId: null, title: 'Done', accent: 'success', cards: [] },
];

// Helpers
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

// ============ Main Component ============
export default function BoardsPage({ authToken }) {
  const { boardId } = useParams();
  const navigate = useNavigate();

  const [columns, setColumns] = useState(() => ensureIds(defaultKanban));
  const [title, setTitle] = useState('My Board');
  const [isStarred, setIsStarred] = useState(false);
  const [composerFor, setComposerFor] = useState(null);
  const [composerError, setComposerError] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingError, setEditingError] = useState('');
  const [editingSaving, setEditingSaving] = useState(false);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState(null);

  // Load board data
  useEffect(() => {
    if (!authToken || !boardId) {
      setBoardLoading(false);
      return;
    }
    let cancelled = false;
    setBoardLoading(true);
    setBoardError(null);
    (async () => {
      try {
        const detail = await api.getBoard(boardId, authToken);
        if (cancelled) return;
        setTitle(detail.title || 'My Board');
        const mapped = ensureIds((detail.lists || []).map((l) => ({
          id: `col-${l.id}`,
          listId: l.id,
          title: l.title,
          accent: l.accent || 'primary',
          cards: (l.cards || []).map((c) => ({
            id: String(c.id),
            title: c.title,
            badge: c.badge,
            color: c.color || 'primary',
          })),
        })));
        setColumns(mapped);
        setBoardLoading(false);
      } catch (e) {
        if (!cancelled) {
          setBoardError('Unable to load this board.');
          setBoardLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [authToken, boardId]);

  // Drag and drop handler
  const handleDragEnd = useCallback((result) => {
    const { destination, source, type } = result;
    if (!destination) return;

    if (type === 'COLUMN') {
      if (destination.index === source.index) return;
      setColumns((cols) => reorder(cols, source.index, destination.index));
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    setColumns((cols) => {
      const sourceColIndex = cols.findIndex((col) => col.id === source.droppableId);
      const destColIndex = cols.findIndex((col) => col.id === destination.droppableId);
      if (sourceColIndex === -1 || destColIndex === -1) return cols;
      const next = moveCardBetweenColumns(cols, sourceColIndex, destColIndex, source.index, destination.index);

      // Update card in API
      const sourceCol = cols[sourceColIndex];
      const movingCard = sourceCol?.cards[source.index];
      const destColumn = next[destColIndex];
      const updatedCard = destColumn?.cards[destination.index];

      if (movingCard && destColumn && updatedCard && authToken) {
        const listId = destColumn.listId;
        if (listId) {
          api.updateCard(movingCard.id, {
            title: updatedCard.title,
            badge: updatedCard.badge,
            color: updatedCard.color,
            listId,
            position: destination.index,
          }, authToken).catch(() => { });
        }
      }

      return next;
    });
  }, [authToken]);

  // Composer handlers
  const openComposer = useCallback((columnId) => {
    setComposerError(null);
    setComposerFor(columnId);
  }, []);

  const closeComposer = useCallback(() => {
    setComposerError(null);
    setComposerFor(null);
  }, []);

  const handleAddCard = async (column, draftTitle) => {
    const cardTitle = (draftTitle || '').trim();
    if (!cardTitle) return;

    const listId = column.listId ?? parseListId(column.id);
    if (!listId) {
      setComposerError('Unable to determine list. Please refresh.');
      return;
    }
    if (!authToken) {
      setComposerError('Please log in to add cards.');
      return;
    }

    try {
      const created = await api.createCard(listId, { title: cardTitle, badge: column.title, color: column.accent }, authToken);
      const card = {
        id: String(created.id),
        title: created.title,
        badge: created.badge,
        color: created.color || column.accent || 'primary',
      };
      setColumns((cols) => cols.map((c) => c.id === column.id ? { ...c, cards: [...c.cards, card] } : c));
      closeComposer();
    } catch (e) {
      setComposerError(e?.message || 'Failed to save card.');
    }
  };

  // Card editor handlers
  const openCardEditor = (card, columnId) => {
    setEditingCard({ cardId: card.id, columnId });
    setEditingTitle(card.title);
    setEditingError('');
  };

  const closeCardEditor = () => {
    setEditingCard(null);
    setEditingTitle('');
    setEditingError('');
    setEditingSaving(false);
  };

  const handleEditCardSave = async () => {
    if (!editingCard) return;
    const nextTitle = (editingTitle || '').trim();
    if (!nextTitle) {
      setEditingError('Title is required');
      return;
    }

    if (authToken) {
      try {
        setEditingSaving(true);
        await api.updateCard(editingCard.cardId, { title: nextTitle }, authToken);
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
        cards: col.cards.map((card) =>
          card.id === editingCard.cardId ? { ...card, title: nextTitle } : card
        ),
      };
    }));

    setEditingSaving(false);
    closeCardEditor();
  };

  // Loading state
  if (boardLoading) {
    return (
      <>
        <PageHeader title="Loading..." kicker="Board" />
        <PageContent>
          <div className="board-loading">
            <div className="app-loading__spinner" />
            <p>Loading board...</p>
          </div>
        </PageContent>
      </>
    );
  }

  // Error state
  if (boardError) {
    return (
      <>
        <PageHeader title="Error" kicker="Board" />
        <PageContent>
          <div className="board-error">
            <p>{boardError}</p>
            <Button variant="primary" onClick={() => navigate('/user/boards')}>
              Back to Boards
            </Button>
          </div>
        </PageContent>
      </>
    );
  }

  // Auth required
  if (!authToken) {
    return (
      <>
        <PageHeader title="Please log in" kicker="Board" />
        <PageContent>
          <div className="board-error">
            <p>Please log in to view this board.</p>
          </div>
        </PageContent>
      </>
    );
  }

  return (
    <div className="board-page">
      {/* Board Header */}
      <header className="board-header">
        <div className="board-header__left">
          <Button variant="ghost" size="sm" onClick={() => navigate('/user/boards')}>
            <Icons.ArrowLeft /> All boards
          </Button>
        </div>
        <div className="board-header__center">
          <h1
            className="board-header__title"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => setTitle(e.currentTarget.textContent || 'My Board')}
          >
            {title}
          </h1>
        </div>
        <div className="board-header__right">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsStarred(!isStarred)}
            className={isStarred ? 'starred' : ''}
          >
            <Icons.Star filled={isStarred} />
          </Button>
          <Button variant="ghost" size="icon">
            <Icons.MoreHorizontal />
          </Button>
          <Button variant="primary" size="sm">Share</Button>
        </div>
      </header>

      {/* Board Content */}
      <div className="board-content">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="COLUMN">
            {(boardProvided) => (
              <div
                className="board-columns"
                ref={boardProvided.innerRef}
                {...boardProvided.droppableProps}
              >
                {columns.map((col, colIndex) => {
                  const accentStyle = ACCENT_COLORS[col.accent] || ACCENT_COLORS.primary;

                  return (
                    <Draggable draggableId={col.id} index={colIndex} key={col.id}>
                      {(colProvided) => (
                        <div
                          className="board-column"
                          ref={colProvided.innerRef}
                          {...colProvided.draggableProps}
                          style={colProvided.draggableProps.style}
                        >
                          {/* Column Header */}
                          <div
                            className="column-header"
                            {...colProvided.dragHandleProps}
                          >
                            <div
                              className="column-header__dot"
                              style={{ background: accentStyle.border }}
                            />
                            <span className="column-header__title">{col.title}</span>
                            <span className="column-header__count">{col.cards.length}</span>
                            <button className="column-header__more">
                              <Icons.MoreHorizontal />
                            </button>
                          </div>

                          {/* Cards */}
                          <Droppable droppableId={col.id} type="CARD">
                            {(listProvided) => (
                              <div
                                className="column-cards"
                                ref={listProvided.innerRef}
                                {...listProvided.droppableProps}
                              >
                                {col.cards.map((card, cardIndex) => (
                                  <Draggable
                                    key={card.id}
                                    draggableId={String(card.id)}
                                    index={cardIndex}
                                  >
                                    {(cardProvided, snapshot) => (
                                      <div
                                        className={`board-card ${snapshot.isDragging ? 'board-card--dragging' : ''}`}
                                        ref={cardProvided.innerRef}
                                        {...cardProvided.draggableProps}
                                        {...cardProvided.dragHandleProps}
                                        style={cardProvided.draggableProps.style}
                                      >
                                        <div className="board-card__header">
                                          <Badge
                                            variant={card.color || col.accent}
                                            size="sm"
                                          >
                                            {card.badge || col.title}
                                          </Badge>
                                          <button
                                            className="board-card__edit"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openCardEditor(card, col.id);
                                            }}
                                          >
                                            <Icons.Edit />
                                          </button>
                                        </div>
                                        <p className="board-card__title">{card.title}</p>
                                        <div className="board-card__footer">
                                          <span className="board-card__meta">
                                            <Icons.Eye />
                                            <span>1</span>
                                          </span>
                                          <span className="board-card__meta">
                                            <Icons.CheckSquare />
                                            <span>0/6</span>
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {listProvided.placeholder}

                                {/* Card Composer */}
                                {composerFor === col.id ? (
                                  <CardComposer
                                    onAdd={(title) => handleAddCard(col, title)}
                                    onCancel={closeComposer}
                                    error={composerError}
                                  />
                                ) : (
                                  <button
                                    className="add-card-btn"
                                    onClick={() => openComposer(col.id)}
                                  >
                                    <Icons.Plus />
                                    <span>Add a card</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {boardProvided.placeholder}

                {/* Add List Button */}
                <button className="add-list-btn">
                  <Icons.Plus />
                  <span>Add a list</span>
                </button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Card Edit Modal */}
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
    </div>
  );
}

// ============ Card Composer ============
function CardComposer({ onAdd, onCancel, error }) {
  const inputRef = useRef(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
      await onAdd?.(trimmed);
      setValue('');
    } catch {
      // Error handled by parent
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel?.();
    }
  };

  return (
    <div className="card-composer">
      <textarea
        ref={inputRef}
        className="card-composer__input"
        placeholder="Enter a title for this card..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
      />
      <div className="card-composer__actions">
        <Button variant="primary" size="sm" onClick={handleSubmit}>
          Add card
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {error && <div className="card-composer__error">{error}</div>}
    </div>
  );
}

// ============ Card Edit Modal ============
function CardEditModal({ title, onChange, onSave, onClose, saving, error }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose?.();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div className="card-modal-overlay">
      <div className="card-modal" ref={ref}>
        <div className="card-modal__header">
          <h3>Edit card</h3>
          <button className="card-modal__close" onClick={onClose}>
            <Icons.X />
          </button>
        </div>
        <textarea
          className="card-modal__input"
          value={title}
          onChange={(e) => onChange?.(e.target.value)}
          rows={4}
          autoFocus
        />
        {error && <div className="card-modal__error">{error}</div>}
        <div className="card-modal__actions">
          <Button variant="primary" onClick={onSave} disabled={saving} loading={saving}>
            Save
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
