"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function SignInPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, user, userData, isLoading, isInitialized } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get('next');
  const safeNext = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') && !requestedNext.includes('\\') ? requestedNext : null;

  // Handle navigation after successful sign-in
  useEffect(() => {
    if (isInitialized && user && !isLoading) {
      console.log('🚀 User authenticated, navigating...', { 
        user: user.email, 
        role: userData?.role 
      });
      
      const targetRoute = safeNext || (userData?.role === 'admin' ? '/admin' : '/dashboard');
      console.log('➡️ Navigating to:', targetRoute);
      
      // Use replace to prevent back navigation to signin
      router.replace(targetRoute);
    }
  }, [user, userData, isLoading, isInitialized, router, safeNext]);

  const getErrorMessage = (errorMessage: string) => {
    // Map Firebase error codes to user-friendly messages
    switch (errorMessage) {
      case 'Firebase: Error (auth/invalid-credential).':
        return {
          title: "Invalid credentials",
          description: "The email or password you entered is incorrect. Please try again."
        };
      case 'Firebase: Error (auth/user-not-found).':
        return {
          title: "Account not found",
          description: "No account found with this email address. Please check your email or sign up."
        };
      case 'Firebase: Error (auth/wrong-password).':
        return {
          title: "Incorrect password",
          description: "The password you entered is incorrect. Please try again or reset your password."
        };
      case 'Firebase: Error (auth/user-disabled).':
        return {
          title: "Account disabled",
          description: "This account has been disabled. Please contact support for assistance."
        };
      case 'Firebase: Error (auth/too-many-requests).':
        return {
          title: "Too many attempts",
          description: "Too many failed sign-in attempts. Please wait a few minutes before trying again."
        };
      case 'Firebase: Error (auth/network-request-failed).':
        return {
          title: "Network error",
          description: "Please check your internet connection and try again."
        };
      case 'Firebase: Error (auth/invalid-email).':
        return {
          title: "Invalid email",
          description: "Please enter a valid email address."
        };
      case 'EMAIL_NOT_VERIFIED':
        return {
          title: "Email not verified",
          description: "Please check your email and verify your account before signing in."
        };
      default:
        return {
          title: "Sign in failed",
          description: "An unexpected error occurred. Please try again."
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('🔐 Starting sign-in...', { email: formData.email });
      await signIn(formData.email, formData.password);
      
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });
      
      // Navigation will be handled by useEffect
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(
        (error instanceof Error ? error.message : String(error)) || 'Unknown error'
      );
      
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Show loading while auth is initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  // If user is already authenticated, show loading while navigating
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center space-x-2 mb-8">
          <div className="w-10 h-10 bg-[#003366] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">TTC</span>
          </div>
          <span className="text-2xl font-semibold text-[#003366]">
            Talk To Text Canada
          </span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-[#003366]">
              Sign In
            </CardTitle>
            <p className="text-gray-600">
              Welcome back! Please sign in to your account.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#b29dd9] hover:text-[#9d87c7]"
                >
                  Forgot your password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#003366] hover:bg-[#002244] text-white"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link
                  href={safeNext ? `/signup?next=${encodeURIComponent(safeNext)}` : '/signup'}
                  className="font-medium text-[#b29dd9] hover:text-[#9d87c7]"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
// Default export for Next.js pages compatibility
export default SignInPage;
