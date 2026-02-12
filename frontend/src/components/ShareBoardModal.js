import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import './ShareBoardModal.css';

function getInitials(email) {
    if (!email) return '?';
    const parts = email.split('@')[0];
    return parts.slice(0, 2).toUpperCase();
}

export default function ShareBoardModal({ boardId, boardOwnerId, authToken, currentUserEmail, onClose }) {
    const modalRef = useRef(null);
    const searchTimerRef = useRef(null);

    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success'|'error', message }

    // Load members
    const loadMembers = useCallback(async () => {
        if (!boardId || !authToken) return;
        try {
            setMembersLoading(true);
            const data = await api.getBoardMembers(boardId, authToken);
            setMembers(data || []);
        } catch {
            // silently fail
        } finally {
            setMembersLoading(false);
        }
    }, [boardId, authToken]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    // Close on outside click or Escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
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

    // Debounced search
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        searchTimerRef.current = setTimeout(async () => {
            try {
                const users = await api.searchUsers(searchQuery.trim(), authToken);
                // Filter out users who are already members
                const memberIds = new Set(members.map((m) => m.user_id));
                const filtered = (users || []).filter((u) => !memberIds.has(u.id));
                setSearchResults(filtered);
                setShowDropdown(true);
            } catch {
                setSearchResults([]);
            }
        }, 300);

        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [searchQuery, authToken, members]);

    const handleInvite = async (email) => {
        if (!email || inviting) return;

        try {
            setInviting(true);
            setStatus(null);
            await api.inviteMember(boardId, email, authToken);
            setStatus({ type: 'success', message: `${email} has been invited!` });
            setSearchQuery('');
            setShowDropdown(false);
            setSearchResults([]);
            await loadMembers();
        } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Failed to invite user' });
        } finally {
            setInviting(false);
        }
    };

    const handleRemove = async (userId, email) => {
        try {
            setStatus(null);
            await api.removeMember(boardId, userId, authToken);
            setStatus({ type: 'success', message: `${email} has been removed` });
            await loadMembers();
        } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Failed to remove member' });
        }
    };

    const handleSelectUser = (user) => {
        setSearchQuery(user.email);
        setShowDropdown(false);
        handleInvite(user.email);
    };

    const handleInviteClick = () => {
        const email = searchQuery.trim();
        if (email) handleInvite(email);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleInviteClick();
        }
    };

    const isOwner = (member) => member.role === 'owner';

    return (
        <div className="share-modal-overlay">
            <div className="share-modal" ref={modalRef}>
                {/* Header */}
                <div className="share-modal__header">
                    <h3>
                        <span className="share-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></span>
                        Share board
                    </h3>
                    <button className="share-modal__close" onClick={onClose}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="share-modal__body">
                    {/* Invite Section */}
                    <div className="share-invite-section">
                        <label>Invite by email</label>
                        <div className="share-invite-row">
                            <div className="share-search-wrapper">
                                <input
                                    type="text"
                                    className="share-search-input"
                                    placeholder="Search by email address..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => {
                                        if (searchResults.length > 0) setShowDropdown(true);
                                    }}
                                />

                                {/* Search Dropdown */}
                                {showDropdown && (
                                    <div className="share-search-dropdown">
                                        {searchResults.length > 0 ? (
                                            searchResults.map((user) => (
                                                <button
                                                    key={user.id}
                                                    className="share-search-item"
                                                    onClick={() => handleSelectUser(user)}
                                                >
                                                    <div className="share-search-avatar">
                                                        {getInitials(user.email)}
                                                    </div>
                                                    <span>{user.email}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="share-search-no-results">
                                                No users found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                className="share-invite-btn"
                                onClick={handleInviteClick}
                                disabled={!searchQuery.trim() || inviting}
                            >
                                {inviting ? 'Inviting...' : 'Invite'}
                            </button>
                        </div>

                        {/* Status message */}
                        {status && (
                            <div className={`share-status share-status--${status.type}`}>
                                {status.message}
                            </div>
                        )}
                    </div>

                    {/* Members List */}
                    <div className="share-members-section">
                        <h4>Members ({members.length})</h4>

                        {membersLoading ? (
                            <div className="share-members-loading">
                                <div className="spinner" />
                                <span>Loading members...</span>
                            </div>
                        ) : members.length === 0 ? (
                            <div className="share-members-empty">
                                No members yet. Invite someone to collaborate!
                            </div>
                        ) : (
                            <div className="share-members-list">
                                {members.map((member) => (
                                    <div key={member.id} className="share-member-item">
                                        <div className={`share-member-avatar share-member-avatar--${member.role}`}>
                                            {getInitials(member.email)}
                                        </div>
                                        <div className="share-member-info">
                                            <div className="share-member-email">
                                                {member.email}
                                                {member.email === currentUserEmail && ' (you)'}
                                            </div>
                                        </div>
                                        <span className={`share-member-role share-member-role--${member.role}`}>
                                            {member.role}
                                        </span>
                                        {!isOwner(member) && member.user_id !== boardOwnerId && (
                                            <button
                                                className="share-member-remove"
                                                onClick={() => handleRemove(member.user_id, member.email)}
                                                title="Remove member"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
