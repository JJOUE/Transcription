'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SecureCheckoutButtonProps {
  amount: number;
  type?: 'wallet' | 'package';
  packageId?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function SecureCheckoutButton({
  amount,
  type = 'wallet',
  packageId,
  className = '',
  children
}: SecureCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleCheckout = async () => {
    if (!user) {
      setError('Please login to make a payment');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const token = await user.getIdToken();

      console.log('[SecureCheckout] Creating checkout for:', { type, packageId });

      // Create checkout session with userId always included
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(type === 'package'
          ? { type, packageId }
          : { type, amount })
      });

      console.log('[SecureCheckout] Response status:', response.status);

      // Check if response has content before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[SecureCheckout] Non-JSON response:', text);
        throw new Error(`Server returned invalid response (${response.status}): ${text.substring(0, 100)}`);
      }

      const data = await response.json();
      console.log('[SecureCheckout] Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        console.log('[SecureCheckout] Redirecting to:', data.checkoutUrl);
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (err) {
      console.error('[SecureCheckout] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleCheckout}
        disabled={isLoading || !user}
        className={className || 'bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50'}
      >
        {isLoading ? (
          'Processing...'
        ) : children || (
          type === 'package' ? `Purchase Package - CA$${amount}` : `Add CA$${amount}`
        )}
      </button>

      {error && (
        <div className="mt-2 text-red-600 text-sm">
          {error}
        </div>
      )}
    </>
  );
}
