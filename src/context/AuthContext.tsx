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
  EmailAuthProvider,
  reauthenticateWithCredential,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured, isMockEnabled, getSecondaryAuth } from '../services/firebase';
import { deriveAuthEmail, extractUsername, AUTH_EMAIL_DOMAIN } from '../config/brand';
import { UserProfile, UserRole, UserStatus, SignUpFormData } from '../types';
import { mockStorage } from '../services/mockStorage';
import { createNewCustomerAccount } from '../services/banking';
import { hashPin, isWeakPin } from '../utils/pin';

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
  updateProfile: (updates: Partial<Pick<UserProfile, 'email' | 'phone' | 'address' | 'routingNumber' | 'photoDataUrl'>>) => Promise<{ success: boolean; error?: string }>;
  setTransferPin: (newPin: string) => Promise<{ success: boolean; error?: string }>;
  changeTransferPin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  resetTransferPinWithPassword: (password: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
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

    // Purge draft state and PIN failure lockouts on logout
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('emprise:draft:') || k.startsWith('emprise:pinfail:'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (storageErr) {
      console.warn('Error clearing drafts and lockouts on logout:', storageErr);
    }

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

  // Safety net: after 12 seconds, if isLoading is still true, call setIsLoading(false)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading((current) => (current ? false : current));
    }, 12000);

    return () => clearTimeout(timer);
  }, []);

  // Initial Auth listener
  useEffect(() => {
    const activeAuth = auth;
    const activeDb = db;
    if (isFirebaseConfigured() && activeAuth && activeDb) {
      const withTimeout = <T,>(p: Promise<T>, ms = 8000): Promise<T> =>
        Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

      const unsubscribe = onAuthStateChanged(activeAuth, async (fbUser) => {
        try {
          setIsLoading(true);
          if (fbUser) {
            setFirebaseUser(fbUser);
            const userDocSnap = await withTimeout(getDoc(doc(activeDb, 'users', fbUser.uid)));
            if (userDocSnap.exists()) {
              const profile = userDocSnap.data() as UserProfile;
              // Check if account is disabled or closed
              if (profile.status === 'disabled' || profile.status === 'closed') {
                try {
                  await firebaseSignOut(activeAuth);
                } catch (signoutErr) {
                  console.warn('Firebase signout error:', signoutErr);
                }
                setUser(null);
                setFirebaseUser(null);
                setError(`Account ${profile.status}. Please contact Emprise Finance Member Care.`);
              } else {
                setUser(profile);
              }
            } else {
              setUser(null);
            }
          } else {
            setFirebaseUser(null);
            setUser(null);
          }
        } catch (err) {
          console.error('Error in onAuthStateChanged:', err);
          setError('Network error while verifying account status.');
          setUser(null);
          setFirebaseUser(null);
          try {
            await firebaseSignOut(activeAuth);
          } catch (signoutErr) {
            console.warn('Firebase signout error on auth error:', signoutErr);
          }
        } finally {
          setIsLoading(false);
        }
      });

      return () => unsubscribe();
    } else if (isMockEnabled) {
      // Preview/Mock mode: check localStorage for active session only if mock is enabled
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
    } else {
      setIsLoading(false);
    }
  }, []);

  // Login handler
  const login = async (
    usernameInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; role: UserRole; error?: string }> => {
    setError(null);

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
          return { success: false, role: 'customer', error: err };
        }

        const profile = userSnap.data() as UserProfile;

        // Check status right after sign-in: disabled or closed accounts cannot log in!
        if (profile.status === 'disabled' || profile.status === 'closed') {
          await firebaseSignOut(auth);
          const err = `Your account is ${profile.status}. Please contact Emprise Customer Care.`;
          setError(err);
          return { success: false, role: profile.role, error: err };
        }

        setUser(profile);
        setFirebaseUser(cred.user);
        lastActivityRef.current = Date.now();
        return { success: true, role: profile.role };
      } catch (fbErr: any) {
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
    } else if (isMockEnabled) {
      // Mock mode validation: permitted strictly when DEV=true and VITE_USE_MOCK="true"
      await new Promise((res) => setTimeout(res, 400)); // simulated latency
      const mockUser = mockStorage.getUserByUsername(cleanUsername);

      if (!mockUser) {
        const err = 'Invalid username or password.';
        setError(err);
        return { success: false, role: 'customer', error: err };
      }

      // Check status
      if (mockUser.status === 'disabled' || mockUser.status === 'closed') {
        const err = `Account is ${mockUser.status}. Access restricted.`;
        setError(err);
        return { success: false, role: mockUser.role, error: err };
      }

      // Check password (accepts 'password123' or any password for newly registered mock users)
      if (passwordInput.length < 6) {
        const err = 'Password must be at least 6 characters.';
        setError(err);
        return { success: false, role: mockUser.role, error: err };
      }

      setUser(mockUser);
      localStorage.setItem('emprise_mock_active_uid', mockUser.uid);
      lastActivityRef.current = Date.now();
      return { success: true, role: mockUser.role };
    } else {
      const err = 'Firebase is not configured. Live Firebase Authentication is required to log in.';
      setError(err);
      return { success: false, role: 'customer', error: err };
    }
  };

  // Sign up handler
  const signUp = async (
    formData: SignUpFormData
  ): Promise<{ success: boolean; accountNumber: string; error?: string }> => {
    setError(null);

    const cleanUsername = formData.username.trim().toLowerCase();
    const derivedEmail = deriveAuthEmail(cleanUsername);

    if (isFirebaseConfigured() && auth && db) {
      try {
        // Create user in Firebase Auth
        const cred = await createUserWithEmailAndPassword(auth, derivedEmail, formData.password);
        
        // Write Firestore records: users, accounts, accountDirectory, opening transaction in single writeBatch
        const { account } = await createNewCustomerAccount(cred.user.uid, formData);

        // Sign out right after signup so user logs in cleanly through the public login card
        await firebaseSignOut(auth);

        return { success: true, accountNumber: account.accountNumber };
      } catch (err: any) {
        let errorMsg = err.message || 'Unable to complete enrollment.';
        if (err.code === 'auth/email-already-in-use') {
          errorMsg = 'This username is already taken. Please choose another.';
        } else if (err.code === 'auth/weak-password') {
          errorMsg = 'Password is too weak. Please use at least 8 characters with numbers and symbols.';
        }
        setError(errorMsg);
        return { success: false, accountNumber: '', error: errorMsg };
      }
    } else if (isMockEnabled) {
      // Mock mode: permitted strictly when DEV=true and VITE_USE_MOCK="true"
      await new Promise((res) => setTimeout(res, 500));
      try {
        const { account } = mockStorage.createUser(formData);
        return { success: true, accountNumber: account.accountNumber };
      } catch (err: any) {
        const errorMsg = err.message || 'Sign up failed.';
        setError(errorMsg);
        return { success: false, accountNumber: '', error: errorMsg };
      }
    } else {
      const errorMsg = 'Firebase is not configured. Enrollment requires active Firebase credentials.';
      setError(errorMsg);
      return { success: false, accountNumber: '', error: errorMsg };
    }
  };

  // Update customer profile (contact email, phone, residential address, routing number, profile photo)
  const updateProfile = async (
    updates: Partial<Pick<UserProfile, 'email' | 'phone' | 'address' | 'routingNumber' | 'photoDataUrl'>>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No active session. Please sign in again.' };
    }

    // Whitelist allowed fields: email, phone, address, routingNumber, photoDataUrl
    const filteredUpdates: Partial<Pick<UserProfile, 'email' | 'phone' | 'address' | 'routingNumber' | 'photoDataUrl'>> = {};
    if (typeof updates.email === 'string') {
      filteredUpdates.email = updates.email.trim();
    }
    if (typeof updates.phone === 'string') {
      filteredUpdates.phone = updates.phone.trim();
    }
    if (typeof updates.routingNumber === 'string') {
      filteredUpdates.routingNumber = updates.routingNumber.trim();
    }
    if (typeof updates.photoDataUrl === 'string') {
      // Allow photoDataUrl to be removed by passing an empty string
      filteredUpdates.photoDataUrl = updates.photoDataUrl;
    }
    if (updates.address) {
      filteredUpdates.address = {
        street: updates.address.street?.trim() || '',
        apt: updates.address.apt?.trim() || '',
        city: updates.address.city?.trim() || '',
        state: updates.address.state?.trim().toUpperCase() || '',
        zip: updates.address.zip?.trim() || '',
      };
    }

    if (isFirebaseConfigured() && db) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, filteredUpdates);
        setUser((prev) => (prev ? { ...prev, ...filteredUpdates } : null));
        return { success: true };
      } catch (err: any) {
        console.error('Failed to update profile in Firestore:', err);
        return { success: false, error: err.message || 'Unable to update profile. Please try again.' };
      }
    } else if (isMockEnabled) {
      try {
        await new Promise((res) => setTimeout(res, 300));
        const mockUser = mockStorage.getUserByUid(user.uid);
        if (mockUser) {
          if (filteredUpdates.email !== undefined) mockUser.email = filteredUpdates.email;
          if (filteredUpdates.phone !== undefined) mockUser.phone = filteredUpdates.phone;
          if (filteredUpdates.routingNumber !== undefined) mockUser.routingNumber = filteredUpdates.routingNumber;
          if (filteredUpdates.photoDataUrl !== undefined) mockUser.photoDataUrl = filteredUpdates.photoDataUrl;
          if (filteredUpdates.address !== undefined) {
            mockUser.address = { ...mockUser.address, ...filteredUpdates.address };
          }
          try {
            const stored = localStorage.getItem('emprise_users_v1');
            if (stored) {
              const list = JSON.parse(stored);
              const idx = list.findIndex((u: any) => u.uid === user.uid);
              if (idx !== -1) {
                list[idx] = { ...list[idx], ...mockUser };
                localStorage.setItem('emprise_users_v1', JSON.stringify(list));
              }
            }
          } catch (storageErr) {
            console.warn('Could not persist mock user update:', storageErr);
          }
        }
        setUser((prev) => (prev ? { ...prev, ...filteredUpdates } : null));
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to update profile in mock storage.' };
      }
    } else {
      return { success: false, error: 'Firebase is not configured and preview mode is not enabled.' };
    }
  };

  // Set 4-digit transfer PIN
  const setTransferPin = async (newPin: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No active session. Please sign in.' };
    }
    const cleanPin = newPin.trim();
    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      return { success: false, error: 'PIN must be exactly 4 numeric digits.' };
    }
    if (isWeakPin(cleanPin)) {
      return { success: false, error: 'PIN is too simple. Avoid repeated digits (like 1111) or sequences (like 1234).' };
    }

    try {
      const pinHash = await hashPin(cleanPin, user.uid);
      if (isFirebaseConfigured() && db) {
        await setDoc(doc(db, 'pins', user.uid), {
          hash: pinHash,
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'users', user.uid), {
          hasPin: true,
        });
      } else if (isMockEnabled) {
        mockStorage.setPinHash(user.uid, pinHash);
      } else {
        return { success: false, error: 'Storage connection unavailable.' };
      }

      setUser((prev) => (prev ? { ...prev, hasPin: true } : null));
      localStorage.removeItem(`emprise:pinfail:${user.uid}`);
      return { success: true };
    } catch (err: any) {
      console.error('Failed to set transfer PIN:', err);
      return { success: false, error: err.message || 'Failed to save transfer PIN.' };
    }
  };

  // Change 4-digit transfer PIN verifying current PIN
  const changeTransferPin = async (
    currentPin: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No active session. Please sign in.' };
    }
    const cleanCurr = currentPin.trim();
    const cleanNew = newPin.trim();

    if (cleanCurr.length !== 4 || !/^\d{4}$/.test(cleanCurr)) {
      return { success: false, error: 'Current PIN must be 4 digits.' };
    }
    if (cleanNew.length !== 4 || !/^\d{4}$/.test(cleanNew)) {
      return { success: false, error: 'New PIN must be 4 digits.' };
    }
    if (isWeakPin(cleanNew)) {
      return { success: false, error: 'New PIN is too simple. Avoid repeated digits or straight sequences.' };
    }

    try {
      const currentHash = await hashPin(cleanCurr, user.uid);
      const newHash = await hashPin(cleanNew, user.uid);

      if (isFirebaseConfigured() && db) {
        const pinDoc = await getDoc(doc(db, 'pins', user.uid));
        if (!pinDoc.exists() || pinDoc.data()?.hash !== currentHash) {
          return { success: false, error: 'Incorrect current PIN.' };
        }
        await setDoc(doc(db, 'pins', user.uid), {
          hash: newHash,
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'users', user.uid), {
          hasPin: true,
        });
      } else if (isMockEnabled) {
        const storedHash = mockStorage.getPinHash(user.uid);
        if (storedHash && storedHash !== currentHash) {
          return { success: false, error: 'Incorrect current PIN.' };
        }
        mockStorage.setPinHash(user.uid, newHash);
      } else {
        return { success: false, error: 'Storage connection unavailable.' };
      }

      setUser((prev) => (prev ? { ...prev, hasPin: true } : null));
      localStorage.removeItem(`emprise:pinfail:${user.uid}`);
      return { success: true };
    } catch (err: any) {
      console.error('Failed to change transfer PIN:', err);
      return { success: false, error: err.message || 'Failed to change transfer PIN.' };
    }
  };

  // Reset transfer PIN using account password verification
  const resetTransferPinWithPassword = async (
    password: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No active session. Please sign in.' };
    }
    if (!password) {
      return { success: false, error: 'Account password is required for security verification.' };
    }
    const cleanNew = newPin.trim();
    if (cleanNew.length !== 4 || !/^\d{4}$/.test(cleanNew)) {
      return { success: false, error: 'New PIN must be 4 digits.' };
    }
    if (isWeakPin(cleanNew)) {
      return { success: false, error: 'New PIN is too simple. Avoid repeated digits or straight sequences.' };
    }

    try {
      if (isFirebaseConfigured() && auth && auth.currentUser && db) {
        const derivedEmail = deriveAuthEmail(user.username);
        const cred = EmailAuthProvider.credential(derivedEmail, password);
        try {
          await reauthenticateWithCredential(auth.currentUser, cred);
        } catch {
          return { success: false, error: 'Incorrect password. Verification failed.' };
        }

        const newHash = await hashPin(cleanNew, user.uid);
        await setDoc(doc(db, 'pins', user.uid), {
          hash: newHash,
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'users', user.uid), {
          hasPin: true,
        });
      } else if (isMockEnabled) {
        if (password.length < 6) {
          return { success: false, error: 'Incorrect password. Verification failed.' };
        }
        const newHash = await hashPin(cleanNew, user.uid);
        mockStorage.setPinHash(user.uid, newHash);
      } else {
        return { success: false, error: 'Storage connection unavailable.' };
      }

      setUser((prev) => (prev ? { ...prev, hasPin: true } : null));
      localStorage.removeItem(`emprise:pinfail:${user.uid}`);
      return { success: true };
    } catch (err: any) {
      console.error('Failed to reset transfer PIN with password:', err);
      return { success: false, error: err.message || 'Failed to reset transfer PIN.' };
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
        updateProfile,
        setTransferPin,
        changeTransferPin,
        resetTransferPinWithPassword,
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
