const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

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
