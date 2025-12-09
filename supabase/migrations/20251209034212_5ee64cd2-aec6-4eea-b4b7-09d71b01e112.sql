-- Create skill_trees table
CREATE TABLE public.skill_trees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  starting_node_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create skill_nodes table
CREATE TABLE public.skill_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tree_id UUID NOT NULL REFERENCES public.skill_trees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  required_dependencies UUID[] DEFAULT '{}',
  recommended_dependencies UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skill_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_nodes ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth required for now)
CREATE POLICY "Anyone can view skill trees" ON public.skill_trees FOR SELECT USING (true);
CREATE POLICY "Anyone can create skill trees" ON public.skill_trees FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update skill trees" ON public.skill_trees FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete skill trees" ON public.skill_trees FOR DELETE USING (true);

CREATE POLICY "Anyone can view skill nodes" ON public.skill_nodes FOR SELECT USING (true);
CREATE POLICY "Anyone can create skill nodes" ON public.skill_nodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update skill nodes" ON public.skill_nodes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete skill nodes" ON public.skill_nodes FOR DELETE USING (true);

-- Create indexes
CREATE INDEX idx_skill_nodes_tree_id ON public.skill_nodes(tree_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_skill_trees_updated_at
  BEFORE UPDATE ON public.skill_trees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skill_nodes_updated_at
  BEFORE UPDATE ON public.skill_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();