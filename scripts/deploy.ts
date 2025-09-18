const hre = require("hardhat");

async function main() {
  console.log("Deploying Web3 Dropbox contracts...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy StorageToken first
  console.log("\n1. Deploying StorageToken...");
  const StorageToken = await hre.ethers.getContractFactory("StorageToken");
  const storageToken = await StorageToken.deploy();
  await storageToken.waitForDeployment();
  const storageTokenAddress = await storageToken.getAddress();
  console.log("StorageToken deployed to:", storageTokenAddress);

  // Deploy StorageMarket with token address
  console.log("\n2. Deploying StorageMarket...");
  const StorageMarket = await hre.ethers.getContractFactory("StorageMarket");
  const storageMarket = await StorageMarket.deploy(storageTokenAddress);
  await storageMarket.waitForDeployment();
  const storageMarketAddress = await storageMarket.getAddress();
  console.log("StorageMarket deployed to:", storageMarketAddress);

  // Deploy FileStorage
  console.log("\n3. Deploying FileStorage...");
  const FileStorage = await hre.ethers.getContractFactory("FileStorage");
  const fileStorage = await FileStorage.deploy();
  await fileStorage.waitForDeployment();
  const fileStorageAddress = await fileStorage.getAddress();
  console.log("FileStorage deployed to:", fileStorageAddress);

  // Add StorageMarket as minter for StorageToken
  console.log("\n4. Setting up permissions...");
  await storageToken.addMinter(storageMarketAddress);
  console.log("Added StorageMarket as minter for StorageToken");

  // Transfer some tokens to deployer for testing
  const initialTokens = hre.ethers.parseEther("10000"); // 10,000 tokens
  await storageToken.transfer(deployer.address, initialTokens);
  console.log("Transferred", hre.ethers.formatEther(initialTokens), "tokens to deployer");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("StorageToken:", storageTokenAddress);
  console.log("StorageMarket:", storageMarketAddress);
  console.log("FileStorage:", fileStorageAddress);

  console.log("\n🔧 Environment Variables:");
  console.log(`NEXT_PUBLIC_STORAGE_TOKEN_CONTRACT=${storageTokenAddress}`);
  console.log(`NEXT_PUBLIC_STORAGE_MARKET_CONTRACT=${storageMarketAddress}`);
  console.log(`NEXT_PUBLIC_FILE_STORAGE_CONTRACT=${fileStorageAddress}`);

  // Verify contracts on Etherscan (if not local network)
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 1337 && network.chainId !== 31337) {
    console.log("\n🔍 Verifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: storageTokenAddress,
        constructorArguments: [],
      });
      console.log("StorageToken verified");
    } catch (error) {
      console.log("StorageToken verification failed:", error);
    }

    try {
      await hre.run("verify:verify", {
        address: storageMarketAddress,
        constructorArguments: [storageTokenAddress],
      });
      console.log("StorageMarket verified");
    } catch (error) {
      console.log("StorageMarket verification failed:", error);
    }

    try {
      await hre.run("verify:verify", {
        address: fileStorageAddress,
        constructorArguments: [],
      });
      console.log("FileStorage verified");
    } catch (error) {
      console.log("FileStorage verification failed:", error);
    }
  }

  console.log("\n✅ All done! Update your .env.local file with the contract addresses above.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
