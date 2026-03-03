import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, LogOut, Upload } from 'lucide-react';
import { SkillTree } from '@/types/skillTree';
import { SkillTreeCard } from '@/components/SkillTreeCard';
import { useNavigate } from 'react-router-dom';
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

const Home = () => {
  const [trees, setTrees] = useState<SkillTree[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTreeName, setNewTreeName] = useState('');
  const [newTreeDescription, setNewTreeDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadTrees();
    }
  }, [user]);

  const loadTrees = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Load skill trees from Supabase
      const { data: treesData, error: treesError } = await supabase
        .from('skill_trees')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (treesError) throw treesError;

      // Load skill nodes for each tree
      const { data: nodesData, error: nodesError } = await supabase
        .from('skill_nodes')
        .select('*')
        .eq('user_id', user.id);

      if (nodesError) throw nodesError;

      // Map trees with their nodes
      const treesWithNodes: SkillTree[] = (treesData || []).map((tree) => ({
        id: tree.id,
        name: tree.name,
        description: tree.description || '',
        startingNodeId: tree.starting_node_id,
        nodes: (nodesData || [])
          .filter((node) => node.tree_id === tree.id)
          .map((node) => ({
            id: node.id,
            title: node.title,
            description: node.description || '',
            x: node.x,
            y: node.y,
            dependencies: node.required_dependencies || [],
            recommendedDependencies: node.recommended_dependencies || [],
            completed: node.is_completed,
          })),
        createdAt: tree.created_at,
        updatedAt: tree.updated_at,
      }));

      setTrees(treesWithNodes);
    } catch (error) {
      console.error('Error loading trees:', error);
      toast.error('Failed to load skill trees');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewTree = async () => {
    if (!newTreeName.trim()) {
      toast.error('Please enter a name for your skill tree');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to create a skill tree');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('skill_trees')
        .insert({
          name: newTreeName,
          description: newTreeDescription || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setIsDialogOpen(false);
      setNewTreeName('');
      setNewTreeDescription('');
      toast.success('Skill tree created!');
      navigate(`/tree/${data.id}`);
    } catch (error) {
      console.error('Error creating tree:', error);
      toast.error('Failed to create skill tree');
    }
  };

  const deleteTree = async (id: string) => {
    try {
      // Delete nodes first
      const { error: nodesError } = await supabase
        .from('skill_nodes')
        .delete()
        .eq('tree_id', id);

      if (nodesError) throw nodesError;

      // Then delete tree
      const { error: treeError } = await supabase
        .from('skill_trees')
        .delete()
        .eq('id', id);

      if (treeError) throw treeError;

      setTrees(trees.filter((t) => t.id !== id));
      toast.success('Skill tree deleted');
    } catch (error) {
      console.error('Error deleting tree:', error);
      toast.error('Failed to delete skill tree');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const importFromLocalStorage = async () => {
    if (!user) return;

    setIsImporting(true);
    try {
      const foundTrees: Array<{ name: string; description?: string; startingNodeId?: string | null; nodes: Array<{ id: string; title: string; description?: string; x: number; y: number; dependencies?: string[]; recommendedDependencies?: string[]; completed?: boolean }> }> = [];

      // Scan all localStorage keys
      const keysToCheck = ['skillTrees', 'skill-trees', 'skill_trees', 'trees'];
      const checkedKeys = new Set<string>();

      // Check known keys first
      for (const key of keysToCheck) {
        checkedKeys.add(key);
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            if (item && typeof item === 'object' && item.name && Array.isArray(item.nodes)) {
              foundTrees.push(item);
            }
          }
        } catch { /* skip invalid JSON */ }
      }

      // Scan all other keys for skill tree shaped data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || checkedKeys.has(key)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            if (item && typeof item === 'object' && item.name && Array.isArray(item.nodes) && item.nodes.length > 0 && item.nodes[0].title) {
              foundTrees.push(item);
            }
          }
        } catch { /* skip */ }
      }

      if (foundTrees.length === 0) {
        toast.info('No local skill trees found in browser storage');
        return;
      }

      let importedCount = 0;

      for (const tree of foundTrees) {
        try {
          // Insert the tree
          const { data: newTree, error: treeError } = await supabase
            .from('skill_trees')
            .insert({
              name: tree.name,
              description: tree.description || null,
              user_id: user.id,
            })
            .select()
            .single();

          if (treeError || !newTree) throw treeError;

          // Build ID mapping and insert nodes
          const idMap = new Map<string, string>();

          if (tree.nodes.length > 0) {
            // First pass: insert nodes without dependencies to get new IDs
            for (const node of tree.nodes) {
              const { data: newNode, error: nodeError } = await supabase
                .from('skill_nodes')
                .insert({
                  tree_id: newTree.id,
                  user_id: user.id,
                  title: node.title,
                  description: node.description || null,
                  x: node.x || 0,
                  y: node.y || 0,
                  is_completed: node.completed || false,
                  required_dependencies: [],
                  recommended_dependencies: [],
                })
                .select()
                .single();

              if (nodeError || !newNode) throw nodeError;
              idMap.set(node.id, newNode.id);
            }

            // Second pass: update dependencies with remapped IDs
            for (const node of tree.nodes) {
              const newNodeId = idMap.get(node.id);
              if (!newNodeId) continue;

              const remappedDeps = (node.dependencies || [])
                .map((d: string) => idMap.get(d))
                .filter(Boolean) as string[];
              const remappedRecDeps = (node.recommendedDependencies || [])
                .map((d: string) => idMap.get(d))
                .filter(Boolean) as string[];

              if (remappedDeps.length > 0 || remappedRecDeps.length > 0) {
                await supabase
                  .from('skill_nodes')
                  .update({
                    required_dependencies: remappedDeps,
                    recommended_dependencies: remappedRecDeps,
                  })
                  .eq('id', newNodeId);
              }
            }

            // Update starting node ID
            if (tree.startingNodeId && idMap.has(tree.startingNodeId)) {
              await supabase
                .from('skill_trees')
                .update({ starting_node_id: idMap.get(tree.startingNodeId) })
                .eq('id', newTree.id);
            }
          }

          importedCount++;
        } catch (error) {
          console.error('Error importing tree:', tree.name, error);
        }
      }

      if (importedCount > 0) {
        toast.success(`Imported ${importedCount} skill tree${importedCount > 1 ? 's' : ''} from local storage`);
        await loadTrees();
      } else {
        toast.error('Failed to import any skill trees');
      }
    } catch (error) {
      console.error('Error during import:', error);
      toast.error('Failed to import from local storage');
    } finally {
      setIsImporting(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Skill Tree
            </h1>
            <p className="text-muted-foreground mt-2">
              Create and manage your custom skill progression systems
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => setIsDialogOpen(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              New Skill Tree
            </Button>
            <Button variant="secondary" size="lg" onClick={importFromLocalStorage} disabled={isImporting}>
              <Upload className="h-5 w-5 mr-2" />
              {isImporting ? 'Importing...' : 'Import from Local Storage'}
            </Button>
            <Button variant="outline" size="lg" onClick={handleSignOut}>
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {trees.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-semibold mb-4">No skill trees yet</h2>
              <p className="text-muted-foreground mb-6">
                Create your first skill tree to start building custom progression systems
              </p>
              <Button onClick={() => setIsDialogOpen(true)} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Tree
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trees.map((tree) => (
              <SkillTreeCard key={tree.id} tree={tree} onDelete={deleteTree} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Skill Tree</DialogTitle>
            <DialogDescription>
              Give your skill tree a name and description to get started
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Programming Skills, Fitness Goals"
                value={newTreeName}
                onChange={(e) => setNewTreeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this skill tree is for..."
                value={newTreeDescription}
                onChange={(e) => setNewTreeDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createNewTree}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
