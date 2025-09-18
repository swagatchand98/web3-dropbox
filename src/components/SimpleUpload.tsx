'use client';

import { useState } from 'react';
import { Upload, Download, File, Share2 } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadDate: string;
  ipfsHash?: string;
}

export default function SimpleUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // Simulate upload process
    setTimeout(() => {
      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        uploadDate: new Date().toLocaleDateString(),
        ipfsHash: `Qm${Math.random().toString(36).substring(2, 15)}` // Mock IPFS hash
      };
      
      setFiles(prev => [...prev, newFile]);
      setUploading(false);
      
      // Reset input
      event.target.value = '';
    }, 2000);
  };

  const handleDownload = (file: UploadedFile) => {
    alert(`Downloading ${file.name} from IPFS: ${file.ipfsHash}`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Web3 Dropbox</h1>
          <p className="text-lg text-gray-600">
            Decentralized storage marketplace powered by IPFS and blockchain
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 max-w-2xl mx-auto">
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
        <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Your Files ({files.length})</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {files.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <File className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p className="text-lg">No files uploaded yet</p>
                <p className="text-sm">Upload your first file to get started!</p>
              </div>
            ) : (
              files.map((file) => (
                <div key={file.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center">
                    <File className="h-8 w-8 text-gray-400 mr-4" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{file.name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • Uploaded {file.uploadDate}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        IPFS: {file.ipfsHash}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
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
              ))
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Why Choose Web3 Dropbox?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Decentralized</h3>
              <p className="text-gray-600">No single point of failure. Your files are distributed across the network.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Secure</h3>
              <p className="text-gray-600">End-to-end encryption ensures only you can access your files.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Earn Tokens</h3>
              <p className="text-gray-600">Provide storage space and earn tokens from the marketplace.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
