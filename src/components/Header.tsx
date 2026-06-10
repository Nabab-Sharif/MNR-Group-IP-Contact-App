import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, LogOut, Settings, Download, HelpCircle, KeyRound, User, Building2, Users, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useOffices } from '@/hooks/useOffices';
import { useAllData } from '@/hooks/useAllData';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import NotificationBell from '@/components/NotificationBell';
import logo from '@/assets/logo.jpg';

const Header = () => {
  const [subProfileOpen, setSubProfileOpen] = useState(false);
  const { isLoggedIn, isAdmin, isSubAdmin, isSuperAdmin, accessCode, logout } = useAuth();
  const { offices } = useOffices();
  const { departments } = useAllData();
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isInstalling, isIOS, showIOSGuide, setShowIOSGuide, handleInstall } = useInstallPrompt();

  const subOffice = isSubAdmin && accessCode?.office_id ? offices.find(o => o.id === accessCode.office_id)?.name : null;
  const subDept = isSubAdmin && accessCode?.department_id ? departments.find(d => d.id === accessCode.department_id)?.name : null;

  return (
    <header className="header-gradient shadow-lg sticky top-0 z-50 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <img src={logo} alt="MNR Group" className="w-10 h-10 rounded-full bg-primary-foreground object-cover flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight truncate">IP & Contact Directory</h1>
            <p className="text-xs text-slate-900 dark:text-slate-50 truncate hidden sm:block">MNR Group</p>
          </div>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          
          <ThemeSwitcher isHeader={true} />
          <NotificationBell enabled={isLoggedIn && isSuperAdmin} />
          {isLoggedIn && isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="text-slate-900 dark:text-slate-50 truncate hover:bg-primary-foreground/10"
            >
              <Settings className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          )}
          {isLoggedIn ? (
            isSubAdmin ? (
              <Popover open={subProfileOpen} onOpenChange={setSubProfileOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onMouseEnter={() => setSubProfileOpen(true)}
                    className="text-slate-900 dark:text-slate-50 truncate hover:bg-primary-foreground/10"
                    aria-label="Sub admin profile"
                  >
                    <User className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Profile</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-[min(92vw,288px)] max-w-[92vw] p-0 overflow-hidden z-[60]"
                  onMouseLeave={() => setSubProfileOpen(false)}
                >
                  <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-3 sm:p-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate text-sm sm:text-base">{accessCode?.label || 'Sub Admin'}</p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">{accessCode?.code}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 text-[11px] sm:text-xs">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">Role:</span>
                      <span className="font-semibold text-foreground">Sub Admin</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">Unit:</span>
                      <span className="font-semibold text-foreground truncate">{subOffice || 'Not assigned'}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">Dept:</span>
                      <span className="font-semibold text-foreground truncate">{subDept || 'Not assigned'}</span>
                    </div>
                    {accessCode?.last_active && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">Active:</span>
                        <span className="font-semibold text-foreground">{new Date(accessCode.last_active).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 border-t bg-muted/30">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => { setSubProfileOpen(false); logout(); navigate('/login'); }}
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { logout(); navigate('/login'); }}
                className="text-slate-900 dark:text-slate-50 truncate hover:bg-primary-foreground/10"
              >
                <LogOut className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            )
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              className="text-slate-900 dark:text-slate-50 truncate hover:bg-primary-foreground/10"
            >
              <LogIn className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          )}
        </div>

      </div>

      {/* iOS Install Guide Dialog */}
      <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Install App on iOS</DialogTitle>
            <DialogDescription>
              Follow these steps to install this app on your iPhone or iPad
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Step 1: Open Share Menu</p>
              <p className="text-slate-600 dark:text-slate-400">Tap the share icon (rectangle with arrow) at the bottom of the page</p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Step 2: Add to Home Screen</p>
              <p className="text-slate-600 dark:text-slate-400">Scroll down and select "Add to Home Screen"</p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Step 3: Confirm</p>
              <p className="text-slate-600 dark:text-slate-400">Name the app and tap "Add" in the top-right corner</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                ✓ The app will be added to your home screen and works offline once installed!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
