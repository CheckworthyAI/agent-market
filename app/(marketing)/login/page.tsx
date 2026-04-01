'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button, Input, Card, Separator, TextField, Label } from '@heroui/react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
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
      console.log('Attempting login for:', email);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Login error:', signInError);
        setError(signInError.message);
        setLoading(false);
      } else {
        console.log('Login successful, redirecting to dashboard...');
        router.push('/dashboard');
        router.refresh();
      }
    } else {
      console.log('Attempting signup for:', email);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      console.log('Signup result:', { data, error: signUpError });

      if (signUpError) {
        console.error('Signup error details:', signUpError);
        setError(signUpError.message);
      } else {
        console.log('Signup successful! Redirecting to verify...');
        const verifyUrl = `/verify?email=${encodeURIComponent(email)}`;
        console.log('Pushing to URL:', verifyUrl);
        router.push(verifyUrl);
      }
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

        <p className="text-center text-tiny text-muted-foreground mt-8">
          By continuing, you agree to our terms and privacy policy.
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
