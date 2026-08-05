import React from 'react';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditDisplayProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function CreditDisplay({ 
  amount, 
  size = 'md', 
  showIcon = true, 
  className 
}: CreditDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className={cn('flex items-center space-x-1 text-[#003366]', className)}>
      {showIcon && (
        <Coins className={cn(iconSizes[size], 'text-[#b29dd9]')} />
      )}
      <span className={cn(sizeClasses[size])}>
        CA${(amount / 100).toFixed(2)}
      </span>
    </div>
  );
}
