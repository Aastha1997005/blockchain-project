const hre = require("hardhat");

async function main() {
  // 1. Deploy Identity Contract
  const Identity = await hre.ethers.getContractFactory("Identity");
  console.log("Deploying Identity contract...");
  const identity = await Identity.deploy();
  await identity.waitForDeployment();
  const identityAddress = await identity.getAddress();
  console.log("Identity Smart Contract deployed to:", identityAddress);

  // 2. Deploy KYCGatedAuction Contract
  const KYCGatedAuction = await hre.ethers.getContractFactory("KYCGatedAuction");
  console.log("Deploying KYCGatedAuction contract...");
  const auction = await KYCGatedAuction.deploy(identityAddress);
  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("KYCGatedAuction Smart Contract deployed to:", auctionAddress);

  console.log("\n--- Deployment Summary ---");
  console.log("Identity Address:", identityAddress);
  console.log("Auction Address:", auctionAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
