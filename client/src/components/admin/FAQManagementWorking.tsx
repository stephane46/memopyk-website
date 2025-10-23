import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Edit2, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, Save, X, ArrowUp, ArrowDown } from 'lucide-react';
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { htmlSanitizer } from "@/lib/sanitize-html";

// Types
interface FAQ {
  id: string;
  section_id: string;
  question_en: string;
  question_fr: string;
  answer_en: string;
  answer_fr: string;
  order_index: number;
  is_active: boolean;
}

interface FAQSection {
  id: string;
  title_en: string;
  title_fr: string;
  order_index: number;
}

// Schemas
const faqSchema = z.object({
  section_id: z.string(),
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

export default function FAQManagementWorking() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [editingSection, setEditingSection] = useState<FAQSection | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data
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
      section_id: 'general',
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

  // FAQ Mutations
  const createFaqMutation = useMutation({
    mutationFn: async (data: FAQFormData) => {
      const result = await apiRequest('/api/faqs', 'POST', data);
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });
      setShowFaqForm(false);
      setEditingFaq(null);
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
    onSuccess: (data, variables) => {
      console.log('✅ UPDATE SUCCESS - Response data:', data);
      console.log('✅ UPDATE SUCCESS - Variables:', variables);
      console.log('✅ About to invalidate cache and refresh FAQ list...');
      
      queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });
      
      // Only reset form and close dialog if this was a form edit, not a visibility toggle
      if (Object.keys(variables.data).length > 1 || !('is_active' in variables.data)) {
        setShowFaqForm(false);
        setEditingFaq(null);
        faqForm.reset();
        toast({
          title: "FAQ mise à jour",
          description: "La FAQ a été mise à jour avec succès.",
        });
      } else {
        // This was just a visibility toggle - show appropriate message
        const isActive = variables.data.is_active;
        console.log('✅ VISIBILITY TOGGLE SUCCESS - FAQ is now:', isActive ? 'ACTIVE' : 'INACTIVE');
        toast({
          title: isActive ? "FAQ activée" : "FAQ désactivée",
          description: isActive ? "La FAQ est maintenant visible sur le site." : "La FAQ est maintenant cachée du site.",
        });
      }
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

  // Section Mutations
  const createSectionMutation = useMutation({
    mutationFn: async (data: SectionFormData) => {
      const result = await apiRequest('/api/faq-sections', 'POST', data);
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faq-sections'] });
      setShowSectionForm(false);
      setEditingSection(null);
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
      setShowSectionForm(false);
      setEditingSection(null);
      sectionForm.reset();
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

  // Section ordering mutations
  const reorderSectionMutation = useMutation({
    mutationFn: async ({ sectionId, newOrder }: { sectionId: string; newOrder: number }) => {
      const result = await apiRequest(`/api/faq-sections/${sectionId}/reorder`, 'PATCH', { order_index: newOrder });
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faq-sections'] });
      toast({
        title: "Section déplacée",
        description: "L'ordre des sections a été mis à jour.",
      });
    },
  });

  // FAQ ordering mutations
  const reorderFaqMutation = useMutation({
    mutationFn: async ({ faqId, newOrder }: { faqId: string; newOrder: number }) => {
      const result = await apiRequest(`/api/faqs/${faqId}/reorder`, 'PATCH', { order_index: newOrder });
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });
      toast({
        title: "FAQ déplacée",
        description: "L'ordre des FAQs a été mis à jour.",
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
    
    // Convert plain text answers to HTML if needed (for backward compatibility)
    const answer_en = htmlSanitizer.isHTML(faq.answer_en) 
      ? faq.answer_en 
      : htmlSanitizer.textToHTML(faq.answer_en);
    const answer_fr = htmlSanitizer.isHTML(faq.answer_fr) 
      ? faq.answer_fr 
      : htmlSanitizer.textToHTML(faq.answer_fr);
    
    faqForm.reset({
      section_id: faq.section_id,
      question_en: faq.question_en,
      question_fr: faq.question_fr,
      answer_en,
      answer_fr,
      order_index: faq.order_index,
      is_active: faq.is_active
    });
    setShowFaqForm(true);
    
    // Auto-scroll to form after state update
    setTimeout(() => {
      const formElement = document.getElementById('faq-edit-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const startEditingSection = (section: FAQSection) => {
    setEditingSection(section);
    sectionForm.reset({
      title_en: section.title_en,
      title_fr: section.title_fr,
      order_index: section.order_index
    });
    setShowSectionForm(true);
    
    // Auto-scroll to form after state update
    setTimeout(() => {
      const formElement = document.getElementById('section-edit-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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
      updateFaqMutation.mutate({ id: editingFaq.id, data });
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
      updateSectionMutation.mutate({ id: editingSection.id, data });
    }
  };

  const toggleFaqVisibility = (faq: FAQ) => {
    console.log('👁️ TOGGLE START - FAQ:', faq.id, 'Question:', faq.question_fr);
    console.log('👁️ Current state:', faq.is_active, '→ New state:', !faq.is_active);
    console.log('👁️ CRITICAL: This should ONLY update is_active field, NOT delete FAQ!');
    
    updateFaqMutation.mutate({
      id: faq.id,
      data: { is_active: !faq.is_active }
    });
    
    console.log('👁️ TOGGLE END - Mutation sent for FAQ:', faq.id);
  };

  // Section ordering helpers
  const moveSectionUp = (section: FAQSection) => {
    const sortedSections = sections.sort((a, b) => a.order_index - b.order_index);
    const currentIndex = sortedSections.findIndex(s => s.id === section.id);
    if (currentIndex > 0) {
      const targetSection = sortedSections[currentIndex - 1];
      console.log(`🔄 Moving section ${section.id} UP: current order ${section.order_index} → target order ${targetSection.order_index}`);
      
      // Swap the order_index values
      reorderSectionMutation.mutate({
        sectionId: section.id,
        newOrder: targetSection.order_index
      });
      
      // Also move the target section down
      setTimeout(() => {
        reorderSectionMutation.mutate({
          sectionId: targetSection.id,
          newOrder: section.order_index
        });
      }, 100);
    }
  };

  const moveSectionDown = (section: FAQSection) => {
    const sortedSections = sections.sort((a, b) => a.order_index - b.order_index);
    const currentIndex = sortedSections.findIndex(s => s.id === section.id);
    if (currentIndex < sortedSections.length - 1) {
      const targetSection = sortedSections[currentIndex + 1];
      console.log(`🔄 Moving section ${section.id} DOWN: current order ${section.order_index} → target order ${targetSection.order_index}`);
      
      // Swap the order_index values
      reorderSectionMutation.mutate({
        sectionId: section.id,
        newOrder: targetSection.order_index
      });
      
      // Also move the target section up
      setTimeout(() => {
        reorderSectionMutation.mutate({
          sectionId: targetSection.id,
          newOrder: section.order_index
        });
      }, 100);
    }
  };

  // FAQ ordering helpers
  const moveFaqUp = (faq: FAQ) => {
    const sectionFaqs = faqs.filter(f => f.section_id === faq.section_id).sort((a, b) => a.order_index - b.order_index);
    const currentIndex = sectionFaqs.findIndex(f => f.id === faq.id);
    if (currentIndex > 0) {
      const targetFaq = sectionFaqs[currentIndex - 1];
      console.log(`🔄 Moving FAQ ${faq.id} UP: current order ${faq.order_index} → target order ${targetFaq.order_index}`);
      
      // Swap the order_index values
      reorderFaqMutation.mutate({
        faqId: faq.id,
        newOrder: targetFaq.order_index
      });
      
      // Also move the target FAQ down
      setTimeout(() => {
        reorderFaqMutation.mutate({
          faqId: targetFaq.id,
          newOrder: faq.order_index
        });
      }, 100);
    }
  };

  const moveFaqDown = (faq: FAQ) => {
    const sectionFaqs = faqs.filter(f => f.section_id === faq.section_id).sort((a, b) => a.order_index - b.order_index);
    const currentIndex = sectionFaqs.findIndex(f => f.id === faq.id);
    if (currentIndex < sectionFaqs.length - 1) {
      const targetFaq = sectionFaqs[currentIndex + 1];
      console.log(`🔄 Moving FAQ ${faq.id} DOWN: current order ${faq.order_index} → target order ${targetFaq.order_index}`);
      
      // Swap the order_index values
      reorderFaqMutation.mutate({
        faqId: faq.id,
        newOrder: targetFaq.order_index
      });
      
      // Also move the target FAQ up
      setTimeout(() => {
        reorderFaqMutation.mutate({
          faqId: targetFaq.id,
          newOrder: faq.order_index
        });
      }, 100);
    }
  };

  // Group FAQs by section (including orphaned FAQs)
  const groupedFaqs = faqs.reduce((acc, faq) => {
    let section = sections.find(s => s.id === faq.section_id);
    
    // Handle orphaned FAQs (section_id doesn't match any existing section)
    if (!section) {
      // Check if section_id is "0" or similar - assign to general
      if (!faq.section_id || faq.section_id === "0") {
        section = sections.find(s => s.id === "general");
      }
      
      // If still no section found, create a temporary "orphaned" section
      if (!section) {
        section = {
          id: faq.section_id || "orphaned",
          title_en: `Orphaned Section (${faq.section_id})`,
          title_fr: `Section Orpheline (${faq.section_id})`,
          order_index: 999
        };
      }
    }
    
    const sectionKey = `${section.title_en}|${section.title_fr}`;
    if (!acc[sectionKey]) {
      acc[sectionKey] = [];
    }
    acc[sectionKey].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);
  
  // Admin FAQ ready

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
      <div className="flex gap-3 mb-6">
        <Button 
          variant="outline" 
          className="border-blue-500 text-blue-600 hover:bg-blue-50"
          onClick={() => {
            const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order_index)) : 0;
            sectionForm.reset({
              title_en: '',
              title_fr: '',
              order_index: maxOrder + 1
            });
            setEditingSection(null);
            setShowSectionForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Section
        </Button>

        <Button 
          className="bg-orange-500 hover:bg-orange-600"
          onClick={() => {
            const sectionFaqs = faqs.filter(faq => faq.section_id === (sections[0]?.id || 'general'));
            const maxOrder = sectionFaqs.length > 0 ? Math.max(...sectionFaqs.map(f => f.order_index)) : 0;
            faqForm.reset({
              section_id: sections[0]?.id || 'general',
              question_en: '',
              question_fr: '',
              answer_en: '',
              answer_fr: '',
              order_index: maxOrder + 1,
              is_active: true
            });
            setEditingFaq(null);
            setShowFaqForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle FAQ
        </Button>
      </div>

      {/* FAQ Form */}
      {showFaqForm && (
        <Card className="mb-6" id="faq-edit-form">
          <CardHeader>
            <CardTitle>{editingFaq ? 'Modifier la FAQ' : 'Nouvelle FAQ'}</CardTitle>
          </CardHeader>
          <CardContent>
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
                          onChange={(e) => field.onChange(e.target.value)}
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
                          <RichTextEditor
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Votre réponse en français avec mise en forme..."
                          />
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
                          <RichTextEditor
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Your answer in English with formatting..."
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
                      setShowFaqForm(false);
                      setEditingFaq(null);
                      faqForm.reset();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={createFaqMutation.isPending || updateFaqMutation.isPending}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {createFaqMutation.isPending || updateFaqMutation.isPending ? 'En cours...' : editingFaq ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Section Form */}
      {showSectionForm && (
        <Card className="mb-6" id="section-edit-form">
          <CardHeader>
            <CardTitle>{editingSection ? 'Modifier la Section' : 'Nouvelle Section FAQ'}</CardTitle>
          </CardHeader>
          <CardContent>
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
                      setShowSectionForm(false);
                      setEditingSection(null);
                      sectionForm.reset();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSectionMutation.isPending || updateSectionMutation.isPending}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {createSectionMutation.isPending || updateSectionMutation.isPending ? 'En cours...' : editingSection ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

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
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {sectionFaqs.length} FAQ{sectionFaqs.length > 1 ? 's' : ''}
                      </Badge>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {sectionFaqs.filter(f => f.is_active).length} actives
                      </Badge>
                      <Badge variant="outline" className="text-gray-600 border-gray-600">
                        {sectionFaqs.filter(f => !f.is_active).length} inactives
                      </Badge>
                    </div>
                    
                    {section && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveSectionUp(section)}
                          disabled={allSections.findIndex(s => s.id === section.id) === 0}
                          className="text-gray-600 hover:text-gray-800 disabled:opacity-30"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveSectionDown(section)}
                          disabled={allSections.findIndex(s => s.id === section.id) === allSections.length - 1}
                          className="text-gray-600 hover:text-gray-800 disabled:opacity-30"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        
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
                              <strong>Réponse (FR):</strong>
                              <div 
                                className="mt-1 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: htmlSanitizer.sanitize(faq.answer_fr) }}
                              />
                            </div>
                            <div className="text-xs text-gray-500">
                              <strong>Réponse (EN):</strong>
                              <div 
                                className="mt-1 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: htmlSanitizer.sanitize(faq.answer_en) }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveFaqUp(faq)}
                              disabled={sectionFaqs.findIndex(f => f.id === faq.id) === 0}
                              className="text-gray-600 hover:text-gray-800 disabled:opacity-30"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveFaqDown(faq)}
                              disabled={sectionFaqs.findIndex(f => f.id === faq.id) === sectionFaqs.length - 1}
                              className="text-gray-600 hover:text-gray-800 disabled:opacity-30"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            
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
                              onClick={() => {
                                if (window.confirm(`Supprimer la FAQ "${faq.question_fr}" ?`)) {
                                  deleteFaqMutation.mutate(faq.id);
                                }
                              }}
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
  );
}