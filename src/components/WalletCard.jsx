"use client";

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Wallet, Activity, Coins, ShieldCheck } from "lucide-react";

export default function WalletCard({ walletAddress, role }) {
  const [balance, setBalance] = useState("0.00");
  const [network, setNetwork] = useState("Loading...");

  useEffect(() => {
    async function fetchWalletInfo() {
      if (!walletAddress || !window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const bal = await provider.getBalance(walletAddress);
        setBalance(Number(ethers.formatEther(bal)).toFixed(4));
        
        const networkInfo = await provider.getNetwork();
        setNetwork(networkInfo.name === "unknown" ? "Localhost" : networkInfo.name);
      } catch (error) {
        console.error("Error fetching wallet info:", error);
      }
    }
    fetchWalletInfo();
  }, [walletAddress]);

  if (!walletAddress) return null;

  return (
    <Card className="mb-8 border-none bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/20 dark:to-purple-900/20 shadow-none">
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Connected Wallet</p>
            <p className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
              {walletAddress.substring(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-600 dark:text-purple-400">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Balance</p>
            <p className="font-bold text-gray-900 dark:text-gray-100">{balance} ETH</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl text-green-600 dark:text-green-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Network</p>
            <p className="font-bold text-gray-900 dark:text-gray-100 capitalize">{network}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-xl text-orange-600 dark:text-orange-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Active Role</p>
            <Badge variant={role === "Admin" ? "danger" : role === "Verifier" ? "primary" : "default"}>
              {role || "User"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
