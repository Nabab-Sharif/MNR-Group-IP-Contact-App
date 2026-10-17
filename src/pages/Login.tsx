import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Phone, ShieldCheck, ArrowRight, Eye, EyeOff, ChevronDown } from 'lucide-react';
import logo from '@/assets/logo.jpg';
import { toast } from 'sonner';

const Login = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showAccessContact, setShowAccessContact] = useState(false);
  const [isAccessContactHovered, setIsAccessContactHovered] = useState(false);
  const [isAccessContactDismissed, setIsAccessContactDismissed] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const isAccessContactVisible = showAccessContact || (isAccessContactHovered && !isAccessContactDismissed);

  const toggleAccessContact = () => {
    if (isAccessContactVisible) {
      setShowAccessContact(false);
      setIsAccessContactDismissed(isAccessContactHovered);
      return;
    }
    setShowAccessContact(true);
    setIsAccessContactDismissed(false);
  };

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
    <div className="login-page min-h-[100dvh] w-full overflow-y-auto overflow-x-hidden relative flex items-center justify-center px-3 sm:px-6 py-6 md:py-10" style={{ background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--primary) / 0.25) 50%, hsl(var(--accent) / 0.2) 100%)' }}>
      {/* Animated background blobs */}
      <div className="absolute top-0 -left-20 w-64 h-64 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse" style={{ background: 'hsl(var(--primary) / 0.5)' }}></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-pulse" style={{ animationDelay: '2s', background: 'hsl(var(--accent) / 0.4)' }}></div>
      <div className="absolute bottom-0 -right-20 w-64 h-64 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '1s', background: 'hsl(var(--primary) / 0.5)' }}></div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

      <div className="login-content w-full max-w-6xl xl:max-w-7xl relative z-10 flex flex-col">
        <div className="login-card backdrop-blur-2xl bg-white/90 dark:bg-white/5 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/20 overflow-hidden ring-1 ring-slate-200/70 dark:ring-white/10 hover:ring-slate-300/80 dark:hover:ring-white/20 transition-all duration-300">
          <div className="login-grid grid md:grid-cols-2 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="login-left relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 sm:p-8 md:p-8 lg:p-12 text-white animate-[slideInLeft_0.7s_ease-out] hidden md:flex">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.30),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.28),_transparent_40%)]"></div>
              <div className="absolute -top-10 right-10 h-32 w-32 rounded-full bg-cyan-400/15 blur-3xl"></div>
              <div className="absolute bottom-8 left-8 h-24 w-24 rounded-full bg-blue-500/20 blur-2xl"></div>
              <div className="login-left-content relative z-10 flex h-full w-full flex-col items-center text-center">
                <div className="login-left-intro flex w-full max-w-xl flex-1 flex-col justify-center pb-8">
                  <h2 className="mt-6 text-2xl sm:text-3xl md:text-2xl lg:text-4xl font-bold leading-[1.15] tracking-tight text-white">
                    <span className="block text-4xl font-extrabold text-amber-300">Welcome</span>
                    <span className="mt-1 block bg-gradient-to-r from-cyan-100 via-sky-100 to-white bg-clip-text text-transparent">MNR Group IP & Contact App</span>
                  </h2>
                  <p className="mb-4 mt-4 max-w-xl text-sm lg:text-base text-slate-200/90 leading-7">
                    A smarter way to reach the right people, with instant access to contacts, extensions, and communication tools.
                  </p>
                </div>

                <div className="login-left-features mt-8 hidden w-full max-w-xl md:mt-0 md:grid gap-3 rounded-3xl border border-white/15 bg-white/10 p-4 sm:p-5 backdrop-blur-xl shadow-2xl shadow-black/20">
                  <div className="login-feature-card flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/20 p-3 text-center">
                    <div className="rounded-2xl bg-cyan-400/20 p-2 text-cyan-200">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Find the right contact instantly</h3>
                      <p className="text-sm text-slate-200/90">Quickly locate extensions, numbers, WhatsApp contacts, and email addresses.</p>
                    </div>
                  </div>
                  <div className="login-feature-card flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/20 p-3 text-center">
                    <div className="rounded-2xl bg-cyan-400/20 p-2 text-cyan-200">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Connect with one tap</h3>
                      <p className="text-sm text-slate-200/90">Use QR-based actions to call, start a WhatsApp chat, or send an email directly.</p>
                    </div>
                  </div>
                  <div className="login-feature-card flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/20 p-3 text-center">
                    <div className="rounded-2xl bg-cyan-400/20 p-2 text-cyan-200">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Access from anywhere</h3>
                      <p className="text-sm text-slate-200/90">Designed for seamless use across mobile, tablet, laptop, and desktop.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="login-right bg-white/80 dark:bg-white/5 p-5 sm:p-7 md:p-8 lg:p-10 animate-[slideInRight_0.7s_ease-out]">
              <div className="login-header flex flex-col items-center justify-center text-center mb-6 md:mb-8">
                <div className="login-logo-wrap relative flex-shrink-0 mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full blur-lg opacity-80 animate-pulse"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full blur-2xl opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <img
                    src={logo}
                    alt="MNR Group"
                    className="login-logo relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-2 sm:border-3 border-white/40 object-cover shadow-2xl"
                  />
                </div>

                <div className="w-full">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:bg-gradient-to-r dark:from-white dark:via-cyan-100 dark:to-blue-200 dark:bg-clip-text dark:text-transparent leading-tight mb-1">
                    IP & Contact App
                  </h1>
                  <p className="text-xs sm:text-sm md:text-xl text-slate-700 dark:text-slate-300 uppercase tracking-wider font-medium mb-3 md:mb-4">MNR Group</p>

                </div>
              </div>

              <div className="login-divider h-px bg-gradient-to-r from-transparent via-slate-300/70 dark:via-white/20 to-transparent mb-6 md:mb-8"></div>

              <form onSubmit={handleSubmit} className="login-form space-y-4 md:space-y-5">
                <div className="group relative rounded-xl transition-transform duration-300 focus-within:scale-[1.01]">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 opacity-0 blur-md transition-opacity duration-300 group-focus-within:opacity-60"></div>
                  <div className="absolute inset-0 rounded-xl border border-transparent bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"></div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-600 dark:text-cyan-300 z-10 transition-all duration-300 group-focus-within:scale-110 group-focus-within:text-blue-600 dark:group-focus-within:text-cyan-200" />
                    <Input
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="Enter your Access ID"
                      type={showCode ? 'text' : 'password'}
                      className="login-input h-12 sm:h-13 md:h-14 pl-12 md:pl-14 pr-12 rounded-xl text-center text-base md:text-lg tracking-widest font-bold bg-white/90 dark:bg-slate-950/40 backdrop-blur-md border border-slate-300/80 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 group-focus-within:border-transparent"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowCode(prev => !prev)}
                      className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                      aria-label={showCode ? 'Hide Access ID' : 'Show Access ID'}
                    >
                      {showCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  variant="ghost"
                  className="login-submit w-full h-12 sm:h-13 md:h-14 rounded-xl border border-white/20 text-sm md:text-base font-bold text-primary-foreground shadow-xl transition-colors hover:border-white/20 hover:bg-transparent hover:text-primary-foreground disabled:opacity-80 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, hsl(190 95% 42%), hsl(221 83% 53%))' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin text-lg">⟳</span> Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="login-divider h-px bg-gradient-to-r from-transparent via-slate-300/70 dark:via-white/20 to-transparent my-6 md:my-8"></div>

              <div
                className="login-contact mx-auto flex w-full max-w-[300px] flex-col items-stretch gap-3 rounded-2xl border border-cyan-300/70 bg-gradient-to-br from-white/90 via-cyan-50/80 to-blue-100/80 p-4 shadow-lg shadow-cyan-950/5 backdrop-blur-md transition-all duration-300 dark:border-cyan-400/30 dark:from-slate-900/70 dark:via-cyan-950/40 dark:to-blue-950/40 dark:shadow-black/10 md:p-5"
                onMouseEnter={() => {
                  setIsAccessContactHovered(true);
                  setIsAccessContactDismissed(false);
                }}
                onMouseLeave={() => {
                  setIsAccessContactHovered(false);
                  setIsAccessContactDismissed(false);
                }}
              >
                <button
                  type="button"
                  onClick={toggleAccessContact}
                  aria-expanded={isAccessContactVisible}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:bg-cyan-100/70 hover:text-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-cyan-200 md:text-sm"
                >
                  <span>Need an Access ID?</span>
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${isAccessContactVisible ? 'rotate-180' : ''}`} />
                </button>
                {isAccessContactVisible && (
                  <div className="flex flex-col items-center gap-3 border-t border-cyan-300/50 pt-3 dark:border-cyan-400/20 sm:flex-row sm:gap-4">
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                      <p className="login-contact-name whitespace-nowrap text-xs font-bold leading-tight text-slate-900 dark:text-white md:text-sm">Nabab Sharif</p>
                    </div>
                    <a
                      href="tel:01838047391"
                      className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-cyan-300/30 bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:from-cyan-400 hover:to-blue-400 hover:shadow-cyan-500/30 hover:scale-105 active:scale-95 md:px-4 md:py-2.5 md:text-sm"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="hidden sm:inline">Call</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="login-footer mt-6 md:mt-8 text-center text-xs md:text-sm text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          © 2026 MNR Group · All rights reserved
        </p>
      </div>
    </div>
  );
};

export default Login;
