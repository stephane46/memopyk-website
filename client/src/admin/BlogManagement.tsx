import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Sparkles, FileText, Tag, ArrowLeft } from 'lucide-react';
import { BlogAICreator } from './BlogAICreator';
import { BlogManagePosts } from './BlogManagePosts';
import { BlogTagManagement } from './BlogTagManagement';
import { BlogEditor } from './BlogEditor';

export function BlogManagement() {
  const [activeTab, setActiveTab] = useState('manage');
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [cameFromCalendar, setCameFromCalendar] = useState(false);

  // Check URL params on mount and when URL changes
  useEffect(() => {
    const checkUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const id = params.get('id');
      const from = params.get('from');
      
      if ((tab === 'blog-edit' || tab === 'blog-management') && id) {
        setActiveTab('edit');
        setEditPostId(id);
        setCameFromCalendar(from === 'calendar');
      }
    };
    
    // Check on mount
    checkUrlParams();
    
    // Listen for URL changes (from calendar navigation)
    window.addEventListener('popstate', checkUrlParams);
    
    return () => {
      window.removeEventListener('popstate', checkUrlParams);
    };
  }, []);

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
          {activeTab === 'edit' ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveTab('manage');
                  setEditPostId(null);
                  setCameFromCalendar(false);
                  window.history.pushState({}, '', '/en-US/admin?tab=blog');
                }}
                className="text-blue-600 hover:text-blue-700"
                data-testid="button-back-to-manage"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Posts
              </Button>
              {cameFromCalendar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Restore the saved calendar view mode (topics or posts)
                    const returnView = localStorage.getItem('calendar-return-view') || 'topics';
                    localStorage.setItem('content-calendar-view', returnView);
                    localStorage.removeItem('calendar-return-view');
                    
                    window.history.pushState({}, '', '/en-US/admin?tab=planner');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="text-[#D67C4A] hover:text-[#B86A3D]"
                  data-testid="button-back-to-calendar"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Calendar
                </Button>
              )}
            </div>
          ) : (
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
                Create a Post
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('tags')}
                className={activeTab === 'tags' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
                style={{ borderRadius: '0', border: '0', padding: '12px 24px' }}
                data-testid="tab-tags"
              >
                <Tag className="h-4 w-4 mr-2" />
                Tags
              </Button>
            </div>
          )}
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

        {activeTab === 'tags' && (
          <div className="space-y-4">
            <BlogTagManagement />
          </div>
        )}

        {activeTab === 'edit' && editPostId && (
          <div className="space-y-4">
            <BlogEditor postId={editPostId} />
          </div>
        )}
      </div>
    </div>
  );
}
