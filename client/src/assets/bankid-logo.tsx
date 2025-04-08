import React from "react";

interface BankIDLogoProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function BankIDLogo({ 
  className = "", 
  width = 48, 
  height = 48,
  color = "#000000" 
}: BankIDLogoProps) {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 600 600" 
      fill="none" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* BankID logo SVG paths - recreated from the image */}
      <g>
        {/* The 'i' and 'D' parts of the logo */}
        <path
          d="M115 400 L115 95 L50 95 C65 115 60 140 50 150 L50 400 L115 400 Z"
          fill={color}
        />
        <path
          d="M240 145 C190 145 165 200 165 240 L165 400 L230 400 L230 250 C230 210 250 210 260 210 L260 145 C260 145 250 145 240 145 Z"
          fill={color}
        />
        <path
          d="M430 145 C320 145 320 300 430 300 L430 145 Z M365 240 C365 290 390 330 430 330 L430 400 L275 400 C275 400 275 310 275 250 C275 150 330 95 430 95 L430 145 Z"
          fill={color}
        />
      </g>
      {/* BankID text */}
      <g transform="translate(50, 460) scale(0.95)">
        <path
          d="M10 30 L40 30 C60 30 70 40 70 60 C70 75 60 85 45 85 L25 85 L25 115 L10 115 L10 30 Z M25 45 L25 70 L40 70 C50 70 55 65 55 57 C55 50 50 45 40 45 L25 45 Z"
          fill={color}
        />
        <path
          d="M80 70 C80 45 100 30 125 30 C150 30 170 45 170 70 C170 95 150 115 125 115 C100 115 80 95 80 70 Z M95 70 C95 85 105 100 125 100 C145 100 155 85 155 70 C155 55 145 45 125 45 C105 45 95 55 95 70 Z"
          fill={color}
        />
        <path
          d="M180 30 L195 30 L195 80 C195 90 205 100 215 100 C225 100 235 90 235 80 L235 30 L250 30 L250 85 C250 105 235 115 215 115 C195 115 180 105 180 85 L180 30 Z"
          fill={color}
        />
        <path
          d="M265 30 L280 30 L280 55 L315 30 L335 30 L295 60 L335 115 L315 115 L285 70 L280 75 L280 115 L265 115 L265 30 Z"
          fill={color}
        />
        <path
          d="M345 30 L360 30 L360 115 L345 115 L345 30 Z"
          fill={color}
        />
        <path
          d="M375 30 L425 30 L425 45 L390 45 L390 65 L420 65 L420 80 L390 80 L390 100 L425 100 L425 115 L375 115 L375 30 Z"
          fill={color}
        />
      </g>
    </svg>
  );
}