"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar';
import WalletCard from '../../components/WalletCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  Gavel, Trophy, Timer, AlertTriangle, 
  Activity, Users, History, Crown, CheckCircle2, XCircle, RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

const IDENTITY_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const AUCTION_CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

import IdentityVerifierJSON from '../../../artifacts/contracts/Identity.sol/IdentityVerifier.json';
import KYCGatedAuctionJSON from '../../../artifacts/contracts/KYCGatedAuction.sol/KYCGatedAuction.json';

const IDENTITY_ABI = IdentityVerifierJSON.abi;
const AUCTION_ABI = KYCGatedAuctionJSON.abi;

export default function AuctionPage() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [role, setRole] = useState("User");
  const [isVerified, setIsVerified] = useState(false);
  
  // Auction State
  const [auctionActive, setAuctionActive] = useState(false);
  const [highestBid, setHighestBid] = useState("0");
  const [highestBidder, setHighestBidder] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [loading, setLoading] = useState(false);
  
  // History & Stats
  const [bidHistory, setBidHistory] = useState([]);
  const [totalBids, setTotalBids] = useState(0);
  const [uniqueBidders, setUniqueBidders] = useState(0);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
      } catch (error) {
        toast.error("Wallet connection error");
      }
    } else {
      toast.error("Please install MetaMask!");
    }
  };

  const fetchBidHistory = async (auctionContract) => {
    try {
      const filter = auctionContract.filters.BidPlaced();
      const events = await auctionContract.queryFilter(filter, 0, 'latest');
      
      const bids = await Promise.all(events.map(async (event, index) => {
        const block = await event.getBlock();
        const date = new Date(block.timestamp * 1000);
        
        return {
          id: index + 1,
          bidder: event.args[0],
          amount: ethers.formatEther(event.args[1]),
          timestamp: date.toLocaleString(),
          rawAmount: event.args[1]
        };
      }));
      
      const sortedBids = bids.sort((a, b) => b.rawAmount > a.rawAmount ? 1 : -1);
      
      setBidHistory(sortedBids);
      setTotalBids(bids.length);
      
      const uniqueAddrs = new Set(bids.map(b => b.bidder));
      setUniqueBidders(uniqueAddrs.size);
      
    } catch (error) {
      console.error("Failed to fetch bid history:", error);
    }
  };

  const checkData = useCallback(async (address) => {
    if (!address) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Aggressively bust cache and ensure latest block data
      await provider.getBlockNumber(); 
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to allow provider to fully sync
      await provider.getBlockNumber(); 

      try {
        const identityContract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IDENTITY_ABI, provider);
        const identity = await identityContract.getIdentity(address);
        const onChainStatus = Number(identity.status); // 0: None, 1: Verified, 2: Revoked
        const verifiedStatus = onChainStatus === 1; // Status.Verified is 1

        setIsVerified(verifiedStatus);
        toast.success(`Auction Page: KYC Status for ${address.substring(0,6)}... is ${verifiedStatus ? 'Verified' : 'Not Verified'} (Source: getIdentity)`);
        console.log(`Auction Page: KYC Status for ${address.substring(0,6)}... is ${verifiedStatus ? 'Verified' : 'Not Verified'} (Source: getIdentity)`);

        const DEFAULT_ADMIN_ROLE = await identityContract.DEFAULT_ADMIN_ROLE();
        const VERIFIER_ROLE = await identityContract.VERIFIER_ROLE();
        if (await identityContract.hasRole(DEFAULT_ADMIN_ROLE, address)) setRole("Admin");
        else if (await identityContract.hasRole(VERIFIER_ROLE, address)) setRole("Verifier");
        else setRole("User");
      } catch (err) {
        console.error("Failed to fetch identity data:", err);
        toast.error("Auction Page: Failed to fetch Identity data.");
      }

      try {
        const auctionContract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, provider);
        const active = await auctionContract.auctionActive();
        setAuctionActive(active);
        
        const hBid = await auctionContract.highestBid();
        setHighestBid(ethers.formatEther(hBid));
        
        const hBidder = await auctionContract.highestBidder();
        setHighestBidder(hBidder === ethers.ZeroAddress ? "" : hBidder);
        
        await fetchBidHistory(auctionContract);
      } catch (err) {
        console.error("Failed to fetch auction data:", err);
      }
    } catch (err) {
      console.error("Failed to initialize provider:", err);
    }
  }, []);

  useEffect(() => {
    if (!walletAddress) return;
    checkData(walletAddress);
    
    let provider;
    let auctionContract;
    
    const setupListener = async () => {
      try {
        provider = new ethers.BrowserProvider(window.ethereum);
        auctionContract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, provider);
        
        auctionContract.on("BidPlaced", (bidder, amount, event) => {
          checkData(walletAddress);
          toast.success(`New bid placed: ${ethers.formatEther(amount)} ETH!`);
        });
        
        auctionContract.on("AuctionStarted", () => {
          toast.success("The auction has started!");
          checkData(walletAddress);
        });
        
        auctionContract.on("AuctionEnded", (winner, amount) => {
          toast.success(`Auction ended! Winner: ${winner.substring(0, 6)}...`);
          checkData(walletAddress);
        });

      } catch (err) {
        console.error("Failed to setup event listener", err);
      }
    };
    
    setupListener();

    return () => {
      if (auctionContract) auctionContract.removeAllListeners();
    };
  }, [walletAddress, checkData]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0) setWalletAddress(accounts[0]);
      });
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) setWalletAddress(accounts[0]);
        else {
          setWalletAddress(null);
          setIsVerified(false);
          setRole("User");
        }
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
      return () => window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
    }
  }, []);

  const placeBid = async () => {
    if (!bidAmount || isNaN(bidAmount) || Number(bidAmount) <= 0) return toast.error("Enter a valid bid");
    setLoading(true);
    const loadToast = toast.loading("Submitting bid to blockchain...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const auctionContract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, signer);
      
      const tx = await auctionContract.placeBid({ value: ethers.parseEther(bidAmount) });
      await tx.wait(); 
      
      toast.success("Bid placed successfully!", { id: loadToast });
      setBidAmount("");
      checkData(walletAddress);
    } catch (error) {
      if (error.message.includes("Bid too low")) toast.error("Bid too low. You must bid higher than the current highest bid.", { id: loadToast });
      else if (error.message.includes("KYC required")) toast.error("KYC required. Your address is not verified.", { id: loadToast });
      else if (error.message.includes("Auction not active")) toast.error("The auction is currently inactive.", { id: loadToast });
      else toast.error("Failed to place bid.", { id: loadToast });
    }
    setLoading(false);
  };

  const isAuctionFinished = !auctionActive && highestBidder !== "";

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-gray-100 font-sans selection:bg-blue-500/30 pb-16">
      <Navbar walletAddress={walletAddress} connectWallet={connectWallet} role={role} />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {walletAddress && <WalletCard walletAddress={walletAddress} role={role} />}

        {/* 1. Hero Section */}
        <div className="text-center mb-12 mt-4">
          <div className="inline-flex items-center justify-center p-3 bg-blue-900/20 rounded-full mb-4 border border-blue-500/20">
            <Gavel className="w-8 h-8 text-blue-400" />
          </div>
          {/* <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 mb-4 tracking-tight">
            Genesis NFT Drop
          </h1> */}
          
          {isAuctionFinished ? (
            <div className="mt-6 inline-flex flex-col items-center bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-2xl shadow-lg shadow-yellow-500/10 backdrop-blur-md">
              <Crown className="w-10 h-10 text-yellow-400 mb-2 drop-shadow-md" />
              <p className="text-lg font-bold text-yellow-500 uppercase tracking-widest mb-2">Auction Concluded</p>
              <p className="text-2xl font-medium text-white mb-1">
                Winner: <span className="font-mono text-yellow-400 bg-black/20 px-2 py-1 rounded border border-yellow-500/20">{highestBidder}</span>
              </p>
              <p className="text-xl text-gray-300">
                Winning Bid: <span className="font-black text-white">{highestBid} ETH</span>
              </p>
            </div>
          ) : (
            <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto">
              {/* Exclusive KYC-Gated Auction. Verify your identity to participate. */}
              {/* <br /> */}
              <span className="text-blue-400 font-bold mt-2 inline-block">Current Highest Bid: {highestBid} ETH</span>
            </p>
          )}
        </div>

        {/* 2. Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Total Bids</p>
                <p className="text-3xl font-black text-white">{totalBids}</p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
                <Activity className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Unique Bidders</p>
                <p className="text-3xl font-black text-white">{uniqueBidders}</p>
              </div>
              <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400">
                <Users className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Auction Status</p>
                <p className={`text-2xl font-black ${auctionActive ? 'text-green-400' : 'text-red-400'}`}>
                  {auctionActive ? 'ACTIVE' : 'ENDED'}
                </p>
              </div>
              <div className={`p-4 rounded-2xl border ${auctionActive ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                <Timer className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Bid History Table */}
        <Card className="border-gray-800 bg-gray-900/60 backdrop-blur-xl shadow-2xl overflow-hidden mb-12">
          <CardHeader className="border-b border-gray-800 bg-gray-900 py-5 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg font-bold text-gray-200">
              <History className="w-5 h-5 text-gray-400" />
              Live Bid History
            </CardTitle>
            <button 
              onClick={() => checkData(walletAddress)} 
              className="p-1.5 hover:bg-gray-800 rounded-full transition-colors group border border-gray-700 bg-gray-900/50"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
            </button>
          </CardHeader>
          <CardContent className="p-0">
            {bidHistory.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center justify-center bg-gray-900/30">
                <Activity className="w-12 h-12 text-gray-700 mb-4" />
                <p className="text-gray-400 font-medium text-lg">No bids have been placed yet.</p>
                <p className="text-gray-600 text-sm mt-2">Be the first to bid when the auction starts!</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-900/90 sticky top-0 z-10 border-b border-gray-800">
                    <tr>
                      <th className="px-8 py-5 font-bold tracking-wider">Bidder</th>
                      <th className="px-8 py-5 font-bold tracking-wider text-right">Amount</th>
                      <th className="px-8 py-5 font-bold tracking-wider text-right">Time</th>
                      <th className="px-8 py-5 font-bold tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {bidHistory.map((bid, index) => {
                      const isHighest = index === 0;
                      return (
                        <tr 
                          key={bid.id} 
                          className={`transition-colors ${isHighest ? 'bg-blue-900/10 hover:bg-blue-900/20' : 'hover:bg-gray-800/50'}`}
                        >
                          <td className="px-8 py-4">
                            <span className="font-mono text-sm font-medium text-gray-300 bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
                              {bid.bidder.substring(0, 6)}...{bid.bidder.slice(-4)}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <span className={`font-black text-lg ${isHighest ? 'text-blue-400' : 'text-gray-200'}`}>
                              {bid.amount} <span className="text-xs font-bold text-gray-500">ETH</span>
                            </span>
                          </td>
                          <td className="px-8 py-4 text-right text-sm text-gray-400 font-medium whitespace-nowrap">
                            {bid.timestamp}
                          </td>
                          <td className="px-8 py-4 text-center">
                            {isHighest ? (
                              <Badge variant="primary" className="bg-blue-500/10 text-blue-400 border-blue-500/30 px-3 py-1">Leading</Badge>
                            ) : (
                              <Badge variant="default" className="bg-gray-800 text-gray-500 border-gray-700 px-3 py-1">Outbid</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Conditional Bid Section */}
        <div className="max-w-2xl mx-auto">
          {auctionActive ? (
            isVerified ? (
              <Card className="bg-gray-800/40 border-gray-700/50 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <CardContent className="p-8 sm:p-10">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Timer className="w-5 h-5 text-blue-400" />
                      Place Your Bid
                    </h3>
                    <Badge variant="success" className="px-3 py-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> KYC Verified
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                      <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                        <span className="text-gray-500 font-bold text-2xl">Ξ</span>
                      </div>
                      <input 
                        type="number" step="0.01" placeholder="0.00" 
                        value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                        disabled={loading || !walletAddress}
                        className="w-full pl-14 pr-6 py-5 text-3xl font-black bg-gray-900/60 border border-gray-700 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-white placeholder-gray-600 disabled:opacity-50 shadow-inner"
                      />
                    </div>
                    <Button 
                      onClick={placeBid} 
                      disabled={loading || !walletAddress || !bidAmount} 
                      loading={loading}
                      className="py-5 px-10 text-xl rounded-2xl shadow-lg shadow-blue-500/25 sm:w-auto w-full bg-blue-600 hover:bg-blue-500 border border-blue-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Submit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-red-900/30 bg-red-950/20 backdrop-blur-md shadow-xl">
                <CardContent className="p-8 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-red-400 mb-2">KYC Verification Required</h3>
                  <p className="text-red-300/70 text-base max-w-md">
                    Your wallet is not verified. You must complete your identity verification in the User Dashboard before you can place bids.
                  </p>
                </CardContent>
              </Card>
            )
          ) : !isAuctionFinished ? (
            <Card className="border-gray-800 bg-gray-900/40 backdrop-blur-md shadow-xl">
              <CardContent className="p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 border border-gray-700">
                  <Timer className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">Bidding is Closed</h3>
                <p className="text-gray-500 text-base">
                  The auction has not been started by the administrator yet.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

      </main>
    </div>
  );
}
