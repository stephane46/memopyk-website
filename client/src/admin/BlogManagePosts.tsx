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
import type { BlogPost } from '@shared/blogTypes';
import { TagManagementModal } from './TagManagementModal';
import { BlogPostListSkeleton } from './skeletons/BlogPostSkeleton';

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Posts</h2>
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
            <BlogPostListSkeleton count={5} />
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

