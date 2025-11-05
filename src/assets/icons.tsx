import React from 'react';

const stroke = '#f97316';
const size = 18;

export const TicketsIcon: React.FC<{active?: boolean}> = ({ active }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="3" y="6" width="18" height="12" rx="2" stroke={active ? stroke : '#666'} strokeWidth="2" />
    <path d="M8 10h8M8 14h5" stroke={active ? stroke : '#666'} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const VerifyIcon: React.FC<{active?: boolean}> = ({ active }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2l3 3 4-1-1 4 3 3-3 3 1 4-4-1-3 3-3-3-4 1 1-4-3-3 3-3-1-4 4 1 3-3z" stroke={active ? stroke : '#666'} strokeWidth="2" strokeLinejoin="round" />
    <path d="M8 12l3 3 5-6" stroke={active ? stroke : '#666'} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const VendorIcon: React.FC<{active?: boolean}> = ({ active }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 6h16v12H4z" stroke={active ? stroke : '#666'} strokeWidth="2" />
    <path d="M8 6v12M16 6v12" stroke={active ? stroke : '#666'} strokeWidth="2" />
  </svg>
);

export const LookupIcon: React.FC<{active?: boolean}> = ({ active }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="11" cy="11" r="6" stroke={active ? stroke : '#666'} strokeWidth="2" />
    <path d="M20 20l-3.5-3.5" stroke={active ? stroke : '#666'} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const GenerateIcon: React.FC<{active?: boolean}> = ({ active }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="5" y="5" width="14" height="14" rx="2" stroke={active ? stroke : '#666'} strokeWidth="2" />
    <path d="M9 9h6v6H9z" stroke={active ? stroke : '#666'} strokeWidth="2" />
  </svg>
);

export const ScannerIcon: React.FC<{active?: boolean}> = ({ active }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M3 7V5a2 2 0 012-2h2M21 7V5a2 2 0 00-2-2h-2M3 17v2a2 2 0 002 2h2M21 17v2a2 2 0 01-2 2h-2" stroke={active ? stroke : '#666'} strokeWidth="2" strokeLinecap="round" />
    <rect x="6" y="9" width="12" height="6" rx="2" stroke={active ? stroke : '#666'} strokeWidth="2" />
  </svg>
);

export default {};