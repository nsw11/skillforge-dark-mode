import { SkillNode, NodeState } from '@/types/skillTree';
import { cn } from '@/lib/utils';
import { Check, Lock } from 'lucide-react';
import { useState } from 'react';

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
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditMode || !onPositionChange) return;
    
    e.stopPropagation();
    setIsDragging(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !onPositionChange) return;
    
    const container = e.currentTarget.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    
    onPositionChange(node.id, Math.max(0, x), Math.max(0, y));
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      onClick();
    }
  };

  const getNodeClasses = () => {
    const baseClasses = 'absolute w-32 h-32 rounded-lg border-2 flex flex-col items-center justify-center p-3 transition-all duration-300';
    
    const cursorClass = isEditMode && onPositionChange 
      ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') 
      : state === 'locked' 
        ? 'cursor-not-allowed' 
        : 'cursor-pointer';
    
    if (state === 'completed') {
      return cn(
        baseClasses,
        cursorClass,
        'bg-node-completed/20 border-node-completed hover:bg-node-completed/30',
        !isDragging && 'hover:scale-105',
        'shadow-[0_0_20px_rgba(96,165,250,0.3)]'
      );
    }
    
    if (state === 'available') {
      return cn(
        baseClasses,
        cursorClass,
        'bg-node-available/20 border-node-available hover:bg-node-available/30',
        !isDragging && 'hover:scale-105',
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
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
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
