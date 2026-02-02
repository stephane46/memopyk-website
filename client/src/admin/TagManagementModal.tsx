import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, Pencil } from 'lucide-react';
import type { BlogTag } from '@shared/schema';
import { useTagsQuery, useCreateTag, useUpdateTag, useDeleteTag } from './hooks/useTagMutations';

interface TagManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagManagementModal({ open, onOpenChange }: TagManagementModalProps) {
  const { toast } = useToast();
  const [editingTag, setEditingTag] = useState<BlogTag | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [editedName, setEditedName] = useState('');

  // Use shared hooks
  const { data: tagsData } = useTagsQuery(open);
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const deleteMutation = useDeleteTag();

  const tags: BlogTag[] = tagsData?.data || [];

  const handleCreate = () => {
    if (!newTagName.trim()) {
      toast({ title: '⚠️ Invalid Name', description: 'Tag name cannot be empty', variant: 'destructive' });
      return;
    }
    if (createMutation.isPending) return;
    createMutation.mutate({ name: newTagName.trim() }, {
      onSuccess: () => setNewTagName('')
    });
  };

  const handleUpdate = (tag: BlogTag) => {
    if (!editedName.trim()) {
      toast({ title: '⚠️ Invalid Name', description: 'Tag name cannot be empty', variant: 'destructive' });
      return;
    }
    if (updateMutation.isPending) return;
    updateMutation.mutate({ id: tag.id, name: editedName.trim() }, {
      onSuccess: () => {
        setEditingTag(null);
        setEditedName('');
      }
    });
  };

  const handleDelete = (tag: BlogTag) => {
    if (tag.usageCount && tag.usageCount > 0) {
      if (!confirm(`This tag is used in ${tag.usageCount} post${tag.usageCount !== 1 ? 's' : ''}. Delete anyway?`)) {
        return;
      }
    }
    if (deleteMutation.isPending) return;
    deleteMutation.mutate(tag.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Blog Tags</DialogTitle>
          <DialogDescription>
            Create, edit, or delete tags for organizing your blog posts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              data-testid="input-new-tag-name"
            />
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !newTagName.trim()}
              className="bg-[#D67C4A] hover:bg-[#C56B39]"
              data-testid="button-create-tag"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            {tags.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No tags yet. Create one above!</p>
            ) : (
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  data-testid={`tag-row-${tag.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {editingTag?.id === tag.id ? (
                    <>
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color || '#94a3b8' }}
                      />
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(tag);
                          if (e.key === 'Escape') { setEditingTag(null); setEditedName(''); }
                        }}
                        className="flex-1"
                        autoFocus
                        data-testid="input-edit-tag-name"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(tag)}
                        disabled={updateMutation.isPending}
                        className="bg-[#D67C4A] hover:bg-[#C56B39]"
                        data-testid="button-save-tag"
                      >
                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingTag(null); setEditedName(''); }}
                        data-testid="button-cancel-edit"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color || '#94a3b8' }}
                      />
                      <span className="flex-1 font-medium">{tag.name}</span>
                      <span className="text-xs text-gray-500 min-w-[60px] text-right">
                        {tag.usageCount || 0} post{(tag.usageCount || 0) !== 1 ? 's' : ''}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingTag(tag);
                          setEditedName(tag.name);
                        }}
                        data-testid={`button-edit-${tag.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(tag)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${tag.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
