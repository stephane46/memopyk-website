import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ContentTopic {
  id: string;
  title: string;
  slug: string;
  category: string;
  type: string;
  market: string;
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
  role: string;
  parent_topic_id: string | null;
  cluster: string | null;
  created_at: string;
  updated_at: string;
}

interface TopicFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: ContentTopic | null;
}

const CATEGORIES = [
  'PHOTO ORGANIZATION & PRESERVATION',
  'VIDEO MEMORY & LEGACY',
  'FAMILY STORYTELLING & TRADITIONS',
  'DIGITAL ORGANIZATION & TECHNOLOGY',
  'MEMORY PRODUCTS & CRAFTS',
  'SEASONAL & HOLIDAY CONTENT',
];

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

const STATUSES = ['backlog', 'planned', 'in_progress', 'published'];

const formatCluster = (cluster: string): string => {
  return cluster
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const toSnakeCase = (text: string): string => {
  return text.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

export function TopicFormModal({ isOpen, onClose, topic }: TopicFormModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageFields, setShowImageFields] = useState(false);
  const [showSeoResearch, setShowSeoResearch] = useState(false);

  // Fetch all topics for Parent Guide dropdown and cluster suggestions
  const { data: allTopics = [] } = useQuery<ContentTopic[]>({
    queryKey: ['/api/admin/content/topics'],
  });

  // Form fields (slug auto-generated from title, not shown in form)
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [market, setMarket] = useState('fr');
  const [status, setStatus] = useState('backlog');
  const [priority, setPriority] = useState('3');
  const [targetWordCount, setTargetWordCount] = useState('900');
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [searchVolume, setSearchVolume] = useState('');
  const [competition, setCompetition] = useState('');
  const [searchIntent, setSearchIntent] = useState('');
  const [contentAngle, setContentAngle] = useState('');
  const [description, setDescription] = useState('');
  const [heroImageConcept, setHeroImageConcept] = useState('');
  const [bodyImageConcepts, setBodyImageConcepts] = useState('');
  const [memopykLinkOpportunities, setMemopykLinkOpportunities] = useState('');
  const [role, setRole] = useState('spoke');
  const [cluster, setCluster] = useState('');
  const [parentTopicId, setParentTopicId] = useState('');

  // Unique clusters from existing topics for suggestions
  const existingClusters = useMemo(() => {
    const clusters = new Set<string>();
    allTopics.forEach(t => { if (t.cluster) clusters.add(t.cluster); });
    return Array.from(clusters).sort();
  }, [allTopics]);

  // Pillar topics in the same cluster for the Parent Guide dropdown
  const availablePillars = useMemo(() => {
    const clusterSnake = toSnakeCase(cluster);
    if (!clusterSnake) return [];
    return allTopics.filter(t =>
      t.role === 'pillar' &&
      t.cluster === clusterSnake &&
      t.id !== topic?.id
    );
  }, [allTopics, cluster, topic]);

  const isEditMode = !!topic;

  // Generate slug from title (used when submitting, not shown in UI)
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Populate form when editing
  useEffect(() => {
    if (topic) {
      setTitle(topic.title || '');
      setCategory(topic.category || '');
      setType(topic.type || '');
      setMarket(topic.market || 'fr');
      setStatus(topic.status || 'backlog');
      setPriority(topic.priority?.toString() || '3');
      setTargetWordCount(topic.target_word_count?.toString() || '900');
      setPrimaryKeyword(topic.primary_keyword || '');
      setSecondaryKeywords(topic.secondary_keywords?.join(', ') || '');
      setSearchVolume(topic.search_volume?.toString() || '');
      setCompetition(topic.competition || '');
      setSearchIntent(topic.search_intent || '');
      setContentAngle(topic.content_angle || '');
      setDescription(topic.description || '');
      setHeroImageConcept(topic.hero_image_concept || '');
      setBodyImageConcepts(topic.body_image_concepts?.join(', ') || '');
      setMemopykLinkOpportunities(topic.memopyk_link_opportunities || '');
      setRole(topic.role || 'spoke');
      setCluster(topic.cluster ? formatCluster(topic.cluster) : '');
      setParentTopicId(topic.parent_topic_id || '');
    } else {
      // Reset form for create mode
      setTitle('');
      setCategory('');
      setType('');
      setMarket('fr');
      setStatus('backlog');
      setPriority('3');
      setTargetWordCount('900');
      setPrimaryKeyword('');
      setSecondaryKeywords('');
      setSearchVolume('');
      setCompetition('');
      setSearchIntent('');
      setContentAngle('');
      setDescription('');
      setHeroImageConcept('');
      setBodyImageConcepts('');
      setMemopykLinkOpportunities('');
      setRole('spoke');
      setCluster('');
      setParentTopicId('');
    }
  }, [topic, isOpen]);

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    if (!category) {
      toast({ title: 'Category is required', variant: 'destructive' });
      return;
    }
    if (!type) {
      toast({ title: 'Type is required', variant: 'destructive' });
      return;
    }
    if (!primaryKeyword.trim()) {
      toast({ title: 'Primary keyword is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Auto-generate slug from title for new topics, keep existing for edits
      const slug = isEditMode && topic?.slug ? topic.slug : generateSlug(title.trim());

      const topicData = {
        title: title.trim(),
        slug,
        category,
        type,
        market,
        status,
        priority: parseInt(priority),
        target_word_count: parseInt(targetWordCount) || 900,
        primary_keyword: primaryKeyword.trim(),
        secondary_keywords: secondaryKeywords
          ? secondaryKeywords.split(',').map(kw => kw.trim()).filter(Boolean)
          : [],
        search_volume: searchVolume ? parseInt(searchVolume) : null,
        competition: competition.trim() || null,
        search_intent: searchIntent.trim() || '',
        content_angle: contentAngle.trim() || '',
        description: description.trim() || '',
        hero_image_concept: heroImageConcept.trim() || null,
        body_image_concepts: bodyImageConcepts
          ? bodyImageConcepts.split(',').map(c => c.trim()).filter(Boolean)
          : null,
        memopyk_link_opportunities: memopykLinkOpportunities.trim() || null,
        role,
        cluster: cluster.trim() ? toSnakeCase(cluster.trim()) : null,
        parent_topic_id: role === 'spoke' && parentTopicId ? parentTopicId : null,
      };

      if (isEditMode && topic) {
        // Update existing topic
        await apiRequest(`/api/admin/content/topics/${topic.id}`, 'PATCH', topicData);
        toast({ title: 'Topic updated successfully' });
      } else {
        // Create new topic
        await apiRequest('/api/admin/content/topics', 'POST', topicData);
        toast({ title: 'Topic created successfully' });
      }

      // Invalidate queries to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/content/topics'] });
      onClose();
    } catch (error: any) {
      console.error('Error saving topic:', error);
      toast({
        title: isEditMode ? 'Failed to update topic' : 'Failed to create topic',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-[#D67C4A]" />
            {isEditMode ? 'Edit Topic' : 'New Topic'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {isEditMode ? 'Update the topic details below' : 'Fill in the details to create a new topic'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">Basic Info</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-gray-900 dark:text-white">Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter topic title"
                  className="text-gray-900 dark:text-white"
                  data-testid="input-title"
                />
                <p className="text-xs text-gray-500 mt-0.5">The blog post title will be based on this</p>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-white">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-white">Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-white">Market</Label>
                <Select value={market} onValueChange={setMarket}>
                  <SelectTrigger data-testid="select-market">
                    <SelectValue placeholder="Select market" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">🇫🇷 France</SelectItem>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-0.5">Target market/language</p>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-white">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-white">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">P1 (Lowest)</SelectItem>
                    <SelectItem value="2">P2</SelectItem>
                    <SelectItem value="3">P3 (Medium)</SelectItem>
                    <SelectItem value="4">P4</SelectItem>
                    <SelectItem value="5">P5 (Highest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-white">Target Word Count</Label>
                <Input
                  type="number"
                  value={targetWordCount}
                  onChange={(e) => setTargetWordCount(e.target.value)}
                  placeholder="900"
                  className="text-gray-900 dark:text-white"
                  data-testid="input-word-count"
                />
                <p className="text-xs text-gray-500 mt-0.5">Target length for the generated article (default: 900)</p>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-white">Article Role</Label>
                <Select value={role} onValueChange={(val) => {
                  setRole(val);
                  if (val === 'pillar') setParentTopicId('');
                }}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spoke">Supporting Article</SelectItem>
                    <SelectItem value="pillar">Main Guide</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-0.5">Main Guide = broad overview; Supporting Article = deep dive on a specific angle</p>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-white">Topic Group</Label>
                <div className="relative">
                  <Input
                    value={cluster}
                    onChange={(e) => setCluster(e.target.value)}
                    placeholder="e.g. Gift Retirement"
                    className="text-gray-900 dark:text-white"
                    list="cluster-suggestions"
                    data-testid="input-cluster"
                  />
                  <datalist id="cluster-suggestions">
                    {existingClusters.map(c => (
                      <option key={c} value={formatCluster(c)} />
                    ))}
                  </datalist>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Group related articles together (e.g. "Gift Retirement")</p>
              </div>

              {role === 'spoke' && (
                <div>
                  <Label className="text-gray-900 dark:text-white">Parent Guide</Label>
                  <Select value={parentTopicId} onValueChange={setParentTopicId}>
                    <SelectTrigger data-testid="select-parent-topic">
                      <SelectValue placeholder="Select parent guide" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {availablePillars.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-0.5">Which Main Guide does this article support?</p>
                </div>
              )}
            </div>
          </div>

          {/* SEO Keywords */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">SEO Keywords</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-gray-900 dark:text-white">Primary Keyword *</Label>
                <Input
                  value={primaryKeyword}
                  onChange={(e) => setPrimaryKeyword(e.target.value)}
                  placeholder="Main SEO keyword"
                  className="text-gray-900 dark:text-white"
                  data-testid="input-primary-keyword"
                />
                <p className="text-xs text-gray-500 mt-0.5">Main keyword for SEO — appears in the post title and content</p>
              </div>

              <div className="md:col-span-2">
                <Label className="text-gray-900 dark:text-white">Secondary Keywords</Label>
                <Input
                  value={secondaryKeywords}
                  onChange={(e) => setSecondaryKeywords(e.target.value)}
                  placeholder="keyword1, keyword2, keyword3"
                  className="text-gray-900 dark:text-white"
                  data-testid="input-secondary-keywords"
                />
                <p className="text-xs text-gray-500 mt-0.5">Supporting keywords woven into the article (comma-separated)</p>
              </div>

              <div className="md:col-span-2">
                <Label className="text-gray-900 dark:text-white">Search Intent</Label>
                <Select value={searchIntent} onValueChange={setSearchIntent}>
                  <SelectTrigger data-testid="select-search-intent">
                    <SelectValue placeholder="Select search intent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Informational">Informational</SelectItem>
                    <SelectItem value="Transactional">Transactional</SelectItem>
                    <SelectItem value="Navigational">Navigational</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-0.5">What is the reader looking for? Sets the article's tone</p>
              </div>
            </div>
          </div>

          {/* SEO Research (Collapsible) */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowSeoResearch(!showSeoResearch)}
              className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white border-b pb-2 w-full"
            >
              SEO Research (Optional)
              {showSeoResearch ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>

            {showSeoResearch && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-900 dark:text-white">Search Volume</Label>
                  <Input
                    type="number"
                    value={searchVolume}
                    onChange={(e) => setSearchVolume(e.target.value)}
                    placeholder="Monthly searches"
                    className="text-gray-900 dark:text-white"
                    data-testid="input-search-volume"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Monthly searches — helps prioritize which topics to write first</p>
                </div>

                <div>
                  <Label className="text-gray-900 dark:text-white">Competition</Label>
                  <Select value={competition} onValueChange={setCompetition}>
                    <SelectTrigger data-testid="select-competition">
                      <SelectValue placeholder="Select competition level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-0.5">How hard is it to rank for this keyword?</p>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">Content</h3>

            <div>
              <Label className="text-gray-900 dark:text-white">Content Angle</Label>
              <Textarea
                value={contentAngle}
                onChange={(e) => setContentAngle(e.target.value)}
                placeholder="The unique angle or approach for this content..."
                className="text-gray-900 dark:text-white h-20"
                data-testid="textarea-content-angle"
              />
              <p className="text-xs text-gray-500 mt-0.5">What makes this article different? Your unique take on the topic</p>
            </div>

            <div>
              <Label className="text-gray-900 dark:text-white">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the topic..."
                className="text-gray-900 dark:text-white h-24"
                data-testid="textarea-description"
              />
              <p className="text-xs text-gray-500 mt-0.5">What should the article cover? A brief outline or scope</p>
            </div>

            <div>
              <Label className="text-gray-900 dark:text-white">MEMOPYK Link Opportunities</Label>
              <Textarea
                value={memopykLinkOpportunities}
                onChange={(e) => setMemopykLinkOpportunities(e.target.value)}
                placeholder="Internal linking opportunities to MEMOPYK services..."
                className="text-gray-900 dark:text-white h-20"
                data-testid="textarea-link-opportunities"
              />
              <p className="text-xs text-gray-500 mt-0.5">Which MEMOPYK pages could this article link to?</p>
            </div>
          </div>

          {/* Images (Collapsible) */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowImageFields(!showImageFields)}
              className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white border-b pb-2 w-full"
            >
              Images (Optional)
              {showImageFields ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>

            {showImageFields && (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-900 dark:text-white">Hero Image Concept</Label>
                  <Textarea
                    value={heroImageConcept}
                    onChange={(e) => setHeroImageConcept(e.target.value)}
                    placeholder="Description of the ideal hero image..."
                    className="text-gray-900 dark:text-white h-20"
                    data-testid="textarea-hero-image"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Describe the ideal banner image for this article</p>
                </div>

                <div>
                  <Label className="text-gray-900 dark:text-white">Body Image Concepts</Label>
                  <Textarea
                    value={bodyImageConcepts}
                    onChange={(e) => setBodyImageConcepts(e.target.value)}
                    placeholder="Image concept 1, Image concept 2, ..."
                    className="text-gray-900 dark:text-white h-20"
                    data-testid="textarea-body-images"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Image ideas for inside the article (comma-separated)</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#D67C4A] hover:bg-[#C56B3A] text-white"
            data-testid="button-save"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? 'Update Topic' : 'Create Topic'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
