import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { auth } from '@/api/flowApiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  // Sunucudan gelen (Oturum Yönetimi'nden yapılandırılabilir) hareketsizlik
  // süresi -- değer henüz yüklenmemişse (ilk render) mevcut varsayılan 60 dk
  // kullanılır. Asıl zorlama artık sunucu tarafında (authMiddleware) da var;
  // bu zamanlayıcı yalnızca kullanıcıya erken uyarı + istemci tarafı çıkış içindir.
  const idleTimeoutRef = useRef(60);
  const WARNING_MS = 60 * 1000; // uyarıdan sonra 60 saniye

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    setShowSessionWarning(false);
    const timeoutMs = Math.max(1, idleTimeoutRef.current) * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      setShowSessionWarning(true);
      warningRef.current = setTimeout(() => {
        setUser(null);
        setIsAuthenticated(false);
        auth.logout();
      }, WARNING_MS);
    }, Math.max(0, timeoutMs - WARNING_MS));
  }, []);

  useEffect(() => {
    const events = ['mousedown','keydown','scroll','touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    return () => events.forEach(e => window.removeEventListener(e, resetTimer));
  }, [resetTimer]);

  useEffect(() => {
    checkUserAuth();
  }, []);


  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    try {
      const currentUser = await auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      if (currentUser?.idle_timeout_dakika > 0) idleTimeoutRef.current = currentUser.idle_timeout_dakika;
      resetTimer();
    } catch (error) {
      setIsAuthenticated(false);
      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Oturum suresi doldu' });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const extendSession = () => {
    resetTimer();
    setShowSessionWarning(false);
  };

  const login = async (email, password) => {
    const data = await auth.login(email, password);
    setUser(data.user);
    setIsAuthenticated(true);
    setAuthError(null);
    if (data.user?.idle_timeout_dakika > 0) idleTimeoutRef.current = data.user.idle_timeout_dakika;
    resetTimer();
    return data;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    auth.logout();
  };

  const navigateToLogin = () => {
    auth.redirectToLogin();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      authChecked,
      showSessionWarning,
      extendSession,
      appPublicSettings: null,
      login,
      logout,
      navigateToLogin,
      checkUserAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
