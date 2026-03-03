

## Import Trees from Local Storage

Since the app previously stored skill trees in localStorage before the cloud migration, we'll add a button that scans localStorage for any remaining tree data and uploads it to the database.

### What will happen

1. **Add an "Import from Local Storage" button** on the Home page, shown alongside the existing action buttons
2. The button will scan localStorage for keys matching common patterns (e.g., `skillTrees`, `skill-trees`, `skill_trees`, or any key containing skill tree JSON data)
3. For each tree found, it will:
   - Create a new `skill_trees` row tied to the logged-in user
   - Create `skill_nodes` rows for each node, remapping old IDs to new UUIDs
   - Update dependency references to use the new UUIDs
4. Show a success/failure toast with the count of imported trees
5. Optionally offer to clear the localStorage data after successful import

### Technical Details

**File: `src/pages/Home.tsx`**
- Add `Upload` icon import from lucide-react
- Add `importFromLocalStorage` async function that:
  - Iterates over all localStorage keys looking for JSON data shaped like skill trees (arrays of objects with `name`, `nodes`, etc.)
  - Also checks common key names: `skillTrees`, `skill-trees`, `trees`
  - For each valid tree found, inserts into `skill_trees` table with `user_id`
  - For each node in the tree, generates a new UUID mapping, inserts into `skill_nodes` with remapped dependency IDs
  - Calls `loadTrees()` to refresh the list
- Add the import button in the header action buttons area (between "New Skill Tree" and "Sign Out")
- Add `isImporting` loading state to disable button during import

**ID Remapping Logic:**
Since old localStorage trees used their own IDs (possibly not UUIDs), we need to:
1. Let Supabase generate new UUIDs for each tree and node
2. Build a mapping of `oldId -> newId`
3. Remap `dependencies` and `recommendedDependencies` arrays using this mapping
4. Remap `startingNodeId` on the tree

**Edge cases handled:**
- No localStorage data found -- show info toast "No local skill trees found"
- Partial/corrupted data -- skip invalid entries and report count
- Duplicate imports -- no deduplication (user can delete duplicates manually)
