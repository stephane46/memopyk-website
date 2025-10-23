import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { htmlSanitizer } from '@/lib/sanitize-html';

interface FAQ {
  id: string;
  question_en: string;
  question_fr: string;
  answer_en: string;
  answer_fr: string;
  order_index: number;
  is_active: boolean;
  section_id?: string;
}

interface FAQSection {
  id: string;
  title_en: string;
  title_fr: string;
  order_index: number;
}

export default function FAQSection() {
  const { language } = useLanguage();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch FAQs
  const { data: faqs = [], isLoading: faqsLoading, error: faqsError } = useQuery<FAQ[]>({
    queryKey: ['/api/faqs']
  });

  // Fetch FAQ Sections
  const { data: sections = [], isLoading: sectionsLoading, error: sectionsError } = useQuery<FAQSection[]>({
    queryKey: ['/api/faq-sections']
  });

  const isLoading = faqsLoading || sectionsLoading;
  const hasError = faqsError || sectionsError;

  // Filter active FAQs and sort by order - with safety checks
  const activeFAQs = Array.isArray(faqs) 
    ? faqs.filter(faq => faq && faq.is_active)
           .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    : [];

  // Group FAQs by section with safety checks
  const faqsBySection = activeFAQs.reduce((groups, faq) => {
    if (!faq) return groups;
    
    // Handle FAQs with no section or section_id of "0" - assign to "general"
    let sectionId = faq.section_id;
    if (!sectionId || String(sectionId) === "0") {
      sectionId = "general";
    }
    
    const sectionKey = String(sectionId); // Ensure string type
    if (!groups[sectionKey]) {
      groups[sectionKey] = [];
    }
    groups[sectionKey].push(faq);
    return groups;
  }, {} as Record<string, FAQ[]>);

  // Sort sections by order with safety checks
  const sortedSections = Array.isArray(sections) 
    ? [...sections].filter(section => section && section.id)
                   .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    : [];
  
  // Sections are now displaying properly - debug confirmed all 5 sections load!

  const toggleSection = (sectionId: string) => {
    const isOpening = openSection !== sectionId;
    setOpenSection(isOpening ? sectionId : null);
    
    // Scroll to section title if opening
    if (isOpening) {
      // Wait for state update and DOM to render, then scroll to element
      setTimeout(() => {
        const element = sectionRefs.current[sectionId];
        if (element) {
          // Calculate offset to show section title and some content
          const elementRect = element.getBoundingClientRect();
          const offset = window.scrollY + elementRect.top - 100; // 100px padding from top
          
          window.scrollTo({
            top: offset,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  const toggleQuestion = (questionId: string) => {
    const isCurrentlyOpen = openQuestions.has(questionId);
    
    if (isCurrentlyOpen) {
      // Close the current question
      setOpenQuestions(new Set());
    } else {
      // Close all questions and open only the selected one
      setOpenQuestions(new Set([questionId]));
      
      // Wait for state update and DOM to render, then scroll to element
      setTimeout(() => {
        const element = questionRefs.current[questionId];
        if (element) {
          // Calculate offset to show question title and answer content
          const elementRect = element.getBoundingClientRect();
          const offset = window.scrollY + elementRect.top - 80; // 80px padding from top
          
          window.scrollTo({
            top: offset,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  // Error handling
  if (hasError) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                {language === 'fr-FR' ? 'Erreur de chargement' : 'Loading Error'}
              </h3>
              <p className="text-red-600">
                {language === 'fr-FR' 
                  ? 'Impossible de charger les questions fréquentes. Veuillez rafraîchir la page.'
                  : 'Unable to load frequently asked questions. Please refresh the page.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-96 mx-auto mb-8"></div>
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-300 rounded mb-4"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Don't render if no active FAQs
  if (activeFAQs.length === 0) {
    return null;
  }

  return (
    <section id="faq" className="py-12 bg-gradient-to-br from-memopyk-cream/50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Section Header - Mobile Optimized */}
        <div className="text-center mb-6 sm:mb-8 lg:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-poppins font-bold text-memopyk-navy mb-6 px-2">
            {language === 'fr-FR' ? 'Foire aux Questions' : 'Frequently Asked Questions'}
          </h2>
        </div>

        {/* FAQ Content - Mobile Optimized */}
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* All FAQ Sections - Accordion Style */}
          {sortedSections.map((section) => {
            if (!section || !section.id) return null;
            
            const sectionKey = String(section.id); // Ensure string type
            const sectionFAQs = faqsBySection[sectionKey] || [];

            return (
              <div key={section.id} className="space-y-3 sm:space-y-4">
                {/* Section Header - Mobile Optimized Accordion */}
                <div 
                  ref={(el) => { sectionRefs.current[sectionKey] = el; }}
                  className="border-l-4 border-memopyk-orange pl-3 sm:pl-4 mb-4 sm:mb-6"
                >
                  <button
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full text-left flex items-center justify-between hover:bg-gray-50 transition-colors p-2 sm:p-2 rounded touch-manipulation min-h-[44px]"
                  >
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 pr-2">
                      {language === 'fr-FR' ? section.title_fr : section.title_en}
                    </h3>
                    {openSection === sectionKey ? (
                      <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                </div>

                {/* Section Content - Mobile Optimized */}
                {openSection === sectionKey && (
                  <div className="space-y-3 sm:space-y-4 animate-in slide-in-from-top-2 duration-300">
                    {sectionFAQs.length === 0 ? (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 text-center text-gray-500 text-sm sm:text-base">
                        {language === 'fr-FR' 
                          ? 'Aucune question dans cette section pour le moment.' 
                          : 'No questions in this section yet.'}
                      </div>
                    ) : (
                      sectionFAQs.map((faq) => (
                        <div
                          key={faq.id}
                          ref={(el) => { questionRefs.current[faq.id] = el; }}
                          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                        >
                          {/* Question Header - Mobile Optimized */}
                          <button
                            onClick={() => toggleQuestion(faq.id)}
                            className={`w-full text-left px-4 sm:px-6 py-3 sm:py-4 transition-colors flex items-center justify-between touch-manipulation min-h-[44px] ${
                              openQuestions.has(faq.id) 
                                ? 'bg-memopyk-cream' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <h4 className={`text-base sm:text-lg font-semibold pr-2 sm:pr-4 leading-tight ${
                              openQuestions.has(faq.id) 
                                ? 'text-memopyk-navy' 
                                : 'text-gray-900'
                            }`}>
                              {language === 'fr-FR' ? faq.question_fr : faq.question_en}
                            </h4>
                            {openQuestions.has(faq.id) ? (
                              <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-memopyk-navy flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                            )}
                          </button>

                          {/* Answer Content - Mobile Optimized */}
                          {openQuestions.has(faq.id) && (
                            <div className="px-4 sm:px-6 pb-3 sm:pb-4 pt-2 border-t border-memopyk-cream bg-memopyk-cream animate-in slide-in-from-top-2 duration-200">
                              <div 
                                className="text-memopyk-navy leading-relaxed prose prose-sm max-w-none text-sm sm:text-base"
                                dangerouslySetInnerHTML={{
                                  __html: htmlSanitizer.sanitize(language === 'fr-FR' ? faq.answer_fr : faq.answer_en)
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}