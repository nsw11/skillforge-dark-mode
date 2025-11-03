export interface SkillNode {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  dependencies: string[]; // IDs of parent nodes (required)
  recommendedDependencies?: string[]; // IDs of recommended parent nodes (optional)
  completed: boolean;
}

export interface SkillTree {
  id: string;
  name: string;
  description: string;
  startingNodeId: string | null;
  nodes: SkillNode[];
  createdAt: string;
  updatedAt: string;
}

export type NodeState = 'completed' | 'available' | 'locked';
