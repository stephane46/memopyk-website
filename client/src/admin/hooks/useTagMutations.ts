import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Fetch tags
export function useTagsQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: ['/api/blog-tags'],
    queryFn: async () => {
      const res = await fetch('/api/blog-tags');
      if (!res.ok) throw new Error('Failed to fetch tags');
      return res.json();
    },
    enabled,
  });
}

// Create tag mutation
export function useCreateTag() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; color?: string }) => {
      const response = await apiRequest('/api/admin/blog/tags', 'POST', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tag');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog-tags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/tags'] });
      toast({ title: '✅ Tag Created' });
    },
    onError: (error: Error) => {
      toast({ title: '❌ Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Update tag mutation
export function useUpdateTag() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; color?: string }) => {
      const response = await apiRequest(`/api/admin/blog/tags/${id}`, 'PUT', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update tag');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog-tags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/tags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
      toast({ title: '✅ Tag Updated' });
    },
    onError: (error: Error) => {
      toast({ title: '❌ Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Delete tag mutation
export function useDeleteTag() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/admin/blog/tags/${id}`, 'DELETE');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog-tags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/tags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
      toast({ title: '✅ Tag Deleted' });
    },
    onError: (error: Error) => {
      toast({ title: '❌ Error', description: error.message, variant: 'destructive' });
    },
  });
}
