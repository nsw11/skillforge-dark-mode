import { SkillNode } from '@/types/skillTree';

interface ConnectionLineProps {
  from: SkillNode;
  to: SkillNode;
  isCompleted: boolean;
  isRecommended?: boolean;
}

export const ConnectionLine = ({ from, to, isCompleted, isRecommended = false }: ConnectionLineProps) => {
  const markerId = `arrow-${isRecommended ? 'recommended' : 'required'}-${isCompleted ? 'completed' : 'locked'}`;
  
  return (
    <g>
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill={isCompleted ? 'hsl(var(--node-completed))' : 'hsl(var(--node-locked))'}
          />
        </marker>
      </defs>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={isCompleted ? 'hsl(var(--node-completed))' : 'hsl(var(--node-locked))'}
        strokeWidth="2"
        strokeDasharray={isRecommended ? "5,5" : "none"}
        className="transition-all duration-300"
        opacity={isCompleted ? 0.8 : 0.3}
        markerEnd={`url(#${markerId})`}
      />
    </g>
  );
};
