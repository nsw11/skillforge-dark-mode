-- Add user_id column to skill_trees table
ALTER TABLE public.skill_trees 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to skill_nodes table  
ALTER TABLE public.skill_nodes
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing overly permissive RLS policies on skill_trees
DROP POLICY IF EXISTS "Anyone can create skill trees" ON public.skill_trees;
DROP POLICY IF EXISTS "Anyone can delete skill trees" ON public.skill_trees;
DROP POLICY IF EXISTS "Anyone can update skill trees" ON public.skill_trees;
DROP POLICY IF EXISTS "Anyone can view skill trees" ON public.skill_trees;

-- Drop existing overly permissive RLS policies on skill_nodes
DROP POLICY IF EXISTS "Anyone can create skill nodes" ON public.skill_nodes;
DROP POLICY IF EXISTS "Anyone can delete skill nodes" ON public.skill_nodes;
DROP POLICY IF EXISTS "Anyone can update skill nodes" ON public.skill_nodes;
DROP POLICY IF EXISTS "Anyone can view skill nodes" ON public.skill_nodes;

-- Create secure RLS policies for skill_trees (owner-based access)
CREATE POLICY "Users can view their own skill trees"
ON public.skill_trees
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own skill trees"
ON public.skill_trees
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skill trees"
ON public.skill_trees
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skill trees"
ON public.skill_trees
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create secure RLS policies for skill_nodes (owner-based access)
CREATE POLICY "Users can view their own skill nodes"
ON public.skill_nodes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own skill nodes"
ON public.skill_nodes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skill nodes"
ON public.skill_nodes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skill nodes"
ON public.skill_nodes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);