"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShieldCheck, Settings, Gavel, Wallet } from "lucide-react";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

export default function Navbar({ walletAddress, connectWallet, role }) {
  const pathname = usePathname();

  const navLinks = [
    { name: 'User UI', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: 'Verifier UI', path: '/verifier', icon: <ShieldCheck className="w-4 h-4" /> },
    { name: 'Admin UI', path: '/admin', icon: <Settings className="w-4 h-4" /> },
    { name: 'Auction Page', path: '/auction', icon: <Gavel className="w-4 h-4" /> },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <div className="flex-shrink-0 flex items-center gap-2 text-xl font-bold text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-7 h-7" />
              <span className="hidden sm:block tracking-tight">TrustID</span>
            </div>
            <div className="hidden md:flex space-x-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.path} 
                  href={link.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                    ${pathname === link.path 
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                    }`}
                >
                  {link.icon}
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {walletAddress ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <Badge variant={role === "Admin" ? "danger" : role === "Verifier" ? "primary" : "default"} className="mb-0.5">
                    {role || "User"}
                  </Badge>
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {walletAddress.substring(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-inner">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            ) : (
              <Button onClick={connectWallet} variant="primary" className="rounded-full shadow-lg shadow-blue-500/30">
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}