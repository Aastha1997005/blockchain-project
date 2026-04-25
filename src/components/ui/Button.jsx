"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export function Button({ 
  children, 
  onClick, 
  disabled, 
  loading, 
  variant = "primary", 
  className = "", 
  type = "button" 
}) {
  const baseStyle = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow",
  };

  const stateStyle = (disabled || loading) ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${stateStyle} px-5 py-2.5 ${className}`}
    >
      {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
      {children}
    </button>
  );
}
