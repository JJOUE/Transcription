'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CreditCard, Settings, LogOut, Upload, BarChart3, MessageCircle, HelpCircle, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

export function UserMenu() {
  const { user, userData, signOut } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Get user's initials from email if no name is available
  const getInitials = () => {
    if (user.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    return user.email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#b29dd9] text-white">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-white border border-gray-200 shadow-lg" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium text-gray-900">{user.displayName || 'User'}</p>
            <p className="w-[200px] truncate text-sm text-gray-600">
              {user.email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center text-gray-900 hover:bg-gray-100">
            <BarChart3 className="mr-2 h-4 w-4 text-gray-600" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/upload" className="flex items-center text-gray-900 hover:bg-gray-100">
            <Upload className="mr-2 h-4 w-4 text-gray-600" />
            Start a Transcription
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/office/upload" className="flex items-center text-gray-900 hover:bg-gray-100">
            <FileText className="mr-2 h-4 w-4 text-gray-600" />
            Document Preparation
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/billing" className="flex items-center text-gray-900 hover:bg-gray-100">
            <CreditCard className="mr-2 h-4 w-4 text-gray-600" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center text-gray-900 hover:bg-gray-100">
            <Settings className="mr-2 h-4 w-4 text-gray-600" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/guide" className="flex items-center text-gray-900 hover:bg-gray-100">
            <HelpCircle className="mr-2 h-4 w-4 text-gray-600" />
            Help &amp; Guide
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/contact" className="flex items-center text-gray-900 hover:bg-gray-100">
            <MessageCircle className="mr-2 h-4 w-4 text-gray-600" />
            Contact
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600 hover:bg-red-50">
          <LogOut className="mr-2 h-4 w-4 text-red-600" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
