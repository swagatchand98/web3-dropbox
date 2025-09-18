import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
  UserCredential,
  onAuthStateChanged,
  Unsubscribe
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  increment
} from 'firebase/firestore';
import { auth, db, googleProvider, githubProvider, twitterProvider } from '@/config/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  walletAddress?: string;
  storageUsed: number;
  storageLimit: number;
  isProvider: boolean;
  providerStats?: {
    totalEarnings: number;
    storageProvided: number;
    reputation: number;
  };
  createdAt: any;
  lastLoginAt: any;
  plan: 'free' | 'premium' | 'provider';
  version: number; // For data migration
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

class ProductionAuthService {
  private authStateListeners: ((state: AuthState) => void)[] = [];
  private currentAuthState: AuthState = {
    user: null,
    profile: null,
    loading: true,
    error: null
  };

  constructor() {
    this.initializeAuthListener();
  }

  // Initialize auth state listener
  private initializeAuthListener(): void {
    onAuthStateChanged(auth, async (user) => {
      try {
        this.updateAuthState({ loading: true, error: null });

        if (user) {
          // User is signed in
          const profile = await this.ensureUserProfile(user);
          this.updateAuthState({
            user,
            profile,
            loading: false,
            error: null
          });
        } else {
          // User is signed out
          this.updateAuthState({
            user: null,
            profile: null,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        this.updateAuthState({
          user,
          profile: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication error'
        });
      }
    });
  }

  // Update auth state and notify listeners
  private updateAuthState(updates: Partial<AuthState>): void {
    this.currentAuthState = { ...this.currentAuthState, ...updates };
    this.authStateListeners.forEach(listener => listener(this.currentAuthState));
  }

  // Subscribe to auth state changes
  public onAuthStateChange(callback: (state: AuthState) => void): Unsubscribe {
    this.authStateListeners.push(callback);
    // Immediately call with current state
    callback(this.currentAuthState);
    
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // Get current auth state
  public getCurrentAuthState(): AuthState {
    return this.currentAuthState;
  }

  // Ensure user profile exists and is up to date
  private async ensureUserProfile(user: User): Promise<UserProfile> {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        
        // Check if profile needs updating
        const needsUpdate = 
          data.email !== user.email ||
          data.displayName !== user.displayName ||
          data.photoURL !== user.photoURL ||
          !data.version || data.version < 1;

        if (needsUpdate) {
          await this.updateExistingProfile(userRef, user, data);
        }

        // Update last login
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp()
        });

        return { uid: user.uid, ...data } as UserProfile;
      } else {
        // Create new profile
        return await this.createNewProfile(user);
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
      // Return a safe default profile
      return this.createDefaultProfile(user);
    }
  }

  // Create new user profile
  private async createNewProfile(user: User): Promise<UserProfile> {
    const now = serverTimestamp();
    const profileData: Omit<UserProfile, 'uid'> = {
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      storageUsed: 0,
      storageLimit: 5 * 1024 * 1024 * 1024, // 5GB free tier
      isProvider: false,
      createdAt: now,
      lastLoginAt: now,
      plan: 'free',
      version: 1
    };

    // Only add photoURL if it exists
    if (user.photoURL) {
      (profileData as any).photoURL = user.photoURL;
    }

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, profileData);

    return { uid: user.uid, ...profileData } as UserProfile;
  }

  // Update existing profile
  private async updateExistingProfile(userRef: any, user: User, existingData: any): Promise<void> {
    const updateData: any = {
      email: user.email || existingData.email,
      displayName: user.displayName || existingData.displayName,
      version: 1
    };

    // Handle photoURL carefully
    if (user.photoURL) {
      updateData.photoURL = user.photoURL;
    } else if (existingData.photoURL) {
      // Keep existing photoURL if user doesn't have one
      updateData.photoURL = existingData.photoURL;
    }

    await updateDoc(userRef, updateData);
  }

  // Create default profile for error cases
  private createDefaultProfile(user: User): UserProfile {
    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'User',
      photoURL: user.photoURL || undefined,
      storageUsed: 0,
      storageLimit: 5 * 1024 * 1024 * 1024, // 5GB
      isProvider: false,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      plan: 'free',
      version: 1
    };
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<UserCredential> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Sign in with GitHub
  async signInWithGitHub(): Promise<UserCredential> {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      return result;
    } catch (error) {
      console.error('GitHub sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Sign in with Twitter
  async signInWithTwitter(): Promise<UserCredential> {
    try {
      const result = await signInWithPopup(auth, twitterProvider);
      return result;
    } catch (error) {
      console.error('Twitter sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<UserCredential> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      console.error('Email sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Create account with email and password
  async createAccountWithEmail(
    email: string, 
    password: string, 
    displayName: string
  ): Promise<UserCredential> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      await updateProfile(result.user, { displayName });
      
      return result;
    } catch (error) {
      console.error('Email account creation error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      
      // Remove undefined values
      const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      await updateDoc(userRef, cleanUpdates);
      
      // Update local state
      if (this.currentAuthState.profile && this.currentAuthState.profile.uid === uid) {
        const updatedProfile = { ...this.currentAuthState.profile, ...cleanUpdates };
        this.updateAuthState({ profile: updatedProfile });
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw this.handleAuthError(error);
    }
  }

  // Link wallet address to user profile
  async linkWalletAddress(uid: string, walletAddress: string): Promise<void> {
    try {
      // Check if wallet is already linked to another user
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('walletAddress', '==', walletAddress));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty && querySnapshot.docs[0].id !== uid) {
        throw new Error('This wallet address is already linked to another account');
      }
      
      // Link wallet to current user
      await this.updateUserProfile(uid, { walletAddress });
    } catch (error) {
      console.error('Error linking wallet address:', error);
      throw this.handleAuthError(error);
    }
  }

  // Register as storage provider
  async registerAsProvider(uid: string): Promise<void> {
    try {
      await this.updateUserProfile(uid, {
        isProvider: true,
        plan: 'provider',
        providerStats: {
          totalEarnings: 0,
          storageProvided: 0,
          reputation: 100
        }
      });
    } catch (error) {
      console.error('Error registering as provider:', error);
      throw this.handleAuthError(error);
    }
  }

  // Update storage usage with atomic increment
  async updateStorageUsage(uid: string, bytesUsed: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        storageUsed: increment(bytesUsed)
      });

      // Update local state
      if (this.currentAuthState.profile && this.currentAuthState.profile.uid === uid) {
        const updatedProfile = {
          ...this.currentAuthState.profile,
          storageUsed: this.currentAuthState.profile.storageUsed + bytesUsed
        };
        this.updateAuthState({ profile: updatedProfile });
      }
    } catch (error) {
      console.error('Error updating storage usage:', error);
      throw this.handleAuthError(error);
    }
  }

  // Check if user has enough storage space
  async hasStorageSpace(uid: string, requiredBytes: number): Promise<boolean> {
    try {
      const profile = this.currentAuthState.profile;
      if (profile && profile.uid === uid) {
        return (profile.storageUsed + requiredBytes) <= profile.storageLimit;
      }
      
      // Fallback to database check
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        return (data.storageUsed + requiredBytes) <= data.storageLimit;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking storage space:', error);
      return false;
    }
  }

  // Handle authentication errors
  private handleAuthError(error: any): Error {
    if (error?.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          return new Error('No account found with this email address');
        case 'auth/wrong-password':
          return new Error('Incorrect password');
        case 'auth/email-already-in-use':
          return new Error('An account with this email already exists');
        case 'auth/weak-password':
          return new Error('Password is too weak');
        case 'auth/invalid-email':
          return new Error('Invalid email address');
        case 'auth/popup-closed-by-user':
          return new Error('Sign-in popup was closed');
        case 'auth/cancelled-popup-request':
          return new Error('Sign-in was cancelled');
        case 'auth/network-request-failed':
          return new Error('Network error. Please check your connection');
        default:
          return new Error(error.message || 'Authentication failed');
      }
    }
    return error instanceof Error ? error : new Error('Unknown authentication error');
  }

  // Utility methods
  formatStorageSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  calculateStoragePercentage(used: number, limit: number): number {
    return Math.round((used / limit) * 100);
  }
}

// Create singleton instance
export const productionAuthService = new ProductionAuthService();
export default productionAuthService;
