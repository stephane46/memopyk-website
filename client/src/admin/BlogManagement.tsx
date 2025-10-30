import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { BookOpen, Sparkles, FileText } from 'lucide-react';
import { BlogAICreator } from './BlogAICreator';
import { BlogManagePosts } from './BlogManagePosts';

export function BlogManagement() {
  const [activeTab, setActiveTab] = useState('manage');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-8 w-8 text-[#D67C4A]" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Blog Posts</h1>
            <p className="text-gray-600 mt-1">Create and manage your blog content</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <Card className="bg-white p-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manage" className="flex items-center gap-2" data-testid="tab-manage-posts">
                <FileText className="h-4 w-4" />
                Manage Posts
              </TabsTrigger>
              <TabsTrigger value="ai-creator" className="flex items-center gap-2" data-testid="tab-ai-creator">
                <Sparkles className="h-4 w-4" />
                AI Creator
              </TabsTrigger>
            </TabsList>
          </Card>

          <TabsContent value="manage" className="space-y-4">
            <BlogManagePosts />
          </TabsContent>

          <TabsContent value="ai-creator" className="space-y-4">
            <BlogAICreator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
