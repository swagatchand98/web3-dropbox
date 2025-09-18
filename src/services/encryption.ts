// Client-side encryption service using Web Crypto API
export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits for GCM

  /**
   * Generate a new encryption key
   */
  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export key to raw format for storage
   */
  static async exportKey(key: CryptoKey): Promise<ArrayBuffer> {
    return await crypto.subtle.exportKey('raw', key);
  }

  /**
   * Import key from raw format
   */
  static async importKey(keyData: ArrayBuffer): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt file data
   */
  static async encryptFile(
    file: File,
    key: CryptoKey
  ): Promise<{
    encryptedData: ArrayBuffer;
    iv: Uint8Array;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }> {
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    
    // Read file as array buffer
    const fileData = await file.arrayBuffer();
    
    // Encrypt the file data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      fileData
    );

    return {
      encryptedData,
      iv,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    };
  }

  /**
   * Decrypt file data
   */
  static async decryptFile(
    encryptedData: ArrayBuffer,
    key: CryptoKey,
    iv: Uint8Array,
    fileName: string,
    mimeType: string
  ): Promise<File> {
    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      encryptedData
    );

    // Create a new File object
    const blob = new Blob([decryptedData], { type: mimeType });
    return new File([blob], fileName, { type: mimeType });
  }

  /**
   * Split file into chunks for distributed storage
   */
  static splitIntoChunks(
    data: ArrayBuffer,
    chunkSize: number = 1024 * 1024 // 1MB chunks
  ): ArrayBuffer[] {
    const chunks: ArrayBuffer[] = [];
    const totalSize = data.byteLength;
    
    for (let offset = 0; offset < totalSize; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, totalSize);
      const chunk = data.slice(offset, end);
      chunks.push(chunk);
    }
    
    return chunks;
  }

  /**
   * Reassemble chunks back into original data
   */
  static reassembleChunks(chunks: ArrayBuffer[]): ArrayBuffer {
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const result = new Uint8Array(totalSize);
    
    let offset = 0;
    for (const chunk of chunks) {
      result.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    return result.buffer;
  }

  /**
   * Generate hash of data for integrity verification
   */
  static async generateHash(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create Merkle tree root for proof of storage
   */
  static async createMerkleRoot(chunks: ArrayBuffer[]): Promise<string> {
    if (chunks.length === 0) return '';
    
    // Hash each chunk
    const hashes = await Promise.all(
      chunks.map(chunk => this.generateHash(chunk))
    );
    
    // Build Merkle tree
    let currentLevel = hashes;
    
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        
        // Hash the concatenation
        const combined = left + right;
        const combinedBuffer = new TextEncoder().encode(combined);
        const hash = await this.generateHash(combinedBuffer.buffer as ArrayBuffer);
        nextLevel.push(hash);
      }
      
      currentLevel = nextLevel;
    }
    
    return currentLevel[0];
  }

  /**
   * Derive key from password using PBKDF2
   */
  static async deriveKeyFromPassword(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive actual encryption key
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate random salt for key derivation
   */
  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  /**
   * Convert ArrayBuffer to Base64 string for storage
   */
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string back to ArrayBuffer
   */
  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Encrypt and prepare file for distributed storage
   */
  static async prepareFileForStorage(
    file: File,
    password?: string
  ): Promise<{
    chunks: ArrayBuffer[];
    metadata: {
      fileName: string;
      fileSize: number;
      mimeType: string;
      iv: string;
      salt?: string;
      merkleRoot: string;
      chunkCount: number;
    };
    key: CryptoKey;
  }> {
    let key: CryptoKey;
    let salt: Uint8Array | undefined;

    if (password) {
      // Derive key from password
      salt = this.generateSalt();
      key = await this.deriveKeyFromPassword(password, salt);
    } else {
      // Generate random key
      key = await this.generateKey();
    }

    // Encrypt the file
    const encrypted = await this.encryptFile(file, key);
    
    // Split into chunks
    const chunks = this.splitIntoChunks(encrypted.encryptedData);
    
    // Generate Merkle root for integrity
    const merkleRoot = await this.createMerkleRoot(chunks);

    const metadata = {
      fileName: encrypted.fileName,
      fileSize: encrypted.fileSize,
      mimeType: encrypted.mimeType,
      iv: this.arrayBufferToBase64(encrypted.iv.buffer as ArrayBuffer),
      salt: salt ? this.arrayBufferToBase64(salt.buffer as ArrayBuffer) : undefined,
      merkleRoot,
      chunkCount: chunks.length,
    };

    return {
      chunks,
      metadata,
      key,
    };
  }

  /**
   * Reconstruct file from distributed chunks
   */
  static async reconstructFileFromChunks(
    chunks: ArrayBuffer[],
    metadata: {
      fileName: string;
      mimeType: string;
      iv: string;
      salt?: string;
      merkleRoot: string;
    },
    key: CryptoKey
  ): Promise<File> {
    // Verify integrity using Merkle root
    const calculatedRoot = await this.createMerkleRoot(chunks);
    if (calculatedRoot !== metadata.merkleRoot) {
      throw new Error('File integrity check failed - chunks may be corrupted');
    }

    // Reassemble chunks
    const encryptedData = this.reassembleChunks(chunks);
    
    // Convert IV back from base64
    const iv = new Uint8Array(this.base64ToArrayBuffer(metadata.iv));
    
    // Decrypt and return file
    return await this.decryptFile(
      encryptedData,
      key,
      iv,
      metadata.fileName,
      metadata.mimeType
    );
  }
}

// Utility functions for key management
export class KeyManager {
  private static readonly STORAGE_KEY = 'web3-dropbox-keys';

  /**
   * Store encrypted key in browser storage
   */
  static async storeKey(
    fileHash: string,
    key: CryptoKey,
    password: string
  ): Promise<void> {
    const keyData = await EncryptionService.exportKey(key);
    const salt = EncryptionService.generateSalt();
    
    // Derive encryption key from password
    const storageKey = await EncryptionService.deriveKeyFromPassword(password, salt);
    
    // Encrypt the file key
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedKey = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      storageKey,
      keyData
    );

    // Store in localStorage
    const stored = this.getStoredKeys();
    stored[fileHash] = {
      encryptedKey: EncryptionService.arrayBufferToBase64(encryptedKey),
      iv: EncryptionService.arrayBufferToBase64(iv.buffer as ArrayBuffer),
      salt: EncryptionService.arrayBufferToBase64(salt.buffer as ArrayBuffer),
    };
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
  }

  /**
   * Retrieve and decrypt key from browser storage
   */
  static async retrieveKey(
    fileHash: string,
    password: string
  ): Promise<CryptoKey | null> {
    const stored = this.getStoredKeys();
    const keyInfo = stored[fileHash];
    
    if (!keyInfo) return null;

    try {
      // Convert from base64
      const encryptedKey = EncryptionService.base64ToArrayBuffer(keyInfo.encryptedKey);
      const iv = new Uint8Array(EncryptionService.base64ToArrayBuffer(keyInfo.iv));
      const salt = new Uint8Array(EncryptionService.base64ToArrayBuffer(keyInfo.salt));
      
      // Derive decryption key
      const storageKey = await EncryptionService.deriveKeyFromPassword(password, salt);
      
      // Decrypt the file key
      const keyData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        storageKey,
        encryptedKey
      );
      
      // Import as CryptoKey
      return await EncryptionService.importKey(keyData);
    } catch (error) {
      console.error('Failed to retrieve key:', error);
      return null;
    }
  }

  /**
   * Get all stored keys
   */
  private static getStoredKeys(): Record<string, any> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Remove key from storage
   */
  static removeKey(fileHash: string): void {
    const stored = this.getStoredKeys();
    delete stored[fileHash];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
  }

  /**
   * Clear all stored keys
   */
  static clearAllKeys(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
