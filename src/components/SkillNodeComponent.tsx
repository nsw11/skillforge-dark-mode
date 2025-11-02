import { SkillNode, NodeState } from '@/types/skillTree';
import { cn } from '@/lib/utils';
import { Check, Lock } from 'lucide-react';

interface SkillNodeComponentProps {
  node: SkillNode;
  state: NodeState;
  isStartingNode: boolean;
  onClick: () => void;
  isEditMode: boolean;
  onPositionChange?: (id: string, x: number, y: number) => void;
  isSelected?: boolean;
}

export const SkillNodeComponent = ({
  node,
  state,
  isStartingNode,
  onClick,
  isEditMode,
  onPositionChange,
  isSelected,
}: SkillNodeComponentProps) => {
  const getNodeClasses = () => {
    const baseClasses = 'absolute w-32 h-32 rounded-lg border-2 flex flex-col items-center justify-center p-3 transition-all duration-300 cursor-pointer';
    
    if (state === 'completed') {
      return cn(
        baseClasses,
        'bg-node-completed/20 border-node-completed hover:bg-node-completed/30 hover:scale-105',
        'shadow-[0_0_20px_rgba(96,165,250,0.3)]'
      );
    }
    
    if (state === 'available') {
      return cn(
        baseClasses,
        'bg-node-available/20 border-node-available hover:bg-node-available/30 hover:scale-105',
        'shadow-[0_0_20px_rgba(45,212,191,0.3)]'
      );
    }
    
    return cn(
      baseClasses,
      'bg-node-locked/10 border-node-locked cursor-not-allowed opacity-50'
    );
  };

  return (
    <div
      className={cn(
        getNodeClasses(),
        isSelected && isEditMode && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={onClick}
    >
      {isStartingNode && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold">
          S
        </div>
      )}
      
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {state === 'completed' && (
          <Check className="h-6 w-6 text-node-completed mb-1" />
        )}
        {state === 'locked' && (
          <Lock className="h-6 w-6 text-node-locked mb-1" />
        )}
        <h4 className="font-semibold text-sm line-clamp-2">{node.title}</h4>
        {node.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {node.description}
          </p>
        )}
      </div>
    </div>
  );
};
