'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader as Loader2, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchCountriesAndCurrencies, Country } from '@/services/api';

export default function SignupPage() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countries, setCountries] = useState<Country[]>([]);
  const { signUp, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      router.push('/admin');
    }
  }, [user, router]);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const data = await fetchCountriesAndCurrencies();
        const sorted = data
          .filter((c) => c.currencies && Object.keys(c.currencies).length > 0)
          .sort((a, b) => a.name.common.localeCompare(b.name.common));
        setCountries(sorted);
      } catch (error) {
        console.error('Failed to load countries:', error);
        toast({
          title: 'Warning',
          description: 'Failed to load countries. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountries();
  }, [toast]);

  const handleCountryChange = (countryName: string) => {
    setCountry(countryName);
    const selectedCountry = countries.find((c) => c.name.common === countryName);
    if (selectedCountry) {
      const currencyCode = Object.keys(selectedCountry.currencies)[0];
      setCurrency(currencyCode);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signUp(email, password, companyName, country, currency);
      toast({
        title: 'Success',
        description: 'Account created successfully',
      });
      router.push('/admin');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-950 to-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <TrendingUp className="h-10 w-10 text-blue-500 mr-3" />
          <h1 className="text-3xl font-bold text-white">ExpenseFlow</h1>
        </div>

        <Card className="bg-gray-950 border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Sign Up</CardTitle>
            <CardDescription className="text-gray-400">
              Create your company account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-gray-300">
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country" className="text-gray-300">
                  Country
                </Label>
                <Select value={country} onValueChange={handleCountryChange} disabled={loadingCountries}>
                  <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                    <SelectValue placeholder={loadingCountries ? 'Loading...' : 'Select country'} />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800 text-white max-h-60">
                    {countries.map((c) => (
                      <SelectItem key={c.name.common} value={c.name.common}>
                        {c.name.common}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currency && (
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                  <p className="text-sm text-gray-400">Default Currency</p>
                  <p className="text-white font-medium">{currency}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || loadingCountries || !currency}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>

              <p className="text-center text-sm text-gray-400 mt-4">
                Already have an account?{' '}
                <Link href="/" className="text-blue-500 hover:text-blue-400 font-medium">
                  Login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
