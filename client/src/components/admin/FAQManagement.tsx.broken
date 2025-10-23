import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowUp, ArrowDown, Plus, Edit, Edit2, Trash2, Eye, EyeOff, Save, X, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface FAQ {
  id: string;
  section_id: number;
  order_index: number;
  question_en: string;
  question_fr: string;
  answer_en: string;
  answer_fr: string;
  is_active: boolean;
}

interface FAQSection {
  id: number;
  title_en: string;
  title_fr: string;
  order_index: number;
}

const faqSchema = z.object({
  section_id: z.number().min(1, 'Section is required'),
  question_en: z.string().min(1, 'Question (English) is required'),
  question_fr: z.string().min(1, 'Question (French) is required'),
  answer_en: z.string().min(1, 'Answer (English) is required'),
  answer_fr: z.string().min(1, 'Answer (French) is required'),
  order_index: z.number().min(0),
  is_active: z.boolean()
});

const sectionSchema = z.object({
  title_en: z.string().min(1, 'Section name (English) is required'),
  title_fr: z.string().min(1, 'Section name (French) is required'),
  order_index: z.number().min(0)
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

  // Fetch FAQs
  const { data: faqs = [], isLoading: faqsLoading } = useQuery<FAQ[]>({
    queryKey: ['/api/faqs'],
  });

  // Fetch FAQ sections
  const { data: sections = [], isLoading: sectionsLoading, refetch: refetchSections } = useQuery<FAQSection[]>({
    queryKey: ['/api/faq-sections'],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the response (renamed from cacheTime in v5)
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch on component mount
  });

  // FAQ form
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

  // Section form
  const sectionForm = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      title_en: '',
      title_fr: '',
      order_index: 1
    }
  });

  // Update section form default order when sections load
  useEffect(() => {
    if (sections && sections.length > 0 && !editingSection) {
      const nextOrder = Math.max(...sections.map((s: FAQSection) => s.order_index)) + 1;
      sectionForm.setValue('order_index', nextOrder);
    }
  }, [sections, editingSection, sectionForm]);

  // FAQ admin system fully operational with all 5 sections displaying correctly

  // Create FAQ mutation
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
    onError: (error) => {
      console.error('Error creating FAQ:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de la FAQ.",
        variant: "destructive",
      });
    },
  });

  // Update FAQ mutation
  const updateFaqMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FAQFormData> }) => {
      const result = await apiRequest(`/api/faqs/${id}`, 'PATCH', data);
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });
      setEditingFaq(null);
      toast({
        title: "FAQ mise à jour",
        description: "La FAQ a été mise à jour avec succès.",
      });
    },
    onError: (error) => {
      console.error('Error updating FAQ:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la FAQ.",
        variant: "destructive",
      });
    },
  });

  // Delete FAQ mutation
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
    onError: (error) => {
      console.error('Error deleting FAQ:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de la FAQ.",
        variant: "destructive",
      });
    },
  });

  // Create section mutation
  const createSectionMutation = useMutation({
    mutationFn: async (data: SectionFormData) => {
      console.log('🔥 API REQUEST STARTING:', {
        url: '/api/faq-sections',
        method: 'POST',
        payload: data
      });
      
      try {
        const result = await apiRequest('/api/faq-sections', 'POST', data);
        // Parse the JSON response
        const responseData = await result.json();
        console.log('✅ API REQUEST SUCCESS:', responseData);
        return responseData;
      } catch (error) {
        console.error('❌ API REQUEST FAILED:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log('🎉 MUTATION SUCCESS:', data);
      // Invalidate and refetch the sections data
      await queryClient.invalidateQueries({ queryKey: ['/api/faq-sections'] });
      await queryClient.refetchQueries({ queryKey: ['/api/faq-sections'] });
      
      setShowSectionDialog(false);
      sectionForm.reset();
      toast({
        title: "Section créée",
        description: "La section FAQ a été créée avec succès.",
      });
    },
    onError: (error: any) => {
      console.error('💥 MUTATION ERROR DETAILS:', {
        error,
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      });
      toast({
        title: "Erreur",
        description: `Erreur lors de la création de la section: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update section mutation
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
    onError: (error) => {
      console.error('Error updating section:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la section.",
        variant: "destructive",
      });
    },
  });

  // Delete section mutation
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
    onError: (error) => {
      console.error('Error deleting section:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de la section.",
        variant: "destructive",
      });
    },
  });

  const handleCreateFaq = (data: FAQFormData) => {
    // Calculate next available order_index for the selected section
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
      updateFaqMutation.mutate({ id: editingFaq.id, data });
    }
  };

  const handleCreateSection = (data: SectionFormData) => {
    console.log('🚀 SECTION SUBMIT DEBUG:', {
      formData: data,
      sections: sections,
      sectionsOrderIndexes: sections ? sections.map((s: FAQSection) => s.order_index) : []
    });
    
    // Calculate next available order_index
    const maxOrder = sections && sections.length > 0 ? Math.max(...sections.map((s: FAQSection) => s.order_index)) : 0;
    const sectionData = {
      ...data,
      order_index: maxOrder + 1
    };
    
    console.log('🎯 FINAL SECTION DATA:', sectionData);
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

  const toggleSectionVisibility = (section: FAQSection) => {
    updateSectionMutation.mutate({
      id: section.id.toString(),
      data: { title_en: section.title_en, title_fr: section.title_fr }
    });
  };

  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName);
    } else {
      newExpanded.add(sectionName);
    }
    setExpandedSections(newExpanded);
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

  // Group FAQs by section using section data
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const section = sections ? sections.find((s: FAQSection) => s.id === faq.section_id) : undefined;
    if (section) {
      const sectionKey = `${section.title_en}|${section.title_fr}`;
      if (!acc[sectionKey]) {
        acc[sectionKey] = [];
      }
      acc[sectionKey].push(faq);
    }
    return acc;
  }, {} as Record<string, FAQ[]>);

  // Create complete section list (including sections without FAQs)
  const allSections = sections ? sections.sort((a, b) => a.order_index - b.order_index) : [];
  
  // Create section keys for ALL sections, not just ones with FAQs
  const allSectionKeys = allSections.map(section => `${section.title_en}|${section.title_fr}`);
  
  // Ensure all sections have an entry in groupedFaqs (even if empty)
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
          className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
          onClick={() => {
            // Reset form with correct next order position
            const maxOrder = sections && sections.length > 0 ? Math.max(...sections.map((s: FAQSection) => s.order_index)) : 0;
            const nextOrder = maxOrder + 1;
            console.log('🔧 SECTION CREATION DEBUG:', {
              sections: sections,
              sectionsLength: sections ? sections.length : 0,
              sectionsOrderIndexes: sections ? sections.map((s: FAQSection) => s.order_index) : [],
              maxOrder,
              nextOrder
            });
            
            sectionForm.reset({
              title_en: '',
              title_fr: '',
              order_index: nextOrder
            });
            setEditingSection(null); // Clear any editing state
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
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          {sections?.map((section: FAQSection) => (
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
                    {createFaqMutation.isPending || updateFaqMutation.isPending ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    ) : null}
                    {editingFaq ? 'Mettre à jour' : 'Créer'}
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
                    
                    {/* Section Management Buttons */}
                    <div className="flex items-center gap-1">
                      {/* Move Up Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const section = allSections.find(s => `${s.title_en}|${s.title_fr}` === sectionKey);
                          if (section) {
                            // Find the section that's immediately above this one to swap with
                            const sortedSections = [...allSections].sort((a, b) => a.order_index - b.order_index);
                            const currentIndex = sortedSections.findIndex(s => s.id === section.id);
                            if (currentIndex > 0) {
                              const targetSection = sortedSections[currentIndex - 1];
                              const newOrder = targetSection.order_index;
                              updateSectionMutation.mutate({
                                id: section.id.toString(),
                                data: { title_en: section.title_en, title_fr: section.title_fr, order_index: newOrder }
                              });
                            }
                          }
                        }}
                        disabled={(() => {
                          const section = allSections.find(s => `${s.title_en}|${s.title_fr}` === sectionKey);
                          if (!section) return true;
                          // Check if this is actually the first section
                          const sortedSections = [...allSections].sort((a, b) => a.order_index - b.order_index);
                          const currentIndex = sortedSections.findIndex(s => s.id === section.id);
                          return currentIndex <= 0;
                        })()}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      
                      {/* Move Down Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const section = allSections.find(s => `${s.title_en}|${s.title_fr}` === sectionKey);
                          if (section) {
                            // Find the section that's immediately below this one to swap with
                            const sortedSections = [...allSections].sort((a, b) => a.order_index - b.order_index);
                            const currentIndex = sortedSections.findIndex(s => s.id === section.id);
                            if (currentIndex < sortedSections.length - 1) {
                              const targetSection = sortedSections[currentIndex + 1];
                              const newOrder = targetSection.order_index;
                              updateSectionMutation.mutate({
                                id: section.id.toString(),
                                data: { title_en: section.title_en, title_fr: section.title_fr, order_index: newOrder }
                              });
                            }
                          }
                        }}
                        disabled={(() => {
                          const section = allSections.find(s => `${s.title_en}|${s.title_fr}` === sectionKey);
                          if (!section) return true;
                          // Check if this is actually the last section
                          const sortedSections = [...allSections].sort((a, b) => a.order_index - b.order_index);
                          const currentIndex = sortedSections.findIndex(s => s.id === section.id);
                          return currentIndex >= sortedSections.length - 1;
                        })()}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const section = allSections.find(s => `${s.title_en}|${s.title_fr}` === sectionKey);
                          if (section) startEditingSection(section);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const section = allSections.find(s => `${s.title_en}|${s.title_fr}` === sectionKey);
                          if (section && window.confirm(`Supprimer la section "${sectionNameFr}" ?`)) {
                            deleteSectionMutation.mutate(section.id.toString());
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent>
                  <div className="space-y-3">
                    {sectionFaqs.map((faq) => (
                      <div key={faq.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {faq.question_fr}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {faq.question_en}
                            </p>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              Réponse (FR): {faq.answer_fr.substring(0, 100)}...
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
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




    </div>

      {/* Section Creation/Edit Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent className="max-w-lg bg-white dark:bg-gray-900">
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
                        <Input 
                          {...field} 
                          placeholder="Créer votre film"
                        />
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
                        <Input 
                          {...field} 
                          placeholder="Create your film"
                        />
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
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {createSectionMutation.isPending || updateSectionMutation.isPending ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  ) : null}
                  {editingSection ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* FAQ Creation/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle FAQ
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        {sections?.map((section: FAQSection) => (
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
                  {createFaqMutation.isPending || updateFaqMutation.isPending ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  ) : null}
                  {editingFaq ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}