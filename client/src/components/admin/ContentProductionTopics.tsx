import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, FileText, BookOpen, Filter, ChevronDown, Sparkles, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BlogPostCreatorModal } from './BlogPostCreatorModal';
import { TopicFormModal } from './TopicFormModal';
import { TopicDeleteDialog } from './TopicDeleteDialog';
import { ContentTopicsSkeleton } from '@/admin/skeletons/ContentTopicsSkeleton';

interface ContentTopic {
  id: string;
  title: string;
  slug: string;
  category: string;
  type: string;
  target_word_count: number;
  primary_keyword: string;
  secondary_keywords: string[];
  search_volume: number | null;
  competition: string | null;
  search_intent: string;
  content_angle: string;
  description: string;
  hero_image_concept: string | null;
  body_image_concepts: string[] | null;
  memopyk_link_opportunities: string | null;
  times_generated: number;
  last_generated_at: string | null;
  priority: number;
  status: string;
  created_at: string;
  updated_at: string;
  post_count?: number; // Number of actual blog posts linked to this topic
}

const CATEGORIES = [
  'PHOTO ORGANIZATION & PRESERVATION',
  'VIDEO MEMORY & LEGACY',
  'FAMILY STORYTELLING & TRADITIONS',
  'DIGITAL ORGANIZATION & TECHNOLOGY',
  'MEMORY PRODUCTS & CRAFTS',
  'SEASONAL & HOLIDAY CONTENT',
];

const STATUSES = ['backlog', 'planned', 'in_progress', 'published'];

const TYPES = [
  'Beginner/How-To Topics',
  'Storytelling Techniques',
  'VHS & Legacy Media',
  'Video Storytelling',
  'Multi-Generational Projects',
  'Physical Products',
  'Holiday-Specific',
  'Phone & Cloud Organization',
  'File Management',
  'Emotional/Legacy Topics',
  'Celebration & Milestones',
  'Advanced/Technical Topics',
  'Modern Video Memories',
  'Problem-Solving Topics',
  'Security & Privacy',
  'Special Occasions',
  'Digital Products',
  'Special Projects',
];

export function ContentProductionTopics() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTopicForPost, setSelectedTopicForPost] = useState<ContentTopic | null>(null);
  const [highlightedTopicId, setHighlightedTopicId] = useState<string | null>(null);

  // CRUD modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<ContentTopic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<ContentTopic | null>(null);

  const topicRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: topics = [], isLoading } = useQuery<ContentTopic[]>({
    queryKey: ['/api/admin/content/topics'],
  });

  // Handle URL param for search keyword filtering
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
      // Keep the URL param so it persists on refresh and enables deep-linking
    }
  }, []);

  // Handle URL param for highlighting - run when topics load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlightParam = params.get('highlight');
    
    console.log('🔍 URL PARAM CHECK:', { 
      fullUrl: window.location.href,
      search: window.location.search,
      highlightParam,
      topicsLoaded: topics.length > 0
    });
    
    if (highlightParam && topics.length > 0) {
      console.log('✅ Setting highlightedTopicId:', highlightParam);
      setHighlightedTopicId(highlightParam);
      
      // Scroll to topic after a brief delay to ensure DOM is ready
      setTimeout(() => {
        const element = topicRefs.current[highlightParam];
        if (element) {
          console.log('📜 Scrolling to element');
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      
      // Clear highlight after 3 seconds
      setTimeout(() => {
        console.log('🧹 Clearing highlight state');
        setHighlightedTopicId(null);
        // Clear URL param
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete('highlight');
        const newUrl = `${window.location.pathname}?${newParams.toString()}`;
        window.history.pushState({}, '', newUrl);
      }, 3000);
    }
  }, [topics]); // Re-run when topics data loads

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        topic.primary_keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        topic.secondary_keywords?.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory;
    const matchesPriority = selectedPriority === 'all' || topic.priority.toString() === selectedPriority;
    const matchesStatus = selectedStatus === 'all' || topic.status === selectedStatus;
    const matchesType = selectedType === 'all' || topic.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesPriority && matchesStatus && matchesType;
  });

  const totalTopics = topics.length;
  const highPriorityCount = topics.filter(t => t.priority >= 4).length;

  const getCategoryColor = (category: string) => {
    const categoryMap: Record<string, string> = {
      'PHOTO ORGANIZATION & PRESERVATION': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'VIDEO MEMORY & LEGACY': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'FAMILY STORYTELLING & TRADITIONS': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'DIGITAL ORGANIZATION & TECHNOLOGY': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'MEMORY PRODUCTS & CRAFTS': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'SEASONAL & HOLIDAY CONTENT': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return categoryMap[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getCategoryShortLabel = (category: string) => {
    const labelMap: Record<string, string> = {
      'PHOTO ORGANIZATION & PRESERVATION': 'Photo',
      'VIDEO MEMORY & LEGACY': 'Video',
      'FAMILY STORYTELLING & TRADITIONS': 'Family',
      'DIGITAL ORGANIZATION & TECHNOLOGY': 'Digital',
      'MEMORY PRODUCTS & CRAFTS': 'Crafts',
      'SEASONAL & HOLIDAY CONTENT': 'Seasonal',
    };
    return labelMap[category] || category.split(' ')[0];
  };

  const getPriorityBadgeColor = (priority: number) => {
    switch (priority) {
      case 5:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 4:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 3:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 2:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 1:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    
    switch (status.toLowerCase()) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'backlog':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatStatusLabel = (status: string | null | undefined) => {
    if (!status) return 'Unknown';
    
    switch (status.toLowerCase()) {
      case 'in_progress':
        return 'In Progress';
      case 'published':
        return 'Published';
      case 'planned':
        return 'Planned';
      case 'backlog':
        return 'Backlog';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedPriority('all');
    setSelectedStatus('all');
    setSelectedType('all');
    setSearchQuery('');
  };

  const navigateToPosts = (topicId: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'posts');
    params.set('filterTopic', topicId);
    params.delete('highlight'); // Clear highlight when navigating
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.location.href = newUrl;
  };

  const activeFiltersCount = [
    selectedCategory !== 'all',
    selectedPriority !== 'all',
    selectedStatus !== 'all',
    selectedType !== 'all',
    searchQuery !== '',
  ].filter(Boolean).length;

  if (isLoading) {
    return <ContentTopicsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalTopics}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Filtered Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredTopics.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{highPriorityCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Filter className="h-5 w-5" />
                Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </CardTitle>
            </div>
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={clearAllFilters} data-testid="button-clear-filters">
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search topics, keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger 
                  data-testid="select-category"
                  className={selectedCategory !== 'all' ? 'border-[#D67C4A] bg-orange-50 dark:bg-orange-950' : ''}
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger 
                  data-testid="select-status"
                  className={selectedStatus !== 'all' ? 'border-[#D67C4A] bg-orange-50 dark:bg-orange-950' : ''}
                >
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger 
                  data-testid="select-type"
                  className={selectedType !== 'all' ? 'border-[#D67C4A] bg-orange-50 dark:bg-orange-950' : ''}
                >
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Topics List with Expandable Rows */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <FileText className="h-5 w-5" />
                Topics ({filteredTopics.length})
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                Click on any topic to see full details
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#D67C4A] hover:bg-[#C56B3A] text-white"
              data-testid="button-new-topic"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Topic
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTopics.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No topics match your filters
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredTopics.map((topic) => (
                <div
                  key={topic.id}
                  ref={(el) => { topicRefs.current[topic.id] = el; }}
                  className={highlightedTopicId === topic.id ? 'ring-2 ring-[#D67C4A] bg-orange-50 rounded-lg p-2 transition-all duration-500' : ''}
                >
                  <AccordionItem value={topic.id} data-testid={`topic-${topic.id}`} className="border-none">
                    <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 dark:text-white">{topic.title}</div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge 
                            variant="custom" 
                            className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs font-normal"
                            data-testid={`keyword-primary-${topic.id}`}
                          >
                            {topic.primary_keyword}
                          </Badge>
                          {topic.secondary_keywords && topic.secondary_keywords.slice(0, 3).map((kw, idx) => (
                            <Badge 
                              key={idx}
                              variant="custom" 
                              className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs font-normal"
                              data-testid={`keyword-secondary-${topic.id}-${idx}`}
                            >
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {topic.times_generated > 0 && (
                          <Badge 
                            variant="custom" 
                            className="bg-[#D67C4A] text-white"
                            data-testid={`badge-generated-${topic.id}`}
                          >
                            Generated {topic.times_generated}x
                          </Badge>
                        )}
                        {topic.post_count !== undefined && topic.post_count > 0 && (
                          <Badge 
                            variant="custom" 
                            className="bg-blue-600 text-white"
                            data-testid={`badge-posts-${topic.id}`}
                          >
                            {topic.post_count} Post{topic.post_count !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        <Badge variant="custom" className={getCategoryColor(topic.category)}>
                          {getCategoryShortLabel(topic.category)}
                        </Badge>
                        <Badge variant="custom" className={getPriorityBadgeColor(topic.priority)}>
                          P{topic.priority}
                        </Badge>
                        <Badge variant="custom" className={getStatusColor(topic.status)}>
                          {formatStatusLabel(topic.status)}
                        </Badge>
                        <Badge variant="custom" className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                          {topic.target_word_count}w
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 border-l-4 border-l-[#D67C4A] rounded-lg space-y-4">
                      {/* SEO Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">SEO Data</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Primary Keyword:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">{topic.primary_keyword}</span>
                            </div>
                            {topic.search_volume && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Search Volume:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">{topic.search_volume.toLocaleString()}</span>
                              </div>
                            )}
                            {topic.competition && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Competition:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">{topic.competition}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Search Intent:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">{topic.search_intent}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Content Type</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Type:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">{topic.type}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Category:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">{topic.category}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Target Words:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">{topic.target_word_count}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Secondary Keywords */}
                      {topic.secondary_keywords && topic.secondary_keywords.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Secondary Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {topic.secondary_keywords.map((kw, idx) => (
                              <Badge key={idx} variant="custom" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content Guidance */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Content Angle</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{topic.content_angle}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Description</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{topic.description}</p>
                      </div>

                      {/* Image Concepts */}
                      {topic.hero_image_concept && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Hero Image Concept</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{topic.hero_image_concept}</p>
                        </div>
                      )}

                      {topic.body_image_concepts && topic.body_image_concepts.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Body Image Concepts</h4>
                          <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            {topic.body_image_concepts.map((concept, idx) => (
                              <li key={idx}>{concept}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* MEMOPYK Links */}
                      {topic.memopyk_link_opportunities && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">MEMOPYK Link Opportunities</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{topic.memopyk_link_opportunities}</p>
                        </div>
                      )}

                      {/* Generation Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Times Generated:</span>
                          <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">{topic.times_generated}</span>
                        </div>
                        {topic.last_generated_at && (
                          <div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Last Generated:</span>
                            <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                              {new Date(topic.last_generated_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions - all primary actions grouped on the left */}
                      <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingTopic(topic)}
                            data-testid={`button-edit-topic-${topic.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingTopic(topic)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            data-testid={`button-delete-topic-${topic.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setSelectedTopicForPost(topic)}
                            className="bg-[#D67C4A] hover:bg-[#C56B3A] text-white"
                            data-testid={`button-create-post-${topic.id}`}
                          >
                            <Sparkles className="h-4 w-4 mr-1" />
                            Create Post from Topic
                          </Button>
                        </div>
                        {topic.times_generated > 0 && (
                          <Button
                            onClick={() => navigateToPosts(topic.id)}
                            variant="outline"
                            size="sm"
                            className="ml-auto border-[#D67C4A] text-[#D67C4A] hover:bg-[#D67C4A] hover:bg-opacity-10"
                            data-testid={`button-view-posts-${topic.id}`}
                          >
                            <BookOpen className="h-4 w-4 mr-1" />
                            View Posts ({topic.post_count || 0})
                          </Button>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </div>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Blog Post Creator Modal */}
      {selectedTopicForPost && (
        <BlogPostCreatorModal
          topic={selectedTopicForPost}
          isOpen={true}
          onClose={() => setSelectedTopicForPost(null)}
        />
      )}

      {/* Topic Create/Edit Modal */}
      <TopicFormModal
        isOpen={isCreateModalOpen || editingTopic !== null}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTopic(null);
        }}
        topic={editingTopic}
      />

      {/* Topic Delete Dialog */}
      {deletingTopic && (
        <TopicDeleteDialog
          isOpen={true}
          onClose={() => setDeletingTopic(null)}
          topic={deletingTopic}
        />
      )}
    </div>
  );
}
