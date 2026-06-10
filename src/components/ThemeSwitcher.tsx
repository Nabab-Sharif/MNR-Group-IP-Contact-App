import { Moon, Sun, Palette, Check } from 'lucide-react';
import { useTheme, COLOR_THEMES } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ThemeSwitcher = ({ isHeader = false }: { isHeader?: boolean }) => {
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`w-9 h-9 ${
            isHeader
              ? 'text-white hover:bg-white/20'
              : 'text-white hover:bg-white/10'
          }`}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Mode</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer">
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
          {theme === 'light' && <Check className="ml-auto h-4 w-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer">
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
          {theme === 'dark' && <Check className="ml-auto h-4 w-4 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs flex items-center gap-1">
          <Palette className="h-3.5 w-3.5" /> Color theme
        </DropdownMenuLabel>
        {COLOR_THEMES.map(t => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setColorTheme(t.id)}
            className="cursor-pointer"
          >
            <span
              className="mr-2 h-5 w-5 rounded-full border-2 border-primary flex-shrink-0"
              style={{ background: t.swatch }}
            />
            <span>{t.label}</span>
            {colorTheme === t.id && <Check className="ml-auto h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSwitcher;
