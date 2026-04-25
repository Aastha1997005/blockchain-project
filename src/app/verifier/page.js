"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import WalletCard from '../../components/WalletCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ExternalLink, UserCheck, UserX, Inbox, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

const IDENTITY_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
import IdentityVerifierJSON from '../../../artifacts/contracts/Identity.sol/IdentityVerifier.json';
const IDENTITY_ABI = IdentityVerifierJSON.abi;

export default function VerifierPage() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [role, setRole] = useState("User");
  const [isVerifier, setIsVerifier] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
      } catch (error) {
        console.error("Wallet connection error:", error);
      }
    } else {
      toast.error("Please install MetaMask!");
    }
  };

  const checkRolesAndData = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IDENTITY_ABI, provider);
      
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
      const VERIFIER_ROLE = await contract.VERIFIER_ROLE();
      
      let currentRole = "User";
      const hasVerifier = await contract.hasRole(VERIFIER_ROLE, address);
      
      if (await contract.hasRole(DEFAULT_ADMIN_ROLE, address)) currentRole = "Admin";
      else if (hasVerifier) currentRole = "Verifier";
      
      setRole(currentRole);
      setIsVerifier(hasVerifier);

      if (hasVerifier || currentRole === "Admin") {
        fetchRequests();
      }
    } catch (error) {
      console.error("Error checking role:", error);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/requests');
      const data = await res.json();
      if (data.success) setRequests(data.requests);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    }
  };

  useEffect(() => {
    if (walletAddress) checkRolesAndData(walletAddress);
  }, [walletAddress]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0) setWalletAddress(accounts[0]);
      });
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) setWalletAddress(accounts[0]);
        else {
          setWalletAddress(null);
          setIsVerifier(false);
          setRole("User");
          setRequests([]);
        }
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
      return () => window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
    }
  }, []);

  const updateRequestStatus = async (id, status) => {
    await fetch('/api/requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    fetchRequests(); 
  };

  const approveUser = async (id, userAddress, cid) => {
    setLoadingId(id);
    const loadingToast = toast.loading(`Approving user ${userAddress.substring(0,6)}...`);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IDENTITY_ABI, signer);
      
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes(cid));
      const tx = await contract.verifyIdentity(userAddress, documentHash);
      await tx.wait();
      
      await updateRequestStatus(id, "Verified");
      toast.success("User verified on Blockchain!", { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error("Failed to verify user.", { id: loadingToast });
    }
    setLoadingId(null);
  };

  const rejectUser = async (id, userAddress, cid) => {
    setLoadingId(id);
    const loadingToast = toast.loading(`Rejecting user ${userAddress.substring(0,6)}...`);
    try {
      await updateRequestStatus(id, "Rejected");
      toast.success("Application rejected successfully.", { id: loadingToast });
    } catch(err) {
      toast.error("Failed to reject.", { id: loadingToast });
    }
    setLoadingId(null);
  };

  return (
    <>
      <Navbar walletAddress={walletAddress} connectWallet={connectWallet} role={role} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {walletAddress && <WalletCard walletAddress={walletAddress} role={role} />}

        {!isVerifier && role !== "Admin" ? (
          <Card className="max-w-2xl mx-auto border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10">
            <CardContent className="p-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-red-800 dark:text-red-400 mb-2">Verifier Access Required</h2>
              <p className="text-red-600/80 dark:text-red-300/80">
                Your connected wallet does not have the necessary permissions to view or process KYC applications.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KYC Applications</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review and process pending identity verifications.</p>
              </div>
              <Badge variant="primary" className="px-3 py-1 text-sm">
                {requests.filter(r => r.status === 'Pending').length} Pending
              </Badge>
            </div>

            {requests.length === 0 ? (
              <Card>
                <CardContent className="p-16 flex flex-col items-center text-center">
                  <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">No applications found in the database.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.map((req) => (
                  <Card key={req.id} className="flex flex-col hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                      <Badge variant={req.status === 'Verified' ? 'success' : req.status === 'Rejected' ? 'danger' : 'warning'}>
                        {req.status}
                      </Badge>
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">ID: #{req.id}</span>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4 p-5">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Applicant Address</p>
                        <p className="font-mono text-sm text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg break-all">
                          {req.userAddress}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Document CID</p>
                        <a 
                          href={`https://ipfs.io/ipfs/${req.cid}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center justify-between p-2 rounded-lg border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors group"
                        >
                          <span className="font-mono text-xs truncate mr-2">{req.cid}</span>
                          <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                        </a>
                      </div>

                      <div className="text-xs text-gray-400 dark:text-gray-500 text-right mt-auto pt-2">
                        Submitted: {new Date(req.timestamp).toLocaleDateString()}
                      </div>
                    </CardContent>
                    
                    {req.status === 'Pending' && (
                      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex gap-3">
                        <Button 
                          variant="success" 
                          className="flex-1 text-sm"
                          onClick={() => {
                            if(window.confirm("Are you sure you want to VERIFY this user on-chain?")) {
                              approveUser(req.id, req.userAddress, req.cid);
                            }
                          }}
                          disabled={loadingId !== null}
                          loading={loadingId === req.id}
                        >
                          <UserCheck className="w-4 h-4 mr-1.5" /> Approve
                        </Button>
                        <Button 
                          variant="danger" 
                          className="flex-1 text-sm"
                          onClick={() => {
                            if(window.confirm("Reject this application?")) {
                              rejectUser(req.id, req.userAddress, req.cid);
                            }
                          }}
                          disabled={loadingId !== null}
                        >
                          <UserX className="w-4 h-4 mr-1.5" /> Reject
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}