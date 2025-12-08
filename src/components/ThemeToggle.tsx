import { useTheme } from '@/contexts/ThemeContext';
import { Monitor, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-3 px-5 py-3",
        "transition-all duration-300",
        "hover:scale-105 active:scale-95",
        theme === 'cyberpunk' 
          ? "bg-background border-2 border-accent text-accent font-mono uppercase tracking-[0.3em] text-lg glow-accent neon-breathe pixel-corners" 
          : "bg-card border border-border text-foreground hover:border-primary rounded-full text-sm"
      )}
    >
      {theme === 'cyberpunk' ? (
        <>
          <Monitor className="h-5 w-5" />
          <span className="vhs-glitch">SYS:RETRO</span>
          <span className="cursor-blink"></span>
        </>
      ) : (
        <>
          <Zap className="h-4 w-4" />
          <span>Default</span>
        </>
      )}
    </button>
  );
};
