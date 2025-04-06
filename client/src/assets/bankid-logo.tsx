import React from "react";
import bankidLogoImage from "@/assets/images/bankid-logo.png";

interface BankIDLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function BankIDLogo({ 
  className = "", 
  width = 48, 
  height = 48 
}: BankIDLogoProps) {
  return (
    <img 
      src={bankidLogoImage} 
      width={width} 
      height={height} 
      className={className}
      alt="BankID Logo"
      style={{ objectFit: 'contain' }}
    />
  );
}