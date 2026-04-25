"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar({ walletAddress, connectWallet }) {
  const pathname = usePathname();

  const navLinks = [
    { name: 'User UI', path: '/' },
    { name: 'Verifier UI', path: '/verifier' },
    { name: 'Admin UI', path: '/admin' },
    { name: 'Auction Page', path: '/auction' },
  ];

  return (
    <nav className="flex justify-between items-center p-4 bg-gray-900 text-white mb-8 rounded-lg shadow-md">
      <div className="flex gap-4">
        {navLinks.map((link) => (
          <Link 
            key={link.path} 
            href={link.path}
            className={`px-3 py-1 rounded transition-colors ${pathname === link.path ? 'bg-blue-600 font-bold' : 'hover:bg-gray-700'}`}
          >
            {link.name}
          </Link>
        ))}
      </div>
      <button 
        onClick={connectWallet} 
        className={`px-4 py-2 rounded font-bold transition-colors ${walletAddress ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {walletAddress ? `Connected: ${walletAddress.substring(0,6)}...${walletAddress.slice(-4)}` : 'Connect Wallet'}
      </button>
    </nav>
  );
}