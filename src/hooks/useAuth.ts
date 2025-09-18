import { useState, useEffect } from 'react';
import { productionAuthService, AuthState, UserProfile } from '@/services/authService';
import { User } from 'firebase/auth';

export interface UseAuthReturn {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithTwitter: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  createAccountWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  linkWalletAddress: (walletAddress: string) => Promise<void>;
  registerAsProvider: () => Promise<void>;
  updateStorageUsage: (bytesUsed: number) => Promise<void>;
  hasStorageSpace: (requiredBytes: number) => Promise<boolean>;
  formatStorageSize: (bytes: number) => string;
  calculateStoragePercentage: (used: number, limit: number) => number;
}

export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = productionAuthService.onAuthStateChange((state) => {
      setAuthState(state);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await productionAuthService.signInWithGoogle();
    } catch (error) {
      console.error('Google sign in failed:', error);
      throw error;
    }
  };

  const signInWithGitHub = async () => {
    try {
      await productionAuthService.signInWithGitHub();
    } catch (error) {
      console.error('GitHub sign in failed:', error);
      throw error;
    }
  };

  const signInWithTwitter = async () => {
    try {
      await productionAuthService.signInWithTwitter();
    } catch (error) {
      console.error('Twitter sign in failed:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await productionAuthService.signInWithEmail(email, password);
    } catch (error) {
      console.error('Email sign in failed:', error);
      throw error;
    }
  };

  const createAccountWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      await productionAuthService.createAccountWithEmail(email, password, displayName);
    } catch (error) {
      console.error('Account creation failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await productionAuthService.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  };

  const linkWalletAddress = async (walletAddress: string) => {
    if (!authState.user) {
      throw new Error('User not authenticated');
    }
    try {
      await productionAuthService.linkWalletAddress(authState.user.uid, walletAddress);
    } catch (error) {
      console.error('Wallet linking failed:', error);
      throw error;
    }
  };

  const registerAsProvider = async () => {
    if (!authState.user) {
      throw new Error('User not authenticated');
    }
    try {
      await productionAuthService.registerAsProvider(authState.user.uid);
    } catch (error) {
      console.error('Provider registration failed:', error);
      throw error;
    }
  };

  const updateStorageUsage = async (bytesUsed: number) => {
    if (!authState.user) {
      throw new Error('User not authenticated');
    }
    try {
      await productionAuthService.updateStorageUsage(authState.user.uid, bytesUsed);
    } catch (error) {
      console.error('Storage usage update failed:', error);
      throw error;
    }
  };

  const hasStorageSpace = async (requiredBytes: number): Promise<boolean> => {
    if (!authState.user) {
      return false;
    }
    try {
      return await productionAuthService.hasStorageSpace(authState.user.uid, requiredBytes);
    } catch (error) {
      console.error('Storage space check failed:', error);
      return false;
    }
  };

  const formatStorageSize = (bytes: number): string => {
    return productionAuthService.formatStorageSize(bytes);
  };

  const calculateStoragePercentage = (used: number, limit: number): number => {
    return productionAuthService.calculateStoragePercentage(used, limit);
  };

  return {
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    error: authState.error,
    signInWithGoogle,
    signInWithGitHub,
    signInWithTwitter,
    signInWithEmail,
    createAccountWithEmail,
    signOut,
    linkWalletAddress,
    registerAsProvider,
    updateStorageUsage,
    hasStorageSpace,
    formatStorageSize,
    calculateStoragePercentage
  };
}
