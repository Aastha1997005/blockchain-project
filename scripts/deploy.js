const hre = require("hardhat");

async function main() {
  // Get the contract factory
  const Identity = await hre.ethers.getContractFactory("Identity");
  
  // Deploy the contract
  console.log("Deploying Identity contract...");
  const identity = await Identity.deploy();

  // Wait for deployment to finish
  await identity.waitForDeployment();

  // Print the address
  console.log("Identity Smart Contract deployed to:", await identity.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});