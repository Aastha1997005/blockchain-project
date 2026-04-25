"use client";

import React from "react";

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }) {
  return (
    <div className={`px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }) {
  return (
    <h3 className={`text-lg font-bold text-gray-900 dark:text-white ${className}`}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = "" }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
