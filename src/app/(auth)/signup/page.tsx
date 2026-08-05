import { Suspense } from 'react';
import { SignUpPage } from '@/components/pages/SignUpPage';

export default function SignUp() {
  return <Suspense fallback={null}><SignUpPage /></Suspense>;
}
