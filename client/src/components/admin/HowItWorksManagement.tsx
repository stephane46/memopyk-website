import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Trash2,
  Plus,
  Save,
  Edit3,
  ChevronUp,
  ChevronDown,
  X
} from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, adminFetch } from '@/lib/queryClient';

interface HowItWorksStep {
  id: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  backTitleEn?: string;
  backTitleFr?: string;
  backDescriptionEn?: string;
  backDescriptionFr?: string;
  imagePath?: string;
  orderIndex: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function HowItWorksManagement() {
  const [steps, setSteps] = useState<HowItWorksStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState<HowItWorksStep | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<HowItWorksStep>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadSteps();
  }, []);

  const loadSteps = async () => {
    try {
      console.log('Loading How It Works steps...');
      const response = await adminFetch('/api/how-it-works-steps');
      const data = await response.json();
      if (response.ok) {
        setSteps(data.sort((a: HowItWorksStep, b: HowItWorksStep) => a.orderIndex - b.orderIndex));
        console.log('Loaded', data.length, 'steps');
      } else {
        throw new Error(data.error || 'Failed to load steps');
      }
    } catch (error) {
      console.error('Error loading steps:', error);
      toast({
        title: "Error",
        description: "Failed to load Comment ça marche steps",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep = async () => {
    try {
      const url = editingStep
        ? `/api/how-it-works-steps/${editingStep.id}`
        : '/api/how-it-works-steps';

      const method = editingStep ? 'PATCH' : 'POST';

      if (!editingStep && !formData.id) {
        formData.id = `step-${Date.now()}`;
      }

      if (!editingStep) {
        formData.orderIndex = steps.length;
      }

      console.log('Saving step:', method, url, formData);

      await apiRequest(url, method, formData);

      toast({
        title: "Success",
        description: editingStep ? "Étape mise à jour" : "Étape créée",
      });

      setEditingStep(null);
      setIsCreating(false);
      setFormData({});
      await loadSteps();

      window.dispatchEvent(new CustomEvent('how-it-works-updated'));
      console.log('how-it-works-updated event dispatched for cache refresh');
    } catch (error) {
      console.error('Error saving step:', error);
      toast({
        title: "Error",
        description: "Failed to save step",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStep = async (id: string) => {
    if (!confirm('Supprimer cette étape ?')) return;

    try {
      console.log('Deleting step:', id);
      await apiRequest(`/api/how-it-works-steps/${id}`, 'DELETE');

      toast({
        title: "Success",
        description: "Étape supprimée",
      });
      await loadSteps();

      window.dispatchEvent(new CustomEvent('how-it-works-updated'));
      console.log('how-it-works-updated event dispatched for cache refresh');
    } catch (error) {
      console.error('Error deleting step:', error);
      toast({
        title: "Error",
        description: "Failed to delete step",
        variant: "destructive",
      });
    }
  };

  const moveStep = async (stepId: string, direction: 'up' | 'down') => {
    const currentIndex = steps.findIndex(s => s.id === stepId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    try {
      console.log('Moving step:', stepId, direction);

      const currentStep = steps[currentIndex];
      const targetStep = steps[newIndex];

      await apiRequest(`/api/how-it-works-steps/${currentStep.id}`, 'PATCH', { orderIndex: targetStep.orderIndex });
      await apiRequest(`/api/how-it-works-steps/${targetStep.id}`, 'PATCH', { orderIndex: currentStep.orderIndex });

      await loadSteps();

      window.dispatchEvent(new CustomEvent('how-it-works-updated'));
      console.log('how-it-works-updated event dispatched for cache refresh');
    } catch (error) {
      console.error('Error moving step:', error);
      toast({
        title: "Error",
        description: "Failed to move step",
        variant: "destructive",
      });
    }
  };

  const handleNewStep = () => {
    setIsCreating(true);
    setEditingStep(null);
    setFormData({
      titleFr: '',
      titleEn: '',
      descriptionFr: '',
      descriptionEn: '',
      backTitleFr: '',
      backTitleEn: '',
      backDescriptionFr: '',
      backDescriptionEn: '',
      imagePath: '',
      isActive: true
    });
  };

  const handleEditStep = (step: HowItWorksStep) => {
    console.log('Editing step:', step);
    setEditingStep(step);
    setIsCreating(false);
    setFormData({ ...step });
  };

  const handleCancel = () => {
    setEditingStep(null);
    setIsCreating(false);
    setFormData({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement des étapes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Comment ça marche</h2>
          <p className="text-gray-600 dark:text-gray-400">Gérer les étapes de la section "Comment ça marche"</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Steps List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Étapes ({steps.length})</h3>
            <Button
              onClick={handleNewStep}
              style={{
                backgroundColor: '#D67C4A',
                color: '#ffffff',
                border: '1px solid #D67C4A'
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span style={{ fontWeight: 'bold' }}>Nouvelle Étape</span>
            </Button>
          </div>

          {steps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune étape. Créez la première étape !
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <Card key={step.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-memopyk-orange flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900 truncate">{step.titleFr}</h4>
                            <Badge variant={step.isActive ? "default" : "secondary"}>
                              {step.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{step.titleEn}</p>
                          {step.imagePath && (
                            <p className="text-xs text-gray-400 truncate">{step.imagePath}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveStep(step.id, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveStep(step.id, 'down')}
                          disabled={index === steps.length - 1}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditStep(step)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStep(step.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Form */}
        <div className="space-y-6">
          {(isCreating || editingStep) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{editingStep ? "Modifier l'Étape" : 'Nouvelle Étape'}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Title - French and English columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title-fr">Titre (Français)</Label>
                    <Input
                      id="title-fr"
                      value={formData.titleFr || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, titleFr: e.target.value }))}
                      placeholder="Titre en français"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title-en">Title (English)</Label>
                    <Input
                      id="title-en"
                      value={formData.titleEn || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, titleEn: e.target.value }))}
                      placeholder="Title in English"
                    />
                  </div>
                </div>

                {/* Description (front card) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="desc-fr">Description Avant (Français)</Label>
                    <RichTextEditor
                      value={formData.descriptionFr || ''}
                      onChange={(value) => setFormData(prev => ({ ...prev, descriptionFr: value }))}
                      placeholder="Description en français"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc-en">Description Front (English)</Label>
                    <RichTextEditor
                      value={formData.descriptionEn || ''}
                      onChange={(value) => setFormData(prev => ({ ...prev, descriptionEn: value }))}
                      placeholder="Description in English"
                    />
                  </div>
                </div>

                <Separator />

                {/* Back card content */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Contenu Dos de Carte (flip)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="back-title-fr">Titre Dos (Français)</Label>
                      <Input
                        id="back-title-fr"
                        value={formData.backTitleFr || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, backTitleFr: e.target.value }))}
                        placeholder="Titre dos en français"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="back-title-en">Back Title (English)</Label>
                      <Input
                        id="back-title-en"
                        value={formData.backTitleEn || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, backTitleEn: e.target.value }))}
                        placeholder="Back title in English"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="back-desc-fr">Description Dos (Français)</Label>
                      <RichTextEditor
                        value={formData.backDescriptionFr || ''}
                        onChange={(value) => setFormData(prev => ({ ...prev, backDescriptionFr: value }))}
                        placeholder="Description dos en français"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="back-desc-en">Back Description (English)</Label>
                      <RichTextEditor
                        value={formData.backDescriptionEn || ''}
                        onChange={(value) => setFormData(prev => ({ ...prev, backDescriptionEn: value }))}
                        placeholder="Back description in English"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Image Path */}
                <div className="space-y-2">
                  <Label htmlFor="image-path">Chemin Image</Label>
                  <Input
                    id="image-path"
                    value={formData.imagePath || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, imagePath: e.target.value }))}
                    placeholder="/images/brand/How_we_work_Step1.png"
                  />
                  {formData.imagePath && (
                    <img
                      src={formData.imagePath}
                      alt="Preview"
                      className="mt-2 h-24 object-contain rounded border border-gray-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.isActive !== false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="px-6"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSaveStep}
                    disabled={!formData.titleFr || !formData.titleEn || !formData.descriptionFr || !formData.descriptionEn}
                    className="px-6"
                    style={{
                      backgroundColor: '#D67C4A',
                      color: '#ffffff',
                      border: '1px solid #D67C4A',
                      fontWeight: 'bold'
                    }}
                  >
                    {editingStep ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </div>

              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
