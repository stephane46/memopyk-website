import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Brain, Save, Edit2, X, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminFetch } from '@/lib/queryClient';

interface AIContextEntry {
  id: string;
  key: string;
  title: string;
  content: string;
  category: string;
  sort_order: number;
  updated_at: string;
  updated_by: string | null;
}

export function AIContextManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Fetch all AI context entries
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-context'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/ai-context');
      if (!response.ok) {
        throw new Error('Failed to fetch AI context');
      }
      const json = await response.json();
      return json.data as AIContextEntry[];
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ key, content }: { key: string; content: string }) => {
      const response = await adminFetch(`/api/admin/ai-context/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!response.ok) {
        throw new Error('Failed to update AI context');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-context'] });
      setEditingKey(null);
      setEditContent('');
      toast({
        title: 'Saved!',
        description: 'AI context updated successfully.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleEdit = (entry: AIContextEntry) => {
    setEditingKey(entry.key);
    setEditContent(entry.content);
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditContent('');
  };

  const handleSave = (key: string) => {
    updateMutation.mutate({ key, content: editContent });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group entries by category
  const groupedEntries = (data || []).reduce((acc, entry) => {
    if (!acc[entry.category]) {
      acc[entry.category] = [];
    }
    acc[entry.category].push(entry);
    return acc;
  }, {} as Record<string, AIContextEntry[]>);

  const categoryLabels: Record<string, string> = {
    brand: 'Brand Guidelines',
    translation: 'Translation Rules'
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#D67C4A]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        Failed to load AI context. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="h-8 w-8 text-[#D67C4A]" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Context</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Brand Brain - context injected into all Claude API calls
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-[#D67C4A]/20">
        <CardContent className="pt-6">
          <p className="text-sm text-gray-700">
            These guidelines are automatically included when generating blog content, translations, and other AI-powered features.
            Edit the content to customize how Claude writes for MEMOPYK.
          </p>
        </CardContent>
      </Card>

      {/* Grouped Entries */}
      {Object.entries(groupedEntries).map(([category, entries]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Badge variant="outline" className="text-[#D67C4A] border-[#D67C4A]">
              {categoryLabels[category] || category}
            </Badge>
          </h2>

          <div className="grid gap-4">
            {entries.map((entry) => (
              <Card key={entry.key} className="bg-white dark:bg-gray-800">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{entry.title}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Key: <code className="bg-gray-100 px-1 rounded">{entry.key}</code>
                        {entry.updated_at && (
                          <span className="ml-3">
                            Updated: {formatDate(entry.updated_at)}
                            {entry.updated_by && ` by ${entry.updated_by}`}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    {editingKey !== entry.key && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(entry)}
                        className="shrink-0"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {editingKey === entry.key ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[150px] font-mono text-sm"
                        placeholder="Enter content..."
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancel}
                          disabled={updateMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSave(entry.key)}
                          disabled={updateMutation.isPending}
                          className="bg-[#D67C4A] hover:bg-[#C56B39]"
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <pre className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-mono">
                        {entry.content || <span className="text-gray-400 italic">No content</span>}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* API Endpoint Info */}
      <Card className="bg-gray-50 dark:bg-gray-900 border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Internal API Endpoint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            The full context (brand + published posts) is available at:
          </p>
          <code className="block bg-white dark:bg-gray-800 p-3 rounded border text-sm">
            GET /api/internal/ai-context/full
          </code>
        </CardContent>
      </Card>
    </div>
  );
}
