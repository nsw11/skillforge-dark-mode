import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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

const Home = () => {
  const [trees, setTrees] = useState<SkillTree[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTreeName, setNewTreeName] = useState('');
  const [newTreeDescription, setNewTreeDescription] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const savedTrees = localStorage.getItem('skillTrees');
    if (savedTrees) {
      setTrees(JSON.parse(savedTrees));
    }
  }, []);

  const saveTrees = (updatedTrees: SkillTree[]) => {
    localStorage.setItem('skillTrees', JSON.stringify(updatedTrees));
    setTrees(updatedTrees);
  };

  const createNewTree = () => {
    if (!newTreeName.trim()) {
      toast.error('Please enter a name for your skill tree');
      return;
    }

    const newTree: SkillTree = {
      id: crypto.randomUUID(),
      name: newTreeName,
      description: newTreeDescription,
      startingNodeId: null,
      nodes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedTrees = [...trees, newTree];
    saveTrees(updatedTrees);
    setIsDialogOpen(false);
    setNewTreeName('');
    setNewTreeDescription('');
    toast.success('Skill tree created!');
    navigate(`/tree/${newTree.id}`);
  };

  const deleteTree = (id: string) => {
    const updatedTrees = trees.filter((t) => t.id !== id);
    saveTrees(updatedTrees);
    toast.success('Skill tree deleted');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Skill Tree Builder
            </h1>
            <p className="text-muted-foreground mt-2">
              Create and manage your custom skill progression systems
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            New Skill Tree
          </Button>
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
