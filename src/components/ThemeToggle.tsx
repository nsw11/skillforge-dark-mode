import { useTheme } from '@/contexts/ThemeContext';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full",
        "border transition-all duration-300 font-mono text-sm",
        "hover:scale-105 active:scale-95",
        theme === 'cyberpunk' 
          ? "bg-primary/20 border-primary text-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.7)]" 
          : "bg-card border-border text-foreground hover:border-primary"
      )}
    >
      <Zap className={cn(
        "h-4 w-4 transition-all",
        theme === 'cyberpunk' && "animate-pulse"
      )} />
      <span className="uppercase tracking-wider">
        {theme === 'cyberpunk' ? 'Cyberpunk' : 'Default'}
      </span>
    </button>
  );
};
