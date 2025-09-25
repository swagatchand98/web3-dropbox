'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useWriteContract, useBalance } from 'wagmi';
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
  Loader2,
  Zap
} from 'lucide-react';
import Hyperspeed from './Hyperspeed';

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
  const [uploadAnimation, setUploadAnimation] = useState<{
    show: boolean;
    phase: 'padlock' | 'splitting' | 'complete';
    fileName: string;
  }>({ show: false, phase: 'padlock', fileName: '' });

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
    } catch (error: unknown) {
      console.error('Error linking wallet:', error);
      showNotification('error', error instanceof Error ? error.message : 'Failed to link wallet');
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

    // Start animation sequence
    setUploadAnimation({ show: true, phase: 'padlock', fileName: file.name });

    // Phase 1: Show padlock for 1.5 seconds
    setTimeout(() => {
      setUploadAnimation(prev => ({ ...prev, phase: 'splitting' }));

      // Phase 2: Show splitting animation for 1 second, then start actual upload
      setTimeout(async () => {
        setUploadAnimation({ show: false, phase: 'complete', fileName: '' });
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
      }, 1000);
    }, 1500);
  }, [user, userProfile, encryptionPassword, hasStorageSpace, updateStorageUsage]);

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
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Hyperspeed Background */}
        <div className="absolute inset-0 w-full h-full">
          <Hyperspeed
            effectOptions={{
              colors: {
                roadColor: 0x080808,
                islandColor: 0x0a0a0a,
                background: 0x000000,
                shoulderLines: 0x131318,
                brokenLines: 0x131318,
                leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
                rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
                sticks: 0x03b3c3
              },
              distortion: 'turbulentDistortion',
              speedUp: 0.5,
              fov: 90,
              fovSpeedUp: 120
            }}
          />
        </div>
        <div className="relative z-10 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white text-lg">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Hyperspeed Background */}
      <div className="absolute inset-0 w-full h-full">
        <Hyperspeed
          effectOptions={{
            colors: {
              roadColor: 0x080808,
              islandColor: 0x0a0a0a,
              background: 0x000000,
              shoulderLines: 0x131318,
              brokenLines: 0x131318,
              leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
              rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
              sticks: 0x03b3c3
            },
            distortion: 'turbulentDistortion',
            speedUp: 0.5,
            fov: 90,
            fovSpeedUp: 120
          }}
        />
      </div>

      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" style={{ zIndex: 2 }}></div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center backdrop-blur-xl border ${
              notification.type === 'success'
                ? 'bg-green-500/10 text-green-200 border-green-500/30'
                : 'bg-red-500/10 text-red-200 border-red-500/30'
            }`}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-3 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-3 text-red-400" />
            )}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Animation Overlay */}
      <AnimatePresence>
        {uploadAnimation.show && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center">
              {uploadAnimation.phase === 'padlock' && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mb-6"
                >
                  <motion.div
                    animate={{
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-24 h-24 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center mx-auto shadow-2xl"
                  >
                    <Lock className="w-12 h-12 text-white" />
                  </motion.div>
                  <motion.p
                    className="text-white text-xl font-semibold mt-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Encrypting {uploadAnimation.fileName}
                  </motion.p>
                  <motion.p
                    className="text-gray-300 text-sm mt-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    Securing your file with military-grade encryption
                  </motion.p>
                </motion.div>
              )}

              {uploadAnimation.phase === 'splitting' && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mb-6"
                >
                  <motion.div
                    className="relative w-32 h-32 mx-auto"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  >
                    {/* Multi-directional splitting animation */}
                    {/* Top chunk */}
                    <motion.div
                      className="absolute top-0 left-1/2 transform -translate-x-1/2"
                      initial={{ y: 0, x: 0, scale: 1 }}
                      animate={{
                        y: [-100, -200, -300],
                        x: [0, -50, -100],
                        scale: [1, 0.5, 0.1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeIn",
                        delay: 0
                      }}
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center shadow-xl">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>

                    {/* Bottom chunk */}
                    <motion.div
                      className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
                      initial={{ y: 0, x: 0, scale: 1 }}
                      animate={{
                        y: [100, 200, 300],
                        x: [0, 30, 60],
                        scale: [1, 0.5, 0.1],
                        rotate: [0, -180, -360]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeIn",
                        delay: 0.3
                      }}
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center shadow-xl">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>

                    {/* Left chunk */}
                    <motion.div
                      className="absolute top-1/2 left-0 transform -translate-y-1/2"
                      initial={{ x: 0, y: 0, scale: 1 }}
                      animate={{
                        x: [-100, -200, -300],
                        y: [0, -40, -80],
                        scale: [1, 0.5, 0.1],
                        rotate: [0, 270, 540]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeIn",
                        delay: 0.6
                      }}
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center shadow-xl">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>

                    {/* Right chunk */}
                    <motion.div
                      className="absolute top-1/2 right-0 transform -translate-y-1/2"
                      initial={{ x: 0, y: 0, scale: 1 }}
                      animate={{
                        x: [100, 200, 300],
                        y: [0, 40, 80],
                        scale: [1, 0.5, 0.1],
                        rotate: [0, -270, -540]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeIn",
                        delay: 0.9
                      }}
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center shadow-xl">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>

                    {/* Top-right diagonal chunk */}
                    <motion.div
                      className="absolute top-0 right-0"
                      initial={{ x: 0, y: 0, scale: 1 }}
                      animate={{
                        x: [70, 150, 250],
                        y: [-70, -150, -250],
                        scale: [1, 0.4, 0.1],
                        rotate: [0, 135, 270]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeIn",
                        delay: 0.2
                      }}
                    >
                      <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                        <Lock className="w-3 h-3 text-white" />
                      </div>
                    </motion.div>

                    {/* Bottom-left diagonal chunk */}
                    <motion.div
                      className="absolute bottom-0 left-0"
                      initial={{ x: 0, y: 0, scale: 1 }}
                      animate={{
                        x: [-70, -150, -250],
                        y: [70, 150, 250],
                        scale: [1, 0.4, 0.1],
                        rotate: [0, -135, -270]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeIn",
                        delay: 0.5
                      }}
                    >
                      <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                        <Lock className="w-3 h-3 text-white" />
                      </div>
                    </motion.div>

                    {/* Top-left diagonal chunk */}
                    <motion.div
                      className="absolute top-0 left-0"
                      initial={{ x: 0, y: 0, scale: 1 }}
                      animate={{
                        x: [-50, -120, -200],
                        y: [-50, -120, -200],
                        scale: [1, 0.3, 0.05],
                        rotate: [0, 225, 450]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeIn",
                        delay: 0.1
                      }}
                    >
                      <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center shadow-md">
                        <Lock className="w-2.5 h-2.5 text-white" />
                      </div>
                    </motion.div>

                    {/* Bottom-right diagonal chunk */}
                    <motion.div
                      className="absolute bottom-0 right-0"
                      initial={{ x: 0, y: 0, scale: 1 }}
                      animate={{
                        x: [50, 120, 200],
                        y: [50, 120, 200],
                        scale: [1, 0.3, 0.05],
                        rotate: [0, -225, -450]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeIn",
                        delay: 0.7
                      }}
                    >
                      <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center shadow-md">
                        <Lock className="w-2.5 h-2.5 text-white" />
                      </div>
                    </motion.div>

                    {/* Center explosion effect */}
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{
                        scale: [1, 2, 4, 0],
                        opacity: [1, 0.8, 0.4, 0]
                      }}
                      transition={{
                        duration: 3.5,
                        repeat: Infinity,
                        ease: "easeOut"
                      }}
                    >
                      <div className="w-20 h-20 border-2 border-purple-400/60 rounded-full"></div>
                    </motion.div>

                    {/* Secondary explosion ring */}
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{
                        scale: [1, 1.5, 3, 0],
                        opacity: [0.5, 0.8, 0.2, 0]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: 0.5
                      }}
                    >
                      <div className="w-12 h-12 border border-cyan-400/40 rounded-full"></div>
                    </motion.div>
                  </motion.div>
                  <motion.p
                    className="text-white text-xl font-semibold mt-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Splitting into chunks
                  </motion.p>
                  <motion.p
                    className="text-gray-300 text-sm mt-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    Distributing across decentralized network
                  </motion.p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <motion.div 
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div>
            <motion.h1 
              className="text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Web3 Dropbox
            </motion.h1>
            <motion.p 
              className="text-gray-300 text-lg"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Welcome back, <span className="text-purple-400 font-semibold">{userProfile.displayName}</span>!
            </motion.p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Storage Usage */}
            <motion.div 
              className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl px-6 py-4 rounded-xl border border-purple-500/20 shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              whileHover={{ scale: 1.05, borderColor: "rgba(168, 85, 247, 0.4)" }}
            >
              <div className="text-sm text-gray-300 mb-1">Storage Used</div>
              <div className="font-bold text-white">
                {formatStorageSize(userProfile.storageUsed)} / {formatStorageSize(userProfile.storageLimit)}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <motion.div 
                  className="bg-gradient-to-r from-purple-500 to-cyan-400 h-2 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateStoragePercentage(userProfile.storageUsed, userProfile.storageLimit)}%` }}
                  transition={{ duration: 1, delay: 0.8 }}
                />
              </div>
            </motion.div>

            {/* Token Balance */}
            {isConnected && (
              <motion.div 
                className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl px-6 py-4 rounded-xl border border-cyan-500/20 shadow-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                whileHover={{ scale: 1.05, borderColor: "rgba(6, 182, 212, 0.4)" }}
              >
                <div className="text-sm text-gray-300 mb-1">Balance</div>
                <div className="font-bold text-cyan-400 flex items-center">
                  <Coins className="w-4 h-4 mr-2" />
                  {formatTokens(tokenBalance?.formatted || '0')}
                </div>
              </motion.div>
            )}

            {/* Wallet Connection */}
            <div className="flex items-center space-x-3">
              {userProfile.walletAddress ? (
                <motion.div 
                  className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-xl px-4 py-3 rounded-xl border border-green-500/30 flex items-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                  <span className="text-sm text-green-200 font-semibold">Wallet Linked</span>
                </motion.div>
              ) : isConnected ? (
                <motion.button
                  onClick={handleLinkWallet}
                  disabled={linkingWallet}
                  className="bg-gradient-to-r from-purple-500 to-cyan-400 text-white px-6 py-3 rounded-xl font-semibold flex items-center disabled:opacity-50 shadow-lg border border-purple-400/30"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(168, 85, 247, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  {linkingWallet ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Link className="w-5 h-5 mr-2" />
                  )}
                  Link Wallet
                </motion.button>
              ) : null}
              <div className="[&>div]:bg-white/10 [&>div]:backdrop-blur-xl [&>div]:border [&>div]:border-purple-500/20 [&>div]:rounded-xl">
                <ConnectButton />
              </div>
            </div>

            {/* User Menu */}
            <motion.button
              onClick={handleSignOut}
              className="flex items-center space-x-3 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl px-4 py-3 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all duration-300 shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              whileHover={{ scale: 1.05, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
              whileTap={{ scale: 0.95 }}
            >
              {userProfile.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className="w-8 h-8 rounded-full border-2 border-purple-400" />
              ) : (
                <User className="w-8 h-8 text-gray-300" />
              )}
              <LogOut className="w-5 h-5 text-red-400" />
            </motion.button>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div 
          className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/20 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="flex flex-wrap border-b border-purple-500/20">
            {[
              { id: 'files', icon: File, label: 'My Files' },
              { id: 'provider', icon: Server, label: 'Storage Provider' },
              { id: 'marketplace', icon: TrendingUp, label: 'Marketplace' },
              { id: 'profile', icon: Settings, label: 'Profile' }
            ].map((tab, index) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'files' | 'provider' | 'marketplace' | 'profile')}
                className={`px-6 py-4 font-semibold transition-all duration-300 flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-purple-400 bg-purple-500/20'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
              >
                <tab.icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Files Tab */}
          {activeTab === 'files' && (
            <motion.div 
              className="p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Upload Section */}
              <motion.div 
                className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-xl rounded-2xl p-8 mb-8 border border-purple-500/20"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="border-2 border-dashed border-purple-400/30 rounded-2xl p-8 text-center hover:border-purple-400/50 transition-colors">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Upload className="mx-auto h-16 w-16 text-purple-400 mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-3">
                      Upload to Decentralized Storage
                    </h3>
                    <p className="text-gray-300 mb-6 text-lg">
                      Files are encrypted, chunked, and distributed across multiple providers
                    </p>
                  </motion.div>
                  
                  {/* Storage Warning */}
                  {calculateStoragePercentage(userProfile.storageUsed, userProfile.storageLimit) > 80 && (
                    <motion.div 
                      className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl backdrop-blur-sm"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-yellow-400 mr-3" />
                        <span className="text-yellow-200 font-semibold">
                          Storage is {calculateStoragePercentage(userProfile.storageUsed, userProfile.storageLimit)}% full
                        </span>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Encryption Options */}
                  <div className="mb-8 max-w-md mx-auto">
                    <div className="flex items-center mb-3">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Optional encryption password"
                        value={encryptionPassword}
                        onChange={(e) => setEncryptionPassword(e.target.value)}
                        className="flex-1 px-4 py-3 bg-white/10 border border-purple-500/30 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 backdrop-blur-sm"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="px-4 py-3 border border-l-0 border-purple-500/30 rounded-r-xl hover:bg-white/10 text-purple-400 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-400">
                      Leave empty for automatic key generation
                    </p>
                  </div>

                  <motion.label 
                    className="cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <span className={`inline-flex items-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-white shadow-2xl transition-all duration-300 ${
                      uploading 
                        ? 'bg-gray-600 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 hover:shadow-purple-500/30 border border-purple-400/30'
                    }`}>
                      {uploading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin mr-3" />
                          Uploading to IPFS...
                        </>
                      ) : (
                        <>
                          <Zap className="w-6 h-6 mr-3" />
                          Choose File
                        </>
                      )}
                    </span>
                  </motion.label>
                </div>
              </motion.div>

              {/* Files List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h2 className="text-2xl font-bold mb-6 text-white">Your Files ({files.length})</h2>
                <div className="space-y-4">
                  {files.length === 0 ? (
                    <motion.div 
                      className="text-center py-16 text-gray-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.6 }}
                    >
                      <File className="mx-auto h-16 w-16 text-gray-500 mb-6" />
                      <p className="text-xl mb-2">No files uploaded yet</p>
                      <p className="text-gray-500">Upload your first file to get started with decentralized storage!</p>
                    </motion.div>
                  ) : (
                    files.map((file, index) => (
                      <motion.div 
                        key={file.id} 
                        className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border border-purple-500/20 rounded-xl p-6 hover:border-purple-400/40 transition-all duration-300 shadow-lg"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                        whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(168, 85, 247, 0.2)" }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-xl flex items-center justify-center mr-4">
                              <File className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white mb-1">{file.name}</h3>
                              <div className="text-sm text-gray-300 space-x-4 mb-2">
                                <span>{formatStorageSize(file.size)}</span>
                                <span>•</span>
                                <span>{file.chunks} chunks</span>
                                <span>•</span>
                                <span>Uploaded {file.uploadDate}</span>
                              </div>
                              <div className="text-xs text-gray-400 font-mono">
                                IPFS: {file.ipfsHash.substring(0, 20)}...
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center text-sm text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/30">
                              <Lock className="w-4 h-4 mr-2" />
                              Encrypted
                            </div>
                            <motion.button
                              onClick={() => handleDownload(file)}
                              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300 border border-purple-400/30"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </motion.button>
                            <motion.button 
                              className="inline-flex items-center px-4 py-2 bg-white/10 text-gray-300 font-semibold rounded-lg hover:bg-white/20 transition-all duration-300 border border-gray-500/30"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Provider Tab */}
          {activeTab === 'provider' && (
            <motion.div 
              className="p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {!userProfile.isProvider ? (
                <motion.div 
                  className="text-center py-16"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <Server className="mx-auto h-20 w-20 text-purple-400 mb-6" />
                  <h2 className="text-3xl font-bold text-white mb-4">Become a Storage Provider</h2>
                  <p className="text-gray-300 mb-8 max-w-md mx-auto text-lg">
                    Rent out your unused storage space and earn STOR tokens. Help build the decentralized storage network.
                  </p>
                  {userProfile.walletAddress ? (
                    <motion.button
                      onClick={handleRegisterAsProvider}
                      className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-bold text-lg rounded-xl shadow-2xl border border-purple-400/30"
                      whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(168, 85, 247, 0.3)" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Coins className="w-6 h-6 mr-3" />
                      Register as Provider
                    </motion.button>
                  ) : (
                    <motion.div 
                      className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 max-w-md mx-auto backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-yellow-400 mr-3" />
                        <span className="text-yellow-200 font-semibold">Connect and link your wallet first</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <div>
                  <h2 className="text-3xl font-bold mb-8 text-white">Provider Dashboard</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-xl p-6 rounded-xl border border-green-500/20">
                      <div className="flex items-center">
                        <Coins className="w-8 h-8 text-green-400 mr-3" />
                        <div>
                          <div className="text-2xl font-bold text-green-400">
                            {userProfile.providerStats?.totalEarnings || 0} STOR
                          </div>
                          <div className="text-sm text-gray-300">Total Earnings</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-xl p-6 rounded-xl border border-blue-500/20">
                      <div className="flex items-center">
                        <Server className="w-8 h-8 text-blue-400 mr-3" />
                        <div>
                          <div className="text-2xl font-bold text-blue-400">
                            {formatStorageSize(userProfile.providerStats?.storageProvided || 0)}
                          </div>
                          <div className="text-sm text-gray-300">Storage Provided</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl p-6 rounded-xl border border-purple-500/20">
                      <div className="flex items-center">
                        <Shield className="w-8 h-8 text-purple-400 mr-3" />
                        <div>
                          <div className="text-2xl font-bold text-purple-400">
                            {userProfile.providerStats?.reputation || 100}%
                          </div>
                          <div className="text-sm text-gray-300">Reputation Score</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Marketplace Tab */}
          {activeTab === 'marketplace' && (
            <motion.div 
              className="p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-8 text-white">Storage Marketplace</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-white">Active Providers (0)</h3>
                  <div className="text-center py-12 text-gray-400">
                    <Users className="mx-auto h-16 w-16 text-gray-500 mb-4" />
                    <p className="text-lg">No active providers found</p>
                    <p className="text-gray-500">Be the first to register as a provider!</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-white">Network Statistics</h3>
                  <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border border-purple-500/20 rounded-xl p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Total Providers</span>
                        <span className="font-medium text-white">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Files Stored</span>
                        <span className="font-medium text-white">{files.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Total Users</span>
                        <span className="font-medium text-white">1</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div 
              className="p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-8 text-white">Profile Settings</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border border-purple-500/20 rounded-xl p-6">
                    <h3 className="text-xl font-semibold mb-4 text-white">Account Information</h3>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        {userProfile.photoURL ? (
                          <img src={userProfile.photoURL} alt="Profile" className="w-16 h-16 rounded-full mr-4 border-2 border-purple-400" />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center mr-4">
                            <User className="w-8 h-8 text-white" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-lg font-medium text-white">{userProfile.displayName}</h4>
                          <p className="text-gray-300">{userProfile.email}</p>
                          <p className="text-sm text-gray-400">
                            Member since {new Date(userProfile.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="border-t border-purple-500/20 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-400">Plan</div>
                            <div className="font-medium capitalize text-white">{userProfile.plan}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400">Status</div>
                            <div className="font-medium text-green-400">Active</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border border-purple-500/20 rounded-xl p-6">
                    <h3 className="text-xl font-semibold mb-4 text-white">Storage & Wallet</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Storage Usage</div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white">{formatStorageSize(userProfile.storageUsed)}</span>
                          <span className="text-white">{formatStorageSize(userProfile.storageLimit)}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-cyan-400 h-2 rounded-full" 
                            style={{ width: `${calculateStoragePercentage(userProfile.storageUsed, userProfile.storageLimit)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="border-t border-purple-500/20 pt-4">
                        <div className="text-sm text-gray-400 mb-2">Wallet Connection</div>
                        {userProfile.walletAddress ? (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-mono text-sm text-white">
                                {userProfile.walletAddress.substring(0, 6)}...{userProfile.walletAddress.substring(userProfile.walletAddress.length - 4)}
                              </div>
                              <div className="text-xs text-green-400">Connected</div>
                            </div>
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          </div>
                        ) : (
                          <div className="text-gray-400">No wallet connected</div>
                        )}
                      </div>
                      
                      {userProfile.isProvider && (
                        <div className="border-t border-purple-500/20 pt-4">
                          <div className="text-sm text-gray-400 mb-2">Provider Status</div>
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 text-green-400 mr-2" />
                            <span className="text-green-400 font-medium">Active Provider</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
