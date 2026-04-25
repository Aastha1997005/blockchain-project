const hre = require("hardhat");
async function main() {
  const code = await hre.ethers.provider.getCode("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
  console.log("Code length:", code.length);
  const owner = await hre.ethers.provider.getStorage("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", 1); // identityContract is slot 0, owner is slot 1
  console.log("Storage at slot 1 (owner):", owner);
}
main().catch(console.error);
