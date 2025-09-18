'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Upload, Download, File, Share2, Lock, Unlock } from 'lucide-react';
import { uploadToIPFS, downloadFromIPFS } from '@/services/ipfs';

const CONTRACT_ADDRESS = '0x...'; // Will be updated after deployment
const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "_ipfsHash", "type": "string"},
      {"internalType": "string", "name": "_fileName", "type": "string"},
      {"internalType": "uint256", "name": "_fileSize", "type": "uint256"},
      {"internalType": "bool", "name": "_isPublic", "type": "bool"}
    ],
    "name": "uploadFile",
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
    "inputs": [{"internalType": "string", "name": "_ipfsHash", "type": "string"}],
    "name": "getFile",
    "outputs": [
      {
        "components": [
          {"internalType": "string", "name": "ipfsHash", "type": "string"},
          {"internalType": "string", "name": "fileName", "type": "string"},
          {"internalType": "uint256", "name": "fileSize", "type": "uint256"},
          {"internalType": "address", "name": "owner", "type": "address"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "bool", "name": "isPublic", "type": "bool"}
        ],
        "internalType": "struct FileStorage.FileRecord",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

interface FileRecord {
  ipfsHash: string;
  fileName: string;
  fileSize: bigint;
  owner: string;
  timestamp: bigint;
  isPublic: boolean;
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const { writeContract } = useWriteContract();

  const { data: userFiles } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getUserFiles',
    args: [address],
    query: {
      enabled: !!address && isConnected,
    },
  });

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isConnected) return;

    setUploading(true);
    try {
      // Upload to IPFS
      const ipfsHash = await uploadToIPFS(file);
      
      // Record on blockchain
      await writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'uploadFile',
        args: [ipfsHash, file.name, BigInt(file.size), false],
      });

      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [isConnected, writeContract]);

  const handleDownload = async (ipfsHash: string, fileName: string) => {
    try {
      const data = await downloadFromIPFS(ipfsHash);
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Web3 Dropbox</h1>
          <p className="text-lg text-gray-600 mb-8">
            Decentralized storage marketplace powered by IPFS and blockchain
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Files</h1>
          <ConnectButton />
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload your files to IPFS
            </h3>
            <p className="text-gray-500 mb-4">
              Files are encrypted and stored across the decentralized network
            </p>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                {uploading ? 'Uploading...' : 'Choose File'}
              </span>
            </label>
          </div>
        </div>

        {/* Files List */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Your Files</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {files.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No files uploaded yet. Upload your first file to get started!
              </div>
            ) : (
              files.map((file) => (
                <div key={file.ipfsHash} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <File className="h-8 w-8 text-gray-400 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{file.fileName}</h3>
                      <p className="text-sm text-gray-500">
                        {(Number(file.fileSize) / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.isPublic ? (
                      <Unlock className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-400" />
                    )}
                    <button
                      onClick={() => handleDownload(file.ipfsHash, file.fileName)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </button>
                    <button className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200">
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
