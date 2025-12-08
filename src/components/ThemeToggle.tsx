import { useTheme } from '@/contexts/ThemeContext';
import { Zap, Tv } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2",
        "border-2 transition-all duration-300 text-sm",
        "hover:scale-105 active:scale-95",
        theme === 'cyberpunk' 
          ? "bg-background/80 border-primary text-primary font-display uppercase tracking-widest glow-primary neon-pulse" 
          : "bg-card border-border text-foreground hover:border-primary rounded-full"
      )}
      style={theme === 'cyberpunk' ? {
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
      } : undefined}
    >
      {theme === 'cyberpunk' ? (
        <Tv className="h-4 w-4 animate-pulse" />
      ) : (
        <Zap className="h-4 w-4" />
      )}
      <span className={cn(
        theme === 'cyberpunk' && "text-glow vhs-glitch"
      )}>
        {theme === 'cyberpunk' ? '// RETRO' : 'Default'}
      </span>
    </button>
  );
};
