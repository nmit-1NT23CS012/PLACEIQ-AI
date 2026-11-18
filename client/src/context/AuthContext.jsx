import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut,
  signInWithPopup,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  GithubAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthError('');
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ ...firebaseUser, ...userDoc.data() });
          } else {
            setUser(firebaseUser);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
        setAuthError(error.message || 'Could not load your account profile.');
      } finally {
        setLoading(false);
      }
    }, error => {
      setUser(null);
      setAuthError(error.message || 'Could not verify your account.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password, rememberMe = true) => {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = async ({ name, email, password, role }) => {
    if (!['student', 'recruiter'].includes(role)) {
      throw new Error('Choose a student or recruiter account. Admin accounts must be provisioned by an administrator.');
    }

    await setPersistence(auth, browserLocalPersistence);
    const result = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await setDoc(doc(db, 'users', result.user.uid), {
        name: name.trim(),
        email,
        role,
        createdAt: new Date().toISOString()
      });
      setUser({ ...result.user, name: name.trim(), email, role });
    } catch (error) {
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error('Could not sign out after profile creation failed:', signOutError);
      }
      throw error;
    }
    return result;
  };

  const updateUserProfile = async (updates) => {
    if (!user?.uid) {
      throw new Error('You must be signed in to update your profile.');
    }

    await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
    setUser(currentUser => ({ ...currentUser, ...updates }));
  };

  const logout = () => {
    return signOut(auth);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await ensureUserProfile(result.user);
    return result;
  };

  const signInWithGithub = async () => {
    const provider = new GithubAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await ensureUserProfile(result.user);
    return result;
  };

  const ensureUserProfile = async (firebaseUser) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const profile = userDoc.data();
      setUser({ ...firebaseUser, ...profile });
      return profile;
    }

    const profile = {
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
      email: firebaseUser.email || '',
      role: 'student',
      createdAt: new Date().toISOString()
    };
    await setDoc(userRef, profile);
    setUser({ ...firebaseUser, ...profile });
    return profile;
  };

  const resetPassword = async (email) => {
    if (!email?.trim()) {
      throw new Error('Enter your email address first.');
    }
    return sendPasswordResetEmail(auth, email.trim());
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      authError,
      login, 
      register, 
      updateUserProfile,
      logout,
      signInWithGoogle,
      signInWithGithub,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
