"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { ethers } from 'ethers';

const IDENTITY_CONTRACT_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
import IdentityVerifierJSON from '../../../artifacts/contracts/Identity.sol/IdentityVerifier.json';
const IDENTITY_ABI = IdentityVerifierJSON.abi;

export default function VerifierPage() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isVerifier, setIsVerifier] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [cid, setCid] = useState("");
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
        await checkVerifierRole(address, provider);
      } catch (error) {
        console.error("Wallet connection error:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const checkVerifierRole = async (address, provider) => {
    try {
      const contract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IDENTITY_ABI, provider);
      const VERIFIER_ROLE = await contract.VERIFIER_ROLE();
      const hasRole = await contract.hasRole(VERIFIER_ROLE, address);
      setIsVerifier(hasRole);
    } catch (error) {
      console.error("Error checking role:", error);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      checkVerifierRole(walletAddress, provider);
    }
  }, [walletAddress]);

  const approveUser = async () => {
    if (!userAddress || !cid) return alert("Please enter User Address and CID");
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IDENTITY_ABI, signer);
      
      // E. On approve: Generate hash using ethers.keccak256(ethers.toUtf8Bytes(CID))
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes(cid));
      
      // Call smart contract: verifyIdentity(userAddress, hash)
      const tx = await contract.verifyIdentity(userAddress, documentHash);
      await tx.wait();
      
      alert(`Successfully verified user ${userAddress}! Hash written to blockchain.`);
      setUserAddress("");
      setCid("");
    } catch (error) {
      console.error(error);
      alert("Failed to verify user. Check console for details.");
    }
    setLoading(false);
  };

  const rejectUser = () => {
    alert(`Rejected document with CID: ${cid} for user ${userAddress}`);
    setUserAddress("");
    setCid("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto">
        <Navbar walletAddress={walletAddress} connectWallet={connectWallet} />

        <div className="bg-white rounded-xl shadow-lg border p-8">
          <h1 className="text-3xl font-bold mb-6 text-purple-800">Verifier Dashboard</h1>
          
          {!isVerifier && walletAddress ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 font-semibold mb-6">
              Access Denied: Your connected wallet does not have the VERIFIER_ROLE.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">User Address to Verify</label>
                <input 
                  type="text" 
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  placeholder="0x..." 
                  className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-purple-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Document CID (from IPFS)</label>
                <input 
                  type="text" 
                  value={cid}
                  onChange={(e) => setCid(e.target.value)}
                  placeholder="Qm..." 
                  className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-purple-500 outline-none" 
                />
              </div>

              {cid && (
                <div className="p-4 bg-gray-100 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-600 mb-2">Preview Document:</p>
                  <a 
                    href={`https://ipfs.io/ipfs/${cid}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-blue-600 hover:underline flex items-center gap-1 font-mono break-all"
                  >
                    🔗 https://ipfs.io/ipfs/{cid}
                  </a>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <button 
                  onClick={approveUser} 
                  disabled={loading || !userAddress || !cid || !isVerifier}
                  className={`flex-1 py-3 rounded-lg font-bold text-white transition-colors
                    ${(loading || !userAddress || !cid || !isVerifier) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md'}
                  `}
                >
                  {loading ? "Processing Blockchain Tx..." : "Approve & Verify On-Chain"}
                </button>
                <button 
                  onClick={rejectUser} 
                  disabled={loading || !userAddress || !cid || !isVerifier}
                  className={`flex-1 py-3 rounded-lg font-bold text-white transition-colors
                    ${(loading || !userAddress || !cid || !isVerifier) ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-md'}
                  `}
                >
                  Reject Application
                </button>
              </div>
              <p className="text-sm text-gray-500 text-center">* Approving will generate a Keccak256 hash of the CID and store it on the blockchain.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}