import { createContext, useContext, useEffect, useState } from 'react';

export const PlatformAuthContext = createContext();

export const PlatformAuthProvider = ({ children }) => {
  const [platformAdmin, setPlatformAdmin] = useState(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('platformAdmin');
    if (stored) {
      try { setPlatformAdmin(JSON.parse(stored)); }
      catch { localStorage.removeItem('platformAdmin'); }
    }
    setLoading(false);
  }, []);

  const platformLogin = (data) => {
    localStorage.setItem('platformAdmin', JSON.stringify(data));
    setPlatformAdmin(data);
  };

  const platformLogout = () => {
    localStorage.removeItem('platformAdmin');
    setPlatformAdmin(null);
  };

  return (
    <PlatformAuthContext.Provider value={{ platformAdmin, platformLogin, platformLogout, loading }}>
      {children}
    </PlatformAuthContext.Provider>
  );
};

export const usePlatformAuth = () => useContext(PlatformAuthContext);
