const API_URL = (process.env.REACT_APP_API_URL || '/api').replace(/\/+$/, '');

export const api = {
  async register(email, password) {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(errorData.error || 'Registration failed');
    }

    return response.json();
  },

  async login(email, password) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(errorData.error || 'Login failed');
    }

    return response.json();
  },

  async getMe(token) {
    try {
      const response = await fetch(`${API_URL}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const err = new Error('Failed to get user info');
        err.status = response.status;
        throw err;
      }

      return response.json();
    } catch (e) {
      if (e && typeof e === 'object' && !('status' in e)) {
        e.status = 0;
      }
      throw e;
    }
  },

  async getBoards(token) {
    const response = await fetch(`${API_URL}/boards`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch boards');
    return response.json();
  },

  async createBoard(title, token) {
    const response = await fetch(`${API_URL}/boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title })
    });
    if (!response.ok) throw new Error('Failed to create board');
    return response.json();
  },

  async getBoard(boardId, token) {
    const response = await fetch(`${API_URL}/boards/${boardId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch board');
    return response.json();
  },

  async createCard(listId, { title, badge, color }, token) {
    const response = await fetch(`${API_URL}/lists/${listId}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ title, badge, color }),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => 'Failed to create card');
      throw new Error(err || 'Failed to create card');
    }
    return response.json();
  },

  async updateCard(cardId, payload, token) {
    const response = await fetch(`${API_URL}/cards/${cardId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => 'Failed to update card');
      throw new Error(err || 'Failed to update card');
    }
    return response.json();
  },

  async getBoardMembers(boardId, token) {
    const response = await fetch(`${API_URL}/boards/${boardId}/members`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch board members');
    return response.json();
  },

  async inviteMember(boardId, email, token) {
    const response = await fetch(`${API_URL}/boards/${boardId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Failed to invite member' }));
      throw new Error(data.error || 'Failed to invite member');
    }
    return response.json();
  },

  async removeMember(boardId, userId, token) {
    const response = await fetch(`${API_URL}/boards/${boardId}/members/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Failed to remove member' }));
      throw new Error(data.error || 'Failed to remove member');
    }
    return response.json();
  },

  async searchUsers(query, token) {
    const response = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to search users');
    return response.json();
  },
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};
