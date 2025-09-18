'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '@/hooks/useAuth';
import { uploadToIPFS, downloadFromIPFS } from '@/services/ipfs';
import { EncryptionService, KeyManager } from '@/services/encryption';
import { 
  Upload, 
  Download, 
  File, 
  Share2, 
  Lock, 
  Coins, 
  Server, 
  Shield,
  Users,
  TrendingUp,
  Settings,
  Eye,
  EyeOff,
  LogOut,
  User,
  Wallet,
  Link,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

// Contract addresses
const STORAGE_MARKET_ADDRESS = process.env.NEXT_PUBLIC_STORAGE_MARKET_CONTRACT as `0x${string}`;
const STORAGE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_STORAGE_TOKEN_CONTRACT as `0x${string}`;

// Contract ABIs (simplified)
const STORAGE_MARKET_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "_fileHash", "type": "string"},
      {"internalType": "uint256", "name": "_fileSize", "type": "uint256"},
      {"internalType": "uint256", "name": "_duration", "type": "uint256"},
      {"internalType": "uint256", "name": "_redundancy", "type": "uint256"}
    ],
    "name": "requestStorage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "_availableStorage", "type": "uint256"},
      {"internalType": "uint256", "name": "_pricePerGB", "type": "uint256"},
      {"internalType": "string", "name": "_endpoint", "type": "string"}
    ],
    "name": "registerProvider",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

interface FileRecord {
  id: string;
  name: string;
  size: number;
  uploadDate: string;
  ipfsHash: string;
  isEncrypted: boolean;
  chunks: number;
  cost: string;
  status: 'uploading' | 'stored' | 'failed';
}

export default function AuthenticatedDashboard() {
  const { 
    user, 
    profile: userProfile, 
    loading, 
    signOut, 
    linkWalletAddress, 
    registerAsProvider, 
    updateStorageUsage, 
    hasStorageSpace, 
    formatStorageSize, 
    calculateStoragePercentage 
  } = useAuth();
  
  const { address, isConnected } = useAccount();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'provider' | 'marketplace' | 'profile'>('files');
  const [showPassword, setShowPassword] = useState(false);
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [linkingWallet, setLinkingWallet] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const { writeContract } = useWriteContract();

  // Get user's token balance
  const { data: tokenBalance } = useBalance({
    address: address,
    token: STORAGE_TOKEN_ADDRESS,
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleLinkWallet = async () => {
    if (!user || !address) return;

    setLinkingWallet(true);
    try {
      await linkWalletAddress(address);
      showNotification('success', 'Wallet linked successfully!');
    } catch (error: any) {
      console.error('Error linking wallet:', error);
      showNotification('error', error.message || 'Failed to link wallet');
    } finally {
      setLinkingWallet(false);
    }
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !userProfile) return;

    // Check storage space
    const hasSpace = await hasStorageSpace(file.size);
    if (!hasSpace) {
      showNotification('error', 'Not enough storage space. Upgrade your plan or delete some files.');
      return;
    }

    setUploading(true);
    try {
      // Prepare file for storage (encrypt and chunk)
      const prepared = await EncryptionService.prepareFileForStorage(
        file,
        encryptionPassword || undefined
      );

      // Upload chunks to IPFS
      const chunkHashes: string[] = [];
      for (let i = 0; i < prepared.chunks.length; i++) {
        const chunk = prepared.chunks[i];
        const chunkArray = new Uint8Array(chunk);
        const chunkBlob = new Blob([chunkArray]);
        const chunkFile = Object.assign(chunkBlob, {
          name: `chunk_${i}`,
          lastModified: Date.now(),
        }) as File;
        const chunkHash = await uploadToIPFS(chunkFile);
        chunkHashes.push(chunkHash);
      }

      // Create main metadata file
      const metadataWithChunks = {
        ...prepared.metadata,
        chunkHashes,
        userId: user.uid,
        encryptionKey: encryptionPassword ? undefined : EncryptionService.arrayBufferToBase64(await EncryptionService.exportKey(prepared.key))
      };

      const metadataString = JSON.stringify(metadataWithChunks);
      const metadataBlob = new Blob([metadataString]);
      const metadataFile = Object.assign(metadataBlob, {
        name: `${file.name}.metadata`,
        lastModified: Date.now(),
      }) as File;
      const metadataHash = await uploadToIPFS(metadataFile);

      // Store encryption key if password was used
      if (encryptionPassword) {
        await KeyManager.storeKey(metadataHash, prepared.key, encryptionPassword);
      }

      // Update storage usage
      await updateStorageUsage(file.size);

      // Add to local state
      const newFile: FileRecord = {
        id: metadataHash,
        name: file.name,
        size: file.size,
        uploadDate: new Date().toLocaleDateString(),
        ipfsHash: metadataHash,
        isEncrypted: true,
        chunks: prepared.chunks.length,
        cost: '0.001', // Mock cost
        status: 'stored'
      };

      setFiles(prev => [...prev, newFile]);
      showNotification('success', 'File uploaded successfully to decentralized storage!');
      
    } catch (error) {
      console.error('Upload failed:', error);
      showNotification('error', 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }, [user, userProfile, encryptionPassword]);

  const handleDownload = async (file: FileRecord) => {
    try {
      // Download metadata
      const metadataData = await downloadFromIPFS(file.ipfsHash);
      const metadata = JSON.parse(new TextDecoder().decode(metadataData));

      // Download all chunks
      const chunks: ArrayBuffer[] = [];
      for (const chunkHash of metadata.chunkHashes) {
        const chunkData = await downloadFromIPFS(chunkHash);
        let arrayBuffer: ArrayBuffer;
        if (chunkData instanceof ArrayBuffer) {
          arrayBuffer = chunkData;
        } else if (chunkData instanceof Uint8Array) {
          arrayBuffer = chunkData.buffer.slice(chunkData.byteOffset, chunkData.byteOffset + chunkData.byteLength) as ArrayBuffer;
        } else {
          const uint8Array = new Uint8Array(chunkData as ArrayBufferLike);
          arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength) as ArrayBuffer;
        }
        chunks.push(arrayBuffer);
      }

      // Get decryption key
      let key: CryptoKey;
      if (metadata.encryptionKey) {
        const keyBuffer = EncryptionService.base64ToArrayBuffer(metadata.encryptionKey);
        key = await EncryptionService.importKey(keyBuffer);
      } else {
        const password = prompt('Enter decryption password:');
        if (!password) return;
        
        const retrievedKey = await KeyManager.retrieveKey(file.ipfsHash, password);
        if (!retrievedKey) {
          showNotification('error', 'Invalid password or key not found');
          return;
        }
        key = retrievedKey;
      }

      // Reconstruct and decrypt file
      const reconstructedFile = await EncryptionService.reconstructFileFromChunks(
        chunks,
        metadata,
        key
      );

      // Download file
      const url = URL.createObjectURL(reconstructedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = reconstructedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification('success', 'File downloaded successfully!');

    } catch (error) {
      console.error('Download failed:', error);
      showNotification('error', 'Download failed. File may be corrupted or key is invalid.');
    }
  };

  const handleRegisterAsProvider = async () => {
    if (!user || !isConnected) return;

    const availableStorage = prompt('Enter available storage in GB:');
    const pricePerGB = prompt('Enter price per GB per month (in tokens):');
    const endpoint = prompt('Enter your IPFS endpoint:');

    if (!availableStorage || !pricePerGB || !endpoint) return;

    try {
      await writeContract({
        address: STORAGE_MARKET_ADDRESS,
        abi: STORAGE_MARKET_ABI,
        functionName: 'registerProvider',
        args: [
          BigInt(parseInt(availableStorage) * 1e9),
          BigInt(parseFloat(pricePerGB) * 1e18),
          endpoint
        ],
      });

      await registerAsProvider();
      showNotification('success', 'Successfully registered as storage provider!');
    } catch (error) {
      console.error('Provider registration failed:', error);
      showNotification('error', 'Registration failed. Please try again.');
    }
  };


  const formatTokens = (amount: string) => {
    return parseFloat(amount).toFixed(4) + ' STOR';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null; // This should not happen as AuthPage handles this
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg flex items-center ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2" />
          )}
          {notification.message}
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Web3 Dropbox</h1>
            <p className="text-gray-600">Welcome back, {userProfile.displayName}!</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Storage Usage */}
            <div className="bg-white px-4 py-2 rounded-lg shadow">
              <div className="text-sm text-gray-600">Storage Used</div>
              <div className="font-semibold">
                {formatStorageSize(userProfile.storageUsed)} / {formatStorageSize(userProfile.storageLimit)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-indigo-600 h-2 rounded-full" 
                  style={{ width: `${calculateStoragePercentage(userProfile.storageUsed, userProfile.storageLimit)}%` }}
                ></div>
              </div>
            </div>

            {/* Token Balance */}
            {isConnected && (
              <div className="bg-white px-4 py-2 rounded-lg shadow">
                <div className="text-sm text-gray-600">Balance</div>
                <div className="font-semibold">{formatTokens(tokenBalance?.formatted || '0')}</div>
              </div>
            )}

            {/* Wallet Connection */}
            <div className="flex items-center space-x-2">
              {userProfile.walletAddress ? (
                <div className="bg-green-50 px-3 py-2 rounded-lg border border-green-200 flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">Wallet Linked</span>
                </div>
              ) : isConnected ? (
                <button
                  onClick={handleLinkWallet}
                  disabled={linkingWallet}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center disabled:opacity-50"
                >
                  {linkingWallet ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Link className="w-4 h-4 mr-2" />
                  )}
                  Link Wallet
                </button>
              ) : null}
              <ConnectButton />
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow hover:bg-gray-50"
              >
                {userProfile.photoURL ? (
                  <img src={userProfile.photoURL} alt="Profile" className="w-6 h-6 rounded-full" />
                ) : (
                  <User className="w-6 h-6 text-gray-600" />
                )}
                <LogOut className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('files')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'files'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <File className="w-5 h-5 inline mr-2" />
              My Files
            </button>
            <button
              onClick={() => setActiveTab('provider')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'provider'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Server className="w-5 h-5 inline mr-2" />
              Storage Provider
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'marketplace'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Marketplace
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'profile'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-5 h-5 inline mr-2" />
              Profile
            </button>
          </div>

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="p-6">
              {/* Upload Section */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Upload to Decentralized Storage
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Files are encrypted, chunked, and distributed across multiple providers
                  </p>
                  
                  {/* Storage Warning */}
                  {calculateStoragePercentage(userProfile.storageUsed, userProfile.storageLimit) > 80 && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-center">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                        <span className="text-yellow-800 text-sm">
                          Storage is {calculateStoragePercentage(userProfile.storageUsed, userProfile.storageLimit)}% full
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Encryption Options */}
                  <div className="mb-4 max-w-md mx-auto">
                    <div className="flex items-center mb-2">
                      <input
                        type="password"
                        placeholder="Optional encryption password"
                        value={encryptionPassword}
                        onChange={(e) => setEncryptionPassword(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-50"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Leave empty for automatic key generation
                    </p>
                  </div>

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <span className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                      uploading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}>
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Uploading...
                        </>
                      ) : (
                        'Choose File'
                      )}
                    </span>
                  </label>
                </div>
              </div>

              {/* Files List */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Your Files ({files.length})</h2>
                <div className="space-y-4">
                  {files.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <File className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg">No files uploaded yet</p>
                      <p className="text-sm">Upload your first file to get started!</p>
                    </div>
                  ) : (
                    files.map((file) => (
                      <div key={file.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <File className="h-8 w-8 text-gray-400 mr-4" />
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">{file.name}</h3>
                              <div className="text-sm text-gray-500 space-x-4">
                                <span>{formatStorageSize(file.size)}</span>
                                <span>•</span>
                                <span>{file.chunks} chunks</span>
                                <span>•</span>
                                <span>Uploaded {file.uploadDate}</span>
                              </div>
                              <div className="text-xs text-gray-400 font-mono mt-1">
                                IPFS: {file.ipfsHash.substring(0, 20)}...
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center text-xs text-green-600">
                              <Lock className="w-3 h-3 mr-1" />
                              Encrypted
                            </div>
                            <button
                              onClick={() => handleDownload(file)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 transition-colors"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </button>
                            <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                              <Share2 className="h-4 w-4 mr-1" />
                              Share
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Provider Tab */}
          {activeTab === 'provider' && (
            <div className="p-6">
              {!userProfile.isProvider ? (
                <div className="text-center py-12">
                  <Server className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Become a Storage Provider</h2>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Rent out your unused storage space and earn STOR tokens. Help build the decentralized storage network.
                  </p>
                  {userProfile.walletAddress ? (
                    <button
                      onClick={handleRegisterAsProvider}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Coins className="w-5 h-5 mr-2" />
                      Register as Provider
                    </button>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                      <div className="flex items-center">
                        <Wallet className="w-5 h-5 text-yellow-600 mr-2" />
                        <span className="text-yellow-800">Connect and link your wallet first</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Provider Dashboard</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-green-50 p-6 rounded-lg">
                      <div className="flex items-center">
                        <Coins className="w-8 h-8 text-green-600 mr-3" />
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {userProfile.providerStats?.totalEarnings || 0} STOR
                          </div>
                          <div className="text-sm text-gray-600">Total Earnings</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <div className="flex items-center">
                        <Server className="w-8 h-8 text-blue-600 mr-3" />
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatStorageSize(userProfile.providerStats?.storageProvided || 0)}
                          </div>
                          <div className="text-sm text-gray-600">Storage Provided</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <div className="flex items-center">
                        <Shield className="w-8 h-8 text-purple-600 mr-3" />
                        <div>
                          <div className="text-2xl font-bold text-purple-600">
                            {userProfile.providerStats?.reputation || 100}%
                          </div>
                          <div className="text-sm text-gray-600">Reputation Score</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Marketplace Tab */}
          {activeTab === 'marketplace' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Storage Marketplace</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Active Providers (0)</h3>
                  <div className="text-center py-8 text-gray-500">
                    <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No active providers found</p>
                    <p className="text-sm">Be the first to register as a provider!</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Network Statistics</h3>
                  <div className="bg-white border rounded-lg p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Providers</span>
                        <span className="font-medium">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Files Stored</span>
                        <span className="font-medium">{files.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Users</span>
                        <span className="font-medium">1</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        {userProfile.photoURL ? (
                          <img src={userProfile.photoURL} alt="Profile" className="w-16 h-16 rounded-full mr-4" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                            <User className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-lg font-medium">{userProfile.displayName}</h4>
                          <p className="text-gray-600">{userProfile.email}</p>
                          <p className="text-sm text-gray-500">
                            Member since {new Date(userProfile.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">Plan</div>
                            <div className="font-medium capitalize">{userProfile.plan}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Status</div>
                            <div className="font-medium text-green-600">Active</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Storage & Wallet</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Storage Usage</div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{formatStorageSize(userProfile.storageUsed)}</span>
                          <span>{formatStorageSize(userProfile.storageLimit)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full" 
                            style={{ width: `${calculateStoragePercentage(userProfile.storageUsed, userProfile.storageLimit)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <div className="text-sm text-gray-600 mb-2">Wallet Connection</div>
                        {userProfile.walletAddress ? (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-mono text-sm">
                                {userProfile.walletAddress.substring(0, 6)}...{userProfile.walletAddress.substring(userProfile.walletAddress.length - 4)}
                              </div>
                              <div className="text-xs text-green-600">Connected</div>
                            </div>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                        ) : (
                          <div className="text-gray-500">No wallet connected</div>
                        )}
                      </div>
                      
                      {userProfile.isProvider && (
                        <div className="border-t pt-4">
                          <div className="text-sm text-gray-600 mb-2">Provider Status</div>
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 text-green-600 mr-2" />
                            <span className="text-green-600 font-medium">Active Provider</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
