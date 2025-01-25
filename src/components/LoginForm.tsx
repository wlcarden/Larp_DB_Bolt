import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PenTool } from 'lucide-react';

export function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await signIn(email, password);
    } catch (err) {
      setError('Failed to sign in');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment-texture bg-cover bg-fixed py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Decorative Border */}
        <div className="relative">
          <div className="absolute inset-0 -m-8 border-4 border-ink/20 rounded-2xl">
            <div className="absolute inset-0 border-2 border-ink/10 rounded-xl m-1"></div>
            {/* Corner Ornaments */}
            <div className="absolute -top-2 -left-2 w-4 h-4 border-t-4 border-l-4 border-ink/40 rounded-tl-xl"></div>
            <div className="absolute -top-2 -right-2 w-4 h-4 border-t-4 border-r-4 border-ink/40 rounded-tr-xl"></div>
            <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-4 border-l-4 border-ink/40 rounded-bl-xl"></div>
            <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-4 border-r-4 border-ink/40 rounded-bl-xl"></div>
            {/* Side Ornaments */}
            <div className="absolute top-1/2 -left-2 w-4 h-4 border-l-4 border-ink/30 -translate-y-1/2"></div>
            <div className="absolute top-1/2 -right-2 w-4 h-4 border-r-4 border-ink/30 -translate-y-1/2"></div>
          </div>

          {/* Content */}
          <div className="relative bg-parchment-100/90 backdrop-blur-sm rounded-xl shadow-parchment overflow-hidden">
            {/* Header Section */}
            <div className="text-center px-8 pt-8 pb-6 border-b border-parchment-300/50">
              {/* Decorative Icon Area */}
              <div className="relative mx-auto w-32 h-32">
                {/* Background Circle */}
                <div className="absolute inset-0 bg-parchment-300 rounded-full shadow-parchment"></div>
                {/* Decorative Ring */}
                <div className="absolute inset-2 border-4 border-ink/20 rounded-full"></div>
                {/* Inner Circle */}
                <div className="absolute inset-4 bg-parchment-200 rounded-full shadow-inner"></div>
                {/* PenTool Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <PenTool className="h-16 w-16 text-ink transform rotate-45" />
                </div>
                {/* Decorative Dots */}
                <div className="absolute top-1/2 -left-2 w-4 h-4 bg-parchment-400 rounded-full shadow-parchment"></div>
                <div className="absolute top-1/2 -right-2 w-4 h-4 bg-parchment-400 rounded-full shadow-parchment"></div>
                <div className="absolute -top-2 left-1/2 w-4 h-4 bg-parchment-400 rounded-full shadow-parchment"></div>
                <div className="absolute -bottom-2 left-1/2 w-4 h-4 bg-parchment-400 rounded-full shadow-parchment"></div>
              </div>
              <h1 className="mt-6 text-5xl font-script text-ink">
                LARP Nexus
              </h1>
              <p className="mt-2 text-xl font-script text-ink-light">
                Building Better Stories
              </p>
            </div>

            {/* Login Form Section */}
            <div className="px-8 py-6">
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-md bg-red-100 border border-red-400 p-4">
                    <div className="text-sm font-script text-red-700">{error}</div>
                  </div>
                )}

                <div>
                  <label htmlFor="email-address" className="block text-lg font-script text-ink">
                    Email address
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-parchment-300 bg-parchment-50 shadow-sm focus:border-ink focus:ring-ink text-ink font-script text-lg"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-lg font-script text-ink">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border-parchment-300 bg-parchment-50 shadow-sm focus:border-ink focus:ring-ink text-ink font-script text-lg"
                    placeholder="Enter your password"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-ink bg-ink text-parchment-100 font-script text-xl rounded-md shadow-sm hover:bg-ink-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-light transition-colors duration-200 disabled:opacity-50"
                  >
                    {loading ? 'Signing in...' : 'Sign in'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}