import { SkillNode } from '@/types/skillTree';

interface ConnectionLineProps {
  from: SkillNode;
  to: SkillNode;
  isCompleted: boolean;
}

export const ConnectionLine = ({ from, to, isCompleted }: ConnectionLineProps) => {
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={isCompleted ? 'hsl(var(--node-completed))' : 'hsl(var(--node-locked))'}
      strokeWidth="2"
      className="transition-all duration-300"
      opacity={isCompleted ? 0.8 : 0.3}
    />
  );
};
