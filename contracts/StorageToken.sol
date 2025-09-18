// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StorageToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1000000000 * 10**18; // 1 billion tokens
    uint256 public constant MAX_SUPPLY = 10000000000 * 10**18; // 10 billion tokens max
    
    // Minting controls
    mapping(address => bool) public minters;
    uint256 public totalMinted;
    
    // Staking rewards
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakingRewards;
    mapping(address => uint256) public lastStakeTime;
    
    uint256 public constant STAKING_REWARD_RATE = 5; // 5% annual reward
    uint256 public constant SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    
    constructor() ERC20("StorageToken", "STOR") {
        _mint(msg.sender, INITIAL_SUPPLY);
        totalMinted = INITIAL_SUPPLY;
    }
    
    function addMinter(address _minter) external onlyOwner {
        minters[_minter] = true;
        emit MinterAdded(_minter);
    }
    
    function removeMinter(address _minter) external onlyOwner {
        minters[_minter] = false;
        emit MinterRemoved(_minter);
    }
    
    function mint(address _to, uint256 _amount) external {
        require(minters[msg.sender], "Not authorized to mint");
        require(totalMinted + _amount <= MAX_SUPPLY, "Would exceed max supply");
        
        _mint(_to, _amount);
        totalMinted += _amount;
    }
    
    function stake(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");
        
        // Calculate and add pending rewards
        if (stakedBalance[msg.sender] > 0) {
            uint256 pendingRewards = calculateStakingRewards(msg.sender);
            stakingRewards[msg.sender] += pendingRewards;
        }
        
        // Transfer tokens to contract
        _transfer(msg.sender, address(this), _amount);
        
        // Update staking info
        stakedBalance[msg.sender] += _amount;
        lastStakeTime[msg.sender] = block.timestamp;
        
        emit Staked(msg.sender, _amount);
    }
    
    function unstake(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(stakedBalance[msg.sender] >= _amount, "Insufficient staked balance");
        
        // Calculate and add pending rewards
        uint256 pendingRewards = calculateStakingRewards(msg.sender);
        stakingRewards[msg.sender] += pendingRewards;
        
        // Update staking info
        stakedBalance[msg.sender] -= _amount;
        lastStakeTime[msg.sender] = block.timestamp;
        
        // Transfer tokens back to user
        _transfer(address(this), msg.sender, _amount);
        
        emit Unstaked(msg.sender, _amount);
    }
    
    function claimRewards() external {
        uint256 pendingRewards = calculateStakingRewards(msg.sender);
        uint256 totalRewards = stakingRewards[msg.sender] + pendingRewards;
        
        require(totalRewards > 0, "No rewards to claim");
        
        // Reset rewards and update timestamp
        stakingRewards[msg.sender] = 0;
        lastStakeTime[msg.sender] = block.timestamp;
        
        // Mint rewards (if within max supply)
        if (totalMinted + totalRewards <= MAX_SUPPLY) {
            _mint(msg.sender, totalRewards);
            totalMinted += totalRewards;
        } else {
            // If minting would exceed max supply, transfer from contract balance
            uint256 contractBalance = balanceOf(address(this));
            uint256 rewardAmount = totalRewards > contractBalance ? contractBalance : totalRewards;
            if (rewardAmount > 0) {
                _transfer(address(this), msg.sender, rewardAmount);
            }
        }
        
        emit RewardsClaimed(msg.sender, totalRewards);
    }
    
    function calculateStakingRewards(address _user) public view returns (uint256) {
        if (stakedBalance[_user] == 0) {
            return 0;
        }
        
        uint256 timeStaked = block.timestamp - lastStakeTime[_user];
        uint256 annualReward = (stakedBalance[_user] * STAKING_REWARD_RATE) / 100;
        uint256 reward = (annualReward * timeStaked) / SECONDS_PER_YEAR;
        
        return reward;
    }
    
    function getTotalRewards(address _user) external view returns (uint256) {
        return stakingRewards[_user] + calculateStakingRewards(_user);
    }
    
    function getStakingInfo(address _user) external view returns (
        uint256 staked,
        uint256 rewards,
        uint256 pendingRewards,
        uint256 lastStake
    ) {
        return (
            stakedBalance[_user],
            stakingRewards[_user],
            calculateStakingRewards(_user),
            lastStakeTime[_user]
        );
    }
    
    // Override transfer to handle staked tokens
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
        
        // Prevent transfer of staked tokens
        if (from != address(0) && from != address(this)) {
            require(
                balanceOf(from) - stakedBalance[from] >= amount,
                "Cannot transfer staked tokens"
            );
        }
    }
}
