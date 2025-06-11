import React from 'react';

interface MainContentLayoutProps {
  children: React.ReactNode;
  isFullWidth?: boolean;
  className?: string;
}

export const MainContentLayout = ({ 
  children, 
  isFullWidth = false,
  className = ""
}: MainContentLayoutProps): JSX.Element => {
  return (
    <div className={`
      w-full transition-all duration-300 ease-in-out
      ${isFullWidth ? 'max-w-none' : 'max-w-7xl mx-auto'}
      ${className}
    `}>
      <div className="bg-white rounded-lg shadow-sm min-h-[calc(100vh-4rem)]">
        {children}
      </div>
    </div>
  );
}; 