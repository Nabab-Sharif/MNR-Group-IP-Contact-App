import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Wifi, WifiOff, Phone, ShieldCheck, ArrowRight } from 'lucide-react';
import logo from '@/assets/logo.jpg';
import { toast } from 'sonner';
import { isOnline } from '@/lib/offlineDb';

const Login = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(isOnline());
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter your Access ID');
      return;
    }
    setLoading(true);
    const { error } = await login(code.trim());
    if (error) {
      toast.error(error);
    } else {
      toast.success('Login successful!');
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden relative flex items-center justify-center px-3 sm:px-6" style={{ background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--primary) / 0.25) 50%, hsl(var(--accent) / 0.2) 100%)' }}>
      {/* Animated background blobs */}
      <div className="absolute top-0 -left-20 w-64 h-64 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse" style={{ background: 'hsl(var(--primary) / 0.5)' }}></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-pulse" style={{ animationDelay: '2s', background: 'hsl(var(--accent) / 0.4)' }}></div>
      <div className="absolute bottom-0 -right-20 w-64 h-64 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '1s', background: 'hsl(var(--primary) / 0.5)' }}></div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg relative z-10 max-h-full flex flex-col">
        {/* Glass card */}
        <div className="backdrop-blur-2xl bg-white/10 dark:bg-white/5 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 px-4 py-6 sm:p-7 md:p-10 ring-1 ring-white/10 hover:ring-white/20 transition-all duration-300">
          {/* Centered Header Section */}
          <div className="flex flex-col items-center justify-center text-center mb-6 md:mb-10">
            {/* Logo with enhanced glow */}
            <div className="relative flex-shrink-0 mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full blur-lg opacity-80 animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full blur-2xl opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <img
                src={logo}
                alt="MNR Group"
                className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-2 sm:border-3 border-white/40 object-cover shadow-2xl"
              />
              
            </div>

            {/* Title and Subtitle */}
            <div className="flex-1 min-w-0 w-full">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent leading-tight mb-1">
                IP & Contact Directory
              </h1>
              <p className="text-xs sm:text-sm md:text-xl text-slate-300 uppercase tracking-wider font-medium mb-3 md:mb-4">MNR Group</p>
              
              {/* Status Badge - Centered */}
              <div className="flex justify-center">
                <div className={`flex items-center gap-2 backdrop-blur-md rounded-full px-3 py-1.5 sm:px-4 sm:py-2 border transition-all duration-300 ${online ? 'bg-emerald-500/20 border-emerald-400/40 hover:bg-emerald-500/30' : 'bg-red-500/20 border-red-400/40 hover:bg-red-500/30'}`}>
                  {online ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                      </span>
                      <Wifi className="w-3 h-3 text-emerald-300" />
                      
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-red-300" />
                      
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6 md:mb-8"></div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            <div>
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur opacity-0 group-focus-within:opacity-70 transition duration-300"></div>
                <div className="relative">
                  <KeyRound className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-300 z-10" />
                  <Input
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="Enter your Access ID"
                    className="h-12 sm:h-13 md:h-14 pl-12 md:pl-14 pr-4 rounded-xl text-center text-base md:text-lg tracking-widest font-bold bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:border-transparent transition-all hover:bg-white/15"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 sm:h-13 md:h-14 rounded-xl text-sm md:text-base font-bold text-primary-foreground shadow-xl border border-white/20 transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] group disabled:opacity-80 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin text-lg">⟳</span> Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-6 md:my-8"></div>

          {/* Help section — enhanced */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-gradient-to-br from-cyan-500/15 to-blue-600/15 backdrop-blur-md border border-cyan-400/30 rounded-xl p-4 md:p-5 hover:border-cyan-400/50 transition-all duration-300 hover:from-cyan-500/20 hover:to-blue-600/20">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm md:text-base shadow-lg flex-shrink-0">
              NS
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <p className="text-sm md:text-base font-bold text-white leading-tight">Nabab Sharif</p>
              <p className="text-xs md:text-sm text-slate-300 uppercase tracking-wider font-medium">Need an Access ID?</p>
            </div>
            <a
              href="tel:01838047391"
              className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 transition-all backdrop-blur-md border border-cyan-300/30 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-semibold text-white flex-shrink-0 shadow-lg hover:shadow-cyan-500/30 hover:scale-105 active:scale-95"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Call</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 md:mt-8 text-center text-xs md:text-sm text-slate-400 hover:text-slate-300 transition-colors">
          © 2026 MNR Group · All rights reserved
        </p>
      </div>
    </div>
  );
};

export default Login;
