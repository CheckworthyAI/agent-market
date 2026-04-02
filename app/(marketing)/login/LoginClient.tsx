"use client";

import { useState, useEffect, Suspense } from 'react';
import { Button, Input, Card, Separator, TextField, Label } from '@heroui/react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (mode === 'login') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      } else {
        router.push("/dashboard/agent-aim?aimFresh=1");
        router.refresh();
      }
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        const verifyUrl = `/verify?email=${encodeURIComponent(email)}`;
        router.push(verifyUrl);
      }
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'profile email',
          redirectTo: `${
            typeof window !== 'undefined' ? window.location.origin : ''
          }/auth/callback?next=${encodeURIComponent("/dashboard/agent-aim?aimFresh=1")}`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-6">
      <Card className="w-full max-w-md p-8 shadow-2xl backdrop-blur-md bg-background/60">
        <div className="flex flex-col gap-4 text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'login'
              ? 'Enter your credentials to access your account'
              : 'Complete the fields below to join our community'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <TextField isRequired>
            <Label>Email</Label>
            <Input
              placeholder="Enter your email"
              type="email"
              variant="secondary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </TextField>

          <TextField isRequired>
            <Label>Password</Label>
            <Input
              placeholder="Enter your password"
              type="password"
              variant="secondary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </TextField>

          {mode === 'signup' && (
            <TextField isRequired>
              <Label>Confirm Password</Label>
              <Input
                placeholder="Confirm your password"
                type="password"
                variant="secondary"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </TextField>
          )}

          {error && <p className="text-danger text-sm text-center font-medium">{error}</p>}

          <Button
            variant="primary"
            size="lg"
            type="submit"
            isPending={loading}
            className="w-full font-semibold shadow-lg shadow-primary/20"
          >
            {mode === 'login' ? 'Log In' : 'Sign Up'}
          </Button>
        </form>

        <div className="flex items-center gap-4 my-8">
          <Separator className="flex-1" />
          <span className="text-tiny text-muted-foreground uppercase">OR</span>
          <Separator className="flex-1" />
        </div>

        <div className="text-center">
          <div className="flex flex-col gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="w-full flex items-center justify-center gap-3"
              onClick={signInWithGoogle}
              isPending={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M21.35 11.1h-9.18v2.92h5.26c-.23 1.4-1.44 3.6-5.26 3.6-3.16 0-5.74-2.6-5.74-5.8s2.58-5.8 5.74-5.8c1.8 0 3.02.76 3.72 1.42l2.54-2.44C17.77 3.3 15.77 2.2 12.9 2.2 7.79 2.2 3.8 6.18 3.8 11.3s3.99 9.1 9.1 9.1c5.25 0 8.73-3.68 8.73-8.87 0-.6-.07-1.05-.38-1.43z" fill="currentColor"/>
              </svg>
              Continue with Google
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="text-sm font-medium text-primary hover:underline transition-all"
            >
              {mode === 'login'
                ? "Don't have an account? Create one"
                : 'Already have an account? Log in'}
            </button>
          </div>
        </div>

        <p className="text-center text-tiny text-muted-foreground mt-8">
          By continuing, you agree to our terms and privacy policy.
        </p>
      </Card>
    </div>
  );
}
