import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { adminFetch } from '@/lib/queryClient';
import { Pencil, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';

/**
 * CreatePostLanding - Choice screen for creating a new blog post
 *
 * Two methods:
 * 1. "Write from scratch" - Creates draft and opens Blog Editor
 * 2. "Generate with AI" - Navigates to AI Creator tab
 */
export function CreatePostLanding() {
  const { toast } = useToast();
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  // Navigate helper
  const navigateTo = (tab: string) => {
    const currentPath = window.location.pathname;
    const langPrefix = currentPath.match(/^\/(en-US|fr-FR)/)?.[0] || '';
    window.location.href = `${langPrefix}/admin?tab=${tab}`;
  };

  // Create new post and navigate to editor (reuses existing API logic)
  const handleWriteFromScratch = async () => {
    setIsCreatingPost(true);
    try {
      const response = await adminFetch('/api/admin/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'en-US' })
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const result = await response.json();
      if (result.success && result.data?.id) {
        // Navigate to editor with new post ID
        const currentPath = window.location.pathname;
        const langPrefix = currentPath.match(/^\/(en-US|fr-FR)/)?.[0] || '';
        window.location.href = `${langPrefix}/admin?tab=blog-edit&id=${result.data.id}`;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create new post',
        variant: 'destructive'
      });
      setIsCreatingPost(false);
    }
  };

  // Navigate to AI Creator tab
  const handleGenerateWithAI = () => {
    navigateTo('ai-creator');
  };

  // Navigate back to Posts (Manual) tab
  const handleBackToPosts = () => {
    navigateTo('blog');
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Create a New Blog Post
      </h1>

      {/* Two Cards Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full mb-8">
        {/* Card 1: Write from Scratch */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:border-[#D67C4A] group"
          onClick={!isCreatingPost ? handleWriteFromScratch : undefined}
          data-testid="card-write-from-scratch"
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 group-hover:bg-orange-50 flex items-center justify-center mb-4 transition-colors">
              {isCreatingPost ? (
                <Loader2 className="h-8 w-8 text-[#D67C4A] animate-spin" />
              ) : (
                <Pencil className="h-8 w-8 text-gray-600 group-hover:text-[#D67C4A] transition-colors" />
              )}
            </div>
            <CardTitle className="text-xl">Write from scratch</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <CardDescription className="text-base">
              Open the editor and start writing
            </CardDescription>
          </CardContent>
        </Card>

        {/* Card 2: Generate with AI */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:border-[#D67C4A] group"
          onClick={handleGenerateWithAI}
          data-testid="card-generate-with-ai"
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 group-hover:bg-orange-50 flex items-center justify-center mb-4 transition-colors">
              <Sparkles className="h-8 w-8 text-gray-600 group-hover:text-[#D67C4A] transition-colors" />
            </div>
            <CardTitle className="text-xl">Generate with AI</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <CardDescription className="text-base">
              Use AI to generate content, then edit
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Back to Posts Link */}
      <Button
        variant="ghost"
        onClick={handleBackToPosts}
        className="text-gray-600 hover:text-gray-900"
        data-testid="button-back-to-posts"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Posts
      </Button>
    </div>
  );
}
