import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { htmlSanitizer } from '@/lib/sanitize-html';
import { FileText, Edit, Trash2, Plus, Eye, EyeOff, Save, X } from 'lucide-react';

interface LegalDocument {
  id: string;
  type: string;
  title_en: string;
  title_fr: string;
  content_en: string;
  content_fr: string;
  is_active: boolean;
  updated_at: string;
}

const DOCUMENT_TYPES = [
  { value: 'legal-notice', label: 'Legal Notice / Mentions légales' },
  { value: 'terms', label: 'Terms of Service / CGU' },
  { value: 'terms-sale', label: 'Terms of Sale / CGV' },
  { value: 'privacy', label: 'Privacy Policy / Politique de confidentialité' },
  { value: 'cookies', label: 'Cookie Policy / Politique des cookies' },
  { value: 'refund', label: 'Refund Policy / Politique de remboursement' },
  { value: 'disclaimer', label: 'Disclaimer / Avis de non-responsabilité' }
];

export function LegalDocumentManagement() {
  const [editingDocument, setEditingDocument] = useState<LegalDocument | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    title_en: '',
    title_fr: '',
    content_en: '',
    content_fr: '',
    is_active: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch legal documents
  const { data: legalDocs = [], isLoading } = useQuery<LegalDocument[]>({
    queryKey: ['/api/legal'],
  });

  // Create document mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('/api/legal', 'POST', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/legal'] });
      toast({ title: "Succès", description: "Document juridique créé avec succès" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer le document", variant: "destructive" });
    }
  });

  // Update document mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      console.log('🔄 Updating legal document with data:', data);
      const response = await apiRequest(`/api/legal/${id}`, 'PATCH', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/legal'] });
      toast({ title: "Succès", description: "Document juridique mis à jour avec succès" });
      resetForm();
    },
    onError: (error: any) => {
      console.error('❌ Update mutation error:', error);
      toast({ title: "Erreur", description: "Impossible de mettre à jour le document", variant: "destructive" });
    }
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/legal/${id}`, 'DELETE');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/legal'] });
      toast({ title: "Succès", description: "Document juridique supprimé avec succès" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de supprimer le document", variant: "destructive" });
    }
  });

  // Toggle document visibility
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const response = await apiRequest(`/api/legal/${id}`, 'PATCH', { is_active });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/legal'] });
      toast({ title: "Succès", description: "Visibilité du document mise à jour" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de changer la visibilité", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      type: '',
      title_en: '',
      title_fr: '',
      content_en: '',
      content_fr: '',
      is_active: true
    });
    setEditingDocument(null);
    setIsCreating(false);
  };

  const startEditing = (doc: LegalDocument) => {
    console.log('🎯 Starting to edit legal document:', doc.type);
    
    // Convert plain text to HTML if needed (backward compatibility)
    const ensureHtml = (content: string) => {
      if (!content) return '';
      // If content doesn't contain HTML tags, wrap in paragraph tags
      return content.includes('<') ? content : `<p>${content}</p>`;
    };

    setFormData({
      type: doc.type,
      title_en: doc.title_en,
      title_fr: doc.title_fr,
      content_en: ensureHtml(doc.content_en),
      content_fr: ensureHtml(doc.content_fr),
      is_active: doc.is_active
    });
    setEditingDocument(doc);
    setIsCreating(false);

    // Scroll to edit form
    setTimeout(() => {
      const formElement = document.getElementById('legal-edit-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const startCreating = () => {
    resetForm();
    setIsCreating(true);
    
    // Scroll to create form
    setTimeout(() => {
      const formElement = document.getElementById('legal-edit-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleSubmit = () => {
    if (!formData.type || !formData.title_en || !formData.title_fr || !formData.content_en || !formData.content_fr) {
      toast({ title: "Erreur", description: "Tous les champs sont requis", variant: "destructive" });
      return;
    }

    console.log('🚀 Submitting form data:', formData);
    console.log('📝 Editing document:', editingDocument);

    if (editingDocument) {
      updateMutation.mutate({ id: editingDocument.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (doc: LegalDocument) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${doc.title_fr}" ?`)) {
      deleteMutation.mutate(doc.id);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const docType = DOCUMENT_TYPES.find(dt => dt.value === type);
    return docType ? docType.label : type;
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-32">Chargement des documents juridiques...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Documents Légaux</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Gestion des documents juridiques avec éditeur de texte enrichi
          </p>
        </div>
        <Button onClick={startCreating} className="bg-[#ea580c] hover:bg-[#dc2626]">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Document
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingDocument) && (
        <Card id="legal-edit-form" className="border-l-4 border-l-[#ea580c]">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editingDocument ? 'Modifier le Document' : 'Créer un Nouveau Document'}</span>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              {editingDocument ? 'Modifiez les détails du document juridique' : 'Créez un nouveau document juridique'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Type - Only show when creating new document */}
            {isCreating && (
              <div className="space-y-2">
                <Label htmlFor="type">Type de Document</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le type de document" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Titles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title_fr">Titre (Français)</Label>
                <Input
                  id="title_fr"
                  value={formData.title_fr}
                  onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })}
                  placeholder="Politique de confidentialité"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title_en">Titre (English)</Label>
                <Input
                  id="title_en"
                  value={formData.title_en}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                  placeholder="Privacy Policy"
                />
              </div>
            </div>

            {/* Content - Single Tabbed Editor */}
            <div className="space-y-2">
              <Label>Contenu du Document</Label>
              <Tabs defaultValue="french" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger 
                    value="french" 
                    className="data-[state=active]:bg-[#ea580c] data-[state=active]:text-white"
                  >
                    Français
                  </TabsTrigger>
                  <TabsTrigger 
                    value="english" 
                    className="data-[state=active]:bg-[#ea580c] data-[state=active]:text-white"
                  >
                    English
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="french" className="mt-4">
                  <div className="rounded-lg">
                    <RichTextEditor
                      value={formData.content_fr}
                      onChange={(value) => setFormData({ ...formData, content_fr: value })}
                      placeholder="Rédigez le contenu juridique en français..."
                    />
                  </div>
                </TabsContent>
                <TabsContent value="english" className="mt-4">
                  <div className="rounded-lg">
                    <RichTextEditor
                      value={formData.content_en}
                      onChange={(value) => setFormData({ ...formData, content_en: value })}
                      placeholder="Write the legal content in English..."
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Document visible sur le site public</Label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-[#ea580c] hover:bg-[#dc2626]"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingDocument ? 'Mettre à jour' : 'Créer'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List - Hide when editing/creating */}
      {!isCreating && !editingDocument && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Documents Existants ({legalDocs.length})</h3>
          
          {legalDocs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Aucun document juridique trouvé</p>
                <Button onClick={startCreating} className="mt-4 bg-[#ea580c] hover:bg-[#dc2626]">
                  Créer le premier document
                </Button>
              </CardContent>
            </Card>
          ) : (
            legalDocs.map((doc) => (
              <Card key={doc.id} className="border-l-4 border-l-[#F2EBDC] bg-[#F2EBDC]">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-semibold text-[#011526]">{doc.title_fr}</h4>
                        <span className="text-sm text-gray-600">({doc.title_en})</span>
                        {doc.is_active ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Eye className="w-3 h-3 mr-1" />
                            Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Masqué
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Type:</strong> {getDocumentTypeLabel(doc.type)}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Dernière modification:</strong> {new Date(doc.updated_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleVisibilityMutation.mutate({ 
                          id: doc.id, 
                          is_active: !doc.is_active 
                        })}
                        disabled={toggleVisibilityMutation.isPending}
                      >
                        {doc.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(doc)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(doc)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}