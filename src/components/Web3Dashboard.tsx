'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
  Upload, 
  Download, 
  File, 
  Share2, 
  Lock, 
  Unlock, 
  Coins, 
  Server, 
  Shield,
  Users,
  TrendingUp,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { uploadToIPFS, downloadFromIPFS } from '@/services/ipfs';
import { EncryptionService, KeyManager } from '@/services/encryption';

// Contract addresses - these would be set after deployment
const STORAGE_MARKET_ADDRESS = process.env.NEXT_PUBLIC_STORAGE_MARKET_CONTRACT as `0x${string}`;
const STORAGE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_STORAGE_TOKEN_CONTRACT as `0x${string}`;

// Contract ABIs (simplified for demo)
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
  },
  {
    "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
    "name": "getUserFiles",
    "outputs": [{"internalType": "string[]", "name": "", "type": "string[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActiveProviders",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const STORAGE_TOKEN_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
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
  providers: string[];
  cost: string;
  status: 'uploading' | 'stored' | 'failed';
}

interface Provider {
  address: string;
  availableStorage: bigint;
  usedStorage: bigint;
  pricePerGB: bigint;
  reputation: number;
  totalEarnings: bigint;
  isActive: boolean;
}

export default function Web3Dashboard() {
  const { address, isConnected } = useAccount();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'provider' | 'marketplace'>('files');
  const [showPassword, setShowPassword] = useState(false);
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [isProvider, setIsProvider] = useState(false);
  const [providerStats, setProviderStats] = useState({
    earnings: '0',
    storage: '0',
    reputation: 100
  });

  const { writeContract } = useWriteContract();

  // Get user's token balance
  const { data: tokenBalance } = useBalance({
    address: address,
    token: STORAGE_TOKEN_ADDRESS,
  });

  // Get user's files from contract
  const { data: userFiles } = useReadContract({
    address: STORAGE_MARKET_ADDRESS,
    abi: STORAGE_MARKET_ABI,
    functionName: 'getUserFiles',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Get active providers
  const { data: activeProviders } = useReadContract({
    address: STORAGE_MARKET_ADDRESS,
    abi: STORAGE_MARKET_ABI,
    functionName: 'getActiveProviders',
    query: {
      enabled: isConnected,
    },
  });

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isConnected || !address) return;

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
        // Create file using object constructor to avoid TS issues
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
        encryptionKey: encryptionPassword ? undefined : EncryptionService.arrayBufferToBase64(await EncryptionService.exportKey(prepared.key))
      };

      const metadataString = JSON.stringify(metadataWithChunks);
      const metadataBlob = new Blob([metadataString]);
      // Create file using object constructor to avoid TS issues
      const metadataFile = Object.assign(metadataBlob, {
        name: `${file.name}.metadata`,
        lastModified: Date.now(),
      }) as File;
      const metadataHash = await uploadToIPFS(metadataFile);

      // Store encryption key if password was used
      if (encryptionPassword) {
        await KeyManager.storeKey(metadataHash, prepared.key, encryptionPassword);
      }

      // Request storage on blockchain
      const duration = 30 * 24 * 60 * 60; // 30 days
      const redundancy = 3; // Store on 3 providers

      await writeContract({
        address: STORAGE_MARKET_ADDRESS,
        abi: STORAGE_MARKET_ABI,
        functionName: 'requestStorage',
        args: [metadataHash, BigInt(file.size), BigInt(duration), BigInt(redundancy)],
      });

      // Add to local state
      const newFile: FileRecord = {
        id: metadataHash,
        name: file.name,
        size: file.size,
        uploadDate: new Date().toLocaleDateString(),
        ipfsHash: metadataHash,
        isEncrypted: true,
        chunks: prepared.chunks.length,
        providers: [], // Will be populated by contract
        cost: '0.1', // Mock cost
        status: 'stored'
      };

      setFiles(prev => [...prev, newFile]);
      alert('File uploaded successfully to decentralized storage!');
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }, [isConnected, address, encryptionPassword, writeContract]);

  const handleDownload = async (file: FileRecord) => {
    try {
      // Download metadata
      const metadataData = await downloadFromIPFS(file.ipfsHash);
      const metadata = JSON.parse(new TextDecoder().decode(metadataData));

      // Download all chunks
      const chunks: ArrayBuffer[] = [];
      for (const chunkHash of metadata.chunkHashes) {
        const chunkData = await downloadFromIPFS(chunkHash);
        // Convert to ArrayBuffer safely
        let arrayBuffer: ArrayBuffer;
        if (chunkData instanceof ArrayBuffer) {
          arrayBuffer = chunkData;
        } else if (chunkData instanceof Uint8Array) {
          arrayBuffer = chunkData.buffer.slice(chunkData.byteOffset, chunkData.byteOffset + chunkData.byteLength) as ArrayBuffer;
        } else {
          // Convert any other type to ArrayBuffer
          const uint8Array = new Uint8Array(chunkData as ArrayBufferLike);
          arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength) as ArrayBuffer;
        }
        chunks.push(arrayBuffer);
      }

      // Get decryption key
      let key: CryptoKey;
      if (metadata.encryptionKey) {
        // Key was stored in metadata (no password)
        const keyBuffer = EncryptionService.base64ToArrayBuffer(metadata.encryptionKey);
        key = await EncryptionService.importKey(keyBuffer);
      } else {
        // Key was encrypted with password
        const password = prompt('Enter decryption password:');
        if (!password) return;
        
        const retrievedKey = await KeyManager.retrieveKey(file.ipfsHash, password);
        if (!retrievedKey) {
          alert('Invalid password or key not found');
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

    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. File may be corrupted or key is invalid.');
    }
  };

  const registerAsProvider = async () => {
    if (!isConnected) return;

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
          BigInt(parseInt(availableStorage) * 1e9), // Convert GB to bytes
          BigInt(parseFloat(pricePerGB) * 1e18), // Convert to wei
          endpoint
        ],
      });

      setIsProvider(true);
      alert('Successfully registered as storage provider!');
    } catch (error) {
      console.error('Provider registration failed:', error);
      alert('Registration failed. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTokens = (amount: string) => {
    return parseFloat(amount).toFixed(4) + ' STOR';
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Web3 Dropbox</h1>
            <p className="text-lg text-gray-600 mb-8">
              Decentralized storage marketplace powered by IPFS and blockchain
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-4">
              Connect your Web3 wallet to start using decentralized storage
            </p>
            <ConnectButton />
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center mb-2">
                <Lock className="w-4 h-4 text-green-600 mr-2" />
                <span className="font-medium">End-to-End Encrypted</span>
              </div>
              <p className="text-gray-600">Files are encrypted before leaving your device</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center mb-2">
                <Server className="w-4 h-4 text-blue-600 mr-2" />
                <span className="font-medium">Distributed Storage</span>
              </div>
              <p className="text-gray-600">Files stored across multiple providers</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center mb-2">
                <Coins className="w-4 h-4 text-yellow-600 mr-2" />
                <span className="font-medium">Earn Tokens</span>
              </div>
              <p className="text-gray-600">Provide storage and earn STOR tokens</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Web3 Dropbox</h1>
            <p className="text-gray-600">Decentralized Storage Marketplace</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white px-4 py-2 rounded-lg shadow">
              <div className="text-sm text-gray-600">Balance</div>
              <div className="font-semibold">{formatTokens(tokenBalance?.formatted || '0')}</div>
            </div>
            <ConnectButton />
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
                      {uploading ? 'Uploading...' : 'Choose File'}
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
                                <span>{formatFileSize(file.size)}</span>
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
                            <div className="flex items-center text-xs text-blue-600">
                              <Server className="w-3 h-3 mr-1" />
                              {file.providers.length || 3} providers
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
              {!isProvider ? (
                <div className="text-center py-12">
                  <Server className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Become a Storage Provider</h2>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Rent out your unused storage space and earn STOR tokens. Help build the decentralized storage network.
                  </p>
                  <button
                    onClick={registerAsProvider}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Coins className="w-5 h-5 mr-2" />
                    Register as Provider
                  </button>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Provider Dashboard</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-green-50 p-6 rounded-lg">
                      <div className="flex items-center">
                        <Coins className="w-8 h-8 text-green-600 mr-3" />
                        <div>
                          <div className="text-2xl font-bold text-green-600">{formatTokens(providerStats.earnings)}</div>
                          <div className="text-sm text-gray-600">Total Earnings</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <div className="flex items-center">
                        <Server className="w-8 h-8 text-blue-600 mr-3" />
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{providerStats.storage} GB</div>
                          <div className="text-sm text-gray-600">Storage Provided</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <div className="flex items-center">
                        <Shield className="w-8 h-8 text-purple-600 mr-3" />
                        <div>
                          <div className="text-2xl font-bold text-purple-600">{providerStats.reputation}%</div>
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
                  <h3 className="text-lg font-semibold mb-4">Active Providers ({activeProviders?.length || 0})</h3>
                  <div className="space-y-4">
                    {providers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <p>No active providers found</p>
                      </div>
                    ) : (
                      providers.map((provider, index) => (
                        <div key={provider.address} className="bg-white border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-mono text-sm text-gray-600">
                                {provider.address.substring(0, 10)}...{provider.address.substring(provider.address.length - 8)}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                Available: {(Number(provider.availableStorage) / 1e9).toFixed(2)} GB
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {(Number(provider.pricePerGB) / 1e18).toFixed(4)} STOR/GB/month
                              </div>
                              <div className="text-xs text-green-600">
                                {provider.reputation}% reputation
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Network Statistics</h3>
                  <div className="bg-white border rounded-lg p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Providers</span>
                        <span className="font-medium">{activeProviders?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Storage</span>
                        <span className="font-medium">1,250 GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Files Stored</span>
                        <span className="font-medium">{files.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Price</span>
                        <span className="font-medium">0.001 STOR/GB/month</span>
                      </div>
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
