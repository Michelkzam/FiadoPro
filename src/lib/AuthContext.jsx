import React, { createContext, useState, useContext, useEffect } from "react";
import db from "@/lib/db";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const authed = await db.auth.isAuthenticated();
      if (authed) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
      }

      setAppPublicSettings({ appName: "FiadoPro" });
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error("Unexpected error:", error);
      setAuthError({ type: "unknown", message: error.message || "An unexpected error occurred" });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await db.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error("User auth check failed:", error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);

      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: "auth_required", message: "Authentication required" });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    db.auth.logout();
    if (shouldRedirect) {
      window.location.href = "/login";
    }
  };

  const navigateToLogin = () => {
    db.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
