import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Edit3, Check, Trash2, Grid3x3 } from 'lucide-react';
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

const SkillTreeEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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

  useEffect(() => {
    const savedTrees = localStorage.getItem('skillTrees');
    if (savedTrees) {
      const trees: SkillTree[] = JSON.parse(savedTrees);
      const currentTree = trees.find((t) => t.id === id);
      if (currentTree) {
        setTree(currentTree);
      } else {
        toast.error('Skill tree not found');
        navigate('/');
      }
    }
  }, [id, navigate]);

  const saveTree = (updatedTree: SkillTree) => {
    const savedTrees = localStorage.getItem('skillTrees');
    if (savedTrees) {
      const trees: SkillTree[] = JSON.parse(savedTrees);
      const updatedTrees = trees.map((t) => (t.id === updatedTree.id ? updatedTree : t));
      localStorage.setItem('skillTrees', JSON.stringify(updatedTrees));
      setTree(updatedTree);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only used to deselect nodes, not create them
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

  const createNode = () => {
    if (!tree || !nodeTitle.trim()) {
      toast.error('Please enter a node title');
      return;
    }

    const newNode: SkillNode = {
      id: crypto.randomUUID(),
      title: nodeTitle,
      description: nodeDescription,
      x: newNodePosition?.x ?? 400,
      y: newNodePosition?.y ?? 300,
      dependencies: [],
      recommendedDependencies: [],
      completed: false,
    };

    const updatedTree = {
      ...tree,
      nodes: [...tree.nodes, newNode],
      startingNodeId: tree.startingNodeId || newNode.id,
      updatedAt: new Date().toISOString(),
    };

    saveTree(updatedTree);
    setIsNodeDialogOpen(false);
    setNodeTitle('');
    setNodeDescription('');
    setNewNodePosition(null);
    toast.success('Node created!');
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

  const updateNode = () => {
    if (!tree || !selectedNode || !nodeTitle.trim()) {
      toast.error('Please enter a node title');
      return;
    }

    const updatedNodes = tree.nodes.map((node) =>
      node.id === selectedNode
        ? { ...node, title: nodeTitle, description: nodeDescription }
        : node
    );

    saveTree({ ...tree, nodes: updatedNodes, updatedAt: new Date().toISOString() });
    setIsEditDialogOpen(false);
    setNodeTitle('');
    setNodeDescription('');
    toast.success('Node updated!');
  };

  const handleNodeClick = (nodeId: string) => {
    if (!tree) return;

    if (isEditMode) {
      if (connectingFrom) {
        // Don't handle here, let handleNodeMouseUp handle it
        return;
      } else {
        setSelectedNode(nodeId);
      }
    } else {
      // Progress mode - toggle completion
      const node = tree.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      if (canCompleteNode(node, tree.nodes, tree.startingNodeId)) {
        const updatedNodes = tree.nodes.map((n) =>
          n.id === nodeId ? { ...n, completed: !n.completed } : n
        );
        saveTree({ ...tree, nodes: updatedNodes, updatedAt: new Date().toISOString() });
        toast.success(node.completed ? 'Node marked incomplete' : 'Node completed!');
      } else if (node.completed) {
        const updatedNodes = tree.nodes.map((n) =>
          n.id === nodeId ? { ...n, completed: false } : n
        );
        saveTree({ ...tree, nodes: updatedNodes, updatedAt: new Date().toISOString() });
        toast.success('Node marked incomplete');
      }
    }
  };

  const handleNodeMouseUp = (nodeId: string) => {
    if (!tree || !isEditMode) return;
    
    // Handle connection completion
    if (connectingFrom && connectingFrom !== nodeId) {
      setConnectingTo(nodeId);
    }
  };

  const createConnection = (isRecommended: boolean) => {
    if (!tree || !connectingFrom || !connectingTo) return;
    
    if (connectingFrom === connectingTo) {
      toast.error('Cannot connect a node to itself');
      return;
    }

    const updatedNodes = tree.nodes.map((node) => {
      if (node.id === connectingTo) {
        if (isRecommended) {
          const recommendedDeps = node.recommendedDependencies || [];
          if (!recommendedDeps.includes(connectingFrom)) {
            return { 
              ...node, 
              recommendedDependencies: [...recommendedDeps, connectingFrom] 
            };
          }
        } else {
          if (!node.dependencies.includes(connectingFrom)) {
            return { 
              ...node, 
              dependencies: [...node.dependencies, connectingFrom] 
            };
          }
        }
      }
      return node;
    });

    saveTree({ ...tree, nodes: updatedNodes, updatedAt: new Date().toISOString() });
    toast.success(`${isRecommended ? 'Recommended' : 'Required'} dependency added!`);
    setConnectingFrom(null);
    setConnectingTo(null);
    setConnectionDragPos(null);
  };

  const deleteNode = () => {
    if (!tree || !selectedNode) return;

    const updatedNodes = tree.nodes.filter((n) => n.id !== selectedNode);
    const cleanedNodes = updatedNodes.map((node) => ({
      ...node,
      dependencies: node.dependencies.filter((dep) => dep !== selectedNode),
      recommendedDependencies: (node.recommendedDependencies || []).filter((dep) => dep !== selectedNode),
    }));

    saveTree({
      ...tree,
      nodes: cleanedNodes,
      startingNodeId: tree.startingNodeId === selectedNode ? null : tree.startingNodeId,
      updatedAt: new Date().toISOString(),
    });
    setSelectedNode(null);
    toast.success('Node deleted');
  };

  const setAsStartingNode = () => {
    if (!tree || !selectedNode) return;

    saveTree({
      ...tree,
      startingNodeId: selectedNode,
      updatedAt: new Date().toISOString(),
    });
    toast.success('Starting node updated!');
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
    
    // Update connection drag position
    if (connectingFrom) {
      setConnectionDragPos({ x, y });
    }
    
    // Move the dragging node
    if (draggingNodeId) {
      setIsDragging(true);
      handlePositionChange(draggingNodeId, Math.max(0, x - dragOffset.x), Math.max(0, y - dragOffset.y));
    }
  };

  const handleCanvasMouseUp = () => {
    if (!tree) return;
    
    if (draggingNodeId) {
      saveTree({ ...tree, updatedAt: new Date().toISOString() });
      setDraggingNodeId(null);
      setTimeout(() => setIsDragging(false), 100);
    }
    
    // Cancel connection drag if released on canvas (delay to allow node mouseup to fire first)
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

  const handleNodeDragEnd = () => {
    if (tree && draggingNodeId) {
      saveTree({ ...tree, updatedAt: new Date().toISOString() });
    }
    setDraggingNodeId(null);
    setTimeout(() => setIsDragging(false), 100);
  };

  const autoBalanceNodes = () => {
    if (!tree || tree.nodes.length === 0) return;

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

    saveTree({ ...tree, nodes: updatedNodes, updatedAt: new Date().toISOString() });
    toast.success('Nodes balanced!');
  };

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
            <DialogDescription>Update the node details</DialogDescription>
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
