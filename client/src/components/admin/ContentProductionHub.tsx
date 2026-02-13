import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Rocket, Calendar, FileText, Search, BookOpen, Image, Brain } from 'lucide-react';
import { ContentProductionPlanner } from './ContentProductionPlanner';
import { ContentProductionTopics } from './ContentProductionTopics';
import { ContentProductionKeywords } from './ContentProductionKeywords';
import { BlogManagePosts } from '@/admin/BlogManagePosts';
import { BlogEditor } from '@/admin/BlogEditor';
import { BlogAICreator } from '@/admin/BlogAICreator';
import { ImageBankManager } from './ImageBankManager';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ContentProductionHub() {
  // URL param state persistence
  const [activeTab, setActiveTab] = useState<string>('planner');
  const [editPostId, setEditPostId] = useState<string | null>(null);

  // Initialize from URL on mount and sync URL with actual active tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const idParam = params.get('id');

    // Handle blog-edit with post ID
    if (tabParam === 'blog-edit' && idParam) {
      setActiveTab('blog-edit');
      setEditPostId(idParam);
      return; // Don't modify URL for blog-edit
    }

    // Valid sub-tabs that have their own help content
    const validSubTabs = ['planner', 'topics', 'keywords', 'posts', 'ai-creator', 'images', 'image-bank'];

    // If there's a valid sub-tab parameter, use it
    // Note: 'image-bank' is an alias for 'images'
    if (tabParam && validSubTabs.includes(tabParam)) {
      setActiveTab(tabParam === 'image-bank' ? 'images' : tabParam);
    } else {
      // No valid sub-tab in URL (e.g., ?tab=blog or no tab at all)
      // Default to 'planner' and update URL to reflect this
      // This ensures HelpContext detects /admin?tab=planner (not /admin?tab=blog)
      const defaultTab = 'planner';
      setActiveTab(defaultTab);

      // Update URL to include the actual tab being shown
      params.set('tab', defaultTab);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Listen for popstate events (from child components changing URL)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const idParam = params.get('id');

      // Handle blog-edit with post ID
      if (tabParam === 'blog-edit' && idParam) {
        setActiveTab('blog-edit');
        setEditPostId(idParam);
        return;
      }

      // Valid sub-tabs
      const validSubTabs = ['planner', 'topics', 'keywords', 'posts', 'ai-creator', 'images', 'image-bank'];

      if (tabParam && validSubTabs.includes(tabParam)) {
        // Note: 'image-bank' is an alias for 'images'
        setActiveTab(tabParam === 'image-bank' ? 'images' : tabParam);
        setEditPostId(null);
      } else {
        // Invalid or no sub-tab - default to planner and update URL
        const defaultTab = 'planner';
        setActiveTab(defaultTab);
        setEditPostId(null);

        params.set('tab', defaultTab);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Update URL without reloading page
    const params = new URLSearchParams(window.location.search);
    params.set('tab', value);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  // Tab configuration with workflow step numbers and descriptions
  const tabConfig = [
    { id: 'keywords', num: 1, label: 'Keywords', desc: 'Research SEO', icon: Search, testId: 'tab-keywords' },
    { id: 'topics', num: 2, label: 'Planned Posts', desc: 'What to write', icon: FileText, testId: 'tab-topics' },
    { id: 'planner', num: 3, label: 'Planner', desc: 'Schedule when', icon: Calendar, testId: 'tab-planner' },
    { id: 'posts', num: 4, label: 'Posts', desc: 'Write & publish', icon: BookOpen, testId: 'tab-posts' },
    { id: 'images', num: 5, label: 'Image Bank', desc: 'Store media', icon: Image, testId: 'tab-images' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Rocket className="h-8 w-8 text-[#D67C4A]" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Blog Hub</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Research keywords, plan content, schedule, and publish blog posts
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set('tab', 'ai-context');
            window.location.href = `${window.location.pathname}?${params.toString()}`;
          }}
          className="text-gray-500 hover:text-[#D67C4A]"
          data-testid="button-brand-brain"
        >
          <Brain className="h-4 w-4 mr-1.5" />
          Brand Brain
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Desktop: Full-width grid layout with workflow arrows */}
        <TabsList className="hidden md:grid md:grid-cols-5 w-full bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {tabConfig.map((tab, index) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <div key={tab.id} className="relative flex items-center justify-center">
                <TabsTrigger
                  value={tab.id}
                  data-testid={tab.testId}
                  className="w-full data-[state=active]:bg-[#D67C4A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 flex items-center justify-center gap-2 py-2"
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {tab.num}
                  </span>
                  <IconComponent className="h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{tab.label}</span>
                    <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-gray-400'}`}>{tab.desc}</span>
                  </div>
                </TabsTrigger>
                {index < tabConfig.length - 1 && (
                  <span className="absolute right-0 translate-x-1/2 text-3xl text-gray-400 dark:text-gray-500 z-10 pointer-events-none">→</span>
                )}
              </div>
            );
          })}
        </TabsList>

        {/* Mobile: Horizontal scroll - reordered to match workflow */}
        <TabsList className="md:hidden flex overflow-x-auto w-full bg-gray-100 dark:bg-gray-800 p-1 gap-1">
          <TabsTrigger
            value="keywords"
            data-testid="tab-keywords-mobile"
            className="flex-shrink-0 data-[state=active]:bg-[#D67C4A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
          >
            <Search className="h-4 w-4 mr-1" />
            Keywords
          </TabsTrigger>
          <TabsTrigger
            value="topics"
            data-testid="tab-topics-mobile"
            className="flex-shrink-0 data-[state=active]:bg-[#D67C4A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
          >
            <FileText className="h-4 w-4 mr-1" />
            Planned Posts
          </TabsTrigger>
          <TabsTrigger
            value="planner"
            data-testid="tab-planner-mobile"
            className="flex-shrink-0 data-[state=active]:bg-[#D67C4A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
          >
            <Calendar className="h-4 w-4 mr-1" />
            Planner
          </TabsTrigger>
          <TabsTrigger
            value="posts"
            data-testid="tab-posts-mobile"
            className="flex-shrink-0 data-[state=active]:bg-[#D67C4A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
          >
            <BookOpen className="h-4 w-4 mr-1" />
            Posts
          </TabsTrigger>
          <TabsTrigger
            value="images"
            data-testid="tab-images-mobile"
            className="flex-shrink-0 data-[state=active]:bg-[#D67C4A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
          >
            <Image className="h-4 w-4 mr-1" />
            Images
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents - ordered to match workflow */}
        <TabsContent value="topics" className="mt-6">
          <ContentProductionTopics />
        </TabsContent>

        <TabsContent value="keywords" className="mt-6">
          <ContentProductionKeywords />
        </TabsContent>

        <TabsContent value="planner" className="mt-6">
          <ContentProductionPlanner />
        </TabsContent>

        <TabsContent value="posts" className="mt-6">
          <ErrorBoundary>
            <BlogManagePosts />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="ai-creator" className="mt-6">
          <ErrorBoundary>
            <BlogAICreator />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="images" className="mt-6">
          <ImageBankManager />
        </TabsContent>

        {/* Blog Editor - Hidden tab, accessed via URL */}
        {activeTab === 'blog-edit' && editPostId && (
          <div className="mt-6">
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveTab('posts');
                  setEditPostId(null);
                  window.history.pushState({}, '', '/en-US/admin?tab=posts');
                }}
                className="text-blue-600 hover:text-blue-700"
                data-testid="button-back-to-posts"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Posts
              </Button>
            </div>
            <ErrorBoundary>
              <BlogEditor postId={editPostId} />
            </ErrorBoundary>
          </div>
        )}
      </Tabs>
    </div>
  );
}
