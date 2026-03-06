'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { CreditProvider } from '@/contexts/CreditContext';
import { WalletProvider } from '@/contexts/WalletContext';
import { PackageProvider } from '@/contexts/PackageContext';
import NoSSR from '@/components/NoSSR';
import { Toaster } from '@/components/ui/toaster';
import { ThirdPartyWidgets } from '@/components/layout/ThirdPartyWidgets';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NoSSR fallback={
      <div suppressHydrationWarning>
        {children}
      </div>
    }>
      <AuthProvider>
        <CreditProvider>
          <WalletProvider>
            <PackageProvider>
              {children}
              <Toaster />
              <ThirdPartyWidgets />
            </PackageProvider>
          </WalletProvider>
        </CreditProvider>
      </AuthProvider>
    </NoSSR>
  );
}