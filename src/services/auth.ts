import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
  UserCredential
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
  getDocs
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
}

class AuthService {
  // Sign in with Google
  async signInWithGoogle(): Promise<UserCredential> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await this.createOrUpdateUserProfile(result.user);
      return result;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }

  // Sign in with GitHub
  async signInWithGitHub(): Promise<UserCredential> {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      await this.createOrUpdateUserProfile(result.user);
      return result;
    } catch (error) {
      console.error('GitHub sign in error:', error);
      throw error;
    }
  }

  // Sign in with Twitter
  async signInWithTwitter(): Promise<UserCredential> {
    try {
      const result = await signInWithPopup(auth, twitterProvider);
      await this.createOrUpdateUserProfile(result.user);
      return result;
    } catch (error) {
      console.error('Twitter sign in error:', error);
      throw error;
    }
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<UserCredential> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await this.updateLastLogin(result.user.uid);
      return result;
    } catch (error) {
      console.error('Email sign in error:', error);
      throw error;
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
      
      // Create user profile in Firestore
      await this.createOrUpdateUserProfile(result.user, displayName);
      
      return result;
    } catch (error) {
      console.error('Email account creation error:', error);
      throw error;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Create or update user profile in Firestore
  async createOrUpdateUserProfile(user: User, customDisplayName?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      const now = serverTimestamp();
      
      if (!userSnap.exists()) {
        // Create new user profile - remove undefined values
        const userProfile: any = {
          email: user.email || '',
          displayName: customDisplayName || user.displayName || 'Anonymous User',
          storageUsed: 0,
          storageLimit: 5 * 1024 * 1024 * 1024, // 5GB free tier
          isProvider: false,
          createdAt: now,
          lastLoginAt: now,
          plan: 'free'
        };
        
        // Only add photoURL if it exists
        if (user.photoURL) {
          userProfile.photoURL = user.photoURL;
        }
        
        await setDoc(userRef, userProfile);
      } else {
        // Update existing user profile - remove undefined values
        const updateData: any = {
          lastLoginAt: now,
          email: user.email || userSnap.data().email,
          displayName: customDisplayName || user.displayName || userSnap.data().displayName,
        };
        
        // Only update photoURL if it exists
        if (user.photoURL) {
          updateData.photoURL = user.photoURL;
        }
        
        await updateDoc(userRef, updateData);
      }
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      throw error;
    }
  }

  // Update last login timestamp
  async updateLastLogin(uid: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  // Get user profile from Firestore
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { uid, ...userSnap.data() } as UserProfile;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, updates);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
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
      throw error;
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
      throw error;
    }
  }

  // Update storage usage
  async updateStorageUsage(uid: string, bytesUsed: number): Promise<void> {
    try {
      const userProfile = await this.getUserProfile(uid);
      if (userProfile) {
        const newStorageUsed = userProfile.storageUsed + bytesUsed;
        await this.updateUserProfile(uid, { storageUsed: newStorageUsed });
      }
    } catch (error) {
      console.error('Error updating storage usage:', error);
      throw error;
    }
  }

  // Check if user has enough storage space
  async hasStorageSpace(uid: string, requiredBytes: number): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(uid);
      if (!userProfile) return false;
      
      return (userProfile.storageUsed + requiredBytes) <= userProfile.storageLimit;
    } catch (error) {
      console.error('Error checking storage space:', error);
      return false;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Format storage size
  formatStorageSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Calculate storage usage percentage
  calculateStoragePercentage(used: number, limit: number): number {
    return Math.round((used / limit) * 100);
  }
}

export const authService = new AuthService();
export default authService;
