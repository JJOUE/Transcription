'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from './UserMenu';
import { AdminMenu } from './AdminMenu';
import { BRANDING_CONFIG } from '@/config/branding';

export function Header() {
  const { user, userData } = useAuth();
  const router = useRouter();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-[9999]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              {BRANDING_CONFIG.USE_LOGO ? (
                <Image
                  src={BRANDING_CONFIG.LOGO_PATH}
                  alt={BRANDING_CONFIG.COMPANY_NAME}
                  width={400}
                  height={60}
                  className="h-12 w-auto"
                  priority
                />
              ) : (
                <>
                  <div className="w-8 h-8 bg-[#003366] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{BRANDING_CONFIG.COMPANY_SHORT}</span>
                  </div>
                  <span className="text-xl font-semibold text-[#003366]">
                    {BRANDING_CONFIG.COMPANY_NAME}
                  </span>
                </>
              )}
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/guide"
              className="text-gray-600 hover:text-[#003366] transition-colors"
            >
              Guide
            </Link>
            {!user && (
              <Link
                href="/pricing"
                className="text-gray-600 hover:text-[#003366] transition-colors"
              >
                Pricing
              </Link>
            )}
            <Link
              href="/about"
              className="text-gray-600 hover:text-[#003366] transition-colors"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-gray-600 hover:text-[#003366] transition-colors"
            >
              Contact
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {userData?.role === 'admin' && <AdminMenu />}
                <UserMenu />
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/signin')}
                  className="text-gray-600 hover:text-[#003366]"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => router.push('/signup')}
                  className="bg-[#003366] hover:bg-[#002244] text-white"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}