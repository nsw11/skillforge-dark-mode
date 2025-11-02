import { SkillTree } from '@/types/skillTree';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SkillTreeCardProps {
  tree: SkillTree;
  onDelete: (id: string) => void;
}

export const SkillTreeCard = ({ tree, onDelete }: SkillTreeCardProps) => {
  const navigate = useNavigate();
  const completedNodes = tree.nodes.filter((n) => n.completed).length;
  const totalNodes = tree.nodes.length;

  return (
    <Card className="hover:border-primary/50 transition-all cursor-pointer group">
      <CardHeader onClick={() => navigate(`/tree/${tree.id}`)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{tree.name}</CardTitle>
            <CardDescription className="mt-2">{tree.description}</CardDescription>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Progress:</span>
            <span className="text-primary font-semibold">
              {completedNodes}/{totalNodes}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/tree/${tree.id}`);
          }}
          className="flex-1"
        >
          <Edit className="h-4 w-4 mr-2" />
          Open
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(tree.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
