import { useState } from 'react';
import { Button } from '@/components/ui/button';
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

        {/* Tabs - SEO Management Style */}
        <div className="mb-6">
          <div className="flex rounded-lg border-2 border-gray-300 overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('manage')}
              className={activeTab === 'manage' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
              style={{ borderRadius: '0', border: '0', padding: '12px 24px' }}
              data-testid="tab-manage-posts"
            >
              <FileText className="h-4 w-4 mr-2" />
              Manage Posts
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('ai-creator')}
              className={activeTab === 'ai-creator' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
              style={{ borderRadius: '0', border: '0', padding: '12px 24px' }}
              data-testid="tab-ai-creator"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Creator
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'manage' && (
          <div className="space-y-4">
            <BlogManagePosts />
          </div>
        )}

        {activeTab === 'ai-creator' && (
          <div className="space-y-4">
            <BlogAICreator />
          </div>
        )}
      </div>
    </div>
  );
}
