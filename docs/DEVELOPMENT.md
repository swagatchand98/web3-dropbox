# Development Guide

## Getting Started

This guide will help you set up the development environment and understand the project structure.

## Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Git for version control
- A code editor (VS Code recommended)

## Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd web3-dropbox
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   - Get a WalletConnect Project ID from https://cloud.walletconnect.com/
   - Update contract addresses after deployment

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## Project Architecture

### Frontend Structure
```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── SimpleUpload.tsx   # Current working UI
│   └── Dashboard.tsx      # Full Web3 dashboard (WIP)
├── config/               # Configuration files
│   └── wagmi.ts          # Web3 wallet configuration
├── providers/            # React context providers
│   └── Web3Provider.tsx  # Web3 connection provider
└── services/             # Business logic
    └── ipfs.ts           # IPFS integration
```

### Smart Contracts
```
contracts/
└── FileStorage.sol       # File ownership and metadata
```

## Development Workflow

### 1. Frontend Development
- Use TypeScript for type safety
- Follow React best practices
- Use Tailwind CSS for styling
- Test components in isolation

### 2. Smart Contract Development
- Write contracts in Solidity
- Use Hardhat for testing and deployment
- Follow security best practices
- Document all functions

### 3. IPFS Integration
- Use Helia for modern IPFS integration
- Implement client-side encryption
- Handle file chunking and distribution
- Test with local IPFS nodes

## Code Style Guidelines

### TypeScript
- Use strict type checking
- Define interfaces for all data structures
- Use meaningful variable names
- Add JSDoc comments for complex functions

### React Components
- Use functional components with hooks
- Implement proper error boundaries
- Use React.memo for performance optimization
- Follow the single responsibility principle

### CSS/Tailwind
- Use Tailwind utility classes
- Create custom components for repeated patterns
- Maintain responsive design principles
- Use semantic color names

## Testing Strategy

### Unit Tests
- Test individual components
- Mock external dependencies
- Use Jest and React Testing Library
- Aim for 80%+ code coverage

### Integration Tests
- Test component interactions
- Test Web3 wallet connections
- Test IPFS upload/download flows
- Use Cypress for E2E testing

### Smart Contract Tests
- Test all contract functions
- Test edge cases and error conditions
- Use Hardhat testing framework
- Test gas optimization

## Deployment Process

### Development Deployment
1. Build the application: `npm run build`
2. Test the build locally: `npm run start`
3. Deploy to staging environment

### Production Deployment
1. Deploy smart contracts to mainnet
2. Update environment variables
3. Build and deploy frontend
4. Monitor application performance

## Debugging Tips

### Frontend Issues
- Use React DevTools for component debugging
- Check browser console for errors
- Use Network tab to debug API calls
- Test in different browsers

### Web3 Issues
- Check wallet connection status
- Verify network configuration
- Monitor transaction status
- Use blockchain explorers for verification

### IPFS Issues
- Check IPFS node connectivity
- Verify file hashes
- Test with different IPFS gateways
- Monitor upload/download performance

## Performance Optimization

### Frontend
- Use Next.js Image optimization
- Implement code splitting
- Optimize bundle size
- Use service workers for caching

### Smart Contracts
- Optimize gas usage
- Use events for off-chain indexing
- Implement batch operations
- Consider layer 2 solutions

### IPFS
- Implement file compression
- Use efficient chunking strategies
- Cache frequently accessed files
- Optimize gateway selection

## Security Considerations

### Frontend Security
- Validate all user inputs
- Implement proper error handling
- Use HTTPS in production
- Sanitize displayed data

### Smart Contract Security
- Follow OpenZeppelin standards
- Implement access controls
- Use reentrancy guards
- Conduct security audits

### IPFS Security
- Implement client-side encryption
- Validate file integrity
- Use secure key management
- Monitor for malicious content

## Contributing Guidelines

1. **Fork the Repository**
   - Create your own fork
   - Clone to local machine
   - Set up upstream remote

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow coding standards
   - Add tests for new features
   - Update documentation

4. **Submit Pull Request**
   - Write clear commit messages
   - Include description of changes
   - Reference related issues
   - Request code review

## Troubleshooting

### Common Issues

**Build Errors**
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify environment variables

**Web3 Connection Issues**
- Check wallet installation
- Verify network configuration
- Clear browser cache
- Try different wallet providers

**IPFS Upload Failures**
- Check IPFS node status
- Verify file size limits
- Test with different files
- Check network connectivity

### Getting Help

- Check existing GitHub issues
- Join our Discord community
- Read the documentation
- Ask questions in discussions

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Guide](https://tailwindcss.com/docs)
- [Wagmi Documentation](https://wagmi.sh/)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Solidity Documentation](https://docs.soliditylang.org/)
