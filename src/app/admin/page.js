"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { ethers } from 'ethers';

const AUCTION_CONTRACT_ADDRESS = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
import KYCGatedAuctionJSON from '../../../artifacts/contracts/KYCGatedAuction.sol/KYCGatedAuction.json';
const AUCTION_ABI = KYCGatedAuctionJSON.abi;

export default function AdminPage() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
        await checkOwner(address, provider);
      } catch (error) {
        console.error("Wallet connection error:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const checkOwner = async (address, provider) => {
    try {
      const contract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, provider);
      const owner = await contract.owner();
      setIsOwner(owner.toLowerCase() === address.toLowerCase());
    } catch (error) {
      console.error("Error checking owner:", error);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      checkOwner(walletAddress, provider);
    }
  }, [walletAddress]);

  const startAuction = async () => {
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, signer);
      const tx = await contract.startAuction();
      await tx.wait();
      alert("Auction Started successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to start auction. Are you the owner?");
    }
    setLoading(false);
  };

  const endAuction = async () => {
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, signer);
      const tx = await contract.endAuction();
      await tx.wait();
      alert("Auction Ended successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to end auction.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto">
        <Navbar walletAddress={walletAddress} connectWallet={connectWallet} />

        <div className="bg-white rounded-xl shadow-lg border p-8">
          <h1 className="text-3xl font-bold mb-6 text-red-800">Admin / Owner Dashboard</h1>
          
          {!isOwner && walletAddress ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 font-semibold mb-6">
              Access Denied: Your connected wallet is not the owner of the Auction contract.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <p className="text-gray-700">Manage the state of the KYC-Gated Auction here.</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={startAuction} 
                  disabled={loading || !isOwner}
                  className={`flex-1 py-3 rounded-lg font-bold text-white transition-colors
                    ${(loading || !isOwner) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md'}
                  `}
                >
                  {loading ? "Processing..." : "Start Auction"}
                </button>
                <button 
                  onClick={endAuction} 
                  disabled={loading || !isOwner}
                  className={`flex-1 py-3 rounded-lg font-bold text-white transition-colors
                    ${(loading || !isOwner) ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-md'}
                  `}
                >
                  {loading ? "Processing..." : "End Auction"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}