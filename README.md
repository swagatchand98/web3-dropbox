# 🌐 Web3 Dropbox - Decentralized Storage Marketplace

A decentralized storage marketplace that combines the power of IPFS, blockchain technology, and smart contracts to create a secure, censorship-resistant alternative to traditional cloud storage services like Google Drive and Dropbox.

## 📌 Problem Statement

Traditional cloud storage solutions have several critical issues:
- **Centralized Control**: Single point of failure and censorship risks
- **Privacy Concerns**: Your data is stored on corporate servers
- **Vendor Lock-in**: Limited portability and control over your files
- **Unused Resources**: Millions of computers have idle storage space

## 🎯 Solution

Web3 Dropbox creates a decentralized storage marketplace where:
- **Storage Providers** rent out unused space and earn tokens
- **Users** pay tokens to store files securely across multiple nodes
- **Files** are encrypted, chunked, and distributed (no single entity has your complete file)
- **Blockchain** ensures fair payments, ownership proof, and reputation tracking

Think of it as **"Uber for Storage"** - anyone can become a storage provider!

## ⚙️ How It Works

### 1. File Upload Process
- User uploads a file through the web interface
- File is encrypted client-side using AES encryption
- File is split into chunks and distributed to multiple IPFS nodes
- Smart contract records file ownership and metadata on blockchain

### 2. Storage Provider Network
- Providers register available storage via smart contracts
- They stake tokens to participate and prove reliability
- Earn tokens for hosting data and maintaining uptime
- Reputation system tracks provider performance

### 3. Blockchain Layer
- Smart contracts handle payments and ownership
- Automated proof-of-storage verification
- Decentralized governance for network upgrades
- Token economics incentivize honest behavior

### 4. File Retrieval
- User requests file through IPFS network
- Chunks are reassembled automatically
- Decryption happens client-side for privacy
- No storage provider can read your files

## 🏗️ Tech Stack

### Frontend (UI/UX)
- **Next.js 15** with App Router for modern React development
- **Tailwind CSS** for responsive, beautiful UI design
- **TypeScript** for type safety and better developer experience
- **Lucide React** for consistent iconography

### Blockchain Integration
- **Wagmi** for Ethereum wallet connections
- **RainbowKit** for seamless wallet UX
- **Viem** for efficient blockchain interactions
- **Smart Contracts** written in Solidity

### Decentralized Storage
- **IPFS/Helia** for distributed file storage
- **Filecoin** integration for incentivized storage
- **Client-side encryption** for privacy protection

### Backend Services
- **Node.js/Express** for API endpoints (planned)
- **Redis** for caching metadata (planned)
- **MongoDB/PostgreSQL** for user profiles (planned)

## 🚀 Current Features (Phase 1 - MVP)

✅ **Modern Web Interface**
- Clean, intuitive Dropbox-like UI
- Drag & drop file upload
- File management dashboard
- Responsive design for all devices

✅ **File Upload Simulation**
- Mock IPFS hash generation
- File size calculation and display
- Upload progress indication
- File listing with metadata

✅ **Smart Contract Foundation**
- FileStorage.sol contract for ownership tracking
- User file registry system
- Public/private file permissions
- Event logging for transparency

✅ **Development Environment**
- Hot reload development server
- TypeScript configuration
- ESLint code quality checks
- Tailwind CSS styling system

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Git for version control
- MetaMask or compatible Web3 wallet (for full functionality)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd web3-dropbox
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Environment Configuration

Create a `.env.local` file with:
```env
# Wallet Connect Project ID (get from https://cloud.walletconnect.com/)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-project-id-here

# Contract addresses (will be updated after deployment)
NEXT_PUBLIC_FILE_STORAGE_CONTRACT=0x...

# IPFS Configuration
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
```

## 📋 Development Roadmap

### Phase 2: Payments & Marketplace (2-3 weeks)
- [ ] Token payment system integration
- [ ] Storage provider registration
- [ ] Reputation and staking mechanisms
- [ ] Provider earnings dashboard
- [ ] Automated payment distribution

### Phase 3: Advanced Features (3-4 weeks)
- [ ] Real IPFS integration with Helia
- [ ] End-to-end AES encryption
- [ ] File sharding across multiple providers
- [ ] Proof-of-storage verification
- [ ] Token staking and slashing

### Phase 4: Production Ready
- [ ] DAO governance system
- [ ] Multi-chain support (Polygon, Arbitrum)
- [ ] File sharing with permissions
- [ ] zk-SNARKs for privacy-preserving proofs
- [ ] Mobile app development

## 🧑‍💻 Project Structure

```
web3-dropbox/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout component
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   │   ├── Dashboard.tsx    # Full Web3 dashboard (WIP)
│   │   └── SimpleUpload.tsx # Current working interface
│   ├── config/              # Configuration files
│   │   └── wagmi.ts         # Web3 wallet configuration
│   ├── providers/           # React context providers
│   │   └── Web3Provider.tsx # Web3 connection provider
│   └── services/            # Business logic
│       └── ipfs.ts          # IPFS integration service
├── contracts/               # Smart contracts
│   └── FileStorage.sol      # File ownership contract
├── public/                  # Static assets
└── package.json            # Dependencies and scripts
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks
- `npm run type-check` - Run TypeScript checks

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Why This Project Matters

Web3 Dropbox represents the future of data storage:
- **User Sovereignty**: You own and control your data
- **Economic Incentives**: Turn unused storage into income
- **Censorship Resistance**: No single entity can block access
- **Global Accessibility**: Works anywhere with internet
- **Privacy First**: End-to-end encryption by default

## 🚀 Demo Flow

1. **Visit the Application**: Navigate to the running development server
2. **Upload a File**: Click "Choose File" and select any document
3. **Watch the Magic**: File gets processed and assigned an IPFS hash
4. **View Your Files**: See your uploaded files in the dashboard
5. **Download & Share**: Use the action buttons to interact with files

## 📞 Support & Community

- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join our community discussions
- **Documentation**: Check the `/docs` folder for detailed guides
- **Updates**: Follow our development progress

---

**Built with ❤️ for the decentralized future**

*Web3 Dropbox - Where your data belongs to you*
