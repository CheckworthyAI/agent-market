'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button, Input, Card, TextField, Label } from '@heroui/react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      alert('Verification code resent!');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-6">
      <Card className="w-full max-w-md p-8 shadow-2xl backdrop-blur-md bg-background/60">
        <div className="flex flex-col gap-4 text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Verify Your Email</h1>
          <p className="text-muted-foreground text-sm">
            We've sent an 8-digit code to <span className="font-semibold text-primary">{email}</span>. 
            Enter it below to confirm your account.
          </p>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col gap-6">
          <TextField isRequired>
            <Label>Verification Code</Label>
            <Input
              placeholder="Enter 8-digit code"
              maxLength={8}
              className="text-center tracking-[0.5em] text-2xl font-bold"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              variant="secondary"
            />
          </TextField>

          {error && <p className="text-danger text-sm text-center font-medium">{error}</p>}

          <Button
            variant="primary"
            size="lg"
            type="submit"
            isPending={loading}
            className="w-full font-semibold shadow-lg shadow-primary/20"
          >
            Verify Account
          </Button>
        </form>

        <div className="mt-8 text-center text-sm">
          <p className="text-muted-foreground">
            Didn't receive the code?{' '}
            <button
              type="button"
              onClick={handleResend}
              className="font-medium text-primary hover:underline transition-all"
            >
              Resend Code
            </button>
          </p>
        </div>

        <button
          onClick={() => router.push('/login')}
          className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Login
        </button>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
