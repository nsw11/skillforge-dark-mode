import { SkillNode, NodeState } from '@/types/skillTree';

export const getNodeState = (
  node: SkillNode,
  allNodes: SkillNode[],
  startingNodeId: string | null
): NodeState => {
  if (node.completed) return 'completed';

  // If this is the starting node, it's always available
  if (startingNodeId && node.id === startingNodeId) return 'available';

  // If no dependencies, check if it's the starting node or if there's no starting node yet
  if (node.dependencies.length === 0) {
    return startingNodeId ? 'locked' : 'available';
  }

  // Check if all dependencies are completed
  const allDependenciesCompleted = node.dependencies.every((depId) => {
    const depNode = allNodes.find((n) => n.id === depId);
    return depNode?.completed;
  });

  return allDependenciesCompleted ? 'available' : 'locked';
};

export const canCompleteNode = (
  node: SkillNode,
  allNodes: SkillNode[],
  startingNodeId: string | null
): boolean => {
  const state = getNodeState(node, allNodes, startingNodeId);
  return state === 'available';
};
