import React from 'react';

interface AuraOrbProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  pulse?: boolean;
  className?: string;
}

export const AuraOrb: React.FC<AuraOrbProps> = ({
  size = 'md',
  pulse = true,
  className = '',
}) => {
  const dimensionMap = {
    sm: 'w-8 h-8',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
    xl: 'w-56 h-56',
  };

  const dim = dimensionMap[size];

  return (
    <div
      id={`aura-orb-${size}`}
      className={`relative flex items-center justify-center select-none ${dim} ${className}`}
    >
      {/* Ambient background glow */}
      <div
        className={`absolute inset-0 rounded-full blur-xl opacity-60 bg-gradient-to-tr from-blue-600 via-indigo-600 to-pink-500 ${
          pulse ? 'animate-pulse' : ''
        }`}
      />

      {/* Outer subtle orbital ring */}
      <svg
        className="absolute inset-0 w-full h-full animate-[spin_24s_linear_infinite]"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="rgba(99, 102, 241, 0.22)"
          strokeWidth="1.2"
          strokeDasharray="4 6"
        />
        <circle cx="50" cy="4" r="2.2" fill="#38bdf8" />
        <circle cx="88" cy="80" r="1.8" fill="#f472b6" />
      </svg>

      {/* Middle counter-rotating ring */}
      <svg
        className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] animate-[spin_16s_linear_infinite_reverse]"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="rgba(192, 132, 252, 0.28)"
          strokeWidth="1.5"
          strokeDasharray="14 10 3 10"
        />
        <circle cx="20" cy="20" r="2" fill="#818cf8" />
      </svg>

      {/* Concentric intelligence core */}
      <div className="relative w-[70%] h-[70%] rounded-full p-[1.5px] bg-gradient-to-br from-cyan-400 via-blue-600 to-fuchsia-500 shadow-lg shadow-indigo-500/20">
        <div className="w-full h-full rounded-full bg-[#090d1a] flex items-center justify-center overflow-hidden">
          {/* Internal neural gradient core */}
          <div className="w-[82%] h-[82%] rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-pink-600 opacity-90 blur-[2px]" />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-cyan-300 blur-[1px] shadow-sm shadow-cyan-200" />
        </div>
      </div>
    </div>
  );
};
