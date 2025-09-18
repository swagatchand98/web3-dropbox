// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StorageMarket is ReentrancyGuard, Ownable {
    IERC20 public storageToken;
    
    struct Provider {
        address providerAddress;
        uint256 availableStorage; // in bytes
        uint256 usedStorage;
        uint256 pricePerGB; // tokens per GB per month
        uint256 stakedTokens;
        uint256 reputation; // 0-100 score
        uint256 totalEarnings;
        bool isActive;
        uint256 registrationTime;
        string endpoint; // IPFS/storage endpoint
    }
    
    struct StorageRequest {
        address user;
        string fileHash;
        uint256 fileSize;
        uint256 duration; // in seconds
        uint256 totalCost;
        address[] assignedProviders;
        uint256 timestamp;
        bool isActive;
        mapping(address => bool) providerConfirmed;
        uint256 confirmationCount;
    }
    
    struct ProofOfStorage {
        string fileHash;
        address provider;
        bytes32 merkleRoot;
        uint256 timestamp;
        bool verified;
    }
    
    mapping(address => Provider) public providers;
    mapping(string => StorageRequest) public storageRequests;
    mapping(string => ProofOfStorage[]) public proofs;
    mapping(address => string[]) public userFiles;
    mapping(address => uint256) public pendingWithdrawals;
    
    address[] public activeProviders;
    
    uint256 public constant MIN_STAKE = 1000 * 10**18; // 1000 tokens
    uint256 public constant PROOF_INTERVAL = 24 hours;
    uint256 public constant REPUTATION_THRESHOLD = 80;
    
    event ProviderRegistered(address indexed provider, uint256 availableStorage, uint256 pricePerGB);
    event StorageRequested(address indexed user, string fileHash, uint256 fileSize, uint256 totalCost);
    event ProvidersAssigned(string fileHash, address[] providers);
    event ProofSubmitted(string fileHash, address provider, bytes32 merkleRoot);
    event PaymentReleased(address indexed provider, uint256 amount);
    event ProviderSlashed(address indexed provider, uint256 slashedAmount);
    event ReputationUpdated(address indexed provider, uint256 newReputation);
    
    constructor(address _storageToken) {
        storageToken = IERC20(_storageToken);
    }
    
    function registerProvider(
        uint256 _availableStorage,
        uint256 _pricePerGB,
        string memory _endpoint
    ) external {
        require(_availableStorage > 0, "Storage must be greater than 0");
        require(_pricePerGB > 0, "Price must be greater than 0");
        require(storageToken.balanceOf(msg.sender) >= MIN_STAKE, "Insufficient tokens for staking");
        
        // Transfer stake
        require(storageToken.transferFrom(msg.sender, address(this), MIN_STAKE), "Stake transfer failed");
        
        providers[msg.sender] = Provider({
            providerAddress: msg.sender,
            availableStorage: _availableStorage,
            usedStorage: 0,
            pricePerGB: _pricePerGB,
            stakedTokens: MIN_STAKE,
            reputation: 100, // Start with perfect reputation
            totalEarnings: 0,
            isActive: true,
            registrationTime: block.timestamp,
            endpoint: _endpoint
        });
        
        activeProviders.push(msg.sender);
        
        emit ProviderRegistered(msg.sender, _availableStorage, _pricePerGB);
    }
    
    function requestStorage(
        string memory _fileHash,
        uint256 _fileSize,
        uint256 _duration,
        uint256 _redundancy
    ) external nonReentrant {
        require(_fileSize > 0, "File size must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(_redundancy >= 3 && _redundancy <= 10, "Redundancy must be between 3-10");
        
        // Calculate total cost
        uint256 totalCost = calculateStorageCost(_fileSize, _duration, _redundancy);
        require(storageToken.balanceOf(msg.sender) >= totalCost, "Insufficient tokens");
        
        // Transfer payment to contract
        require(storageToken.transferFrom(msg.sender, address(this), totalCost), "Payment transfer failed");
        
        // Select providers
        address[] memory selectedProviders = selectProviders(_fileSize, _redundancy);
        require(selectedProviders.length == _redundancy, "Not enough providers available");
        
        // Create storage request
        StorageRequest storage request = storageRequests[_fileHash];
        request.user = msg.sender;
        request.fileHash = _fileHash;
        request.fileSize = _fileSize;
        request.duration = _duration;
        request.totalCost = totalCost;
        request.assignedProviders = selectedProviders;
        request.timestamp = block.timestamp;
        request.isActive = true;
        request.confirmationCount = 0;
        
        // Update provider used storage
        for (uint i = 0; i < selectedProviders.length; i++) {
            providers[selectedProviders[i]].usedStorage += _fileSize;
        }
        
        userFiles[msg.sender].push(_fileHash);
        
        emit StorageRequested(msg.sender, _fileHash, _fileSize, totalCost);
        emit ProvidersAssigned(_fileHash, selectedProviders);
    }
    
    function confirmStorage(string memory _fileHash) external {
        StorageRequest storage request = storageRequests[_fileHash];
        require(request.isActive, "Storage request not active");
        require(isAssignedProvider(_fileHash, msg.sender), "Not assigned to this file");
        require(!request.providerConfirmed[msg.sender], "Already confirmed");
        
        request.providerConfirmed[msg.sender] = true;
        request.confirmationCount++;
        
        // If all providers confirmed, start payment schedule
        if (request.confirmationCount == request.assignedProviders.length) {
            startPaymentSchedule(_fileHash);
        }
    }
    
    function submitProofOfStorage(
        string memory _fileHash,
        bytes32 _merkleRoot
    ) external {
        require(isAssignedProvider(_fileHash, msg.sender), "Not assigned to this file");
        require(providers[msg.sender].isActive, "Provider not active");
        
        ProofOfStorage memory proof = ProofOfStorage({
            fileHash: _fileHash,
            provider: msg.sender,
            merkleRoot: _merkleRoot,
            timestamp: block.timestamp,
            verified: false
        });
        
        proofs[_fileHash].push(proof);
        
        emit ProofSubmitted(_fileHash, msg.sender, _merkleRoot);
        
        // Auto-verify for now (in production, this would be more sophisticated)
        verifyProof(_fileHash, proofs[_fileHash].length - 1);
    }
    
    function verifyProof(string memory _fileHash, uint256 _proofIndex) internal {
        ProofOfStorage storage proof = proofs[_fileHash][_proofIndex];
        proof.verified = true;
        
        // Update provider reputation
        updateReputation(proof.provider, true);
        
        // Release payment
        releasePayment(_fileHash, proof.provider);
    }
    
    function updateReputation(address _provider, bool _success) internal {
        Provider storage provider = providers[_provider];
        
        if (_success) {
            if (provider.reputation < 100) {
                provider.reputation = provider.reputation + 1;
            }
        } else {
            if (provider.reputation > 10) {
                provider.reputation = provider.reputation - 10;
            }
            
            // Slash stake if reputation drops too low
            if (provider.reputation < REPUTATION_THRESHOLD) {
                slashProvider(_provider);
            }
        }
        
        emit ReputationUpdated(_provider, provider.reputation);
    }
    
    function slashProvider(address _provider) internal {
        Provider storage provider = providers[_provider];
        uint256 slashAmount = provider.stakedTokens / 10; // 10% slash
        
        provider.stakedTokens -= slashAmount;
        
        if (provider.stakedTokens < MIN_STAKE) {
            provider.isActive = false;
        }
        
        emit ProviderSlashed(_provider, slashAmount);
    }
    
    function releasePayment(string memory _fileHash, address _provider) internal {
        StorageRequest storage request = storageRequests[_fileHash];
        uint256 paymentPerProvider = request.totalCost / request.assignedProviders.length;
        
        providers[_provider].totalEarnings += paymentPerProvider;
        pendingWithdrawals[_provider] += paymentPerProvider;
        
        emit PaymentReleased(_provider, paymentPerProvider);
    }
    
    function withdrawEarnings() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No earnings to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        require(storageToken.transfer(msg.sender, amount), "Transfer failed");
    }
    
    function calculateStorageCost(
        uint256 _fileSize,
        uint256 _duration,
        uint256 _redundancy
    ) public view returns (uint256) {
        uint256 sizeInGB = (_fileSize + 1e9 - 1) / 1e9; // Round up to nearest GB
        uint256 durationInMonths = (_duration + 30 days - 1) / 30 days; // Round up to nearest month
        
        // Get average price from active providers
        uint256 totalPrice = 0;
        uint256 activeCount = 0;
        
        for (uint i = 0; i < activeProviders.length; i++) {
            if (providers[activeProviders[i]].isActive) {
                totalPrice += providers[activeProviders[i]].pricePerGB;
                activeCount++;
            }
        }
        
        require(activeCount > 0, "No active providers");
        uint256 avgPrice = totalPrice / activeCount;
        
        return sizeInGB * durationInMonths * avgPrice * _redundancy;
    }
    
    function selectProviders(uint256 _fileSize, uint256 _redundancy) internal view returns (address[] memory) {
        address[] memory selected = new address[](_redundancy);
        uint256 selectedCount = 0;
        
        // Simple selection based on available storage and reputation
        for (uint i = 0; i < activeProviders.length && selectedCount < _redundancy; i++) {
            address providerAddr = activeProviders[i];
            Provider memory provider = providers[providerAddr];
            
            if (provider.isActive && 
                provider.availableStorage >= provider.usedStorage + _fileSize &&
                provider.reputation >= REPUTATION_THRESHOLD) {
                selected[selectedCount] = providerAddr;
                selectedCount++;
            }
        }
        
        return selected;
    }
    
    function startPaymentSchedule(string memory _fileHash) internal {
        // In a real implementation, this would set up a payment schedule
        // For now, we'll just mark it as ready for proof submission
    }
    
    function isAssignedProvider(string memory _fileHash, address _provider) internal view returns (bool) {
        StorageRequest storage request = storageRequests[_fileHash];
        for (uint i = 0; i < request.assignedProviders.length; i++) {
            if (request.assignedProviders[i] == _provider) {
                return true;
            }
        }
        return false;
    }
    
    // View functions
    function getProvider(address _provider) external view returns (Provider memory) {
        return providers[_provider];
    }
    
    function getActiveProviders() external view returns (address[] memory) {
        return activeProviders;
    }
    
    function getUserFiles(address _user) external view returns (string[] memory) {
        return userFiles[_user];
    }
    
    function getStorageRequest(string memory _fileHash) external view returns (
        address user,
        uint256 fileSize,
        uint256 duration,
        uint256 totalCost,
        address[] memory assignedProviders,
        bool isActive
    ) {
        StorageRequest storage request = storageRequests[_fileHash];
        return (
            request.user,
            request.fileSize,
            request.duration,
            request.totalCost,
            request.assignedProviders,
            request.isActive
        );
    }
}
