import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Eye, Save, History, RotateCcw, Globe } from 'lucide-react';

// Form validation schema
const seoFormSchema = z.object({
  title: z.string().max(70, 'Title must be 70 characters or less').optional(),
  description: z.string().max(320, 'Description must be 320 characters or less').optional(),
  canonical: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  keywords: z.string().optional(),
  robotsIndex: z.boolean().default(true),
  robotsFollow: z.boolean().default(true),
  robotsNoArchive: z.boolean().default(false),
  robotsNoSnippet: z.boolean().default(false),
  jsonLd: z.string().optional(),
  'openGraph.title': z.string().optional(),
  'openGraph.description': z.string().optional(),
  'openGraph.image': z.string().url('Must be a valid URL').optional().or(z.literal('')),
  'openGraph.type': z.string().default('website'),
  'openGraph.url': z.string().url('Must be a valid URL').optional().or(z.literal('')),
  'twitter.card': z.string().default('summary_large_image'),
  'twitter.title': z.string().optional(),
  'twitter.description': z.string().optional(),
  'twitter.image': z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type SeoFormData = z.infer<typeof seoFormSchema>;

interface SeoData {
  lang: 'fr-FR' | 'en-US';
  title?: string;
  description?: string;
  canonical?: string;
  keywords?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  robotsNoArchive: boolean;
  robotsNoSnippet: boolean;
  jsonLd?: string;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
    url?: string;
  };
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  hreflang?: Array<{
    lang: string;
    href: string;
  }>;
  extras?: Array<{
    name: string;
    content: string;
  }>;
}

const SeoManagement: React.FC = () => {
  const [currentLang, setCurrentLang] = useState<'fr-FR' | 'en-US'>('fr-FR');
  const [seoData, setSeoData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [hreflangList, setHreflangList] = useState<Array<{lang: string; href: string}>>([]);
  const [extrasList, setExtrasList] = useState<Array<{name: string; content: string}>>([]);

  const { toast } = useToast();

  const form = useForm<SeoFormData>({
    resolver: zodResolver(seoFormSchema),
    defaultValues: {
      title: '',
      description: '',
      canonical: '',
      keywords: '',
      robotsIndex: true,
      robotsFollow: true,
      robotsNoArchive: false,
      robotsNoSnippet: false,
      jsonLd: '',
      'openGraph.title': '',
      'openGraph.description': '',
      'openGraph.image': '',
      'openGraph.type': 'website',
      'openGraph.url': '',
      'twitter.card': 'summary_large_image',
      'twitter.title': '',
      'twitter.description': '',
      'twitter.image': '',
    },
  });

  // API helper with auth token
  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const token = 'admin-token-temp'; // In production, get from auth context
    
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
  };

  // Load SEO data for current language
  const loadSeoData = async () => {
    setLoading(true);
    try {
      const response = await apiRequest(`/api/admin/seo?lang=${currentLang}`);
      
      if (!response.ok) {
        throw new Error('Failed to load SEO data');
      }

      const data = await response.json();
      console.log('🔍 SEO LOAD DEBUG - Raw API Response:', data);
      setSeoData(data);
      
      // Populate form with data
      if (data) {
        const formData = {
          title: data.title || '',
          description: data.description || '',
          canonical: data.canonical || '',
          keywords: data.keywords || '',
          robotsIndex: data.robotsIndex ?? true,
          robotsFollow: data.robotsFollow ?? true,
          robotsNoArchive: data.robotsNoArchive ?? false,
          robotsNoSnippet: data.robotsNoSnippet ?? false,
          jsonLd: data.jsonLd || '',
          'openGraph.title': data.openGraph?.title || '',
          'openGraph.description': data.openGraph?.description || '',
          'openGraph.image': data.openGraph?.image || '',
          'openGraph.type': data.openGraph?.type || 'website',
          'openGraph.url': data.openGraph?.url || '',
          'twitter.card': data.twitter?.card || 'summary_large_image',
          'twitter.title': data.twitter?.title || '',
          'twitter.description': data.twitter?.description || '',
          'twitter.image': data.twitter?.image || '',
        };
        
        console.log('🔍 SEO LOAD DEBUG - Form Data Before Reset:', formData);
        
        // Use form.reset() with keepDefaultValues: false to force complete reset
        form.reset(formData, { keepDefaultValues: false });
        
        // Additional debug after reset
        setTimeout(() => {
          const afterResetValues = {
            title: form.getValues('title'),
            description: form.getValues('description'),
            keywords: form.getValues('keywords')
          };
          console.log('🔍 SEO LOAD DEBUG - Form Values After Reset:', afterResetValues);
          console.log('🔍 SEO LOAD DEBUG - Form Watch Values:', {
            title: form.watch('title'),
            description: form.watch('description'),
            keywords: form.watch('keywords')
          });
        }, 100);

        setHreflangList(data.hreflang || []);
        setExtrasList(data.extras || []);
      }
    } catch (error) {
      console.error('Error loading SEO data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SEO data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Save SEO data
  const onSubmit = async (data: SeoFormData) => {
    console.log('🔍 SEO SAVE DEBUG - Form Data Submitted:', data);
    setSaving(true);
    try {
      const payload = {
        lang: currentLang,
        title: data.title || undefined,
        description: data.description || undefined,
        canonical: data.canonical || undefined,
        keywords: data.keywords || undefined,
        robotsIndex: data.robotsIndex,
        robotsFollow: data.robotsFollow,
        robotsNoArchive: data.robotsNoArchive,
        robotsNoSnippet: data.robotsNoSnippet,
        jsonLd: data.jsonLd || undefined,
        openGraph: {
          title: data['openGraph.title'] || undefined,
          description: data['openGraph.description'] || undefined,
          image: data['openGraph.image'] || undefined,
          type: data['openGraph.type'] || 'website',
          url: data['openGraph.url'] || undefined,
        },
        twitter: {
          card: data['twitter.card'] || 'summary_large_image',
          title: data['twitter.title'] || undefined,
          description: data['twitter.description'] || undefined,
          image: data['twitter.image'] || undefined,
        },
        hreflang: hreflangList.filter(item => item.lang && item.href),
        extras: extrasList.filter(item => item.name && item.content),
        changeReason: `Updated SEO settings for ${currentLang}`,
      };

      const response = await apiRequest('/api/admin/seo', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save SEO data');
      }

      toast({
        title: 'Success',
        description: 'SEO settings saved successfully',
      });

      // Reload data
      await loadSeoData();
    } catch (error: any) {
      console.error('Error saving SEO data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save SEO data',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Generate preview
  const generatePreview = async () => {
    try {
      const response = await apiRequest(`/api/admin/seo/preview?lang=${currentLang}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const data = await response.json();
      setPreviewHtml(data.headHtml);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate preview',
        variant: 'destructive',
      });
    }
  };

  // Load history
  const loadHistory = async () => {
    try {
      const response = await apiRequest(`/api/admin/seo/history?lang=${currentLang}`);
      
      if (!response.ok) {
        throw new Error('Failed to load history');
      }

      const data = await response.json();
      setHistory(data.history || []);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load history',
        variant: 'destructive',
      });
    }
  };

  // Publish settings
  const publishSettings = async () => {
    setPublishing(true);
    try {
      const response = await apiRequest(`/api/admin/seo/publish?lang=${currentLang}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to publish settings');
      }

      toast({
        title: 'Published',
        description: 'SEO settings published successfully',
      });
    } catch (error) {
      console.error('Error publishing settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish settings',
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  // Add hreflang entry
  const addHreflangEntry = () => {
    setHreflangList([...hreflangList, { lang: '', href: '' }]);
  };

  // Remove hreflang entry
  const removeHreflangEntry = (index: number) => {
    setHreflangList(hreflangList.filter((_, i) => i !== index));
  };

  // Add extra meta tag
  const addExtraEntry = () => {
    setExtrasList([...extrasList, { name: '', content: '' }]);
  };

  // Remove extra meta tag
  const removeExtraEntry = (index: number) => {
    setExtrasList(extrasList.filter((_, i) => i !== index));
  };

  // Load data when language changes
  useEffect(() => {
    console.log('🔍 SEO MANAGEMENT COMPONENT - Language changed to:', currentLang);
    loadSeoData();
  }, [currentLang]);

  // Component mount debug
  useEffect(() => {
    console.log('🔍 SEO MANAGEMENT COMPONENT - Component mounted');
    return () => console.log('🔍 SEO MANAGEMENT COMPONENT - Component unmounted');
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading SEO settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SEO Management</h1>
          <p className="text-muted-foreground">
            Manage meta tags, Open Graph data, and structured data for both languages
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Language Switcher */}
          <div className="flex items-center gap-2">
            <Label>Language:</Label>
            <div className="flex rounded-lg border-2 border-gray-300 overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentLang('fr-FR')}
                className={currentLang === 'fr-FR' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
                style={{ borderRadius: '0', border: '0', padding: '8px 16px' }}
              >
                🇫🇷 French
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentLang('en-US')}
                className={currentLang === 'en-US' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
                style={{ borderRadius: '0', border: '0', padding: '8px 16px' }}
              >
                🇺🇸 English
              </Button>
            </div>
          </div>



          <Button
            onClick={loadHistory}
            variant="outline"
            size="sm"
            className="seo-btn-history"
            data-testid="button-history-seo"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>

          <Button
            onClick={publishSettings}
            size="sm"
            className="seo-btn-publish"
            data-testid="button-publish-seo"
            disabled={publishing}
          >
            {publishing ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Publishing...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 mr-2" />
                Publish
              </>
            )}
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList style={{ display: 'grid', width: '100%', gridTemplateColumns: 'repeat(5, 1fr)', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
            <TabsTrigger 
              value="basic"
              className="seo-tab"
            >
              Basic SEO
            </TabsTrigger>
            <TabsTrigger 
              value="robots"
              className="seo-tab"
            >
              Robots
            </TabsTrigger>
            <TabsTrigger 
              value="social"
              className="seo-tab"
            >
              Social Media
            </TabsTrigger>
            <TabsTrigger 
              value="advanced"
              className="seo-tab"
            >
              Advanced
            </TabsTrigger>
            <TabsTrigger 
              value="preview-tab"
              className="seo-tab"
            >
              Live Preview
            </TabsTrigger>
          </TabsList>

          {/* Basic SEO Tab */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic SEO Settings</CardTitle>
                <CardDescription>
                  Core meta tags for search engines
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Page Title</Label>
                  <div className="relative">
                    <Input
                      id="title"
                      {...form.register('title')}
                      placeholder="Enter page title (max 70 chars)"
                      maxLength={70}
                      data-testid="input-title"
                    />
                    <div className="absolute right-2 top-2 text-xs text-muted-foreground">
                      {form.watch('title')?.length || 0}/70
                    </div>
                  </div>
                  {form.formState.errors.title && (
                    <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Meta Description</Label>
                  <div className="relative">
                    <Textarea
                      id="description"
                      {...form.register('description')}
                      placeholder="Enter meta description (max 320 chars)"
                      maxLength={320}
                      className="min-h-[80px]"
                      data-testid="textarea-description"
                    />
                    <div className="absolute right-2 bottom-2 text-xs text-muted-foreground">
                      {form.watch('description')?.length || 0}/320
                    </div>
                  </div>
                  {form.formState.errors.description && (
                    <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords</Label>
                  <Input
                    id="keywords"
                    {...form.register('keywords')}
                    placeholder="keyword1, keyword2, keyword3"
                    data-testid="input-keywords"
                  />
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Comma-separated keywords (Note: Google ignores meta keywords since 2009, but other search engines may still use them)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="canonical">Canonical URL</Label>
                  <Input
                    id="canonical"
                    {...form.register('canonical')}
                    placeholder="https://memopyk.com/page"
                    data-testid="input-canonical"
                  />
                  {form.formState.errors.canonical && (
                    <p className="text-sm text-red-500">{form.formState.errors.canonical.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Search Result Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Search Result Preview</CardTitle>
                <CardDescription>How this will appear in Google search results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-gray-200 rounded p-4 bg-gray-50">
                  <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
                    {form.watch('title') || 'Your Page Title Here'}
                  </div>
                  <div className="text-green-700 text-sm">
                    {form.watch('canonical') || 'https://memopyk.com/your-page'}
                  </div>
                  <div className="text-gray-600 text-sm mt-1">
                    {form.watch('description') || 'Your meta description will appear here. Make it compelling to encourage clicks from search results.'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Robots Tab */}
          <TabsContent value="robots" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Robots Meta Settings</CardTitle>
                <CardDescription>Control how search engines crawl and index this page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Index Page</Label>
                    <p className="text-sm text-muted-foreground">Allow search engines to index this page</p>
                  </div>
                  <Switch
                    checked={form.watch('robotsIndex')}
                    onCheckedChange={(checked) => form.setValue('robotsIndex', checked)}
                    data-testid="switch-robots-index"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Follow Links</Label>
                    <p className="text-sm text-muted-foreground">Allow search engines to follow links on this page</p>
                  </div>
                  <Switch
                    checked={form.watch('robotsFollow')}
                    onCheckedChange={(checked) => form.setValue('robotsFollow', checked)}
                    data-testid="switch-robots-follow"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>No Archive</Label>
                    <p className="text-sm text-muted-foreground">Prevent search engines from caching this page</p>
                  </div>
                  <Switch
                    checked={form.watch('robotsNoArchive')}
                    onCheckedChange={(checked) => form.setValue('robotsNoArchive', checked)}
                    data-testid="switch-robots-noarchive"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>No Snippet</Label>
                    <p className="text-sm text-muted-foreground">Prevent search engines from showing page snippets</p>
                  </div>
                  <Switch
                    checked={form.watch('robotsNoSnippet')}
                    onCheckedChange={(checked) => form.setValue('robotsNoSnippet', checked)}
                    data-testid="switch-robots-nosnippet"
                  />
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Current robots meta tag:</h4>
                  <code className="text-sm text-blue-800">
                    {`<meta name="robots" content="${
                      [
                        form.watch('robotsIndex') ? 'index' : 'noindex',
                        form.watch('robotsFollow') ? 'follow' : 'nofollow',
                        form.watch('robotsNoArchive') ? 'noarchive' : '',
                        form.watch('robotsNoSnippet') ? 'nosnippet' : ''
                      ].filter(Boolean).join(', ')
                    }" />`}
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Open Graph */}
              <Card>
                <CardHeader>
                  <CardTitle>Open Graph (Facebook, LinkedIn)</CardTitle>
                  <CardDescription>How your content appears when shared on social media</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="og-title">OG Title</Label>
                    <Input
                      id="og-title"
                      {...form.register('openGraph.title')}
                      placeholder="Open Graph title"
                      data-testid="input-og-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="og-description">OG Description</Label>
                    <Textarea
                      id="og-description"
                      {...form.register('openGraph.description')}
                      placeholder="Open Graph description"
                      data-testid="textarea-og-description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="og-image">OG Image URL</Label>
                    <Input
                      id="og-image"
                      {...form.register('openGraph.image')}
                      placeholder="https://example.com/image.jpg"
                      data-testid="input-og-image"
                    />
                    {form.formState.errors['openGraph.image'] && (
                      <p className="text-sm text-red-500">{form.formState.errors['openGraph.image']?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="og-type">OG Type</Label>
                    <Input
                      id="og-type"
                      {...form.register('openGraph.type')}
                      placeholder="website"
                      data-testid="input-og-type"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="og-url">OG URL</Label>
                    <Input
                      id="og-url"
                      {...form.register('openGraph.url')}
                      placeholder="https://memopyk.com/page"
                      data-testid="input-og-url"
                    />
                    {form.formState.errors['openGraph.url'] && (
                      <p className="text-sm text-red-500">{form.formState.errors['openGraph.url']?.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Twitter Cards */}
              <Card>
                <CardHeader>
                  <CardTitle>Twitter Cards</CardTitle>
                  <CardDescription>How your content appears on Twitter/X</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="twitter-card">Card Type</Label>
                    <select
                      id="twitter-card"
                      {...form.register('twitter.card')}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      data-testid="select-twitter-card"
                    >
                      <option value="summary">Summary</option>
                      <option value="summary_large_image">Summary Large Image</option>
                      <option value="app">App</option>
                      <option value="player">Player</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter-title">Twitter Title</Label>
                    <Input
                      id="twitter-title"
                      {...form.register('twitter.title')}
                      placeholder="Twitter title"
                      data-testid="input-twitter-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter-description">Twitter Description</Label>
                    <Textarea
                      id="twitter-description"
                      {...form.register('twitter.description')}
                      placeholder="Twitter description"
                      data-testid="textarea-twitter-description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter-image">Twitter Image URL</Label>
                    <Input
                      id="twitter-image"
                      {...form.register('twitter.image')}
                      placeholder="https://example.com/image.jpg"
                      data-testid="input-twitter-image"
                    />
                    {form.formState.errors['twitter.image'] && (
                      <p className="text-sm text-red-500">{form.formState.errors['twitter.image']?.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4">
            {/* JSON-LD Structured Data */}
            <Card>
              <CardHeader>
                <CardTitle>JSON-LD Structured Data</CardTitle>
                <CardDescription>Add structured data for rich snippets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="jsonLd">JSON-LD Code</Label>
                  <Textarea
                    id="jsonLd"
                    {...form.register('jsonLd')}
                    placeholder='{"@context": "https://schema.org", "@type": "Organization", ...}'
                    className="min-h-[120px] font-mono text-sm"
                    data-testid="textarea-jsonld"
                  />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    <span>Must be valid JSON format</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hreflang */}
            <Card>
              <CardHeader>
                <CardTitle>Hreflang Alternate Languages</CardTitle>
                <CardDescription>Specify alternate language versions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hreflangList.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="fr-FR"
                      value={item.lang}
                      onChange={(e) => {
                        const newList = [...hreflangList];
                        newList[index].lang = e.target.value;
                        setHreflangList(newList);
                      }}
                      className="flex-1"
                      data-testid={`input-hreflang-lang-${index}`}
                    />
                    <Input
                      placeholder="https://memopyk.com/fr-FR"
                      value={item.href}
                      onChange={(e) => {
                        const newList = [...hreflangList];
                        newList[index].href = e.target.value;
                        setHreflangList(newList);
                      }}
                      className="flex-2"
                      data-testid={`input-hreflang-href-${index}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeHreflangEntry(index)}
                      data-testid={`button-remove-hreflang-${index}`}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addHreflangEntry}
                  data-testid="button-add-hreflang"
                >
                  Add Hreflang Entry
                </Button>
              </CardContent>
            </Card>

            {/* Extra Meta Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Extra Meta Tags</CardTitle>
                <CardDescription>Additional custom meta tags</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {extrasList.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="name"
                      value={item.name}
                      onChange={(e) => {
                        const newList = [...extrasList];
                        newList[index].name = e.target.value;
                        setExtrasList(newList);
                      }}
                      className="flex-1"
                      data-testid={`input-extra-name-${index}`}
                    />
                    <Input
                      placeholder="content"
                      value={item.content}
                      onChange={(e) => {
                        const newList = [...extrasList];
                        newList[index].content = e.target.value;
                        setExtrasList(newList);
                      }}
                      className="flex-2"
                      data-testid={`input-extra-content-${index}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeExtraEntry(index)}
                      data-testid={`button-remove-extra-${index}`}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addExtraEntry}
                  data-testid="button-add-extra"
                >
                  Add Extra Meta Tag
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Preview Tab */}
          <TabsContent value="preview-tab" className="space-y-4">
            {/* HTML Language Attribute Info */}
            <Card>
              <CardHeader>
                <CardTitle>HTML Language Attribute</CardTitle>
                <CardDescription>
                  The HTML lang attribute that will be set based on the current language selection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">Current Language Setting:</span>
                  </div>
                  <div className="bg-gray-900 text-green-400 p-3 rounded border">
                    <code className="text-sm">
                      {`<html lang="${currentLang === 'fr-FR' ? 'fr' : 'en'}">`}
                    </code>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                    This indicates to search engines and browsers that the page content is in{' '}
                    <strong>{currentLang === 'fr-FR' ? 'French' : 'English'}</strong>, helping with:
                  </p>
                  <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-4 list-disc space-y-1">
                    <li>Search engine language detection and indexing</li>
                    <li>Screen reader pronunciation and accessibility</li>
                    <li>Browser translation offers and language-specific features</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Live HTML Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Complete HTML Head Tags Preview</CardTitle>
                <CardDescription>
                  Preview of all generated HTML meta tags and structured data for the current language
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
                  <pre className="text-sm">
                    <code>
                      {previewHtml || 'Click "Generate Preview" button to see complete HTML head output including all meta tags, Open Graph data, and structured markup'}
                    </code>
                  </pre>
                </div>
                <div className="mt-4">
                  <Button onClick={generatePreview} variant="outline" data-testid="button-generate-preview">
                    <Eye className="w-4 h-4 mr-2" />
                    Generate Complete Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {currentLang === 'fr-FR' ? 'French' : 'English'}
            </Badge>
            {seoData && (
              <Badge variant="outline">
                Last updated: {new Date().toLocaleDateString()}
              </Badge>
            )}
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="seo-btn-save"
            data-testid="button-save-seo"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-3" />
                Save SEO Settings
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent 
          className="max-w-4xl max-h-[80vh] overflow-auto dialog-content modal-force-white" 
          style={{ 
            backgroundColor: '#ffffff',
            background: '#ffffff',
            opacity: '1'
          }}
        >
          <DialogHeader>
            <DialogTitle>SEO Preview - {currentLang}</DialogTitle>
            <DialogDescription>
              This is how the HTML head tags will appear in the actual page
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
            <pre className="text-sm whitespace-pre-wrap">
              <code>{previewHtml}</code>
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent 
          className="max-w-2xl max-h-[80vh] overflow-auto dialog-content modal-force-white" 
          style={{ 
            backgroundColor: '#ffffff',
            background: '#ffffff',
            opacity: '1'
          }}
        >
          <DialogHeader>
            <DialogTitle>SEO History - {currentLang}</DialogTitle>
            <DialogDescription>
              Version history and changes made to SEO settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {history.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No history available yet
              </p>
            ) : (
              history.map((entry, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>Version {entry.version}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">
                    Changed by: <strong>{entry.createdBy}</strong>
                  </p>
                  {entry.changeReason && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Reason: {entry.changeReason}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      // Implement rollback functionality
                      console.log('Rollback to version', entry.version);
                    }}
                    data-testid={`button-rollback-${entry.version}`}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Rollback to this version
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeoManagement;