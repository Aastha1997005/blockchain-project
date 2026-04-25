"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import WalletCard from '../components/WalletCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { UploadCloud, CheckCircle2, XCircle, Clock, FileText, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

const IDENTITY_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
import IdentityVerifierJSON from '../../artifacts/contracts/Identity.sol/IdentityVerifier.json';
const IDENTITY_ABI = IdentityVerifierJSON.abi;

export default function UserPage() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [role, setRole] = useState("User");
  const [file, setFile] = useState(null);
  const [cid, setCid] = useState("");
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("Not Submitted");
  const [history, setHistory] = useState([]);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
        toast.success("Wallet connected!");
      } catch (error) {
        console.error("Wallet connection error:", error);
        toast.error("Failed to connect wallet.");
      }
    } else {
      toast.error("Please install MetaMask!");
    }
  };

  const checkRolesAndStatus = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IDENTITY_ABI, provider);
      
      // Check Role
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
      const VERIFIER_ROLE = await contract.VERIFIER_ROLE();
      if (await contract.hasRole(DEFAULT_ADMIN_ROLE, address)) setRole("Admin");
      else if (await contract.hasRole(VERIFIER_ROLE, address)) setRole("Verifier");
      else setRole("User");

      // Check Verification Status On-Chain
      const identity = await contract.getIdentity(address);
      const statusNames = ["None", "Verified", "Revoked"];
      const statusStr = statusNames[Number(identity.status)];
      
      if (statusStr === "Verified") {
        setVerificationStatus("Verified");
        fetchHistory(address);
      } else {
        // Check Off-Chain DB
        const res = await fetch('/api/requests');
        if (res.ok) {
          const data = await res.json();
          const userRequests = data.requests.filter(r => r.userAddress.toLowerCase() === address.toLowerCase());
          setHistory(userRequests);
          if (userRequests.length > 0) {
            const latestReq = userRequests[0]; // Ordered DESC by backend
            setCid(latestReq.cid);
            if (latestReq.status === 'Rejected') setVerificationStatus("Rejected");
            else if (latestReq.status === 'Pending') setVerificationStatus("Pending Verification");
            else setVerificationStatus("Not Submitted");
          } else {
            setVerificationStatus("Not Submitted");
            setCid("");
          }
        }
      }
    } catch (error) {
      console.error("Error checking verification:", error);
    }
  };

  const fetchHistory = async (address) => {
      const res = await fetch('/api/requests');
      if (res.ok) {
          const data = await res.json();
          setHistory(data.requests.filter(r => r.userAddress.toLowerCase() === address.toLowerCase()));
      }
  };

  useEffect(() => {
    if (walletAddress) checkRolesAndStatus(walletAddress);
  }, [walletAddress]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0) setWalletAddress(accounts[0]);
      });
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) setWalletAddress(accounts[0]);
        else setWalletAddress(null);
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
      return () => window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
    }
  }, []);

  const uploadToIPFS = async () => {
    if (!file) return toast.error("Please select a file first");
    setUploading(true);
    const loadingToast = toast.loading("Uploading securely to IPFS...");
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIwZWI1ODgzZS1jZWZlLTRhMzMtOThiMS04NmQwY2U4ZDYyOTAiLCJlbWFpbCI6InN1aGFuaXZhdGFsaXlhNjY5NUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYzBjYTVmMmYzMGMwMTJhYjM3YzciLCJzY29wZWRLZXlTZWNyZXQiOiJkOTAwZGNhNzY2NmY3ZDVlYjQ0M2FiYzEwMmIyZWUxYjMyYjVjMDkzNjM4ZmJjM2E0OWU1NTQ1NjJkYWVmNmJlIiwiZXhwIjoxODA4NjQ4NTcwfQ.amCCpwpVP-rPP_sHnZ2iC3BiMTqjsTbLmyIFia_kF2M`,
        },
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error ? JSON.stringify(errorData.error) : res.statusText);
      }
      
      const resData = await res.json();
      const cidResponse = resData.IpfsHash;
      setCid(cidResponse);

      // Save off-chain
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: walletAddress, cid: cidResponse })
      });

      setVerificationStatus("Pending Verification");
      fetchHistory(walletAddress);
      toast.success("Document submitted successfully!", { id: loadingToast });
      setFile(null);
    } catch (error) {
      console.error(error);
      toast.error(`Upload Failed: ${error.message}`, { id: loadingToast });
    }
    setUploading(false);
  };

  const getStatusConfig = (status) => {
    switch(status) {
      case 'Verified': return { icon: <CheckCircle2 className="w-8 h-8 text-green-500" />, badge: 'success', text: 'Identity Verified', desc: 'You have full access to KYC-gated features.' };
      case 'Rejected': return { icon: <XCircle className="w-8 h-8 text-red-500" />, badge: 'danger', text: 'Verification Rejected', desc: 'Please ensure your document is clear and valid, then try uploading again.' };
      case 'Pending Verification': return { icon: <Clock className="w-8 h-8 text-yellow-500 animate-pulse" />, badge: 'warning', text: 'Pending Verification', desc: 'Your document is securely stored and awaiting verifier review.' };
      default: return { icon: <FileText className="w-8 h-8 text-gray-400" />, badge: 'default', text: 'Not Submitted', desc: 'Please upload a valid identity document to begin.' };
    }
  };

  const config = getStatusConfig(verificationStatus);

  return (
    <>
      <Navbar walletAddress={walletAddress} connectWallet={connectWallet} role={role} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {walletAddress && <WalletCard walletAddress={walletAddress} role={role} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Identity Status Card */}
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700 shadow-inner">
                    {config.icon}
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{config.text}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{config.desc}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant={config.badge} className="px-4 py-1.5 text-sm uppercase tracking-wider">{verificationStatus}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Card */}
            {verificationStatus !== 'Verified' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-blue-500" />
                    Secure Document Upload
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      You can submit your document up to 4 times.
                    </p>
                    <Badge variant={history.length >= 4 ? "danger" : "primary"}>
                      {4 - history.length} Submissions Remaining
                    </Badge>
                  </div>

                  {history.length >= 4 ? (
                    <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl text-center">
                      <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                      <p className="text-red-800 dark:text-red-400 font-bold">Maximum Submissions Reached</p>
                      <p className="text-sm text-red-600/80 dark:text-red-300/80 mt-1">You have reached the maximum limit of 4 identity verification attempts.</p>
                    </div>
                  ) : (
                    <>
                      <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center bg-gray-50/50 dark:bg-gray-800/20 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group cursor-pointer relative">
                        <input 
                          type="file" 
                          onChange={(e) => setFile(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                          disabled={uploading}
                        />
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-white dark:bg-gray-700 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-8 h-8 text-blue-500" />
                          </div>
                          <p className="font-semibold text-gray-700 dark:text-gray-300">
                            {file ? file.name : "Click or drag document to upload"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">PDF, PNG, JPG up to 10MB</p>
                        </div>
                      </div>

                      <Button 
                        onClick={uploadToIPFS} 
                        disabled={uploading || !file}
                        loading={uploading}
                        className="w-full mt-6"
                      >
                        Submit for Verification
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Active CID Display */}
            {cid && verificationStatus === 'Pending Verification' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 mb-1 tracking-wider">Active Submission CID</p>
                  <p className="font-mono text-sm text-gray-800 dark:text-gray-200 break-all">{cid}</p>
                </div>
                <a 
                  href={`https://ipfs.io/ipfs/${cid}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-semibold rounded-lg border border-blue-100 dark:border-gray-700 shadow-sm hover:shadow transition-shadow whitespace-nowrap"
                >
                  View on IPFS <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <Clock className="w-5 h-5 text-purple-500" />
                  Submission History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {history.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No past submissions found.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {history.map((req, idx) => (
                      <div key={idx} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant={req.status === 'Verified' ? 'success' : req.status === 'Rejected' ? 'danger' : 'warning'}>
                            {req.status}
                          </Badge>
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">ID: #{req.id}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate mb-2">{req.cid}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(req.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </>
  );
}