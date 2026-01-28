import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Tag, Loader2, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BlogTag = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  post_count?: number;
};

export function BlogTagManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<BlogTag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#D67C4A');

  // Fetch tags
  const { data: tagsData, isLoading } = useQuery({
    queryKey: ['/api/admin/blog/tags'],
    queryFn: async () => {
      const response = await fetch('/api/admin/blog/tags');
      if (!response.ok) throw new Error('Failed to fetch tags');
      return response.json();
    }
  });

  const tags: BlogTag[] = tagsData?.data || [];

  // Create/update tag mutation
  const saveMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id?: string; name: string; color: string }) => {
      if (id) {
        return apiRequest(`/api/admin/blog/tags/${id}`, 'PUT', { name, color });
      } else {
        return apiRequest('/api/admin/blog/tags', 'POST', { name, color });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/tags'] });
      toast({
        title: "Success!",
        description: editingTag ? "Tag updated successfully" : "Tag created successfully"
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete tag mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/blog/tags/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/tags'] });
      toast({
        title: "Success!",
        description: "Tag deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleOpenDialog = (tag?: BlogTag) => {
    if (tag) {
      setEditingTag(tag);
      setTagName(tag.name);
      setTagColor(tag.color || '#D67C4A');
    } else {
      setEditingTag(null);
      setTagName('');
      setTagColor('#D67C4A');
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTag(null);
    setTagName('');
    setTagColor('#D67C4A');
  };

  const handleSave = () => {
    if (!tagName.trim()) {
      toast({
        title: "Validation error",
        description: "Tag name is required",
        variant: "destructive"
      });
      return;
    }

    saveMutation.mutate({
      id: editingTag?.id,
      name: tagName.trim(),
      color: tagColor
    });
  };

  const handleDelete = (tag: BlogTag) => {
    if (confirm(`Delete tag "${tag.name}"? This will remove it from all posts.`)) {
      deleteMutation.mutate(tag.id);
    }
  };

  const predefinedColors = [
    '#D67C4A', // MEMOPYK Orange
    '#2A4759', // MEMOPYK Dark Blue
    '#89BAD9', // MEMOPYK Sky Blue
    '#10b981', // Green
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f59e0b', // Amber
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Blog Tags</CardTitle>
              <CardDescription>Organize your blog posts with tags</CardDescription>
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-[#D67C4A] hover:bg-[#c16d3f]"
              data-testid="button-create-tag"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Tag
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#D67C4A]" />
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No tags yet</p>
              <p className="text-gray-400 text-sm mt-1">Create your first tag to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="border rounded-lg p-4 hover:border-[#D67C4A] transition-colors"
                  data-testid={`tag-card-${tag.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge 
                      style={{ backgroundColor: tag.color || '#D67C4A' }}
                      className="text-white"
                    >
                      {tag.name}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(tag)}
                        data-testid={`button-edit-${tag.id}`}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tag)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${tag.id}`}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {tag.post_count || 0} {tag.post_count === 1 ? 'post' : 'posts'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {editingTag ? 'Edit Tag' : 'Create New Tag'}
            </DialogTitle>
            <DialogDescription>
              {editingTag ? 'Update tag details' : 'Add a new tag to organize your blog posts'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tagName">Tag Name</Label>
              <Input
                id="tagName"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="e.g., Photography Tips"
                data-testid="input-tag-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Tag Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTagColor(color)}
                    className={`h-10 rounded border-2 ${tagColor === color ? 'border-gray-900' : 'border-gray-200'}`}
                    style={{ backgroundColor: color }}
                    data-testid={`color-${color}`}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={tagColor}
                onChange={(e) => setTagColor(e.target.value)}
                className="w-full h-10"
                data-testid="input-tag-color"
              />
            </div>
            <div className="pt-2">
              <p className="text-sm text-gray-500">Preview:</p>
              <Badge 
                style={{ backgroundColor: tagColor }}
                className="text-white mt-2"
              >
                {tagName || 'Tag Name'}
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-[#D67C4A] hover:bg-[#c16d3f]"
              data-testid="button-save-tag"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingTag ? 'Update Tag' : 'Create Tag'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
