const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Configuration
  const NAME = "Generative NFT";
  const SYMBOL = "GNFT";
  const MAX_SUPPLY = 1000;
  const ALLOWLIST_PRICE = hre.ethers.parseEther("0.05");
  const PUBLIC_PRICE = hre.ethers.parseEther("0.08");
  const UNREVEALED_URI = "ipfs://QmUnrevealedCID/"; // Placeholder
  const ROYALTY_RECIPIENT = deployer.address;
  const ROYALTY_PERCENTAGE = 500; // 5%

  const NFTLaunchpad = await hre.ethers.getContractFactory("NFTLaunchpad");
  const nftLaunchpad = await NFTLaunchpad.deploy(
    NAME,
    SYMBOL,
    MAX_SUPPLY,
    ALLOWLIST_PRICE,
    PUBLIC_PRICE,
    UNREVEALED_URI,
    ROYALTY_RECIPIENT,
    ROYALTY_PERCENTAGE
  );

  await nftLaunchpad.waitForDeployment();

  const address = await nftLaunchpad.getAddress();
  console.log("NFTLaunchpad deployed to:", address);

  // We can write this address to a file or .env if needed for the frontend
  // For now, just logging it is enough as the user will copy it
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
