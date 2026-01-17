import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Edit3, Check, Trash2, Grid3x3, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SkillTree, SkillNode } from '@/types/skillTree';
import { SkillNodeComponent } from '@/components/SkillNodeComponent';
import { ConnectionLine } from '@/components/ConnectionLine';
import { getNodeState, canCompleteNode } from '@/utils/skillTreeUtils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const SkillTreeEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tree, setTree] = useState<SkillTree | null>(null);
  const [isEditMode, setIsEditMode] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [connectionDragPos, setConnectionDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeDescription, setNodeDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [newNodePosition, setNewNodePosition] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      loadTree();
    }
  }, [user, id]);

  const loadTree = async () => {
    if (!user || !id) return;

    setIsLoading(true);
    try {
      // Load tree
      const { data: treeData, error: treeError } = await supabase
        .from('skill_trees')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (treeError) throw treeError;

      if (!treeData) {
        toast.error('Skill tree not found');
        navigate('/');
        return;
      }

      // Load nodes for this tree
      const { data: nodesData, error: nodesError } = await supabase
        .from('skill_nodes')
        .select('*')
        .eq('tree_id', id)
        .eq('user_id', user.id);

      if (nodesError) throw nodesError;

      const loadedTree: SkillTree = {
        id: treeData.id,
        name: treeData.name,
        description: treeData.description || '',
        startingNodeId: treeData.starting_node_id,
        nodes: (nodesData || []).map((node) => ({
          id: node.id,
          title: node.title,
          description: node.description || '',
          x: node.x,
          y: node.y,
          dependencies: node.required_dependencies || [],
          recommendedDependencies: node.recommended_dependencies || [],
          completed: node.is_completed,
        })),
        createdAt: treeData.created_at,
        updatedAt: treeData.updated_at,
      };

      setTree(loadedTree);
    } catch (error) {
      console.error('Error loading tree:', error);
      toast.error('Failed to load skill tree');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const saveTree = async (updatedTree: SkillTree) => {
    if (!user) return;

    try {
      // Update tree metadata
      const { error: treeError } = await supabase
        .from('skill_trees')
        .update({
          starting_node_id: updatedTree.startingNodeId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedTree.id)
        .eq('user_id', user.id);

      if (treeError) throw treeError;

      // Sync nodes - this is a simple approach that updates all nodes
      for (const node of updatedTree.nodes) {
        const { error: nodeError } = await supabase
          .from('skill_nodes')
          .upsert({
            id: node.id,
            tree_id: updatedTree.id,
            user_id: user.id,
            title: node.title,
            description: node.description || null,
            x: node.x,
            y: node.y,
            required_dependencies: node.dependencies,
            recommended_dependencies: node.recommendedDependencies || [],
            is_completed: node.completed,
          });

        if (nodeError) throw nodeError;
      }

      setTree(updatedTree);
    } catch (error) {
      console.error('Error saving tree:', error);
      toast.error('Failed to save changes');
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode || !tree || isDragging) return;
    setSelectedNode(null);
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode || !tree || isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setNewNodePosition({ x, y });
    setIsNodeDialogOpen(true);
  };

  const createNode = async () => {
    if (!tree || !nodeTitle.trim() || !user) {
      toast.error('Please enter a node title');
      return;
    }

    const newNodeId = crypto.randomUUID();
    const newNode: SkillNode = {
      id: newNodeId,
      title: nodeTitle,
      description: nodeDescription,
      x: newNodePosition?.x ?? 400,
      y: newNodePosition?.y ?? 300,
      dependencies: [],
      recommendedDependencies: [],
      completed: false,
    };

    try {
      // Insert into database
      const { error: nodeError } = await supabase
        .from('skill_nodes')
        .insert({
          id: newNodeId,
          tree_id: tree.id,
          user_id: user.id,
          title: nodeTitle,
          description: nodeDescription || null,
          x: newNodePosition?.x ?? 400,
          y: newNodePosition?.y ?? 300,
          required_dependencies: [],
          recommended_dependencies: [],
          is_completed: false,
        });

      if (nodeError) throw nodeError;

      const updatedTree = {
        ...tree,
        nodes: [...tree.nodes, newNode],
        startingNodeId: tree.startingNodeId || newNodeId,
        updatedAt: new Date().toISOString(),
      };

      // Update starting node if this is the first node
      if (!tree.startingNodeId) {
        await supabase
          .from('skill_trees')
          .update({ starting_node_id: newNodeId })
          .eq('id', tree.id);
      }

      setTree(updatedTree);
      setIsNodeDialogOpen(false);
      setNodeTitle('');
      setNodeDescription('');
      setNewNodePosition(null);
      toast.success('Node created!');
    } catch (error) {
      console.error('Error creating node:', error);
      toast.error('Failed to create node');
    }
  };

  const openEditDialog = (nodeId?: string) => {
    if (!tree) return;
    
    const targetNodeId = nodeId || selectedNode;
    if (!targetNodeId) return;
    
    const node = tree.nodes.find((n) => n.id === targetNodeId);
    if (node) {
      setNodeTitle(node.title);
      setNodeDescription(node.description || '');
      setSelectedNode(targetNodeId);
      setIsEditDialogOpen(true);
    }
  };

  const removeDependency = async (nodeId: string, depId: string, isRecommended: boolean) => {
    if (!tree || !user) return;

    const node = tree.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const updatedDeps = isRecommended
      ? (node.recommendedDependencies || []).filter(id => id !== depId)
      : node.dependencies.filter(id => id !== depId);

    try {
      const { error } = await supabase
        .from('skill_nodes')
        .update(isRecommended 
          ? { recommended_dependencies: updatedDeps }
          : { required_dependencies: updatedDeps }
        )
        .eq('id', nodeId)
        .eq('user_id', user.id);

      if (error) throw error;

      const updatedNodes = tree.nodes.map((n) => {
        if (n.id === nodeId) {
          return isRecommended
            ? { ...n, recommendedDependencies: updatedDeps }
            : { ...n, dependencies: updatedDeps };
        }
        return n;
      });

      setTree({ ...tree, nodes: updatedNodes, updatedAt: new Date().toISOString() });
      toast.success('Dependency removed');
    } catch (error) {
      console.error('Error removing dependency:', error);
      toast.error('Failed to remove dependency');
    }
  };

  const updateNode = async () => {
    if (!tree || !selectedNode || !nodeTitle.trim() || !user) {
      toast.error('Please enter a node title');
      return;
    }

    try {
      const { error } = await supabase
        .from('skill_nodes')
        .update({
          title: nodeTitle,
          description: nodeDescription || null,
        })
        .eq('id', selectedNode)
        .eq('user_id', user.id);

      if (error) throw error;

      const updatedNodes = tree.nodes.map((node) =>
        node.id === selectedNode
          ? { ...node, title: nodeTitle, description: nodeDescription }
          : node
      );

      setTree({ ...tree, nodes: updatedNodes, updatedAt: new Date().toISOString() });
      setIsEditDialogOpen(false);
      setNodeTitle('');
      setNodeDescription('');
      toast.success('Node updated!');
    } catch (error) {
      console.error('Error updating node:', error);
      toast.error('Failed to update node');
    }
  };

  const handleNodeClick = (nodeId: string) => {
    if (!tree) return;

    if (isEditMode) {
      if (connectingFrom) {
        return;
      } else {
        setSelectedNode(nodeId);
      }
    } else {
      // Progress mode - toggle completion
      const node = tree.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      if (canCompleteNode(node, tree.nodes, tree.startingNodeId)) {
        toggleNodeCompletion(nodeId, !node.completed);
      } else if (node.completed) {
        toggleNodeCompletion(nodeId, false);
      }
    }
  };

  const toggleNodeCompletion = async (nodeId: string, completed: boolean) => {
    if (!tree || !user) return;

    try {
      const { error } = await supabase
        .from('skill_nodes')
        .update({ is_completed: completed })
        .eq('id', nodeId)
        .eq('user_id', user.id);

      if (error) throw error;

      const updatedNodes = tree.nodes.map((n) =>
        n.id === nodeId ? { ...n, completed } : n
      );
      setTree({ ...tree, nodes: updatedNodes, updatedAt: new Date().toISOString() });
      toast.success(completed ? 'Node completed!' : 'Node marked incomplete');
    } catch (error) {
      console.error('Error toggling completion:', error);
      toast.error('Failed to update node');
    }
  };

  const handleNodeMouseUp = (nodeId: string) => {
    if (!tree || !isEditMode) return;
    
    if (connectingFrom && connectingFrom !== nodeId) {
      setConnectingTo(nodeId);
    }
  };

  const createConnection = async (isRecommended: boolean) => {
    if (!tree || !connectingFrom || !connectingTo || !user) return;
    
    if (connectingFrom === connectingTo) {
      toast.error('Cannot connect a node to itself');
      return;
    }

    const targetNode = tree.nodes.find((n) => n.id === connectingTo);
    if (!targetNode) return;

    const updatedDeps = isRecommended
      ? [...(targetNode.recommendedDependencies || []), connectingFrom]
      : [...targetNode.dependencies, connectingFrom];

    try {
      const { error } = await supabase
        .from('skill_nodes')
        .update(isRecommended
          ? { recommended_dependencies: updatedDeps }
          : { required_dependencies: updatedDeps }
        )
        .eq('id', connectingTo)
        .eq('user_id', user.id);

      if (error) throw error;

      const updatedNodes = tree.nodes.map((node) => {
        if (node.id === connectingTo) {
          return isRecommended
            ? { ...node, recommendedDependencies: updatedDeps }
            : { ...node, dependencies: updatedDeps };
        }
        return node;
      });

      setTree({ ...tree, nodes: updatedNodes, updatedAt: new Date().toISOString() });
      toast.success(`${isRecommended ? 'Recommended' : 'Required'} dependency added!`);
    } catch (error) {
      console.error('Error creating connection:', error);
      toast.error('Failed to create connection');
    }

    setConnectingFrom(null);
    setConnectingTo(null);
    setConnectionDragPos(null);
  };

  const deleteNode = async () => {
    if (!tree || !selectedNode || !user) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from('skill_nodes')
        .delete()
        .eq('id', selectedNode)
        .eq('user_id', user.id);

      if (error) throw error;

      const updatedNodes = tree.nodes.filter((n) => n.id !== selectedNode);
      const cleanedNodes = updatedNodes.map((node) => ({
        ...node,
        dependencies: node.dependencies.filter((dep) => dep !== selectedNode),
        recommendedDependencies: (node.recommendedDependencies || []).filter((dep) => dep !== selectedNode),
      }));

      // Update dependencies in all affected nodes
      for (const node of cleanedNodes) {
        await supabase
          .from('skill_nodes')
          .update({
            required_dependencies: node.dependencies,
            recommended_dependencies: node.recommendedDependencies || [],
          })
          .eq('id', node.id)
          .eq('user_id', user.id);
      }

      const newStartingNodeId = tree.startingNodeId === selectedNode ? null : tree.startingNodeId;
      
      if (tree.startingNodeId === selectedNode) {
        await supabase
          .from('skill_trees')
          .update({ starting_node_id: null })
          .eq('id', tree.id);
      }

      setTree({
        ...tree,
        nodes: cleanedNodes,
        startingNodeId: newStartingNodeId,
        updatedAt: new Date().toISOString(),
      });
      setSelectedNode(null);
      toast.success('Node deleted');
    } catch (error) {
      console.error('Error deleting node:', error);
      toast.error('Failed to delete node');
    }
  };

  const setAsStartingNode = async () => {
    if (!tree || !selectedNode || !user) return;

    try {
      const { error } = await supabase
        .from('skill_trees')
        .update({ starting_node_id: selectedNode })
        .eq('id', tree.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTree({
        ...tree,
        startingNodeId: selectedNode,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Starting node updated!');
    } catch (error) {
      console.error('Error setting starting node:', error);
      toast.error('Failed to update starting node');
    }
  };

  const handlePositionChange = (nodeId: string, x: number, y: number) => {
    if (!tree) return;
    
    const updatedNodes = tree.nodes.map((node) =>
      node.id === nodeId ? { ...node, x, y } : node
    );
    
    setTree({ ...tree, nodes: updatedNodes });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tree) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (connectingFrom) {
      setConnectionDragPos({ x, y });
    }
    
    if (draggingNodeId) {
      setIsDragging(true);
      handlePositionChange(draggingNodeId, Math.max(0, x - dragOffset.x), Math.max(0, y - dragOffset.y));
    }
  };

  const handleCanvasMouseUp = async () => {
    if (!tree || !user) return;
    
    if (draggingNodeId) {
      // Save position to database
      const node = tree.nodes.find((n) => n.id === draggingNodeId);
      if (node) {
        await supabase
          .from('skill_nodes')
          .update({ x: node.x, y: node.y })
          .eq('id', draggingNodeId)
          .eq('user_id', user.id);
      }
      setDraggingNodeId(null);
      setTimeout(() => setIsDragging(false), 100);
    }
    
    if (connectingFrom && !connectingTo) {
      setTimeout(() => {
        if (connectingFrom && !connectingTo) {
          setConnectingFrom(null);
          setConnectionDragPos(null);
        }
      }, 50);
    }
  };

  const handleConnectionDragStart = (nodeId: string) => {
    setConnectingFrom(nodeId);
    setConnectingTo(null);
  };

  const handleNodeDragStart = (nodeId: string, offsetX: number, offsetY: number) => {
    setDraggingNodeId(nodeId);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleNodeDragEnd = async () => {
    if (tree && draggingNodeId && user) {
      const node = tree.nodes.find((n) => n.id === draggingNodeId);
      if (node) {
        await supabase
          .from('skill_nodes')
          .update({ x: node.x, y: node.y })
          .eq('id', draggingNodeId)
          .eq('user_id', user.id);
      }
    }
    setDraggingNodeId(null);
    setTimeout(() => setIsDragging(false), 100);
  };

  const autoBalanceNodes = async () => {
    if (!tree || tree.nodes.length === 0 || !user) return;

    const padding = 200;
    const columns = Math.ceil(Math.sqrt(tree.nodes.length));
    const spacing = 250;

    const updatedNodes = tree.nodes.map((node, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      return {
        ...node,
        x: padding + col * spacing,
        y: padding + row * spacing,
      };
    });

    try {
      for (const node of updatedNodes) {
        await supabase
          .from('skill_nodes')
          .update({ x: node.x, y: node.y })
          .eq('id', node.id)
          .eq('user_id', user.id);
      }

      setTree({ ...tree, nodes: updatedNodes, updatedAt: new Date().toISOString() });
      toast.success('Nodes balanced!');
    } catch (error) {
      console.error('Error balancing nodes:', error);
      toast.error('Failed to balance nodes');
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Loading skill tree...</h2>
          <p className="text-muted-foreground">If this persists, the tree may not exist.</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{tree.name}</h1>
                <p className="text-sm text-muted-foreground">{tree.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode && (
                <>
                  <Button onClick={() => setIsNodeDialogOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Node
                  </Button>
                  <Button onClick={autoBalanceNodes} variant="outline" size="sm">
                    <Grid3x3 className="h-4 w-4 mr-2" />
                    Auto-Balance
                  </Button>
                  {selectedNode && (
                    <>
                      <Button onClick={() => openEditDialog()} variant="outline" size="sm">
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button onClick={setAsStartingNode} variant="outline" size="sm">
                        Set as Start
                      </Button>
                      <Button onClick={deleteNode} variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </>
              )}
              <Button
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  setSelectedNode(null);
                  setConnectingFrom(null);
                  setConnectingTo(null);
                  setConnectionDragPos(null);
                }}
                variant={isEditMode ? 'default' : 'outline'}
                size="sm"
              >
                {isEditMode ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Progress Mode
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Mode
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        <ScrollArea className="flex-1">
          <div
            className="relative min-w-[2000px] min-h-[2000px] bg-background/50"
            onClick={isEditMode ? handleCanvasClick : undefined}
            onDoubleClick={isEditMode ? handleCanvasDoubleClick : undefined}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="currentColor" />
              </marker>
            </defs>
            
            {tree.nodes.map((node) => (
              <>
                {/* Required dependencies */}
                {node.dependencies.map((depId) => {
                  const depNode = tree.nodes.find((n) => n.id === depId);
                  if (!depNode) return null;
                  return (
                    <ConnectionLine
                      key={`req-${depId}-${node.id}`}
                      from={depNode}
                      to={node}
                      isCompleted={depNode.completed && node.completed}
                      isRecommended={false}
                    />
                  );
                })}
                {/* Recommended dependencies */}
                {(node.recommendedDependencies || []).map((depId) => {
                  const depNode = tree.nodes.find((n) => n.id === depId);
                  if (!depNode) return null;
                  return (
                    <ConnectionLine
                      key={`rec-${depId}-${node.id}`}
                      from={depNode}
                      to={node}
                      isCompleted={depNode.completed && node.completed}
                      isRecommended={true}
                    />
                  );
                })}
              </>
            ))}
            
            {/* Connection drag line */}
            {connectingFrom && connectionDragPos && (() => {
              const fromNode = tree.nodes.find((n) => n.id === connectingFrom);
              if (!fromNode) return null;
              return (
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={connectionDragPos.x}
                  y2={connectionDragPos.y}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  markerEnd="url(#arrowhead)"
                  className="text-primary"
                />
              );
            })()}
          </svg>

          {tree.nodes.map((node) => {
            const state = getNodeState(node, tree.nodes, tree.startingNodeId);
            return (
              <SkillNodeComponent
                key={node.id}
                node={node}
                state={state}
                isStartingNode={tree.startingNodeId === node.id}
                onClick={() => handleNodeClick(node.id)}
                onDoubleClick={() => openEditDialog(node.id)}
                onMouseUp={() => handleNodeMouseUp(node.id)}
                isEditMode={isEditMode}
                isSelected={selectedNode === node.id}
                onPositionChange={handlePositionChange}
                onDragStart={handleNodeDragStart}
                onDragEnd={handleNodeDragEnd}
                onConnectionDragStart={handleConnectionDragStart}
                isDragging={draggingNodeId === node.id}
              />
            );
          })}
          </div>
        </ScrollArea>

        {/* Connection Type Dropdown */}
        {connectingTo && connectingFrom && (
          <DropdownMenu open={true} onOpenChange={(open) => {
            if (!open) {
              setConnectingFrom(null);
              setConnectingTo(null);
              setConnectionDragPos(null);
            }
          }}>
            <DropdownMenuTrigger asChild>
              <div className="absolute" style={{ 
                left: connectionDragPos?.x || 0, 
                top: connectionDragPos?.y || 0 
              }} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => createConnection(false)}>
                Required (solid arrow)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createConnection(true)}>
                Recommended (dotted arrow)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Side Panel for Selected Node */}
        {selectedNode && tree && !connectingFrom && (
          <div className="w-80 border-l border-border bg-card p-6 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {tree.nodes.find((n) => n.id === selectedNode)?.title}
                </h3>
                {tree.startingNodeId === selectedNode && (
                  <span className="inline-block px-2 py-1 text-xs font-semibold bg-primary/20 text-primary rounded mb-2">
                    Starting Node
                  </span>
                )}
              </div>

              {tree.nodes.find((n) => n.id === selectedNode)?.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p className="text-sm">
                    {tree.nodes.find((n) => n.id === selectedNode)?.description}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Dependencies</h4>
                {(() => {
                  const node = tree.nodes.find((n) => n.id === selectedNode);
                  const requiredDeps = node?.dependencies || [];
                  const recommendedDeps = node?.recommendedDependencies || [];
                  
                  if (requiredDeps.length === 0 && recommendedDeps.length === 0) {
                    return <p className="text-sm text-muted-foreground">No dependencies</p>;
                  }
                  
                  return (
                    <div className="space-y-2">
                      {requiredDeps.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">Required:</p>
                          <ul className="space-y-1">
                            {requiredDeps.map((depId) => {
                              const depNode = tree.nodes.find((n) => n.id === depId);
                              return depNode ? (
                                <li key={depId} className="text-sm pl-2 border-l-2 border-primary">
                                  {depNode.title}
                                </li>
                              ) : null;
                            })}
                          </ul>
                        </div>
                      )}
                      {recommendedDeps.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">Recommended:</p>
                          <ul className="space-y-1">
                            {recommendedDeps.map((depId) => {
                              const depNode = tree.nodes.find((n) => n.id === depId);
                              return depNode ? (
                                <li key={depId} className="text-sm pl-2 border-l-2 border-dashed border-muted-foreground">
                                  {depNode.title}
                                </li>
                              ) : null;
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                <p className="text-sm">
                  {tree.nodes.find((n) => n.id === selectedNode)?.completed
                    ? 'Completed ✓'
                    : 'Not completed'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isNodeDialogOpen} onOpenChange={setIsNodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Node</DialogTitle>
            <DialogDescription>Add a new skill to your tree</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., React Basics"
                value={nodeTitle}
                onChange={(e) => setNodeTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-description">Description</Label>
              <Textarea
                id="node-description"
                placeholder="What does this skill involve?"
                value={nodeDescription}
                onChange={(e) => setNodeDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNodeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createNode}>Create Node</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
            <DialogDescription>Update the node details and manage dependencies</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="e.g., React Basics"
                value={nodeTitle}
                onChange={(e) => setNodeTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="What does this skill involve?"
                value={nodeDescription}
                onChange={(e) => setNodeDescription(e.target.value)}
                rows={4}
              />
            </div>
            
            {/* Dependencies Section */}
            {selectedNode && tree && (() => {
              const node = tree.nodes.find((n) => n.id === selectedNode);
              const requiredDeps = node?.dependencies || [];
              const recommendedDeps = node?.recommendedDependencies || [];
              
              if (requiredDeps.length === 0 && recommendedDeps.length === 0) {
                return (
                  <div className="space-y-2">
                    <Label>Dependencies</Label>
                    <p className="text-sm text-muted-foreground">No dependencies. Drag from a node's link icon to add one.</p>
                  </div>
                );
              }
              
              return (
                <div className="space-y-3">
                  <Label>Dependencies</Label>
                  {requiredDeps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Required:</p>
                      <div className="space-y-1">
                        {requiredDeps.map((depId) => {
                          const depNode = tree.nodes.find((n) => n.id === depId);
                          return depNode ? (
                            <div key={depId} className="flex items-center justify-between px-3 py-2 bg-secondary rounded border-l-2 border-primary">
                              <span className="text-sm">{depNode.title}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => removeDependency(selectedNode, depId, false)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                  {recommendedDeps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Recommended:</p>
                      <div className="space-y-1">
                        {recommendedDeps.map((depId) => {
                          const depNode = tree.nodes.find((n) => n.id === depId);
                          return depNode ? (
                            <div key={depId} className="flex items-center justify-between px-3 py-2 bg-secondary rounded border-l-2 border-dashed border-muted-foreground">
                              <span className="text-sm">{depNode.title}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => removeDependency(selectedNode, depId, true)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateNode}>Update Node</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SkillTreeEditor;
