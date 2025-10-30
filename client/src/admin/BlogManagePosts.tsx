import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Globe
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

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  language: string;
  status: 'draft' | 'published';
  description: string;
  is_featured: boolean;
  created_at: string;
  published_at: string | null;
  hero_url: string | null;
};

export function BlogManagePosts() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [languageFilter, setLanguageFilter] = useState<'all' | 'en-US' | 'fr-FR'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);

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

  const posts: BlogPost[] = postsData?.data || [];
  const totalCount = postsData?.total || 0;

  // Publish/Unpublish mutation
  const publishMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: 'draft' | 'published' }) => {
      const updates: any = { status: newStatus };
      if (newStatus === 'published') {
        updates.published_at = new Date().toISOString();
      }
      
      return apiRequest(`/api/admin/blog/posts/${id}`, 'PUT', updates);
    },
    onMutate: async ({ id, newStatus }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/admin/blog/posts'] });
      
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
      toast({
        title: "Success!",
        description: `Post ${variables.newStatus === 'published' ? 'published' : 'unpublished'} successfully`
      });
    },
    onSettled: () => {
      // Refetch to ensure server state is synced
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/blog/posts/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
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

  const handlePublishToggle = (post: BlogPost) => {
    const newStatus = post.status === 'draft' ? 'published' : 'draft';
    publishMutation.mutate({ id: post.id, newStatus });
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-[#D67C4A]" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Blog Posts</h1>
              <p className="text-gray-600 mt-1">View, publish, and manage all blog content</p>
            </div>
          </div>
          <Button 
            onClick={() => window.location.href = '/admin#ai-blog-creator'}
            className="bg-[#D67C4A] hover:bg-[#C06A3A]"
            data-testid="button-create-new-post"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Post
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

        {/* Posts Table */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Blog Posts</CardTitle>
            <CardDescription>Manage and publish your blog content</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#D67C4A]" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No blog posts found</p>
                <p className="text-gray-400 text-sm mt-1">Create your first post to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Language</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Published</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} className="border-b hover:bg-gray-50" data-testid={`row-post-${post.id}`}>
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium text-gray-900">{post.title}</div>
                            <div className="text-sm text-gray-500">/{post.slug}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">
                              {post.language === 'en-US' ? 'English' : 'French'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {post.status === 'published' ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100" data-testid={`badge-status-${post.id}`}>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-600" data-testid={`badge-status-${post.id}`}>
                              <XCircle className="h-3 w-3 mr-1" />
                              Draft
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {formatDate(post.created_at)}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {formatDate(post.published_at)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {post.status === 'published' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                data-testid={`button-view-${post.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePublishToggle(post)}
                              disabled={publishMutation.isPending}
                              className={post.status === 'draft' 
                                ? "text-green-600 hover:text-green-700 hover:bg-green-50" 
                                : "text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                              }
                              data-testid={`button-publish-toggle-${post.id}`}
                            >
                              {post.status === 'draft' ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Publish
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Unpublish
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(post)}
                              disabled={deleteMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid={`button-delete-${post.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{postToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
