import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Edit3, Check, Trash2, Grid3x3, Link } from 'lucide-react';
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
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeDescription, setNodeDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);

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
    if (!isEditMode || !tree || isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
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
      x: 400,
      y: 300,
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
    toast.success('Node created!');
  };

  const handleNodeClick = (nodeId: string) => {
    if (!tree) return;

    if (isEditMode) {
      if (connectingFrom) {
        if (connectingFrom !== nodeId) {
          setSelectedNode(nodeId);
        } else {
          toast.error('Cannot connect a node to itself');
          setConnectingFrom(null);
        }
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

  const createConnection = (isRecommended: boolean) => {
    if (!tree || !connectingFrom || !selectedNode) return;
    
    if (connectingFrom === selectedNode) {
      toast.error('Cannot connect a node to itself');
      return;
    }

    const updatedNodes = tree.nodes.map((node) => {
      if (node.id === selectedNode) {
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
    
    // Find if any node is being dragged
    const draggingNode = tree.nodes.find(node => {
      const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
      return nodeElement?.getAttribute('data-dragging') === 'true';
    });
    
    if (draggingNode) {
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const nodeElement = document.querySelector(`[data-node-id="${draggingNode.id}"]`);
      const dragOffsetX = parseFloat(nodeElement?.getAttribute('data-drag-offset-x') || '0');
      const dragOffsetY = parseFloat(nodeElement?.getAttribute('data-drag-offset-y') || '0');
      
      handlePositionChange(draggingNode.id, Math.max(0, x - dragOffsetX), Math.max(0, y - dragOffsetY));
    }
  };

  const handleCanvasMouseUp = () => {
    if (!tree || !isDragging) return;
    saveTree({ ...tree, updatedAt: new Date().toISOString() });
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
                  {connectingFrom ? (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm">
                            <Link className="h-4 w-4 mr-2" />
                            Add Dependency
                          </Button>
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
                      <Button onClick={() => setConnectingFrom(null)} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    selectedNode && (
                      <>
                        <Button onClick={() => setConnectingFrom(selectedNode)} size="sm">
                          <Link className="h-4 w-4 mr-2" />
                          Make Child Of...
                        </Button>
                        <Button onClick={setAsStartingNode} variant="outline" size="sm">
                          Set as Start
                        </Button>
                        <Button onClick={deleteNode} variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )
                  )}
                </>
              )}
              <Button
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  setSelectedNode(null);
                  setConnectingFrom(null);
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

      <ScrollArea className="h-[calc(100vh-120px)]">
        <div
          className="relative min-w-[2000px] min-h-[2000px] bg-background/50"
          onClick={isEditMode ? handleCanvasClick : undefined}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
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
                isEditMode={isEditMode}
                isSelected={selectedNode === node.id}
                onPositionChange={handlePositionChange}
                onDragStart={() => {}}
                onDragEnd={() => {}}
              />
            );
          })}
        </div>
      </ScrollArea>

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
    </div>
  );
};

export default SkillTreeEditor;
