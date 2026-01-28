import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Eye,
  Loader2,
  Calendar,
  Globe,
  Languages,
  Pencil,
  FileText,
  X,
  Target,
  Tag as TagIcon,
  ChevronRight
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BlogTag } from '@shared/schema';

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  language: string;
  status: 'draft' | 'in_review' | 'published';
  description: string;
  is_featured: boolean;
  created_at: string;
  published_at: string | null;
  hero_url: string | null;
  source_topic_id: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[] | null;
};

export function BlogManagePosts() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'in_review' | 'published'>('all');
  const [languageFilter, setLanguageFilter] = useState<'all' | 'en-US' | 'fr-FR'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [filterKeyword, setFilterKeyword] = useState<string | null>(null);
  const [tagManagementOpen, setTagManagementOpen] = useState(false);

  // Check URL params for topic filtering
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topicParam = params.get('filterTopic');
    if (topicParam) {
      setFilterTopic(topicParam);
    }
  }, []);

  // Build query params
  const queryParams = new URLSearchParams();
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);
  if (languageFilter !== 'all') queryParams.set('language', languageFilter);

  // Fetch blog posts
  const { data: postsData, isLoading } = useQuery({
    queryKey: ['/api/admin/blog/posts', statusFilter, languageFilter],
    queryFn: async () => {
      const url = `/api/admin/blog/posts?${queryParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch blog posts');
      return response.json();
    }
  });

  // Apply client-side filtering (topic and keyword)
  let posts: BlogPost[] = postsData?.data || [];
  if (filterTopic) {
    posts = posts.filter(post => post.source_topic_id === filterTopic);
  }
  if (filterKeyword) {
    posts = posts.filter(post => 
      post.primary_keyword === filterKeyword || 
      (post.secondary_keywords && post.secondary_keywords.includes(filterKeyword))
    );
  }
  const totalCount = posts.length;

  // Update status mutation
  const statusUpdateMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: 'draft' | 'in_review' | 'published' }) => {
      const updates: any = { status: newStatus };
      if (newStatus === 'published') {
        updates.published_at = new Date().toISOString();
      }
      return apiRequest(`/api/admin/blog/posts/${id}`, 'PATCH', updates);
    },
    onMutate: async ({ id, newStatus }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/admin/blog/posts', statusFilter, languageFilter] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['/api/admin/blog/posts', statusFilter, languageFilter]);
      
      // Optimistically update
      queryClient.setQueryData(['/api/admin/blog/posts', statusFilter, languageFilter], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((post: BlogPost) =>
            post.id === id
              ? { 
                  ...post, 
                  status: newStatus,
                  published_at: newStatus === 'published' ? new Date().toISOString() : null
                }
              : post
          )
        };
      });
      
      return { previousData };
    },
    onError: (error: Error, variables, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['/api/admin/blog/posts', statusFilter, languageFilter], context.previousData);
      }
      toast({
        title: "Failed to update post",
        description: error.message,
        variant: "destructive"
      });
    },
    onSuccess: (_, variables) => {
      const statusText = variables.newStatus === 'published' ? 'published' : 
                        variables.newStatus === 'in_review' ? 'marked for review' : 'set to draft';
      toast({
        title: "Success!",
        description: `Post ${statusText} successfully`
      });
    },
    onSettled: () => {
      // Refetch to ensure server state is synced
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blog-tags'] });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/blog/posts/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blog-tags'] });
      toast({
        title: "Success!",
        description: "Post deleted successfully"
      });
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete post",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Translate mutation
  const translateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/blog/posts/${id}/translate`, 'POST');
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blog-tags'] });
      const targetLang = response?.data?.language === 'en-US' ? 'English' : 'French';
      toast({
        title: "Draft created! 📋",
        description: `Duplicate created for ${targetLang} translation. All images are preserved in position. Edit the post and replace the text with your ${targetLang} translation.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create translation draft",
        description: error.message || "Unable to duplicate post.",
        variant: "destructive"
      });
    }
  });

  const handleStatusChange = (post: BlogPost, newStatus: 'draft' | 'in_review' | 'published') => {
    statusUpdateMutation.mutate({ id: post.id, newStatus });
  };

  const handleDeleteClick = (post: BlogPost) => {
    setPostToDelete(post);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (postToDelete) {
      deleteMutation.mutate(postToDelete.id);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not published';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const navigateToTopic = (topicId: string) => {
    console.log('📄 NAVIGATE TO TOPIC CLICKED', { topicId });
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'topics');
    params.set('highlight', topicId);
    params.delete('filterTopic'); // Clear the filter when navigating
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    console.log('🔗 Navigation URL:', newUrl);
    window.location.href = newUrl;
  };

  const clearTopicFilter = () => {
    setFilterTopic(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('filterTopic');
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  const filterByKeyword = (keyword: string) => {
    setFilterKeyword(keyword);
  };

  const clearKeywordFilter = () => {
    setFilterKeyword(null);
  };

  return (
    <div className="space-y-6">

      {/* Header with Manage Tags Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Blog Posts</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and organize your blog content
          </p>
        </div>
        <Button
          onClick={() => setTagManagementOpen(true)}
          variant="outline"
          data-testid="button-manage-tags"
        >
          <TagIcon className="w-4 h-4 mr-2" />
          Manage Tags
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter blog posts by status and language</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Posts</SelectItem>
                  <SelectItem value="draft">Draft Only</SelectItem>
                  <SelectItem value="in_review">In Review Only</SelectItem>
                  <SelectItem value="published">Published Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Language</label>
              <Select value={languageFilter} onValueChange={(val: any) => setLanguageFilter(val)}>
                <SelectTrigger data-testid="select-language-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="en-US">English (en-US)</SelectItem>
                  <SelectItem value="fr-FR">French (fr-FR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Total Results</label>
              <div className="h-10 flex items-center px-3 bg-gray-100 rounded-md font-semibold text-gray-900">
                {totalCount} {totalCount === 1 ? 'post' : 'posts'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Filters */}
      {(filterTopic || filterKeyword) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {filterTopic && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-2">
                    <Target className="h-3 w-3" />
                    Filtered by topic
                    <button onClick={clearTopicFilter} className="ml-1 hover:text-blue-900">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterKeyword && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-2">
                    Keyword: {filterKeyword}
                    <button onClick={clearKeywordFilter} className="ml-1 hover:text-green-900">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearTopicFilter();
                  clearKeywordFilter();
                }}
              >
                Clear all filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts List */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
              <p className="text-gray-500">
                {statusFilter !== 'all' || languageFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first blog post'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {post.title}
                        </h3>
                        
                        {/* Source Topic Link - Next to title */}
                        {post.source_topic_id && (
                          <button
                            onClick={() => navigateToTopic(post.source_topic_id!)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                            data-testid="link-view-source-topic"
                          >
                            <Target className="h-3 w-3" />
                            <span className="group-hover:underline">View source topic</span>
                            <ChevronRight className="h-3 w-3 opacity-50" />
                          </button>
                        )}

                        {post.is_featured && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            Featured
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{post.description}</p>

                      {/* Unified Meta Pills */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Language Badge - First position */}
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {post.language === 'en-US' ? 'EN' : 'FR'}
                        </Badge>

                        {/* Status Pill - Always filled badge */}
                        <Badge
                          className={
                            post.status === 'published'
                              ? 'bg-green-100 text-green-700 border-green-200 px-2.5 py-0.5 text-xs font-medium'
                              : post.status === 'in_review'
                              ? 'bg-amber-100 text-amber-700 border-amber-200 px-2.5 py-0.5 text-xs font-medium'
                              : 'bg-gray-100 text-gray-700 border-gray-200 px-2.5 py-0.5 text-xs font-medium'
                          }
                        >
                          <Calendar className="h-3 w-3 mr-1 inline" />
                          {post.status === 'published' 
                            ? formatDate(post.published_at)
                            : post.status === 'in_review'
                            ? 'In Review'
                            : 'Draft'
                          }
                        </Badge>

                        {/* Primary Keyword Badge - Muted fill, non-interactive */}
                        {post.primary_keyword && (
                          <Badge
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 px-2.5 py-0.5 text-xs font-medium"
                            data-testid="badge-primary-keyword"
                          >
                            <TagIcon className="h-3 w-3 mr-1 inline" />
                            {post.primary_keyword}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={post.status}
                        onValueChange={(val: any) => handleStatusChange(post, val)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="in_review">In Review</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                        title="View post"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => translateMutation.mutate(post.id)}
                        disabled={translateMutation.isPending}
                        title="Duplicate for translation"
                      >
                        {translateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Languages className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const currentPath = window.location.pathname;
                          const langPrefix = currentPath.match(/^\/(en-US|fr-FR)/)?.[0] || '';
                          window.location.href = `${langPrefix}/admin?tab=blog-edit&id=${post.id}`;
                        }}
                        title="Edit post"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(post)}
                        disabled={deleteMutation.isPending}
                        title="Delete post"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{postToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tag Management Modal */}
      <TagManagementModal 
        open={tagManagementOpen}
        onOpenChange={setTagManagementOpen}
      />
    </div>
  );
}

// Tag Management Modal Component
function TagManagementModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [editingTag, setEditingTag] = useState<BlogTag | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [editedName, setEditedName] = useState('');

  // Fetch all tags
  const { data: tagsData } = useQuery({
    queryKey: ['/api/blog-tags'],
    queryFn: async () => {
      const res = await fetch('/api/blog-tags');
      if (!res.ok) throw new Error('Failed to fetch tags');
      return res.json();
    },
    enabled: open,
  });

  const tags: BlogTag[] = tagsData?.data || [];

  // Create tag mutation
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('/api/blog-tags', 'POST', { name });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tag');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog-tags'] });
      setNewTagName('');
      toast({ title: '✅ Tag Created' });
    },
    onError: (error: Error) => {
      toast({ title: '❌ Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update tag mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await apiRequest(`/api/blog-tags/${id}`, 'PATCH', { name });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update tag');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog-tags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
      setEditingTag(null);
      setEditedName('');
      toast({ title: '✅ Tag Updated' });
    },
    onError: (error: Error) => {
      toast({ title: '❌ Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete tag mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/blog-tags/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete tag');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog-tags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
      toast({ title: '✅ Tag Deleted' });
    },
    onError: (error: Error) => {
      toast({ title: '❌ Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreate = () => {
    if (!newTagName.trim()) {
      toast({ title: '⚠️ Invalid Name', description: 'Tag name cannot be empty', variant: 'destructive' });
      return;
    }
    if (createMutation.isPending) return;
    createMutation.mutate(newTagName.trim());
  };

  const handleUpdate = (tag: BlogTag) => {
    if (!editedName.trim()) {
      toast({ title: '⚠️ Invalid Name', description: 'Tag name cannot be empty', variant: 'destructive' });
      return;
    }
    if (updateMutation.isPending) return;
    updateMutation.mutate({ id: tag.id, name: editedName.trim() });
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
