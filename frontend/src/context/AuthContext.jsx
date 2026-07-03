import { createContext, useContext, useEffect, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (data) => {
    // Preserve restaurant info so TrialBanner can read planStatus without an extra API call
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
  };

  // Patch restaurant info after a plan change without a full re-login
  const updateRestaurant = (restaurantPatch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, restaurant: { ...(prev.restaurant || {}), ...restaurantPatch } };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    const stored = JSON.parse(localStorage.getItem('user') || 'null');

    // Clear auth state synchronously first — no race window where user is
    // still "logged in" while the navigate fires.
    localStorage.removeItem('user');
    setUser(null);

    // Fire server-side refresh token revocation in the background.
    // Never block navigation on a network request.
    if (stored?.refreshToken) {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      fetch(`${base}/auth/logout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: stored.refreshToken }),
      }).catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateRestaurant, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
