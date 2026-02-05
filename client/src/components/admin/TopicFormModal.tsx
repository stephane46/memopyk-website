import { useState, useEffect } from 'react';
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

export function TopicFormModal({ isOpen, onClose, topic }: TopicFormModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageFields, setShowImageFields] = useState(false);
  const [autoSlug, setAutoSlug] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
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

  const isEditMode = !!topic;

  // Generate slug from title
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Auto-generate slug when title changes
  useEffect(() => {
    if (!isEditMode) {
      const newAutoSlug = generateSlug(title);
      setAutoSlug(newAutoSlug);
      // Only update slug if it matches the previous auto-slug or is empty
      if (slug === '' || slug === autoSlug) {
        setSlug(newAutoSlug);
      }
    }
  }, [title, isEditMode]);

  // Populate form when editing
  useEffect(() => {
    if (topic) {
      setTitle(topic.title || '');
      setSlug(topic.slug || '');
      setCategory(topic.category || '');
      setType(topic.type || '');
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
    } else {
      // Reset form for create mode
      setTitle('');
      setSlug('');
      setCategory('');
      setType('');
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
      setAutoSlug('');
    }
  }, [topic, isOpen]);

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    if (!slug.trim()) {
      toast({ title: 'Slug is required', variant: 'destructive' });
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
      const topicData = {
        title: title.trim(),
        slug: slug.trim(),
        category,
        type,
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
              </div>

              <div className="md:col-span-2">
                <Label className="text-gray-900 dark:text-white">Slug *</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-friendly-slug"
                  className="text-gray-900 dark:text-white font-mono"
                  data-testid="input-slug"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-generated from title. Edit to customize.</p>
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
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">SEO</h3>

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
                <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
              </div>

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
              </div>

              <div>
                <Label className="text-gray-900 dark:text-white">Competition</Label>
                <Input
                  value={competition}
                  onChange={(e) => setCompetition(e.target.value)}
                  placeholder="Low / Medium / High"
                  className="text-gray-900 dark:text-white"
                  data-testid="input-competition"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-gray-900 dark:text-white">Search Intent</Label>
                <Input
                  value={searchIntent}
                  onChange={(e) => setSearchIntent(e.target.value)}
                  placeholder="Informational / Transactional / Navigational"
                  className="text-gray-900 dark:text-white"
                  data-testid="input-search-intent"
                />
              </div>
            </div>
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
                  <p className="text-xs text-gray-500 mt-1">Comma-separated list of image concepts</p>
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
