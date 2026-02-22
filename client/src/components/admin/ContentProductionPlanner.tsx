import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest, adminFetch } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Plus, X, ListTodo, GripVertical, Eye, PenSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { BlogPostCreatorModal } from './BlogPostCreatorModal';
import { ContentPlannerSkeleton } from '@/admin/skeletons/ContentPlannerSkeleton';

interface ContentTopic {
  id: string;
  title: string;
  slug: string;
  category: string;
  type: string;
  targetWordCount: number;
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchVolume: number | null;
  competition: string | null;
  searchIntent: string;
  contentAngle: string;
  description: string;
  heroImageConcept: string | null;
  bodyImageConcepts: string[] | null;
  memopykLinkOpportunities: string | null;
  timesGenerated: number;
  lastGeneratedAt: string | null;
  priority: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ContentDailyAssignment {
  id: string;
  date: string;
  topicId: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

type CalendarViewMode = 'topics' | 'posts';

export function ContentProductionPlanner() {
  // Initialize viewMode from localStorage or default to 'topics'
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    const saved = localStorage.getItem('content-calendar-view');
    return (saved === 'posts' || saved === 'topics') ? saved : 'topics';
  });
  
  const [weeksToShow, setWeeksToShow] = useState(12);
  const [weekOffset, setWeekOffset] = useState(-4); // Start 4 weeks before today
  
  // Persist viewMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('content-calendar-view', viewMode);
  }, [viewMode]);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<ContentTopic | null>(null);
  const { toast } = useToast();
  const calendarRef = useRef<HTMLDivElement>(null);

  // Calculate start date based on offset
  const today = new Date();
  const todayDay = today.getDay();
  const todayDiff = today.getDate() - todayDay + (todayDay === 0 ? -6 : 1);
  const thisWeekMonday = new Date(today.setDate(todayDiff));
  
  const startDate = new Date(thisWeekMonday);
  startDate.setDate(startDate.getDate() + (weekOffset * 7));
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (weeksToShow * 7) - 1);

  // Fetch all topics
  const { data: allTopics = [], isLoading: isLoadingTopics } = useQuery<ContentTopic[]>({
    queryKey: ['/api/admin/content/topics'],
  });

  // Fetch assignments for visible weeks
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery<ContentDailyAssignment[]>({
    queryKey: ['/api/admin/content/assignments', weekOffset, weeksToShow],
    queryFn: async () => {
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];
      const response = await adminFetch(`/api/admin/content/assignments?startDate=${start}&endDate=${end}`);
      if (!response.ok) throw new Error('Failed to fetch assignments');
      return response.json();
    },
  });

  // Fetch blog posts to check publish status
  const { data: blogPostsData } = useQuery({
    queryKey: ['/api/admin/blog/posts'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/blog/posts?limit=200');
      if (!response.ok) throw new Error('Failed to fetch blog posts');
      return response.json();
    }
  });
  
  const blogPosts = blogPostsData?.data || [];

  // Scroll to today's date within calendar container (not the page)
  useEffect(() => {
    const scrollToToday = () => {
      // Delay to ensure DOM is fully rendered with data
      setTimeout(() => {
        const todayCell = document.querySelector('[data-is-today="true"]');
        const calendarContainer = calendarRef.current;
        
        if (todayCell && calendarContainer) {
          // Calculate scroll position within the calendar container
          const todayRect = todayCell.getBoundingClientRect();
          const containerRect = calendarContainer.getBoundingClientRect();
          
          // Get current scroll position
          const currentScroll = calendarContainer.scrollTop;
          
          // Calculate where TODAY is relative to container top
          const todayOffsetFromContainerTop = todayRect.top - containerRect.top + currentScroll;
          
          // Center TODAY in the container (subtract half container height)
          const targetScroll = todayOffsetFromContainerTop - (containerRect.height / 2) + (todayRect.height / 2);
          
          // Smooth scroll within the calendar container only
          calendarContainer.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
          });
        }
      }, 300);
    };
    
    // Always scroll (data might be empty on first load)
    scrollToToday();
  }, [viewMode, assignments.length, blogPosts.length]); // Trigger when view changes or data loads

  // Create efficient lookup cache: topicId -> array of posts
  const postsByTopicId = useMemo(() => {
    const map = new Map<string, any[]>();
    blogPosts.forEach((post: any) => {
      if (post.sourceTopicId) {
        const existing = map.get(post.sourceTopicId) || [];
        map.set(post.sourceTopicId, [...existing, post]);
      }
    });
    return map;
  }, [blogPosts]);
  
  // Helper: Get most relevant post for a topic with deterministic ordering
  const getRelevantPost = (topicId: string) => {
    const posts = postsByTopicId.get(topicId);
    if (!posts || posts.length === 0) return null;
    
    // Sort by updated_at descending (most recent first) for deterministic ordering
    const sorted = [...posts].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    // Prefer most recent draft (what needs tracking), fallback to most recent published
    const draft = sorted.find((p: any) => p.status !== 'published');
    return draft || sorted[0];
  };

  // Fetch posts grouped by publish date (for Posts view)
  const { data: postsByDateData } = useQuery({
    queryKey: ['/api/admin/blog/posts-by-date', weekOffset, weeksToShow],
    queryFn: async () => {
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];
      const response = await adminFetch(`/api/admin/blog/posts-by-date?startDate=${start}&endDate=${end}`);
      if (!response.ok) throw new Error('Failed to fetch posts by date');
      return response.json();
    },
    enabled: viewMode === 'posts', // Only fetch when in Posts view
  });

  const postsByDate = postsByDateData?.data?.byDate || {};
  const unscheduledPosts = postsByDateData?.data?.unscheduled || [];

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: { date: string; topicId: string }) => {
      // Create the assignment
      const assignmentResponse = await apiRequest('/api/admin/content/assignments', 'POST', {
        date: data.date,
        topicId: data.topicId,
        status: 'planned',
      });
      const assignment = await assignmentResponse.json();
      
      // Update topic status to "planned"
      await apiRequest(`/api/admin/content/topics/${data.topicId}`, 'PATCH', {
        status: 'planned',
      });
      
      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content/topics'] });
      setIsModalOpen(false);
      setSelectedDate(null);
      toast({ title: 'Topic assigned and status updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to assign topic', description: error.message, variant: 'destructive' });
    },
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      // Find the assignment to get the topic ID
      const assignment = assignments.find(a => a.id === id);
      if (!assignment) throw new Error('Assignment not found');
      
      // Delete the assignment
      const response = await apiRequest(`/api/admin/content/assignments/${id}`, 'DELETE');
      const result = await response.json();
      
      // Fetch ALL assignments for this topic (not just current week)
      const allAssignmentsResponse = await adminFetch('/api/admin/content/assignments');
      const allAssignments: ContentDailyAssignment[] = await allAssignmentsResponse.json();
      const remainingAssignments = allAssignments.filter(a => a.topicId === assignment.topicId);
      
      // Only update topic status to "backlog" if no assignments remain
      if (remainingAssignments.length === 0) {
        await apiRequest(`/api/admin/content/topics/${assignment.topicId}`, 'PATCH', {
          status: 'backlog',
        });
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content/topics'] });
      toast({ title: 'Assignment removed successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to remove assignment', description: error.message, variant: 'destructive' });
    },
  });

  // Update assignment mutation (status or date)
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, status, date }: { id: string; status?: string; date?: string }) => {
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (date !== undefined) updates.date = date;
      
      const response = await apiRequest(`/api/admin/content/assignments/${id}`, 'PATCH', updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content/assignments'] });
      toast({ title: 'Assignment updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update assignment', description: error.message, variant: 'destructive' });
    },
  });

  // Update post publication date mutation
  const updatePostDateMutation = useMutation({
    mutationFn: async ({ id, publishedAt }: { id: string; publishedAt: string }) => {
      const response = await apiRequest(`/api/admin/blog/posts/${id}`, 'PATCH', {
        publishedAt,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts-by-date'] });
      toast({ title: 'Post date updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update post date', description: error.message, variant: 'destructive' });
    },
  });

  // Get assigned topic IDs
  const assignedTopicIds = new Set(assignments.map(a => a.topicId));

  // Get unassigned topics for stats
  const unassignedTopics = allTopics.filter(topic => !assignedTopicIds.has(topic.id));

  // Calculate current ISO week boundaries for "Assigned This Week" stat
  const currentWeekStart = new Date();
  const dayOfWeek = currentWeekStart.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentWeekStart.setDate(currentWeekStart.getDate() + diffToMonday);
  currentWeekStart.setHours(0, 0, 0, 0);
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 7);
  const thisWeekAssignments = assignments.filter(a => {
    const d = new Date(a.date);
    return d >= currentWeekStart && d < currentWeekEnd;
  });
  
  // Filter all topics by search query (for modal - show all topics)
  const filteredTopics = allTopics.filter(topic =>
    topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.primaryKeyword.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get topic by ID
  const getTopicById = (id: string) => allTopics.find(t => t.id === id);

  // Get assignments for a specific date
  const getAssignmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return assignments.filter(a => a.date.startsWith(dateStr));
  };

  // Get posts for a specific date
  const getPostsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return postsByDate[dateStr] || [];
  };


  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      const container = calendarRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // Load more weeks when scrolling near top (load past weeks)
      if (scrollTop < 200) {
        setWeeksToShow(prev => prev + 4);
        setWeekOffset(prev => prev - 4);
        // Maintain scroll position
        setTimeout(() => {
          if (container) container.scrollTop = scrollTop + 400;
        }, 50);
      }

      // Load more weeks when scrolling near bottom (load future weeks)
      if (scrollHeight - scrollTop - clientHeight < 200) {
        setWeeksToShow(prev => prev + 4);
      }
    };

    const container = calendarRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Navigate to previous/next period (now loads 4 weeks at a time)
  const previousPeriod = () => {
    setWeekOffset(prev => prev - 4);
  };

  const nextPeriod = () => {
    setWeekOffset(prev => prev + 4);
  };

  const goToToday = () => {
    setWeekOffset(-4); // Start 4 weeks before today
    setWeeksToShow(12);
    setTimeout(() => {
      if (calendarRef.current) calendarRef.current.scrollTop = 400;
    }, 100);
  };

  // Generate weeks based on offset and count
  const weeks = [];
  for (let weekNum = 0; weekNum < weeksToShow; weekNum++) {
    const weekDays = [];
    for (let dayNum = 0; dayNum < 7; dayNum++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + (weekNum * 7) + dayNum);
      weekDays.push(date);
    }
    weeks.push(weekDays);
  }

  // Get assignment info for a topic (to show in modal)
  const getTopicAssignmentInfo = (topicId: string) => {
    const assignment = assignments.find(a => a.topicId === topicId);
    return assignment;
  };

  // Removed: isTopicPublished - now using getRelevantPost() for consistent status display

  // Handle day click
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
    setSearchQuery('');
  };

  // Handle topic assignment
  const handleAssignTopic = (topicId: string, date?: Date) => {
    const targetDate = date || selectedDate;
    if (!targetDate) return;
    
    createAssignmentMutation.mutate({
      date: targetDate.toISOString(),
      topicId,
    });
    setIsModalOpen(false);
  };

  // Drag and drop handlers
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [draggedAssignmentId, setDraggedAssignmentId] = useState<string | null>(null);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);

  const handleTopicDragStart = (topicId: string) => {
    setDraggedTopicId(topicId);
    setDraggedAssignmentId(null);
    setDraggedPostId(null);
  };

  const handleAssignmentDragStart = (assignmentId: string) => {
    setDraggedAssignmentId(assignmentId);
    setDraggedTopicId(null);
    setDraggedPostId(null);
  };

  const handlePostDragStart = (postId: string) => {
    setDraggedPostId(postId);
    setDraggedTopicId(null);
    setDraggedAssignmentId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    
    // If dragging a post, update its publication date
    if (draggedPostId) {
      updatePostDateMutation.mutate({
        id: draggedPostId,
        publishedAt: date.toISOString(),
      });
      setDraggedPostId(null);
    }
    // If dragging an existing assignment, update its date
    else if (draggedAssignmentId) {
      updateAssignmentMutation.mutate({
        id: draggedAssignmentId,
        date: date.toISOString(),
      });
      setDraggedAssignmentId(null);
    }
    // If dragging a new topic, create assignment
    else if (draggedTopicId) {
      handleAssignTopic(draggedTopicId, date);
      setDraggedTopicId(null);
    }
  };

  // Show skeleton while loading
  if (isLoadingTopics || isLoadingAssignments) {
    return <ContentPlannerSkeleton />;
  }

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards - Compact Single Row */}
      <div className="grid grid-cols-3 gap-4 mt-8 mb-3">
        <Card className="py-0">
          <CardContent className="p-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Topics</span>
            <span className="text-base font-bold text-gray-900 dark:text-white">{allTopics.length}</span>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned This Week</span>
            <span className="text-base font-bold text-green-600 dark:text-green-400">{thisWeekAssignments.length}</span>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Unassigned</span>
            <span className="text-base font-bold text-orange-600 dark:text-orange-400">{unassignedTopics.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Calendar className="h-5 w-5" />
                12-Week Content Calendar
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                {weeks[0][0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weeks[11][6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </CardDescription>
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant={viewMode === 'topics' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('topics')}
                  className={`${viewMode === 'topics' ? 'bg-[#D67C4A] hover:bg-[#D67C4A]/90' : ''} h-auto py-2`}
                  data-testid="button-view-topics"
                >
                  <div className="flex flex-col items-center">
                    <div className="flex items-center">
                      <ListTodo className="h-4 w-4 mr-2" />
                      Topics
                    </div>
                    <span className={`text-xs ${viewMode === 'topics' ? 'text-white/70' : 'text-gray-500'}`}>Plan when to write</span>
                  </div>
                </Button>
                <Button
                  variant={viewMode === 'posts' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('posts')}
                  className={`${viewMode === 'posts' ? 'bg-[#D67C4A] hover:bg-[#D67C4A]/90' : ''} h-auto py-2`}
                  data-testid="button-view-posts"
                >
                  <div className="flex flex-col items-center">
                    <div className="flex items-center">
                      <PenSquare className="h-4 w-4 mr-2" />
                      Posts
                    </div>
                    <span className={`text-xs ${viewMode === 'posts' ? 'text-white/70' : 'text-gray-500'}`}>See when they go live</span>
                  </div>
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={previousPeriod}
                data-testid="button-prev-period"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                data-testid="button-today"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextPeriod}
                data-testid="button-next-period"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={calendarRef} className="space-y-2 max-h-[800px] overflow-y-auto">
            {/* Day headers */}
            <div className="grid grid-cols-8 gap-2 mb-2 sticky top-0 bg-white dark:bg-gray-950 z-10 pb-2">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">Week</div>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="text-xs font-semibold text-center text-gray-600 dark:text-gray-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Week rows */}
            {weeks.map((weekDays, weekIndex) => {
              const weekStart = weekDays[0];
              const weekEnd = weekDays[6];
              
              return (
                <div key={weekIndex} className="grid grid-cols-8 gap-2">
                  {/* Week label */}
                  <div className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300">
                    {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>

                  {/* Day cells */}
                  {weekDays.map((day, dayIndex) => {
                    const dayAssignments = getAssignmentsForDate(day);
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                    
                    return (
                      <div
                        key={dayIndex}
                        className={`min-h-[140px] border-2 rounded-lg p-2 transition-colors ${
                          draggedTopicId || draggedAssignmentId || draggedPostId
                            ? 'border-dashed border-[#D67C4A] bg-orange-50 dark:bg-orange-950' 
                            : isToday 
                              ? 'border-[#D67C4A] bg-orange-50 dark:bg-orange-950' 
                              : isPast
                                ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900'
                                : 'border-gray-200 dark:border-gray-700'
                        }`}
                        data-testid={`day-${day.toISOString().split('T')[0]}`}
                        data-is-today={isToday ? 'true' : 'false'}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day)}
                      >
                        {/* Day number and add button */}
                        <div className="flex items-center justify-between mb-2">
                          <div className={`text-sm font-bold ${
                            isToday ? 'text-[#D67C4A]' : isPast ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-white'
                          }`}>
                            {day.getDate()}
                          </div>
                          {viewMode === 'topics' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDayClick(day)}
                              className="h-5 w-5 p-0"
                              data-testid={`button-add-${day.toISOString().split('T')[0]}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        {/* Content based on view mode */}
                        {viewMode === 'topics' ? (
                          /* Assigned topics */
                          <div className="space-y-1">
                            {dayAssignments.map((assignment) => {
                            const topic = getTopicById(assignment.topicId);
                            if (!topic) return null;
                            const post = getRelevantPost(topic.id);
                            const isPublished = post?.status === 'published';
                            const isInReview = post?.status === 'in_review';
                            const isDraft = post?.status === 'draft';
                            const hasPost = !!post;

                            // Visual styling based on status
                            const bgColor = isPublished ? '#dcfce7' : isInReview ? '#fef3c7' : isDraft ? '#fef3c7' : '#ffedd5';
                            const borderColor = isPublished ? '#16a34a' : isInReview ? '#f59e0b' : isDraft ? '#f59e0b' : '#f97316';
                            const barWidth = isPublished ? '6px' : (isInReview || isDraft) ? '4px' : '2px';
                            const barColor = isPublished ? '#16a34a' : isInReview ? '#f59e0b' : isDraft ? '#f59e0b' : '#f97316';
                            const badgeColor = isPublished ? '#16a34a' : isInReview ? '#f59e0b' : isDraft ? '#f59e0b' : '#f97316';
                            const badgeText = isPublished ? 'PUBLISHED' : isInReview ? 'IN REVIEW' : isDraft ? 'DRAFT' : 'PLANNED';

                            return (
                              <div
                                key={assignment.id}
                                className="rounded p-1.5 text-xs hover:shadow-md transition-shadow border-2 relative overflow-hidden"
                                style={{
                                  backgroundColor: bgColor,
                                  borderColor: borderColor
                                }}
                                data-testid={`assignment-${assignment.id}`}
                              >
                                {/* Left vertical status bar */}
                                <div 
                                  className="absolute left-0 top-0 bottom-0 rounded-l"
                                  style={{
                                    width: barWidth,
                                    backgroundColor: barColor,
                                    zIndex: 1
                                  }}
                                />
                                
                                {/* Content with left padding for the bar */}
                                <div className="pl-2 relative" style={{ zIndex: 2 }}>
                                  {/* Title */}
                                  <div 
                                    className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-1"
                                    title={topic.title}
                                  >
                                    {topic.title}
                                  </div>
                                  
                                  {/* Date lines */}
                                  {isPublished && post?.publishedAt && (
                                    <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-1">
                                      Published: {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                  )}
                                  {(isDraft || isInReview) && (
                                    <>
                                      <div className="text-[10px] text-gray-600 dark:text-gray-400">
                                        Assigned: {new Date(assignment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </div>
                                      <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-1">
                                        Publication: {post?.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                                      </div>
                                    </>
                                  )}
                                  
                                  {/* Bottom row: Drag handle + Badges + Action icons */}
                                  <div className="flex items-center justify-between gap-1">
                                  {/* Left side: Drag handle + Badges */}
                                  <div className="flex items-center gap-1">
                                    <div
                                      draggable={true}
                                      onDragStart={(e) => {
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('application/x-assignment', assignment.id);
                                        handleAssignmentDragStart(assignment.id);
                                      }}
                                      onDragEnd={() => setDraggedAssignmentId(null)}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      className="cursor-move hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5 flex-shrink-0"
                                    >
                                      <GripVertical className="h-3 w-3 text-gray-400" />
                                    </div>
                                    <Badge 
                                      className="text-[10px] px-1.5 py-0.5 h-4 font-semibold"
                                      style={{
                                        backgroundColor: badgeColor,
                                        color: '#ffffff'
                                      }}
                                      data-testid={`badge-status-${assignment.id}`}
                                    >
                                      {badgeText}
                                    </Badge>
                                    {post && (
                                      <Badge 
                                        className="text-[10px] px-1.5 py-0.5 h-4 bg-blue-100 text-blue-800 font-semibold"
                                        data-testid={`badge-language-${assignment.id}`}
                                      >
                                        {post.language === 'English' ? 'EN' : post.language === 'French' ? 'FR' : post.language.substring(0, 2).toUpperCase()}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {/* Right side: Action icons */}
                                  <div className="flex gap-0.5">
                                    {(() => {
                                      const post = getRelevantPost(topic.id);
                                      
                                      if (post) {
                                        // Post exists - show Eye icon to view/edit
                                        return (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              // Save current view mode for return navigation
                                              localStorage.setItem('calendar-return-view', viewMode);
                                              
                                              const params = new URLSearchParams(window.location.search);
                                              params.set('tab', 'posts');
                                              params.set('id', post.id);
                                              params.set('from', 'calendar');
                                              window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                                              window.dispatchEvent(new PopStateEvent('popstate'));
                                              
                                              toast({ 
                                                title: post.status === 'published' ? 'Opening post' : 'Opening draft',
                                                description: topic.title 
                                              });
                                            }}
                                            className="h-4 w-4 p-0 flex-shrink-0"
                                            title="View or edit post"
                                            data-testid={`button-view-${assignment.id}`}
                                          >
                                            <Eye className="h-3 w-3 text-blue-600" />
                                          </Button>
                                        );
                                      } else {
                                        // No post - show PenSquare icon to create
                                        return (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedTopic(topic);
                                              setIsCreatorModalOpen(true);
                                            }}
                                            className="h-4 w-4 p-0 flex-shrink-0"
                                            title="Create post from this topic"
                                            data-testid={`button-create-${assignment.id}`}
                                          >
                                            <PenSquare className="h-3 w-3 text-[#D67C4A]" />
                                          </Button>
                                        );
                                      }
                                    })()}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        deleteAssignmentMutation.mutate(assignment.id);
                                      }}
                                      className="h-4 w-4 p-0 flex-shrink-0"
                                      data-testid={`button-remove-${assignment.id}`}
                                    >
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        ) : (
                          /* Published posts view */
                          <div className="space-y-1">
                            {getPostsForDate(day).map((post: any) => {
                              const isPublished = post.status === 'published';
                              const isInReview = post.status === 'in_review';
                              const isDraft = post.status === 'draft';
                              
                              // For non-published posts, the backend positions them on their assignment date
                              // So the current 'day' IS the assignment date - no need to look it up
                              const assignmentDate = (isDraft || isInReview) ? day : null;
                              
                              // Visual styling based on status
                              const bgColor = isPublished ? '#dcfce7' : isInReview ? '#fef3c7' : '#fef3c7';
                              const borderColor = isPublished ? '#16a34a' : isInReview ? '#f59e0b' : '#f59e0b';
                              const barWidth = isPublished ? '6px' : '4px';
                              const barColor = isPublished ? '#16a34a' : isInReview ? '#f59e0b' : '#f59e0b';
                              const badgeColor = isPublished ? '#16a34a' : isInReview ? '#f59e0b' : '#f59e0b';
                              const badgeText = isPublished ? 'PUBLISHED' : isInReview ? 'IN REVIEW' : 'DRAFT';
                              
                              return (
                              <div
                                key={post.id}
                                className="rounded p-1.5 text-xs hover:shadow-md transition-shadow border-2 relative overflow-hidden"
                                style={{
                                  backgroundColor: bgColor,
                                  borderColor: borderColor
                                }}
                                data-testid={`post-${post.id}`}
                              >
                                {/* Left vertical status bar */}
                                <div 
                                  className="absolute left-0 top-0 bottom-0 rounded-l"
                                  style={{
                                    width: barWidth,
                                    backgroundColor: barColor,
                                    zIndex: 1
                                  }}
                                />
                                
                                {/* Content with left padding for the bar */}
                                <div className="pl-2 relative" style={{ zIndex: 2 }}>
                                  {/* Title */}
                                  <div 
                                    className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-1"
                                    title={post.title}
                                  >
                                    {post.title}
                                  </div>
                                  
                                  {/* Date lines */}
                                  {isPublished && post.publishedAt && (
                                    <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-1">
                                      Published: {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                  )}
                                  {(isDraft || isInReview) && (
                                    <>
                                      {assignmentDate && (
                                        <div className="text-[10px] text-gray-600 dark:text-gray-400">
                                          Assigned: {assignmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                      )}
                                      <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-1">
                                        Publication: {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                                      </div>
                                    </>
                                  )}
                                  
                                  {/* Bottom row: Drag handle + Badges + Eye icon */}
                                  <div className="flex items-center justify-between gap-1">
                                  {/* Left side: Drag handle + Badges */}
                                  <div className="flex items-center gap-1">
                                    {/* Drag handle for posts */}
                                    <div
                                      draggable={true}
                                      onDragStart={(e) => {
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('application/x-post', post.id);
                                        handlePostDragStart(post.id);
                                      }}
                                      onDragEnd={() => setDraggedPostId(null)}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      className="cursor-move hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5 flex-shrink-0"
                                    >
                                      <GripVertical className="h-3 w-3 text-gray-400" />
                                    </div>
                                    <Badge 
                                      className="text-[10px] px-1.5 py-0.5 h-4 font-semibold"
                                      style={{
                                        backgroundColor: badgeColor,
                                        color: '#ffffff'
                                      }}
                                      data-testid={`badge-status-${post.id}`}
                                    >
                                      {badgeText}
                                    </Badge>
                                    <Badge 
                                      className="text-[10px] px-1.5 py-0.5 h-4 bg-blue-100 text-blue-800 font-semibold"
                                    >
                                      {post.language === 'English' ? 'EN' : post.language === 'French' ? 'FR' : post.language.substring(0, 2).toUpperCase()}
                                    </Badge>
                                  </div>
                                  
                                  {/* Right side: Eye icon (no X) */}
                                  <div className="flex gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        // Save current view mode for return navigation
                                        localStorage.setItem('calendar-return-view', viewMode);
                                        
                                        const params = new URLSearchParams(window.location.search);
                                        params.set('tab', 'posts');
                                        params.set('id', post.id);
                                        params.set('from', 'calendar');
                                        window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                                        window.dispatchEvent(new PopStateEvent('popstate'));
                                      }}
                                      className="h-4 w-4 p-0 flex-shrink-0"
                                      title="View or edit post"
                                      data-testid={`button-view-post-${post.id}`}
                                    >
                                      <Eye className="h-3 w-3 text-blue-600" />
                                    </Button>
                                  </div>
                                  </div>
                                </div>
                              </div>
                            );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Topic Selection Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assign Topic to {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </DialogTitle>
            <DialogDescription>
              Select a topic to assign to this day
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-modal"
            />

            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredTopics.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No topics match your search
                </div>
              ) : (
                filteredTopics.map((topic) => {
                  const assignmentInfo = getTopicAssignmentInfo(topic.id);
                  const isAlreadyPlanned = !!assignmentInfo;
                  
                  return (
                    <Card
                      key={topic.id}
                      className={`p-3 transition-colors ${
                        isAlreadyPlanned 
                          ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-75' 
                          : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => !isAlreadyPlanned && handleAssignTopic(topic.id)}
                      data-testid={`modal-topic-${topic.id}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-sm text-gray-900 dark:text-white flex-1">
                            {topic.title}
                          </div>
                          {isAlreadyPlanned && (
                            <Badge className="bg-[#D67C4A] text-white flex-shrink-0">
                              Planned: {new Date(assignmentInfo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs font-medium" data-keyword data-keyword-text={topic.primaryKeyword}>
                          Keyword: {topic.primaryKeyword}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="custom" className={`text-xs ${getCategoryColor(topic.category)}`} data-category-badge={topic.category}>
                            {topic.category}
                          </Badge>
                          <Badge variant="custom" className="text-xs" data-word-badge data-word-count={topic.targetWordCount}>
                            {topic.targetWordCount} words
                          </Badge>
                          <Badge variant="custom" className="text-xs" data-priority-badge data-priority-num={topic.priority}>
                            Priority {topic.priority}
                          </Badge>
                          <Badge variant="custom" className="text-xs bg-indigo-100 text-indigo-800" data-type-badge>
                            {topic.type}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blog Post Creator Modal */}
      {selectedTopic && (
        <BlogPostCreatorModal
          topic={selectedTopic}
          isOpen={isCreatorModalOpen}
          onClose={() => {
            setIsCreatorModalOpen(false);
            setSelectedTopic(null);
            // Invalidate queries to refresh calendar state
            queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
            queryClient.invalidateQueries({ queryKey: ['/api/admin/content/assignments'] });
          }}
        />
      )}
    </div>
  );
}
