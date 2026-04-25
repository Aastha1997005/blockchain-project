"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import WalletCard from '../../components/WalletCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ShieldAlert, Shield, Users, UserPlus, Play, Square, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

const AUCTION_CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const IDENTITY_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

import KYCGatedAuctionJSON from '../../../artifacts/contracts/KYCGatedAuction.sol/KYCGatedAuction.json';
import IdentityVerifierJSON from '../../../artifacts/contracts/Identity.sol/IdentityVerifier.json';

const AUCTION_ABI = KYCGatedAuctionJSON.abi;
const IDENTITY_ABI = IdentityVerifierJSON.abi;

export default function AdminPage() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [role, setRole] = useState("User");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [auctionActive, setAuctionActive] = useState(false);

  // Role Management State
  const [admins, setAdmins] = useState([]);
  const [verifiers, setVerifiers] = useState([]);
  const [newAdmin, setNewAdmin] = useState("");
  const [newVerifier, setNewVerifier] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
      } catch (error) {
        toast.error("Failed to connect wallet");
      }
    } else {
      toast.error("Please install MetaMask!");
    }
  };

  const fetchRoleMembers = async (contract, roleHash) => {
    try {
      const filter = contract.filters.RoleGranted(roleHash);
      const events = await contract.queryFilter(filter, 0, 'latest');
      const uniqueAddresses = [...new Set(events.map(e => e.args[1]))];
      
      const active = [];
      for (const addr of uniqueAddresses) {
        if (await contract.hasRole(roleHash, addr)) {
          active.push(addr);
        }
      }
      return active;
    } catch (e) {
      console.error("Failed to fetch role members", e);
      return [];
    }
  };

  const loadDashboardData = async (address, provider) => {
    try {
      const auctionContract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, provider);
      const identityContract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IDENTITY_ABI, provider);

      const owner = await auctionContract.owner();
      setIsOwner(owner.toLowerCase() === address.toLowerCase());
      
      const DEFAULT_ADMIN_ROLE = await identityContract.DEFAULT_ADMIN_ROLE();
      const VERIFIER_ROLE = await identityContract.VERIFIER_ROLE();
      
      const isIdAdmin = await identityContract.hasRole(DEFAULT_ADMIN_ROLE, address);
      setIsAdmin(isIdAdmin);

      if (isIdAdmin) setRole("Admin");
      else if (await identityContract.hasRole(VERIFIER_ROLE, address)) setRole("Verifier");
      else setRole("User");

      const active = await auctionContract.auctionActive();
      setAuctionActive(active);

      if (isIdAdmin) {
        const activeAdmins = await fetchRoleMembers(identityContract, DEFAULT_ADMIN_ROLE);
        const activeVerifiers = await fetchRoleMembers(identityContract, VERIFIER_ROLE);
        setAdmins(activeAdmins);
        setVerifiers(activeVerifiers);
      }

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      loadDashboardData(walletAddress, provider);
    }
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
          setIsAdmin(false);
          setIsOwner(false);
          setRole("User");
        }
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
      return () => window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
    }
  }, []);

  const handleRoleAction = async (actionType, targetAddress, roleType) => {
    if (!targetAddress || !ethers.isAddress(targetAddress)) {
      return toast.error("Invalid Ethereum address.");
    }
    if (actionType === 'REVOKE' && roleType === 'ADMIN' && admins.length <= 1) {
      return toast.error("Cannot remove the last admin.");
    }

    if (actionType === 'REVOKE') {
      if (!window.confirm(`Are you sure you want to revoke the ${roleType} role from ${targetAddress}?`)) return;
    }

    setActionLoading(targetAddress + actionType);
    const loadToast = toast.loading("Transaction submitted. Waiting for confirmation...");
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IDENTITY_ABI, signer);
      
      const roleHash = roleType === 'ADMIN' 
        ? await contract.DEFAULT_ADMIN_ROLE() 
        : await contract.VERIFIER_ROLE();

      let tx;
      if (actionType === 'GRANT') {
        tx = await contract.grantRole(roleHash, targetAddress);
      } else {
        tx = await contract.revokeRole(roleHash, targetAddress);
      }
      
      await tx.wait();
      toast.success(`Transaction confirmed! Role ${actionType === 'GRANT' ? 'granted' : 'revoked'} successfully.`, { id: loadToast });
      
      if (actionType === 'GRANT') {
        if (roleType === 'ADMIN') setNewAdmin("");
        if (roleType === 'VERIFIER') setNewVerifier("");
      }
      
      loadDashboardData(walletAddress, provider);

    } catch (error) {
      console.error(error);
      toast.error("Error occurred during transaction.", { id: loadToast });
    }
    setActionLoading(null);
  };

  const toggleAuction = async (start) => {
    setLoading(true);
    const loadToast = toast.loading(`${start ? 'Starting' : 'Ending'} auction...`);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, signer);
      
      const tx = start ? await contract.startAuction() : await contract.endAuction();
      await tx.wait();
      
      setAuctionActive(start);
      toast.success(`Auction ${start ? 'Started' : 'Ended'}!`, { id: loadToast });
      loadDashboardData(walletAddress, provider);
    } catch (error) {
      toast.error(`Failed to ${start ? 'start' : 'end'} auction.`, { id: loadToast });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-blue-500/30">
      <Navbar walletAddress={walletAddress} connectWallet={connectWallet} role={role} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {walletAddress && <WalletCard walletAddress={walletAddress} role={role} />}

        {(!isAdmin) && walletAddress ? (
          <Card className="max-w-2xl mx-auto border-red-900/50 bg-red-950/20 backdrop-blur-md">
            <CardContent className="p-12 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                <ShieldAlert className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-red-400 mb-3 tracking-tight">Access Denied</h2>
              <p className="text-red-300/70 text-lg">
                This dashboard requires system administrator permissions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Role Management */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* ADMIN MANAGEMENT CARD */}
              <Card className="border-gray-800 bg-gray-800/50 backdrop-blur-xl shadow-2xl">
                <CardHeader className="border-gray-700/50 bg-transparent pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-3 text-xl text-white">
                      <Shield className="w-6 h-6 text-red-500" />
                      Admin Management
                    </CardTitle>
                    <Badge variant="danger" className="bg-red-500/10 text-red-400 border-red-500/20 px-3 py-1">
                      {admins.length} Total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="Enter wallet address (0x...)" 
                      value={newAdmin}
                      onChange={(e) => setNewAdmin(e.target.value)}
                      className="flex-1 bg-gray-900/50 border border-gray-700 text-gray-100 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 font-mono text-sm transition-all"
                    />
                    <Button 
                      variant="danger"
                      onClick={() => handleRoleAction('GRANT', newAdmin, 'ADMIN')}
                      disabled={!newAdmin || actionLoading !== null}
                      loading={actionLoading === newAdmin + 'GRANT'}
                      className="px-6 rounded-xl shadow-lg shadow-red-900/20 bg-red-600 hover:bg-red-700"
                    >
                      <UserPlus className="w-4 h-4 mr-2" /> Add Admin
                    </Button>
                  </div>

                  <div className="border border-gray-700/50 rounded-xl overflow-hidden bg-gray-900/20">
                    {admins.length === 0 ? (
                      <div className="p-6 text-center text-gray-500 flex justify-center"><div className="animate-pulse">Loading admins...</div></div>
                    ) : (
                      <div className="divide-y divide-gray-700/50">
                        {admins.map((admin) => (
                          <div key={admin} className="flex justify-between items-center p-4 hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/20">
                                <Shield className="w-5 h-5 text-red-400" />
                              </div>
                              <div>
                                <p className="font-mono text-sm text-gray-200">{admin}</p>
                                <Badge variant="danger" className="mt-1 bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">ADMIN</Badge>
                              </div>
                            </div>
                            <Button 
                              variant="secondary"
                              className="bg-gray-800 hover:bg-red-950/50 hover:text-red-400 hover:border-red-900/50 border border-gray-700 text-gray-400 px-4 py-2 text-xs"
                              onClick={() => handleRoleAction('REVOKE', admin, 'ADMIN')}
                              disabled={admins.length <= 1 || actionLoading !== null}
                              loading={actionLoading === admin + 'REVOKE'}
                              title={admins.length <= 1 ? "Cannot remove last admin" : ""}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* VERIFIER MANAGEMENT CARD */}
              <Card className="border-gray-800 bg-gray-800/50 backdrop-blur-xl shadow-2xl">
                <CardHeader className="border-gray-700/50 bg-transparent pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-3 text-xl text-white">
                      <Users className="w-6 h-6 text-purple-500" />
                      Verifier Management
                    </CardTitle>
                    <Badge variant="primary" className="bg-purple-500/10 text-purple-400 border-purple-500/20 px-3 py-1">
                      {verifiers.length} Total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="Enter wallet address (0x...)" 
                      value={newVerifier}
                      onChange={(e) => setNewVerifier(e.target.value)}
                      className="flex-1 bg-gray-900/50 border border-gray-700 text-gray-100 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 font-mono text-sm transition-all"
                    />
                    <Button 
                      variant="primary"
                      className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 shadow-lg shadow-purple-900/20 px-6 rounded-xl"
                      onClick={() => handleRoleAction('GRANT', newVerifier, 'VERIFIER')}
                      disabled={!newVerifier || actionLoading !== null}
                      loading={actionLoading === newVerifier + 'GRANT'}
                    >
                      <UserPlus className="w-4 h-4 mr-2" /> Add Verifier
                    </Button>
                  </div>

                  <div className="border border-gray-700/50 rounded-xl overflow-hidden bg-gray-900/20">
                    {verifiers.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">No verifiers assigned.</div>
                    ) : (
                      <div className="divide-y divide-gray-700/50 max-h-96 overflow-y-auto">
                        {verifiers.map((verifier) => (
                          <div key={verifier} className="flex justify-between items-center p-4 hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/20">
                                <Users className="w-5 h-5 text-purple-400" />
                              </div>
                              <div>
                                <p className="font-mono text-sm text-gray-200">{verifier}</p>
                                <Badge variant="primary" className="mt-1 bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px]">VERIFIER</Badge>
                              </div>
                            </div>
                            <Button 
                              variant="secondary"
                              className="bg-gray-800 hover:bg-red-950/50 hover:text-red-400 hover:border-red-900/50 border border-gray-700 text-gray-400 px-4 py-2 text-xs"
                              onClick={() => handleRoleAction('REVOKE', verifier, 'VERIFIER')}
                              disabled={actionLoading !== null}
                              loading={actionLoading === verifier + 'REVOKE'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right Column: Auction Control */}
            <div className="lg:col-span-4">
              <Card className="border-gray-800 bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur-xl shadow-2xl sticky top-24">
                <CardHeader className="border-gray-700/50 bg-transparent pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl text-white">
                    <AlertCircle className="w-6 h-6 text-blue-500" />
                    Auction Control
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 pt-4">
                  
                  <div className="flex flex-col items-center justify-center p-8 bg-gray-900/50 rounded-2xl border border-gray-700/50 shadow-inner">
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">Current Status</p>
                    {auctionActive ? (
                      <div className="flex flex-col items-center">
                        <div className="relative">
                          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
                            <div className="w-12 h-12 bg-green-500 rounded-full shadow-[0_0_30px_rgba(34,197,94,0.5)]"></div>
                          </div>
                        </div>
                        <span className="mt-4 text-2xl font-black text-green-400 tracking-tight">ACTIVE</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-700 shadow-inner">
                          <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                        </div>
                        <span className="mt-4 text-2xl font-black text-gray-500 tracking-tight">INACTIVE</span>
                      </div>
                    )}
                  </div>

                  {isOwner ? (
                    <div className="grid grid-cols-1 gap-4">
                      <Button 
                        variant="success"
                        onClick={() => toggleAuction(true)} 
                        disabled={loading || auctionActive}
                        className="h-14 text-lg rounded-xl shadow-lg shadow-green-900/20"
                      >
                        <Play className="w-5 h-5 mr-2" /> Start Auction
                      </Button>
                      <Button 
                        variant="danger"
                        onClick={() => toggleAuction(false)} 
                        disabled={loading || !auctionActive}
                        className="h-14 text-lg rounded-xl shadow-lg shadow-red-900/20 bg-red-600 hover:bg-red-700"
                      >
                        <Square className="w-5 h-5 mr-2" /> End Auction
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-center">
                      <p className="text-sm text-gray-400">Only the contract Owner can toggle the auction.</p>
                    </div>
                  )}

                </CardContent>
              </Card>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}