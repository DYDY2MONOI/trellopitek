import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../services/api';
import ShareBoardModal from '../components/ShareBoardModal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageHeader, PageContent } from '../components/layout/MainLayout';
import './BoardsPage.css';

// Icons
// Preset tags
const PRESET_TAGS = [
  { name: 'Bug', color: 'destructive' },
  { name: 'Feature', color: 'primary' },
  { name: 'Enhancement', color: 'accent' },
  { name: 'Urgent', color: 'warning' },
  { name: 'Documentation', color: 'success' },
];

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
        description: card.description || '',
        badge: card.badge,
        color: card.color || 'primary',
        tags: card.tags || [],
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
export default function BoardsPage({ authToken, user }) {
  const { boardId } = useParams();
  const navigate = useNavigate();

  const [columns, setColumns] = useState(() => ensureIds(defaultKanban));
  const [title, setTitle] = useState('My Board');
  const [isStarred, setIsStarred] = useState(false);
  const [composerFor, setComposerFor] = useState(null);
  const [composerError, setComposerError] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingTags, setEditingTags] = useState([]);
  const [editingComments, setEditingComments] = useState([]);
  const [editingError, setEditingError] = useState('');
  const [editingSaving, setEditingSaving] = useState(false);
  const [editingLoading, setEditingLoading] = useState(false);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [boardMembers, setBoardMembers] = useState([]);
  const [boardOwnerID, setBoardOwnerID] = useState(null);

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
            description: c.description || '',
            badge: c.badge,
            color: c.color || 'primary',
            tags: c.tags || [],
          })),
        })));
        setColumns(mapped);
        setBoardOwnerID(detail.user_id);
        setBoardLoading(false);
        // Load members
        try {
          const membersData = await api.getBoardMembers(boardId, authToken);
          setBoardMembers(membersData || []);
        } catch { /* silently fail */ }
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
  const openCardEditor = async (card, columnId) => {
    setEditingCard({ cardId: card.id, columnId });
    setEditingTitle(card.title);
    setEditingDescription(card.description || '');
    setEditingTags(card.tags || []);
    setEditingComments([]);
    setEditingError('');
    setEditingLoading(true);

    if (authToken) {
      try {
        const detail = await api.getCard(card.id, authToken);
        setEditingDescription(detail.description || '');
        setEditingTags(detail.tags || []);
        setEditingComments(detail.comments || []);
      } catch { /* use what we have */ }
    }
    setEditingLoading(false);
  };

  const closeCardEditor = () => {
    setEditingCard(null);
    setEditingTitle('');
    setEditingDescription('');
    setEditingTags([]);
    setEditingComments([]);
    setEditingError('');
    setEditingSaving(false);
    setEditingLoading(false);
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
        await api.updateCard(editingCard.cardId, {
          title: nextTitle,
          description: editingDescription,
        }, authToken);
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
          card.id === editingCard.cardId
            ? { ...card, title: nextTitle, description: editingDescription, tags: editingTags }
            : card
        ),
      };
    }));

    setEditingSaving(false);
    closeCardEditor();
  };

  const handleAddTag = async (name, color) => {
    if (!editingCard || !authToken) return;
    try {
      const tag = await api.addCardTag(editingCard.cardId, { name, color }, authToken);
      setEditingTags((prev) => [...prev.filter(t => t.name !== name), tag]);
    } catch { /* ignore */ }
  };

  const handleRemoveTag = async (tagId) => {
    if (!editingCard || !authToken) return;
    try {
      await api.removeCardTag(editingCard.cardId, tagId, authToken);
      setEditingTags((prev) => prev.filter(t => t.id !== tagId));
    } catch { /* ignore */ }
  };

  const handleAddComment = async (content) => {
    if (!editingCard || !authToken) return;
    try {
      const comment = await api.addCardComment(editingCard.cardId, content, authToken);
      setEditingComments((prev) => [...prev, comment]);
    } catch { /* ignore */ }
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
          {/* Member Avatars */}
          {boardMembers.length > 0 && (
            <div className="board-header__members">
              {boardMembers.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className={`board-header__member-avatar board-header__member-avatar--${m.role}`}
                  title={m.email}
                >
                  {m.email ? m.email.slice(0, 2).toUpperCase() : '?'}
                </div>
              ))}
              {boardMembers.length > 4 && (
                <div className="board-header__member-more">
                  +{boardMembers.length - 4}
                </div>
              )}
            </div>
          )}
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
          <Button variant="primary" size="sm" onClick={() => setShowShareModal(true)}>Share</Button>
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
                                        {card.tags && card.tags.length > 0 && (
                                          <div className="board-card__tags">
                                            {card.tags.map((tag) => (
                                              <span key={tag.id} className={`board-card__tag board-card__tag--${tag.color}`}>
                                                {tag.name}
                                              </span>
                                            ))}
                                          </div>
                                        )}
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
          description={editingDescription}
          tags={editingTags}
          comments={editingComments}
          loading={editingLoading}
          onTitleChange={setEditingTitle}
          onDescriptionChange={setEditingDescription}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onAddComment={handleAddComment}
          onSave={handleEditCardSave}
          onClose={closeCardEditor}
          saving={editingSaving}
          error={editingError}
          user={user}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareBoardModal
          boardId={boardId}
          boardOwnerId={boardOwnerID}
          authToken={authToken}
          currentUserEmail={user?.email}
          onClose={() => {
            setShowShareModal(false);
            // Refresh members
            api.getBoardMembers(boardId, authToken)
              .then((data) => setBoardMembers(data || []))
              .catch(() => { });
          }}
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
function CardEditModal({
  title, description, tags, comments, loading,
  onTitleChange, onDescriptionChange,
  onAddTag, onRemoveTag, onAddComment,
  onSave, onClose, saving, error, user,
}) {
  const ref = useRef(null);
  const commentsEndRef = useRef(null);
  const [customTagName, setCustomTagName] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [activeSection, setActiveSection] = useState('details');

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleAddCustomTag = () => {
    const name = customTagName.trim();
    if (!name) return;
    onAddTag?.(name, 'primary');
    setCustomTagName('');
  };

  const handlePostComment = () => {
    const content = commentDraft.trim();
    if (!content) return;
    onAddComment?.(content);
    setCommentDraft('');
  };

  const isTagActive = (tagName) => tags?.some(t => t.name === tagName);

  const formatTime = (dateStr) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString();
    } catch { return ''; }
  };

  return (
    <div className="card-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="card-modal" ref={ref}>
        {/* Header */}
        <div className="card-modal__header">
          <div className="card-modal__header-left">
            <div className="card-modal__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </div>
            <h3>Edit Card</h3>
          </div>
          <button className="card-modal__close" onClick={onClose}>
            <Icons.X />
          </button>
        </div>

        {loading ? (
          <div className="card-modal__loading">
            <div className="app-loading__spinner" />
            <p>Loading card details...</p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="card-modal__tabs">
              <button
                className={`card-modal__tab ${activeSection === 'details' ? 'card-modal__tab--active' : ''}`}
                onClick={() => setActiveSection('details')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Details
              </button>
              <button
                className={`card-modal__tab ${activeSection === 'comments' ? 'card-modal__tab--active' : ''}`}
                onClick={() => setActiveSection('comments')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Comments
                {comments && comments.length > 0 && (
                  <span className="card-modal__tab-badge">{comments.length}</span>
                )}
              </button>
            </div>

            <div className="card-modal__body">
              {activeSection === 'details' && (
                <>
                  {/* Title Section */}
                  <div className="card-modal__section">
                    <label className="card-modal__label">Title</label>
                    <input
                      className="card-modal__title-input"
                      value={title}
                      onChange={(e) => onTitleChange?.(e.target.value)}
                      placeholder="Card title..."
                      autoFocus
                    />
                  </div>

                  {/* Tags Section */}
                  <div className="card-modal__section">
                    <label className="card-modal__label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      Tags
                    </label>
                    <div className="card-modal__tags-presets">
                      {PRESET_TAGS.map((preset) => {
                        const active = isTagActive(preset.name);
                        return (
                          <button
                            key={preset.name}
                            className={`card-modal__tag-preset card-modal__tag-preset--${preset.color} ${active ? 'card-modal__tag-preset--active' : ''}`}
                            onClick={() => {
                              if (active) {
                                const tag = tags.find(t => t.name === preset.name);
                                if (tag) onRemoveTag?.(tag.id);
                              } else {
                                onAddTag?.(preset.name, preset.color);
                              }
                            }}
                          >
                            {active && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                            {preset.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active tags */}
                    {tags && tags.length > 0 && (
                      <div className="card-modal__tags-active">
                        {tags.map((tag) => (
                          <span key={tag.id} className={`card-modal__tag card-modal__tag--${tag.color}`}>
                            {tag.name}
                            <button onClick={() => onRemoveTag?.(tag.id)} className="card-modal__tag-remove">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Custom tag input */}
                    <div className="card-modal__custom-tag">
                      <input
                        className="card-modal__custom-tag-input"
                        placeholder="Add custom tag..."
                        value={customTagName}
                        onChange={(e) => setCustomTagName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddCustomTag(); }
                        }}
                      />
                      <button
                        className="card-modal__custom-tag-btn"
                        onClick={handleAddCustomTag}
                        disabled={!customTagName.trim()}
                      >
                        <Icons.Plus />
                      </button>
                    </div>
                  </div>

                  {/* Description Section */}
                  <div className="card-modal__section">
                    <label className="card-modal__label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="17" y1="10" x2="3" y2="10" />
                        <line x1="21" y1="6" x2="3" y2="6" />
                        <line x1="21" y1="14" x2="3" y2="14" />
                        <line x1="17" y1="18" x2="3" y2="18" />
                      </svg>
                      Description
                    </label>
                    <textarea
                      className="card-modal__desc-input"
                      value={description}
                      onChange={(e) => onDescriptionChange?.(e.target.value)}
                      placeholder="Add a more detailed description..."
                      rows={5}
                    />
                  </div>
                </>
              )}

              {activeSection === 'comments' && (
                <div className="card-modal__comments">
                  {/* Comments list */}
                  <div className="card-modal__comments-list">
                    {(!comments || comments.length === 0) && (
                      <div className="card-modal__comments-empty">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <p>No comments yet</p>
                        <span>Be the first to comment on this card</span>
                      </div>
                    )}
                    {comments && comments.map((c) => (
                      <div key={c.id} className="card-modal__comment">
                        <div className="card-modal__comment-avatar">
                          {(c.user_email || '').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="card-modal__comment-body">
                          <div className="card-modal__comment-meta">
                            <span className="card-modal__comment-author">{c.user_email}</span>
                            <span className="card-modal__comment-time">{formatTime(c.created_at)}</span>
                          </div>
                          <div className="card-modal__comment-content">{c.content}</div>
                        </div>
                      </div>
                    ))}
                    <div ref={commentsEndRef} />
                  </div>

                  {/* Comment composer */}
                  <div className="card-modal__comment-compose">
                    <div className="card-modal__comment-compose-avatar">
                      {(user?.email || '').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="card-modal__comment-compose-input-wrap">
                      <textarea
                        className="card-modal__comment-compose-input"
                        placeholder="Leave a comment..."
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handlePostComment();
                          }
                        }}
                        rows={2}
                      />
                      <button
                        className="card-modal__comment-send"
                        onClick={handlePostComment}
                        disabled={!commentDraft.trim()}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && <div className="card-modal__error">{error}</div>}

            {/* Footer Actions */}
            <div className="card-modal__actions">
              <Button variant="primary" onClick={onSave} disabled={saving} loading={saving}>
                Save Changes
              </Button>
              <Button variant="ghost" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
