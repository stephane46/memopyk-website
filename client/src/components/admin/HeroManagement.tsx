import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, adminFetch } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUp, ArrowDown, Video, X, Type, Save, Trash2, Upload, FileVideo } from 'lucide-react';
import { formatFrenchDateTime } from '@/utils/date-format';
import { useToast } from '@/hooks/use-toast';

interface HeroVideo {
  id: string;
  titleEn: string;
  titleFr: string;
  urlEn: string;
  urlFr: string;
  useSameVideo: boolean;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function HeroManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [heroTab, setHeroTab] = useState('videos');
  const [previewVideo, setPreviewVideo] = useState<{ url: string; title: string } | null>(null);
  const [editingVideo, setEditingVideo] = useState<any | null>(null);
  const [editVideoData, setEditVideoData] = useState({
    urlEn: '',
    urlFr: '',
    useSameVideo: true
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<number | null>(null);
  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({ titleMobileFr: '', titleMobileEn: '', titleDesktopFr: '', titleDesktopEn: '' });
  const [showNewTextForm, setShowNewTextForm] = useState(false);
  const [newTextData, setNewTextData] = useState({ titleMobileFr: '', titleMobileEn: '', titleDesktopFr: '', titleDesktopEn: '', fontSizeDesktop: 60, fontSizeTablet: 45, fontSizeMobile: 32 });
  const [currentPreviewLanguage, setCurrentPreviewLanguage] = useState<'fr' | 'en'>('fr');

  // Fetch hero videos
  const { data: heroVideos = [], isLoading: videosLoading } = useQuery<HeroVideo[]>({
    queryKey: ['/api/hero-videos'],
  });

  // Fetch hero text overlays
  const { data: heroTexts = [], isLoading: textsLoading } = useQuery<any[]>({
    queryKey: ['/api/hero-text'],
  });

  // Sync responsive font sizes when a text is selected
  useEffect(() => {
    if (selectedTextId && heroTexts.length > 0) {
      // Preview functionality removed - interface simplified
    }
  }, [selectedTextId, heroTexts]);

  // File upload handler
  const handleFileUpload = async (file: File, isEnglish: boolean = true) => {
    if (!file.type.includes('video')) {
      toast({ title: "Error", description: "Please select a video file", variant: "destructive" });
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await adminFetch('/api/hero-videos/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        const filename = result.filename;

        if (editVideoData.useSameVideo) {
          setEditVideoData(prev => ({ ...prev, urlEn: filename, urlFr: filename }));
        } else {
          if (isEnglish) {
            setEditVideoData(prev => ({ ...prev, urlEn: filename }));
          } else {
            setEditVideoData(prev => ({ ...prev, urlFr: filename }));
          }
        }

        toast({ title: "Success!", description: `Video uploaded: ${filename}` });
      } else {
        const errorData = await response.json();
        toast({ title: "Error", description: errorData.error || "Failed to upload video", variant: "destructive" });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingFile(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Video reordering mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ videoId, newOrder }: { videoId: string; newOrder: number }) => {
      console.log('=== MUTATION STARTED ===');
      console.log('Sending PATCH to:', `/api/hero-videos/${videoId}/reorder`);
      console.log('Payload:', { orderIndex: newOrder });

      const response = await apiRequest(`/api/hero-videos/${videoId}/reorder`, 'PATCH', { orderIndex: newOrder });
      const result = await response.json();
      console.log('=== MUTATION RESPONSE ===', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('=== MUTATION SUCCESS ===', data);
      queryClient.invalidateQueries({ queryKey: ['/api/hero-videos'] });
      toast({ title: "Success", description: "Video order updated successfully" });
    },
    onError: (error) => {
      console.log('=== MUTATION ERROR ===', error);
      toast({ title: "Error", description: "Failed to update video order", variant: "destructive" });
    }
  });

  // Video toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ videoId, isActive }: { videoId: string; isActive: boolean }) => {
      const response = await apiRequest(`/api/hero-videos/${videoId}/toggle`, 'PATCH', { isActive });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-videos'] });
      toast({ title: "Success", description: "Video status updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update video status", variant: "destructive" });
    }
  });

  // Hero text update mutation
  const updateTextMutation = useMutation({
    mutationFn: async ({ textId, data }: { textId: number; data: any }) => {
      const response = await apiRequest(`/api/hero-text/${textId}`, 'PATCH', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'fr-FR'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'en-US'] });
      toast({ title: "Succès", description: "Texte hero mis à jour avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la mise à jour du texte", variant: "destructive" });
    }
  });

  // Apply text to site mutation
  const applyTextMutation = useMutation({
    mutationFn: async ({ textId, fontSizes }: {
      textId: number;
      fontSizes: {
        desktop: number;
        tablet: number;
        mobile: number;
        legacy?: number;
      }
    }) => {
      const response = await apiRequest(`/api/hero-text/${textId}/apply`, 'PATCH', {
        fontSize: fontSizes.legacy || fontSizes.desktop,
        fontSizeDesktop: fontSizes.desktop,
        fontSizeTablet: fontSizes.tablet,
        fontSizeMobile: fontSizes.mobile,
        isActive: true
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'fr-FR'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'en-US'] });
      toast({ title: "Succès", description: "Texte appliqué au site avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de l'application du texte", variant: "destructive" });
    }
  });

  // Create new text mutation
  const createTextMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/hero-text', 'POST', data);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'fr-FR'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'en-US'] });
      setShowNewTextForm(false);
      setNewTextData({ titleMobileFr: '', titleMobileEn: '', titleDesktopFr: '', titleDesktopEn: '', fontSizeDesktop: 60, fontSizeTablet: 45, fontSizeMobile: 36 });
      toast({ title: "Succès", description: "Nouveau texte créé avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la création du texte", variant: "destructive" });
    }
  });

  // Delete text mutation
  const deleteTextMutation = useMutation({
    mutationFn: async (textId: number) => {
      const response = await apiRequest(`/api/hero-text/${textId}`, 'DELETE');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'fr-FR'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hero-text', 'en-US'] });
      setSelectedTextId(null);
      setEditingTextId(null);
      toast({ title: "Succès", description: "Texte supprimé avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la suppression du texte", variant: "destructive" });
    }
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Gestion Hero</h2>
          <p className="text-muted-foreground">Gérer les vidéos du carrousel héros avec support bilingue</p>
        </div>

        {/* Hero Tabs - SEO Management Style */}
        <div className="mb-6">
          <div className="flex rounded-lg border-2 border-gray-300 overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHeroTab('videos')}
              className={heroTab === 'videos' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
              style={{ borderRadius: '0', border: '0', padding: '12px 24px' }}
            >
              <Video className="h-4 w-4 mr-2" />
              Gestion Vidéos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHeroTab('text')}
              className={heroTab === 'text' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
              style={{ borderRadius: '0', border: '0', padding: '12px 24px' }}
            >
              <Type className="h-4 w-4 mr-2" />
              Textes & Superpositions
            </Button>
          </div>
        </div>

        {/* Videos Tab */}
        {heroTab === 'videos' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Hero Video Management
            </CardTitle>
            <CardDescription>
              Manage hero carousel videos with bilingual support, ordering, and metadata
            </CardDescription>
          </CardHeader>
          <CardContent>
            {videosLoading ? (
              <div className="text-center py-8">Loading videos...</div>
            ) : (
              <div className="space-y-6">
                {/* Add New Video Button */}
                <Card className="border-dashed border-2 border-gray-300 dark:border-gray-600">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800">
                        <Video className="h-6 w-6 text-gray-700" />
                      </div>
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Add New Hero Video</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-700">Upload a new video to the hero carousel</p>
                      <div className="mt-6">
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          id="video-upload"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              toast({ title: "Upload Started", description: `Uploading ${file.name}...` });

                              try {
                                const formData = new FormData();
                                formData.append('video', file);
                                formData.append('title_en', `New Video - ${file.name}`);
                                formData.append('title_fr', `Nouvelle Vidéo - ${file.name}`);

                                const response = await fetch('/api/hero-videos/upload', {
                                  method: 'POST',
                                  body: formData
                                });

                                if (response.ok) {
                                  const result = await response.json();
                                  const filename = result.filename;

                                  const createResponse = await fetch('/api/hero-videos', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      titleEn: `New Video - ${file.name}`,
                                      titleFr: `Nouvelle Vidéo - ${file.name}`,
                                      urlEn: filename,
                                      urlFr: filename,
                                      useSameVideo: true,
                                      isActive: true,
                                      orderIndex: heroVideos.length + 1
                                    })
                                  });

                                  if (createResponse.ok) {
                                    toast({ title: "Success", description: "Video uploaded and added successfully!" });
                                    queryClient.invalidateQueries({ queryKey: ['/api/hero-videos'] });
                                  } else {
                                    toast({ title: "Upload Failed", description: "Video uploaded but failed to create entry", variant: "destructive" });
                                  }
                                } else {
                                  const errorData = await response.json();
                                  toast({ title: "Upload Failed", description: errorData.error || "Upload failed", variant: "destructive" });
                                }
                              } catch (error) {
                                console.error('Upload error:', error);
                                toast({ title: "Upload Failed", description: "An error occurred during upload", variant: "destructive" });
                              }

                              e.target.value = '';
                            }
                          }}
                        />
                        <label
                          htmlFor="video-upload"
                          className="inline-flex items-center px-6 py-3 border border-transparent shadow-lg text-sm font-semibold rounded-lg text-white cursor-pointer transition-all hover:scale-105 hover:opacity-90"
                          style={{ backgroundColor: '#D67C4A' }}
                        >
                          Upload Video
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Existing Videos */}
                {heroVideos
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((video) => (
                    <Card key={video.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Video Preview */}
                          <div className="space-y-4">
                            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg relative overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                              <video
                                src={`/api/video-proxy?filename=${encodeURIComponent(video.urlEn)}`}
                                className="w-full h-full object-cover cursor-pointer"
                                muted
                                preload="metadata"
                                controls
                                playsInline
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const videoElement = e.target as HTMLVideoElement;
                                  if (videoElement.paused) {
                                    videoElement.play();
                                  } else {
                                    videoElement.pause();
                                  }
                                }}
                              />
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center justify-center">
                                <div className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold text-lg">
                                  Plays {!video.orderIndex ? '1st' : video.orderIndex === 1 ? '1st' : video.orderIndex === 2 ? '2nd' : video.orderIndex === 3 ? '3rd' : `${video.orderIndex}th`}
                                </div>
                              </div>
                              <p className="text-center text-sm text-gray-600 dark:text-gray-700">
                                Order videos appear on your website
                              </p>

                              <div className="flex items-center justify-center">
                                <div className={`px-6 py-3 rounded-lg font-bold text-lg border-2 ${
                                  video.isActive
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-500'
                                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-500'
                                }`}>
                                  {video.isActive ? '🟢 VISIBLE ON WEBSITE' : '🔴 HIDDEN FROM WEBSITE'}
                                </div>
                              </div>



                              <div className="flex items-center justify-center space-x-3">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Hidden</span>
                                <Switch
                                  checked={video.isActive}
                                  onCheckedChange={(checked) =>
                                    toggleMutation.mutate({ videoId: video.id, isActive: checked })
                                  }
                                  disabled={toggleMutation.isPending}
                                  className="scale-150"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Visible</span>
                              </div>
                            </div>
                          </div>

                          {/* Video Files */}
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-semibold" style={{ color: '#011526' }}>Video File</Label>
                              <div
                                className="mt-1 text-xs font-mono p-3 rounded-md"
                                style={{ backgroundColor: '#F2EBDC', color: '#2A4759' }}
                              >
                                {video.useSameVideo || video.urlEn === video.urlFr ? (
                                  <div className="font-medium text-sm">
                                    {video.urlEn}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="font-medium">EN: {video.urlEn}</div>
                                    <div className="font-medium">FR: {video.urlFr}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border-2">
                              <h4 className="font-bold text-gray-900 dark:text-white mb-3">Change Display Order</h4>
                              <div className="flex space-x-2 justify-center">
                                <Button
                                  size="lg"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const newOrder = video.orderIndex - 1;
                                    if (newOrder >= 1) {
                                      reorderMutation.mutate({ videoId: video.id, newOrder });
                                    }
                                  }}
                                  disabled={video.orderIndex <= 1 || reorderMutation.isPending}
                                  className="px-6 py-3"
                                >
                                  <ArrowUp className="h-5 w-5 mr-2" />
                                  Move Earlier
                                </Button>
                                <Button
                                  size="lg"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const maxOrder = Math.max(...heroVideos.map(v => v.orderIndex));
                                    const newOrder = video.orderIndex + 1;
                                    if (newOrder <= maxOrder) {
                                      reorderMutation.mutate({ videoId: video.id, newOrder });
                                    }
                                  }}
                                  disabled={video.orderIndex >= Math.max(...heroVideos.map(v => v.orderIndex)) || reorderMutation.isPending}
                                  className="px-6 py-3"
                                >
                                  <ArrowDown className="h-5 w-5 mr-2" />
                                  Move Later
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingVideo(video);
                                  setEditVideoData({
                                    urlEn: video.urlEn,
                                    urlFr: video.urlFr,
                                    useSameVideo: video.useSameVideo ?? true
                                  });
                                }}
                              >
                                Edit Video
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${video.titleEn}"? This will permanently remove the video from Supabase storage, database, and cache.`)) {
                                    fetch(`/api/hero-videos/${video.id}`, { method: 'DELETE' })
                                      .then(async (response) => {
                                        if (response.ok) {
                                          const result = await response.json();
                                          toast({ title: "Deleted", description: result.message });
                                          queryClient.invalidateQueries({ queryKey: ['/api/hero-videos'] });
                                          queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
                                        } else {
                                          const error = await response.text();
                                          toast({ title: "Delete Failed", description: error, variant: "destructive" });
                                        }
                                      })
                                      .catch((error) => {
                                        toast({ title: "Delete Failed", description: "Network error", variant: "destructive" });
                                      });
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Text Overlay Tab */}
        {heroTab === 'text' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Gestion des Textes Hero
                </CardTitle>
                <CardDescription>
                  Créer et gérer les superpositions de texte avec contrôles de police
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {textsLoading ? (
                  <div className="text-center py-8">Chargement des textes...</div>
                ) : (
                  <div className="space-y-6">
                    {/* Text Library */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Bibliothèque de Textes</h3>
                        <Button
                          onClick={() => setShowNewTextForm(true)}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          + Nouveau Texte
                        </Button>
                      </div>

                      {/* New Text Form */}
                      {showNewTextForm && (
                        <Card className="mb-4 border-orange-200">
                          <CardHeader>
                            <CardTitle>Créer un Nouveau Texte</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-gray-700 mb-3">💻 📱 Titres Spécifiques Desktop/Mobile</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label>Titre Desktop (Français) - 2 lignes</Label>
                                  <small className="text-green-600 block mb-1">≥768px - Version desktop - Entrée = saut de ligne</small>
                                  <Textarea
                                    value={newTextData.titleDesktopFr}
                                    onChange={(e) => setNewTextData({ ...newTextData, titleDesktopFr: e.target.value })}
                                    placeholder="Ex: Transformez vos souvenirs&#10;en films cinématographiques"
                                    rows={2}
                                    className="resize-none"
                                  />
                                </div>
                                <div>
                                  <Label>Titre Desktop (Anglais) - 2 lignes</Label>
                                  <small className="text-green-600 block mb-1">≥768px - Desktop version - Enter = line break</small>
                                  <Textarea
                                    value={newTextData.titleDesktopEn}
                                    onChange={(e) => setNewTextData({ ...newTextData, titleDesktopEn: e.target.value })}
                                    placeholder="Ex: Transform your memories&#10;into cinematic films"
                                    rows={2}
                                    className="resize-none"
                                  />
                                </div>
                                <div>
                                  <Label>Titre Mobile (Français) - 3 lignes</Label>
                                  <small className="text-blue-600 block mb-1">&lt;768px - Version mobile - Entrée = saut de ligne</small>
                                  <Textarea
                                    value={newTextData.titleMobileFr}
                                    onChange={(e) => setNewTextData({ ...newTextData, titleMobileFr: e.target.value })}
                                    placeholder="Ex: Transformez vos&#10;souvenirs en films&#10;cinématographiques"
                                    rows={3}
                                    className="resize-none"
                                  />
                                </div>
                                <div>
                                  <Label>Titre Mobile (Anglais) - 3 lignes</Label>
                                  <small className="text-blue-600 block mb-1">&lt;768px - Mobile version - Enter = line break</small>
                                  <Textarea
                                    value={newTextData.titleMobileEn}
                                    onChange={(e) => setNewTextData({ ...newTextData, titleMobileEn: e.target.value })}
                                    placeholder="Ex: Transform your&#10;memories into&#10;cinematic films"
                                    rows={3}
                                    className="resize-none"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <Label>Taille de Police Desktop: {newTextData.fontSizeDesktop}px</Label>
                              <input
                                type="range"
                                min="20"
                                max="120"
                                value={newTextData.fontSizeDesktop}
                                onChange={(e) => setNewTextData({ ...newTextData, fontSizeDesktop: Number(e.target.value) })}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                            <div className="flex gap-3">
                              <Button
                                onClick={() => createTextMutation.mutate(newTextData)}
                                disabled={createTextMutation.isPending || !newTextData.titleMobileFr || !newTextData.titleMobileEn || !newTextData.titleDesktopFr || !newTextData.titleDesktopEn}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Créer le Texte
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowNewTextForm(false);
                                  setNewTextData({ titleMobileFr: '', titleMobileEn: '', titleDesktopFr: '', titleDesktopEn: '', fontSizeDesktop: 60, fontSizeTablet: 45, fontSizeMobile: 36 });
                                }}
                              >
                                Annuler
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <div className="grid gap-4">
                        {heroTexts.map((text: any) => (
                          <Card key={text.id} className={`transition-all ${
                            selectedTextId === text.id ? 'ring-2 ring-orange-500' : ''
                          } ${text.isActive ? 'border-green-500 bg-green-50' : ''}`}>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div
                                      className="space-y-2 flex-1 cursor-pointer"
                                      onClick={() => setSelectedTextId(text.id)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium">{text.titleFr}</h4>
                                        {text.isActive && (
                                          <Badge className="bg-green-500">Actif sur le site</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600">{text.subtitleFr}</p>
                                      <div className="text-xs text-gray-500">
                                        Taille: {text.fontSize}px | Créé: {formatFrenchDateTime(text.createdAt)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="border-t pt-4 mt-4">
                                    <h4 className="font-semibold text-gray-700 mb-3 text-sm">💻 📱 Titres Spécifiques Desktop/Mobile</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-xs">Titre Desktop (Français) - 2 lignes</Label>
                                        <small className="text-green-600 block text-xs">≥768px - Version desktop - Entrée = saut de ligne</small>
                                        <Textarea
                                          value={editingTextId === text.id ? editFormData.titleDesktopFr : (text.titleDesktopFr || '')}
                                          onChange={(e) => {
                                            if (editingTextId !== text.id) {
                                              setEditingTextId(text.id);
                                              setEditFormData({
                                                titleMobileFr: text.titleMobileFr || '',
                                                titleMobileEn: text.titleMobileEn || '',
                                                titleDesktopFr: e.target.value,
                                                titleDesktopEn: text.titleDesktopEn || ''
                                              });
                                            } else {
                                              setEditFormData({ ...editFormData, titleDesktopFr: e.target.value });
                                            }
                                          }}
                                          className="text-sm resize-none"
                                          rows={2}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Titre Desktop (Anglais) - 2 lignes</Label>
                                        <small className="text-green-600 block text-xs">≥768px - Desktop version - Enter = line break</small>
                                        <Textarea
                                          value={editingTextId === text.id ? editFormData.titleDesktopEn : (text.titleDesktopEn || '')}
                                          onChange={(e) => {
                                            if (editingTextId !== text.id) {
                                              setEditingTextId(text.id);
                                              setEditFormData({
                                                titleMobileFr: text.titleMobileFr || '',
                                                titleMobileEn: text.titleMobileEn || '',
                                                titleDesktopFr: text.titleDesktopFr || '',
                                                titleDesktopEn: e.target.value
                                              });
                                            } else {
                                              setEditFormData({ ...editFormData, titleDesktopEn: e.target.value });
                                            }
                                          }}
                                          className="text-sm resize-none"
                                          rows={2}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Titre Mobile (Français) - 3 lignes</Label>
                                        <small className="text-blue-600 block text-xs">&lt;768px - Version mobile - Entrée = saut de ligne</small>
                                        <Textarea
                                          value={editingTextId === text.id ? editFormData.titleMobileFr : (text.titleMobileFr || '')}
                                          onChange={(e) => {
                                            if (editingTextId !== text.id) {
                                              setEditingTextId(text.id);
                                              setEditFormData({
                                                titleMobileFr: e.target.value,
                                                titleMobileEn: text.titleMobileEn || '',
                                                titleDesktopFr: text.titleDesktopFr || '',
                                                titleDesktopEn: text.titleDesktopEn || ''
                                              });
                                            } else {
                                              setEditFormData({ ...editFormData, titleMobileFr: e.target.value });
                                            }
                                          }}
                                          className="text-sm resize-none"
                                          rows={3}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Titre Mobile (Anglais) - 3 lignes</Label>
                                        <small className="text-blue-600 block text-xs">&lt;768px - Mobile version - Enter = line break</small>
                                        <Textarea
                                          value={editingTextId === text.id ? editFormData.titleMobileEn : (text.titleMobileEn || '')}
                                          onChange={(e) => {
                                            if (editingTextId !== text.id) {
                                              setEditingTextId(text.id);
                                              setEditFormData({
                                                titleMobileFr: text.titleMobileFr || '',
                                                titleMobileEn: e.target.value,
                                                titleDesktopFr: text.titleDesktopFr || '',
                                                titleDesktopEn: text.titleDesktopEn || ''
                                              });
                                            } else {
                                              setEditFormData({ ...editFormData, titleMobileEn: e.target.value });
                                            }
                                          }}
                                          className="text-sm resize-none"
                                          rows={3}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 pt-2 border-t">
                                    {editingTextId === text.id && (
                                      <>
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            updateTextMutation.mutate({
                                              textId: text.id,
                                              data: editFormData
                                            });
                                            setEditingTextId(null);
                                          }}
                                          disabled={updateTextMutation.isPending}
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          <Save className="h-3 w-3 mr-1" />
                                          Sauvegarder
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setEditingTextId(null)}
                                        >
                                          Annuler
                                        </Button>
                                      </>
                                    )}

                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="bg-orange-500 hover:bg-orange-600"
                                      onClick={async () => {
                                        if (editingTextId === text.id) {
                                          await updateTextMutation.mutateAsync({
                                            textId: text.id,
                                            data: editFormData
                                          });
                                          setEditingTextId(null);
                                        }

                                        applyTextMutation.mutate({
                                          textId: text.id,
                                          fontSizes: {
                                            desktop: text.fontSizeDesktop || text.fontSize || 60,
                                            tablet: text.fontSizeTablet || Math.round((text.fontSize || 60) * 0.75),
                                            mobile: text.fontSizeMobile || Math.round((text.fontSize || 60) * 0.53),
                                            legacy: text.fontSize
                                          }
                                        });
                                      }}
                                      disabled={applyTextMutation.isPending || updateTextMutation.isPending}
                                    >
                                      {editingTextId === text.id ? 'Sauvegarder & Appliquer au Site' : 'Appliquer au Site'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        if (confirm(`Êtes-vous sûr de vouloir supprimer "${text.titleMobileFr || text.titleDesktopFr || 'ce texte'}" ?`)) {
                                          deleteTextMutation.mutate(text.id);
                                        }
                                      }}
                                      disabled={deleteTextMutation.isPending}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>



                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Video Preview Modal */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Aperçu Vidéo: {previewVideo?.title}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewVideo(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <div className="aspect-video">
              <video
                src={previewVideo.url}
                controls
                autoPlay
                className="w-full h-full rounded-lg"
                onError={(e) => {
                  console.error('Video playback error:', e);
                  toast({
                    title: "Video Error",
                    description: "Unable to load video preview",
                    variant: "destructive"
                  });
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Video Modal */}
      {editingVideo && (
        <Dialog open={!!editingVideo} onOpenChange={() => setEditingVideo(null)}>
          <DialogContent className="max-w-3xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700">
            <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 -m-6 mb-6 p-6 rounded-t-lg">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                Edit Hero Video
              </DialogTitle>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                Manage video file settings
              </p>
            </DialogHeader>

            <div className="space-y-6">
              <div
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  editVideoData.useSameVideo
                    ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600'
                    : 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-600'
                }`}
                onClick={() => {
                  const newValue = !editVideoData.useSameVideo;
                  if (newValue && editVideoData.urlEn) {
                    setEditVideoData(prev => ({
                      ...prev,
                      useSameVideo: newValue,
                      urlFr: prev.urlEn
                    }));
                  } else {
                    setEditVideoData(prev => ({
                      ...prev,
                      useSameVideo: newValue
                    }));
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={editVideoData.useSameVideo}
                      onCheckedChange={(checked) => {
                        if (checked && editVideoData.urlEn) {
                          setEditVideoData(prev => ({
                            ...prev,
                            useSameVideo: checked,
                            urlFr: prev.urlEn
                          }));
                        } else {
                          setEditVideoData(prev => ({
                            ...prev,
                            useSameVideo: checked
                          }));
                        }
                      }}
                    />
                    <Label className={`font-semibold text-lg cursor-pointer ${
                      editVideoData.useSameVideo
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-orange-900 dark:text-orange-100'
                    }`}>
                      {editVideoData.useSameVideo
                        ? "Same Video for Both Languages"
                        : "Different Video for Each Language"
                      }
                    </Label>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    editVideoData.useSameVideo
                      ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                      : 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200'
                  }`}>
                    {editVideoData.useSameVideo ? "ON" : "OFF"}
                  </div>
                </div>
                <p className={`text-sm mt-2 ${
                  editVideoData.useSameVideo
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-orange-800 dark:text-orange-200'
                }`}>
                  {editVideoData.useSameVideo
                    ? "✓ One video file will be used for both French and English versions"
                    : "⚠ You can specify different video files for French and English"
                  }
                </p>
              </div>



              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white text-lg border-b border-gray-200 dark:border-gray-700 pb-2">
                  {editingVideo ? 'Modifier vos fichiers vidéo (optionnel)' : 'Video Files'}
                </h4>
                {editVideoData.useSameVideo ? (
                  <div className="space-y-4">
                    <Label className="text-gray-700 dark:text-gray-300 font-medium">
                      Video File (applies to both languages)
                    </Label>

                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <FileVideo className="mx-auto h-12 w-12 text-gray-700 mb-4" />
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          {editVideoData.urlEn ? 'Remplacer la vidéo' : 'Drop your video here'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-700">
                          {editVideoData.urlEn ? 'ou cliquez pour parcourir les fichiers' : 'or click to browse files'}
                        </p>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                          className="hidden"
                          id="video-upload-same"
                        />
                        <label
                          htmlFor="video-upload-same"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {uploadingFile ? 'Uploading...' : 'Browse Files'}
                        </label>
                      </div>
                    </div>

                    {editVideoData.urlEn && (
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <Label className="text-sm font-medium text-green-800 dark:text-green-200">Vidéo actuelle téléchargée ✓</Label>
                        </div>
                        <p className="text-xs font-mono text-green-700 dark:text-green-300 break-all mb-3">
                          {editVideoData.urlEn}
                        </p>
                        <div className="flex items-center gap-3">
                          <video
                            src={`/api/video-proxy?filename=${encodeURIComponent(editVideoData.urlEn)}`}
                            className="w-20 h-12 object-cover rounded border"
                            muted
                          />
                          <div className="text-xs text-green-600 dark:text-green-400">
                            <p className="font-medium">Remplacer la vidéo</p>
                            <p>Téléchargez une nouvelle vidéo ci-dessus</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600 dark:text-gray-700">
                        Or enter filename manually:
                      </Label>
                      <Input
                        value={editVideoData.urlEn}
                        onChange={(e) => {
                          const url = e.target.value;
                          setEditVideoData({ ...editVideoData, urlEn: url, urlFr: url });
                        }}
                        placeholder="VideoHero1.mp4"
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 font-mono text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6 items-start">
                    {/* English Video Upload */}
                    <div className="space-y-3 flex flex-col">
                      <Label className="text-gray-700 dark:text-gray-300 font-medium">English Video</Label>
                      <div
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500"
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={(e) => {
                          handleDrop(e);
                          e.preventDefault();
                          e.stopPropagation();
                          setDragActive(false);
                          const files = Array.from(e.dataTransfer.files);
                          if (files.length > 0) {
                            handleFileUpload(files[0], true);
                          }
                        }}
                      >
                        <FileVideo className="mx-auto h-8 w-8 text-gray-700 mb-2" />
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)}
                          className="hidden"
                          id="video-upload-en"
                        />
                        <label
                          htmlFor="video-upload-en"
                          className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                        >
                          {editVideoData.urlEn ? 'Remplacer vidéo EN' : 'Upload EN Video'}
                        </label>
                      </div>
                      {editVideoData.urlEn && (
                        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 h-auto">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            <Label className="text-xs font-medium text-green-800 dark:text-green-200">Vidéo EN téléchargée ✓</Label>
                          </div>
                          <p className="text-xs font-mono text-green-700 dark:text-green-300 break-all mb-2 min-h-[1.5rem]">
                            {editVideoData.urlEn}
                          </p>
                          <div className="flex items-start gap-2">
                            <video
                              src={`/api/video-proxy?filename=${encodeURIComponent(editVideoData.urlEn)}`}
                              className="w-16 h-10 object-cover rounded border flex-shrink-0"
                              muted
                            />
                            <span className="text-xs text-green-600 dark:text-green-400 flex-1 leading-tight">Remplacer ci-dessus</span>
                          </div>
                        </div>
                      )}
                      <Input
                        value={editVideoData.urlEn}
                        onChange={(e) => setEditVideoData({ ...editVideoData, urlEn: e.target.value })}
                        placeholder="VideoHeroEN.mp4"
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 font-mono text-sm"
                      />
                    </div>

                    {/* French Video Upload */}
                    <div className="space-y-3 flex flex-col">
                      <Label className="text-gray-700 dark:text-gray-300 font-medium">French Video</Label>
                      <div
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500"
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragActive(false);
                          const files = Array.from(e.dataTransfer.files);
                          if (files.length > 0) {
                            handleFileUpload(files[0], false);
                          }
                        }}
                      >
                        <FileVideo className="mx-auto h-8 w-8 text-gray-700 mb-2" />
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], false)}
                          className="hidden"
                          id="video-upload-fr"
                        />
                        <label
                          htmlFor="video-upload-fr"
                          className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                        >
                          {editVideoData.urlFr ? 'Remplacer vidéo FR' : 'Upload FR Video'}
                        </label>
                      </div>
                      {editVideoData.urlFr && (
                        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 h-auto">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            <Label className="text-xs font-medium text-green-800 dark:text-green-200">Vidéo FR téléchargée ✓</Label>
                          </div>
                          <p className="text-xs font-mono text-green-700 dark:text-green-300 break-all mb-2 min-h-[1.5rem]">
                            {editVideoData.urlFr}
                          </p>
                          <div className="flex items-start gap-2">
                            <video
                              src={`/api/video-proxy?filename=${encodeURIComponent(editVideoData.urlFr)}`}
                              className="w-16 h-10 object-cover rounded border flex-shrink-0"
                              muted
                            />
                            <span className="text-xs text-green-600 dark:text-green-400 flex-1 leading-tight">Remplacer ci-dessus</span>
                          </div>
                        </div>
                      )}
                      <Input
                        value={editVideoData.urlFr}
                        onChange={(e) => setEditVideoData({ ...editVideoData, urlFr: e.target.value })}
                        placeholder="VideoHeroFR.mp4"
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 font-mono text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/hero-videos/${editingVideo.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          urlEn: editVideoData.urlEn,
                          urlFr: editVideoData.urlFr,
                          useSameVideo: editVideoData.useSameVideo
                        })
                      });

                      if (response.ok) {
                        queryClient.invalidateQueries({ queryKey: ['/api/hero-videos'] });
                        toast({ title: "Success!", description: "Video updated successfully" });
                        setEditingVideo(null);
                      } else {
                        toast({ title: "Error", description: "Failed to update video", variant: "destructive" });
                      }
                    } catch (error) {
                      toast({ title: "Error", description: "Network error", variant: "destructive" });
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 flex-1"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingVideo(null)}
                  className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold px-6 py-2 flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
