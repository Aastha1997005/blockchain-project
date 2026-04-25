"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { ethers } from 'ethers';

// Replace with actual IdentityVerifier address
const IDENTITY_CONTRACT_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
import IdentityVerifierJSON from '../../artifacts/contracts/Identity.sol/IdentityVerifier.json';
const IDENTITY_ABI = IdentityVerifierJSON.abi;

export default function UserPage() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [file, setFile] = useState(null);
  const [cid, setCid] = useState("");
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("Not Submitted");

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
        await checkVerification(address);
      } catch (error) {
        console.error("Wallet connection error:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const checkVerification = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IDENTITY_ABI, provider);
      const identity = await contract.getIdentity(address);
      const statusNames = ["None", "Verified", "Revoked"];
      const statusStr = statusNames[Number(identity.status)];
      
      if (statusStr === "Verified") {
        setVerificationStatus("Verified");
      }
    } catch (error) {
      console.error("Error checking verification:", error);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      checkVerification(walletAddress);
    }
  }, [walletAddress]);

  const uploadToIPFS = async () => {
    if (!file) return alert("Please select a file first");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // IMPORTANT: Replace YOUR_PINATA_JWT with a real JWT
      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIwZWI1ODgzZS1jZWZlLTRhMzMtOThiMS04NmQwY2U4ZDYyOTAiLCJlbWFpbCI6InN1aGFuaXZhdGFsaXlhNjY5NUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYzBjYTVmMmYzMGMwMTJhYjM3YzciLCJzY29wZWRLZXlTZWNyZXQiOiJkOTAwZGNhNzY2NmY3ZDVlYjQ0M2FiYzEwMmIyZWUxYjMyYjVjMDkzNjM4ZmJjM2E0OWU1NTQ1NjJkYWVmNmJlIiwiZXhwIjoxODA4NjQ4NTcwfQ.amCCpwpVP-rPP_sHnZ2iC3BiMTqjsTbLmyIFia_kF2M`,
        },
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Pinata Upload Error Status:", res.status);
        console.error("Pinata Upload Error Data:", errorData);
        const errorMsg = errorData.error ? (typeof errorData.error === 'object' ? JSON.stringify(errorData.error) : errorData.error) : res.statusText;
        throw new Error(errorMsg);
      }
      
      const resData = await res.json();
      setCid(resData.IpfsHash);
      setVerificationStatus("Pending Verification");
      alert("File uploaded to IPFS successfully! CID: " + resData.IpfsHash);
    } catch (error) {
      console.error("Full Upload Error:", error);
      alert(`IPFS Upload Failed: ${error.message}`);
      
      // MOCK UPLOAD FOR TESTING PURPOSES IF PINATA FAILS:
      // const mockCid = "QmHash" + Date.now();
      // setCid(mockCid);
      // setVerificationStatus("Pending Verification");
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto">
        <Navbar walletAddress={walletAddress} connectWallet={connectWallet} />

        <div className="bg-white rounded-xl shadow-lg border p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">User Identity Portal</h1>
          
          <div className="mb-8 p-4 rounded-lg border bg-gray-50 flex justify-between items-center shadow-sm">
            <span className="font-semibold text-gray-700">Identity Status:</span>
            <span className={`px-3 py-1 rounded-full font-bold border 
              ${verificationStatus === 'Verified' ? 'bg-green-100 text-green-800 border-green-300' : 
                verificationStatus === 'Pending Verification' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 
                'bg-gray-200 text-gray-800 border-gray-300'}`}>
              {verificationStatus}
            </span>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Submit Document for KYC</h3>
            
            {verificationStatus !== 'Verified' ? (
              <div className="flex flex-col gap-4">
                <input 
                  type="file" 
                  onChange={(e) => setFile(e.target.files[0])}
                  className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
                <button 
                  onClick={uploadToIPFS} 
                  disabled={uploading || !file}
                  className={`py-3 rounded-lg font-bold text-white transition-colors
                    ${(uploading || !file) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}
                  `}
                >
                  {uploading ? "Uploading to IPFS..." : "Upload to IPFS"}
                </button>
                <p className="text-sm text-gray-500">* Document will be uploaded to IPFS. Only the CID will be shared with the verifier.</p>
                
                {cid && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="font-semibold text-blue-800 mb-1">Your Document CID (Share this with a Verifier):</p>
                    <p className="font-mono text-sm break-all">{cid}</p>
                    <a href={`https://ipfs.io/ipfs/${cid}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm mt-2 inline-block">View on IPFS Gateway →</a>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                <p className="font-bold">✅ You are already verified!</p>
                <p className="text-sm mt-1">You can now participate in KYC-gated activities like the Auction.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}