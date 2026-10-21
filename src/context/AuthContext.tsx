/**
 * Authentication Context for Emprise Finance
 * Handles username/password login, email derivation, role retrieval,
 * account status checks, 15-minute inactivity auto-logout, and session expiration.
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured, getSecondaryAuth } from '../services/firebase';
import { deriveAuthEmail, extractUsername, AUTH_EMAIL_DOMAIN } from '../config/brand';
import { UserProfile, UserRole, UserStatus, SignUpFormData } from '../types';
import { mockStorage } from '../services/mockStorage';
import { createNewCustomerAccount } from '../services/banking';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  role: UserRole | null;
  status: UserStatus | null;
  isLoading: boolean;
  error: string | null;
  isFirebaseActive: boolean;
  isSessionExpiredModalOpen: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; role: UserRole; error?: string }>;
  signUp: (formData: SignUpFormData) => Promise<{ success: boolean; accountNumber: string; error?: string }>;
  logout: (isTimeout?: boolean) => Promise<void>;
  closeSessionExpiredModal: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 15 minutes of inactivity = 15 * 60 * 1000 ms
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSessionExpiredModalOpen, setIsSessionExpiredModalOpen] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<any>(null);

  // Clear error utility
  const clearError = () => setError(null);

  // Logout function
  const logout = useCallback(async (isTimeout = false) => {
    if (isFirebaseConfigured() && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn('Firebase signout error:', err);
      }
    }
    setUser(null);
    setFirebaseUser(null);
    localStorage.removeItem('emprise_mock_active_uid');

    if (isTimeout) {
      setIsSessionExpiredModalOpen(true);
    }
  }, []);

  // Inactivity tracking
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!user) return;

    const checkInactivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        console.warn('Auto-logging out user due to 15 minutes of inactivity');
        logout(true);
      }
    };

    inactivityTimerRef.current = setInterval(checkInactivity, 30000); // Check every 30s

    const activityEvents = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetInactivityTimer, { passive: true }));

    return () => {
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetInactivityTimer));
    };
  }, [user, logout, resetInactivityTimer]);

  // Initial Auth listener
  useEffect(() => {
    const activeAuth = auth;
    const activeDb = db;
    if (isFirebaseConfigured() && activeAuth && activeDb) {
      const unsubscribe = onAuthStateChanged(activeAuth, async (fbUser) => {
        setIsLoading(true);
        if (fbUser) {
          setFirebaseUser(fbUser);
          try {
            const userDocSnap = await getDoc(doc(activeDb, 'users', fbUser.uid));
            if (userDocSnap.exists()) {
              const profile = userDocSnap.data() as UserProfile;
              // Check if account is disabled or closed
              if (profile.status === 'disabled' || profile.status === 'closed') {
                await firebaseSignOut(activeAuth);
                setUser(null);
                setFirebaseUser(null);
                setError(`Account ${profile.status}. Please contact Emprise Finance Member Care.`);
              } else {
                setUser(profile);
              }
            } else {
              setUser(null);
            }
          } catch (err) {
            console.error('Error fetching user profile:', err);
            setError('Network error while verifying account status.');
            setUser(null);
          }
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Preview/Mock mode: check localStorage for active session
      const storedUid = localStorage.getItem('emprise_mock_active_uid');
      if (storedUid) {
        const mockUser = mockStorage.getUserByUid(storedUid);
        if (mockUser && mockUser.status === 'active') {
          setUser(mockUser);
        } else {
          localStorage.removeItem('emprise_mock_active_uid');
        }
      }
      setIsLoading(false);
    }
  }, []);

  // Login handler
  const login = async (
    usernameInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; role: UserRole; error?: string }> => {
    setError(null);
    setIsLoading(true);

    const cleanUsername = usernameInput.trim().toLowerCase();
    const derivedEmail = deriveAuthEmail(cleanUsername);

    if (isFirebaseConfigured() && auth && db) {
      try {
        const cred = await signInWithEmailAndPassword(auth, derivedEmail, passwordInput);
        const userDocRef = doc(db, 'users', cred.user.uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          await firebaseSignOut(auth);
          const err = 'User profile record not found.';
          setError(err);
          setIsLoading(false);
          return { success: false, role: 'customer', error: err };
        }

        const profile = userSnap.data() as UserProfile;

        // Check status right after sign-in: disabled or closed accounts cannot log in!
        if (profile.status === 'disabled' || profile.status === 'closed') {
          await firebaseSignOut(auth);
          const err = `Your account is ${profile.status}. Please contact Emprise Customer Care.`;
          setError(err);
          setIsLoading(false);
          return { success: false, role: profile.role, error: err };
        }

        setUser(profile);
        setFirebaseUser(cred.user);
        lastActivityRef.current = Date.now();
        setIsLoading(false);
        return { success: true, role: profile.role };
      } catch (fbErr: any) {
        setIsLoading(false);
        let errorMsg = 'Invalid credentials. Please verify your username and password.';

        if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
          errorMsg = 'Invalid username or password.';
        } else if (fbErr.code === 'auth/user-disabled') {
          errorMsg = 'This account has been disabled. Contact customer care.';
        } else if (fbErr.code === 'auth/network-request-failed') {
          errorMsg = 'Network connection failed. Please check your internet connection.';
        } else if (fbErr.code === 'auth/too-many-requests') {
          errorMsg = 'Too many failed login attempts. Please try again in a few minutes.';
        }

        setError(errorMsg);
        return { success: false, role: 'customer', error: errorMsg };
      }
    } else {
      // Mock mode validation
      await new Promise((res) => setTimeout(res, 400)); // simulated latency
      const mockUser = mockStorage.getUserByUsername(cleanUsername);

      if (!mockUser) {
        setIsLoading(false);
        const err = 'Invalid username or password.';
        setError(err);
        return { success: false, role: 'customer', error: err };
      }

      // Check status
      if (mockUser.status === 'disabled' || mockUser.status === 'closed') {
        setIsLoading(false);
        const err = `Account is ${mockUser.status}. Access restricted.`;
        setError(err);
        return { success: false, role: mockUser.role, error: err };
      }

      // Check password (accepts 'password123' or any password for newly registered mock users)
      if (passwordInput.length < 6) {
        setIsLoading(false);
        const err = 'Password must be at least 6 characters.';
        setError(err);
        return { success: false, role: mockUser.role, error: err };
      }

      setUser(mockUser);
      localStorage.setItem('emprise_mock_active_uid', mockUser.uid);
      lastActivityRef.current = Date.now();
      setIsLoading(false);
      return { success: true, role: mockUser.role };
    }
  };

  // Sign up handler
  const signUp = async (
    formData: SignUpFormData
  ): Promise<{ success: boolean; accountNumber: string; error?: string }> => {
    setError(null);
    setIsLoading(true);

    const cleanUsername = formData.username.trim().toLowerCase();
    const derivedEmail = deriveAuthEmail(cleanUsername);

    if (isFirebaseConfigured() && auth && db) {
      try {
        // Create user in Firebase Auth
        const cred = await createUserWithEmailAndPassword(auth, derivedEmail, formData.password);
        
        // Write Firestore records: users, accounts, accountDirectory
        const { account } = await createNewCustomerAccount(cred.user.uid, formData);

        // Sign out right after signup so user logs in cleanly through the public login card,
        // or let them see their success account number
        await firebaseSignOut(auth);

        setIsLoading(false);
        return { success: true, accountNumber: account.accountNumber };
      } catch (err: any) {
        setIsLoading(false);
        let errorMsg = err.message || 'Unable to complete enrollment.';
        if (err.code === 'auth/email-already-in-use') {
          errorMsg = 'This username is already taken. Please choose another.';
        } else if (err.code === 'auth/weak-password') {
          errorMsg = 'Password is too weak. Please use at least 8 characters with numbers and symbols.';
        }
        setError(errorMsg);
        return { success: false, accountNumber: '', error: errorMsg };
      }
    } else {
      // Mock mode
      await new Promise((res) => setTimeout(res, 500));
      try {
        const { account } = mockStorage.createUser(formData);
        setIsLoading(false);
        return { success: true, accountNumber: account.accountNumber };
      } catch (err: any) {
        setIsLoading(false);
        const errorMsg = err.message || 'Sign up failed.';
        setError(errorMsg);
        return { success: false, accountNumber: '', error: errorMsg };
      }
    }
  };

  const closeSessionExpiredModal = () => {
    setIsSessionExpiredModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        role: user?.role || null,
        status: user?.status || null,
        isLoading,
        error,
        isFirebaseActive: isFirebaseConfigured(),
        isSessionExpiredModalOpen,
        login,
        signUp,
        logout,
        closeSessionExpiredModal,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
