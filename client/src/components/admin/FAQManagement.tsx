import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Edit2, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';

// Types
interface FAQ {
  id: number;
  section_id: number;
  question_en: string;
  question_fr: string;
  answer_en: string;
  answer_fr: string;
  order_index: number;
  is_active: boolean;
}

interface FAQSection {
  id: number;
  title_en: string;
  title_fr: string;
  order_index: number;
}

// Schemas
const faqSchema = z.object({
  section_id: z.number(),
  question_en: z.string().min(1, 'Question en anglais requise'),
  question_fr: z.string().min(1, 'Question en français requise'),
  answer_en: z.string().min(1, 'Réponse en anglais requise'),
  answer_fr: z.string().min(1, 'Réponse en français requise'),
  order_index: z.number(),
  is_active: z.boolean()
});

const sectionSchema = z.object({
  title_en: z.string().min(1, 'Titre en anglais requis'),
  title_fr: z.string().min(1, 'Titre en français requis'),
  order_index: z.number()
});

type FAQFormData = z.infer<typeof faqSchema>;
type SectionFormData = z.infer<typeof sectionSchema>;

export default function FAQManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [editingSection, setEditingSection] = useState<FAQSection | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch FAQs and sections
  const { data: faqs = [], isLoading: faqsLoading } = useQuery<FAQ[]>({
    queryKey: ['/api/faqs'],
  });

  const { data: sections = [], isLoading: sectionsLoading } = useQuery<FAQSection[]>({
    queryKey: ['/api/faq-sections'],
  });

  // Forms
  const faqForm = useForm<FAQFormData>({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      section_id: 1,
      question_en: '',
      question_fr: '',
      answer_en: '',
      answer_fr: '',
      order_index: 0,
      is_active: true
    }
  });

  const sectionForm = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      title_en: '',
      title_fr: '',
      order_index: 1
    }
  });

  // Mutations for FAQs
  const createFaqMutation = useMutation({
    mutationFn: async (data: FAQFormData) => {
      const result = await apiRequest('/api/faqs', 'POST', data);
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });
      setShowCreateDialog(false);
      faqForm.reset();
      toast({
        title: "FAQ créée",
        description: "La FAQ a été créée avec succès.",
      });
    },
  });

  const updateFaqMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FAQFormData> }) => {
      const result = await apiRequest(`/api/faqs/${id}`, 'PATCH', data);
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });
      setShowCreateDialog(false);
      setEditingFaq(null);
      faqForm.reset();
      toast({
        title: "FAQ mise à jour",
        description: "La FAQ a été mise à jour avec succès.",
      });
    },
  });

  const deleteFaqMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiRequest(`/api/faqs/${id}`, 'DELETE');
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });
      toast({
        title: "FAQ supprimée",
        description: "La FAQ a été supprimée avec succès.",
      });
    },
  });

  // Mutations for sections
  const createSectionMutation = useMutation({
    mutationFn: async (data: SectionFormData) => {
      const result = await apiRequest('/api/faq-sections', 'POST', data);
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faq-sections'] });
      setShowSectionDialog(false);
      sectionForm.reset();
      toast({
        title: "Section créée",
        description: "La section FAQ a été créée avec succès.",
      });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SectionFormData> }) => {
      const result = await apiRequest(`/api/faq-sections/${id}`, 'PATCH', data);
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faq-sections'] });
      setEditingSection(null);
      toast({
        title: "Section mise à jour",
        description: "La section FAQ a été mise à jour avec succès.",
      });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiRequest(`/api/faq-sections/${id}`, 'DELETE');
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faq-sections'] });
      toast({
        title: "Section supprimée",
        description: "La section FAQ a été supprimée avec succès.",
      });
    },
  });

  // Helper functions
  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  const startEditingFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    faqForm.reset({
      section_id: faq.section_id,
      question_en: faq.question_en,
      question_fr: faq.question_fr,
      answer_en: faq.answer_en,
      answer_fr: faq.answer_fr,
      order_index: faq.order_index,
      is_active: faq.is_active
    });
    setShowCreateDialog(true);
  };

  const startEditingSection = (section: FAQSection) => {
    setEditingSection(section);
    sectionForm.reset({
      title_en: section.title_en,
      title_fr: section.title_fr,
      order_index: section.order_index
    });
    setShowSectionDialog(true);
  };

  const handleCreateFaq = (data: FAQFormData) => {
    const sectionFaqs = faqs.filter(faq => faq.section_id === data.section_id);
    const maxOrder = sectionFaqs.length > 0 ? Math.max(...sectionFaqs.map(f => f.order_index)) : 0;
    const faqData = {
      ...data,
      order_index: maxOrder + 1
    };
    createFaqMutation.mutate(faqData);
  };

  const handleUpdateFaq = (data: FAQFormData) => {
    if (editingFaq) {
      updateFaqMutation.mutate({ id: editingFaq.id.toString(), data });
    }
  };

  const handleCreateSection = (data: SectionFormData) => {
    const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order_index)) : 0;
    const sectionData = {
      ...data,
      order_index: maxOrder + 1
    };
    createSectionMutation.mutate(sectionData);
  };

  const handleUpdateSection = (data: SectionFormData) => {
    if (editingSection) {
      updateSectionMutation.mutate({ id: editingSection.id.toString(), data });
    }
  };

  const toggleFaqVisibility = (faq: FAQ) => {
    updateFaqMutation.mutate({
      id: faq.id.toString(),
      data: { is_active: !faq.is_active }
    });
  };

  // Group FAQs by section
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const section = sections.find(s => s.id === faq.section_id);
    if (section) {
      const sectionKey = `${section.title_en}|${section.title_fr}`;
      if (!acc[sectionKey]) {
        acc[sectionKey] = [];
      }
      acc[sectionKey].push(faq);
    }
    return acc;
  }, {} as Record<string, FAQ[]>);

  // Create complete section list
  const allSections = sections.sort((a, b) => a.order_index - b.order_index);
  const allSectionKeys = allSections.map(section => `${section.title_en}|${section.title_fr}`);

  // Ensure all sections have an entry in groupedFaqs
  allSectionKeys.forEach(sectionKey => {
    if (!groupedFaqs[sectionKey]) {
      groupedFaqs[sectionKey] = [];
    }
  });

  if (faqsLoading || sectionsLoading) {
    return <div className="text-center py-8">Chargement des FAQs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">FAQ</h2>
        <p className="text-gray-600 dark:text-gray-400">Gestion des questions fréquemment posées</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="border-[#2A4759] text-[#2A4759] hover:bg-[#F2EBDC]"
          onClick={() => {
            const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order_index)) : 0;
            sectionForm.reset({
              title_en: '',
              title_fr: '',
              order_index: maxOrder + 1
            });
            setEditingSection(null);
            setShowSectionDialog(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Section
        </Button>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle FAQ
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFaq ? 'Modifier la FAQ' : 'Nouvelle FAQ'}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...faqForm}>
              <form onSubmit={faqForm.handleSubmit(editingFaq ? handleUpdateFaq : handleCreateFaq)} className="space-y-4">
                <FormField
                  control={faqForm.control}
                  name="section_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          {sections.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.title_fr} - {section.title_en}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={faqForm.control}
                    name="question_fr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question (Français)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Votre question en français" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={faqForm.control}
                    name="question_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question (Anglais)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Your question in English" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={faqForm.control}
                    name="answer_fr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Réponse (Français)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Votre réponse en français" rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={faqForm.control}
                    name="answer_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Réponse (Anglais)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Your answer in English" rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false);
                      setEditingFaq(null);
                      faqForm.reset();
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={createFaqMutation.isPending || updateFaqMutation.isPending}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {createFaqMutation.isPending || updateFaqMutation.isPending ? 'En cours...' : editingFaq ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* FAQ sections and items */}
      <div className="space-y-4">
        {allSectionKeys.map((sectionKey) => {
          const [sectionNameEn, sectionNameFr] = sectionKey.split('|');
          const sectionFaqs = (groupedFaqs[sectionKey] || []).sort((a, b) => a.order_index - b.order_index);
          const isExpanded = expandedSections.has(sectionKey);
          const section = allSections.find(s => `${s.title_en}|${s.title_fr}` === sectionKey);

          return (
            <Card key={sectionKey}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleSection(sectionKey)}
                    className="flex items-center gap-2 text-left"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-orange-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-orange-500" />
                    )}
                    <div>
                      <CardTitle className="text-lg">{sectionNameFr}</CardTitle>
                      <CardDescription>{sectionNameEn}</CardDescription>
                    </div>
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {sectionFaqs.length} FAQ{sectionFaqs.length > 1 ? 's' : ''}
                    </Badge>
                    
                    {section && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditingSection(section)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Supprimer la section "${sectionNameFr}" ?`)) {
                              deleteSectionMutation.mutate(section.id.toString());
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent>
                  <div className="space-y-3">
                    {sectionFaqs.map((faq) => (
                      <div key={faq.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <h4 className="font-medium text-gray-900">
                              {faq.question_fr}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {faq.question_en}
                            </p>
                            <div className="text-xs text-gray-500">
                              Réponse (FR): {faq.answer_fr.substring(0, 100)}...
                            </div>
                            <div className="text-xs text-gray-500">
                              Réponse (EN): {faq.answer_en.substring(0, 100)}...
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFaqVisibility(faq)}
                              className={faq.is_active ? "text-green-600" : "text-gray-400"}
                            >
                              {faq.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingFaq(faq)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteFaqMutation.mutate(faq.id.toString())}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Section Creation/Edit Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Modifier la Section' : 'Nouvelle Section FAQ'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...sectionForm}>
            <form onSubmit={sectionForm.handleSubmit(editingSection ? handleUpdateSection : handleCreateSection)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={sectionForm.control}
                  name="title_fr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom (Français)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Créer votre film" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={sectionForm.control}
                  name="title_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom (Anglais)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Create your film" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowSectionDialog(false);
                    setEditingSection(null);
                    sectionForm.reset();
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createSectionMutation.isPending || updateSectionMutation.isPending}
                  className="bg-[#2A4759] hover:bg-[#011526]"
                >
                  {createSectionMutation.isPending || updateSectionMutation.isPending ? 'En cours...' : editingSection ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}