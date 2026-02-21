import React, { useState, useEffect, Suspense } from 'react';
import { BarChart3, Video, Play, HardDrive, Users, MessageSquare, FileText, LogOut, ChevronRight, Upload, Search, Zap, Layers, UserCheck, Settings, PenTool, Brain, Handshake, Activity, ListOrdered } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpButton } from '@/components/admin/HelpButton';
import { HelpDrawer } from '@/components/admin/HelpDrawer';
import { HelpProvider, useHelp } from '@/contexts/HelpContext';

// Lazy-loaded admin sections (default exports)
const GalleryManagementNew = React.lazy(() => import('@/components/admin/GalleryManagementNew'));
const FAQManagementWorking = React.lazy(() => import('@/components/admin/FAQManagementWorking'));
const SeoManagement = React.lazy(() => import('@/components/admin/SeoManagement'));
const PartnersManagementEnhanced = React.lazy(() => import('@/components/admin/PartnersManagementEnhanced'));

const ContentProductionHub = React.lazy(() => import('@/components/admin/ContentProductionHub'));
const TravelUploadsAdmin = React.lazy(() => import('@/components/admin/TravelUploadsAdmin'));
const TravelAgencyCodesAdmin = React.lazy(() => import('@/components/admin/TravelAgencyCodesAdmin'));
const HeroManagement = React.lazy(() => import('@/components/admin/HeroManagement'));
const CacheManagementSection = React.lazy(() => import('@/components/admin/CacheManagementSection'));

// Lazy-loaded admin sections (named exports)
const AnalyticsNewDashboard = React.lazy(() => import('@/admin/analyticsNew/AnalyticsNewDashboard').then(m => ({ default: m.AnalyticsNewDashboard })));
const SystemDiagnostics = React.lazy(() => import('@/admin/analyticsNew/AnalyticsNewFallback').then(m => ({ default: m.AnalyticsNewFallback })));
const LegalDocumentManagement = React.lazy(() => import('@/components/admin/LegalDocumentManagement').then(m => ({ default: m.LegalDocumentManagement })));
const CtaManagement = React.lazy(() => import('@/components/admin/CtaManagement').then(m => ({ default: m.CtaManagement })));
const WhyMemopykManagement = React.lazy(() => import('@/components/admin/WhyMemopykManagement').then(m => ({ default: m.WhyMemopykManagement })));
const HowItWorksManagement = React.lazy(() => import('@/components/admin/HowItWorksManagement').then(m => ({ default: m.HowItWorksManagement })));
const AIContextManager = React.lazy(() => import('@/admin/AIContextManager').then(m => ({ default: m.AIContextManager })));


function AdminSectionLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4" />
      <p className="text-sm text-gray-500">Chargement...</p>
    </div>
  );
}

function AdminPageContent() {
  const { isHelpOpen, closeHelp, currentRoute } = useHelp();

  // Check URL params for initial section
  const getInitialSection = () => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');

    // Handle blog-edit tab (redirect to blog which is now Blog Posts)
    if (tab === 'blog-edit') {
      return 'blog';
    }

    // Handle Content Production Hub sub-tabs
    // If user has ?tab=topics or ?tab=keywords etc, show blog section
    // Note: 'image-bank' is an alias for 'images'
    if (tab && ['planner', 'topics', 'keywords', 'posts', 'ai-creator', 'images', 'image-bank'].includes(tab)) {
      return 'blog';
    }

    // Handle other tab parameters
    if (tab) {
      return tab;
    }
    return 'analytics-new';
  };

  const [activeSection, setActiveSection] = useState(getInitialSection());

  // Auto-scroll to top when admin page loads or refreshes
  React.useEffect(() => {
    // Immediate scroll without animation for instant positioning
    window.scrollTo(0, 0);
    // Add a small delay to ensure DOM is fully rendered, then smooth scroll
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timeoutId);
  }, []);

  // Handle page refresh (F5) and browser back/forward
  React.useEffect(() => {
    const handlePageLoad = () => {
      // Force scroll to top on page load/refresh
      window.scrollTo(0, 0);
    };

    // Handle browser back/forward navigation and programmatic URL changes
    const handlePopState = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Update active section based on URL parameter
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');

      if (tab === 'blog-edit') {
        setActiveSection('blog');
      } else if (tab && ['planner', 'topics', 'keywords', 'posts', 'ai-creator', 'images', 'image-bank'].includes(tab)) {
        setActiveSection('blog');
      } else if (tab) {
        setActiveSection(tab);
      }
    };

    // Add event listeners
    window.addEventListener('load', handlePageLoad);
    window.addEventListener('popstate', handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener('load', handlePageLoad);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Add logout functionality
  const handleLogout = () => {
    localStorage.removeItem('memopyk_admin_authenticated');
    window.dispatchEvent(new CustomEvent('authStateChange'));
    window.location.reload();
  };

  // Menu structure with direct links and collapsible sections
  // Items with 'directLink' go directly to a section, items with 'children' are collapsible
  const menuCategories = [
    {
      id: 'analytics-new',
      label: 'Analytics',
      icon: BarChart3,
      directLink: true, // Direct link to analytics dashboard
    },
    {
      id: 'blog',
      label: 'Blog',
      icon: PenTool,
      directLink: true, // Direct link to blog (internal tabs handle sub-navigation)
    },
    {
      id: 'partenaires',
      label: 'Partenaires',
      icon: Handshake,
      children: [
        { id: 'travel-agencies', label: 'Agences de Voyage', icon: Upload },
        { id: 'partners', label: 'Annuaire Pro', icon: UserCheck },
      ]
    },
    {
      id: 'seo',
      label: 'SEO',
      icon: Search,
      directLink: true, // Direct link to SEO
    },
    {
      id: 'contenu-site',
      label: 'Contenu Site',
      icon: Layers,
      children: [
        { id: 'hero-management', label: 'Vidéos Hero', icon: Video },
        { id: 'gallery', label: 'Galerie Vidéos', icon: Play },
        { id: 'faq', label: 'FAQ', icon: MessageSquare },
        { id: 'why-memopyk', label: 'Pourquoi MEMOPYK', icon: Users },
        { id: 'how-it-works', label: 'Comment ça marche', icon: ListOrdered },
        { id: 'cta', label: 'Boutons CTA', icon: Zap },
        { id: 'legal-docs', label: 'Documents Légaux', icon: FileText },
      ]
    },
    {
      id: 'systeme',
      label: 'Système',
      icon: Settings,
      children: [
        { id: 'ai-context', label: 'AI Context', icon: Brain },
        { id: 'cache', label: 'Cache', icon: HardDrive },
        { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
      ]
    },
  ];

  // State for expanded categories (persisted in localStorage)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('admin_expanded_categories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return []; // No default expansion needed
      }
    }
    return []; // No default expansion (top items are direct links)
  });

  // Persist expanded categories to localStorage
  useEffect(() => {
    localStorage.setItem('admin_expanded_categories', JSON.stringify(expandedCategories));
  }, [expandedCategories]);

  // Find which category contains the active section and expand it
  useEffect(() => {
    const category = menuCategories.find(cat =>
      cat.children?.some(child => child.id === activeSection)
    );
    if (category && !expandedCategories.includes(category.id)) {
      setExpandedCategories(prev => [...prev, category.id]);
    }
  }, [activeSection]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Check if a category has an active child (for collapsible items)
  const categoryHasActiveChild = (category: typeof menuCategories[0]) => {
    return category.children?.some(child => child.id === activeSection) ?? false;
  };

  // Check if a direct link item is active
  const isDirectLinkActive = (category: typeof menuCategories[0]) => {
    return category.directLink && category.id === activeSection;
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-full bg-gray-900 text-white flex flex-col z-40">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">MEMOPYK</h1>
              <p className="text-xs text-gray-700">Panel d'administration</p>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {/* Section Title */}
          <div className="mb-4 px-2">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Sections</h3>
          </div>

          <div className="space-y-1">
            {menuCategories.map((category) => {
              const CategoryIcon = category.icon;
              const isExpanded = expandedCategories.includes(category.id);
              const hasActiveChild = categoryHasActiveChild(category);
              const isDirectActive = isDirectLinkActive(category);

              // Direct link items (no children, navigate directly)
              if (category.directLink) {
                return (
                  <div key={category.id} className="mb-1">
                    <button
                      onClick={() => {
                        setActiveSection(category.id);
                        window.history.pushState({}, '', `/en-US/admin?tab=${category.id}`);
                      }}
                      className={`w-full flex items-center px-3 py-2.5 rounded-lg text-left transition-colors duration-200 group ${
                        isDirectActive
                          ? 'text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                      style={isDirectActive ? { backgroundColor: 'var(--memopyk-orange)' } : {}}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-1.5 rounded-md ${isDirectActive ? 'bg-orange-600' : 'group-hover:bg-gray-700'}`}>
                          <CategoryIcon className={`h-4 w-4 ${isDirectActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                        </div>
                        <span className={`text-sm font-medium ${isDirectActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                          {category.label}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              }

              // Collapsible category items (with children)
              return (
                <div key={category.id} className="mb-1">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors duration-200 group ${
                      hasActiveChild
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded-md ${hasActiveChild ? 'bg-gray-700' : 'group-hover:bg-gray-700'}`}>
                        <CategoryIcon className={`h-4 w-4 ${hasActiveChild ? 'text-orange-400' : 'text-gray-400 group-hover:text-white'}`} />
                      </div>
                      <span className={`text-sm font-medium ${hasActiveChild ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                        {category.label}
                      </span>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {/* Category Children */}
                  {category.children && (
                    <div
                      className={`overflow-hidden transition-all duration-200 ${
                        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-700 pl-3">
                        {category.children.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = activeSection === item.id;

                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveSection(item.id);
                                window.history.pushState({}, '', `/en-US/admin?tab=${item.id}`);
                              }}
                              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-left transition-colors duration-200 group ${
                                isActive
                                  ? 'text-white'
                                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                              }`}
                              style={isActive ? { backgroundColor: 'var(--memopyk-orange)' } : {}}
                            >
                              <ItemIcon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
                              <span className={`text-sm ${isActive ? 'text-white font-medium' : 'text-gray-400 group-hover:text-white'}`}>
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Help & Logout - Fixed at bottom */}
        <div className="p-4 border-t border-gray-700 flex-shrink-0 space-y-2">
          <HelpButton />
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Content with left margin for sidebar + right margin for help drawer */}
      <div className={`ml-64 overflow-visible transition-all duration-300 ${isHelpOpen ? 'mr-80' : ''}`}>
        <div className="p-8 overflow-visible">
          <Suspense fallback={<AdminSectionLoader />}>

            {/* Hero Management */}
            {activeSection === 'hero-management' && (
              <HeroManagement />
            )}

            {/* Travel Agencies Admin (Uploads + Agency Codes) */}
            {activeSection === 'travel-agencies' && (
              <Tabs defaultValue="uploads" className="w-full">
                <TabsList className="mb-4 bg-gray-100 border border-gray-200">
                  <TabsTrigger value="uploads" className="data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-gray-900 px-4 py-2">Uploads</TabsTrigger>
                  <TabsTrigger value="agency-codes" className="data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-gray-900 px-4 py-2">Agency Codes</TabsTrigger>
                </TabsList>

                <TabsContent value="uploads">
                  <TravelUploadsAdmin />
                </TabsContent>

                <TabsContent value="agency-codes">
                  <TravelAgencyCodesAdmin />
                </TabsContent>
              </Tabs>
            )}

            {/* Analytics New Dashboard */}
            {activeSection === 'analytics-new' && (
              <AnalyticsNewDashboard />
            )}

            {/* Gallery */}
            {activeSection === 'gallery' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Galerie</h2>
                  <p className="text-gray-600 dark:text-gray-700">Gestion des éléments de galerie portfolio - Interface améliorée</p>
                </div>
                <GalleryManagementNew key="gallery-v1.0.88" />
              </div>
            )}

            {/* Cache Management */}
            {activeSection === 'cache' && (
              <CacheManagementSection />
            )}

            {/* SEO Management */}
            {activeSection === 'seo' && (
              <div className="space-y-6">
                <SeoManagement />
              </div>
            )}

            {/* Blog Posts - Unified Content Production Hub */}
            {activeSection === 'blog' && (
              <ContentProductionHub />
            )}

            {/* FAQ */}
            {activeSection === 'faq' && (
              <div className="space-y-6">
                <FAQManagementWorking />
              </div>
            )}

            {/* Partners Management */}
            {activeSection === 'partners' && (
              <PartnersManagementEnhanced />
            )}

            {/* CTA Management */}
            {activeSection === 'cta' && (
              <div className="space-y-6">
                <CtaManagement />
              </div>
            )}

            {/* Why MEMOPYK Cards */}
            {activeSection === 'why-memopyk' && (
              <div className="space-y-6">
                <WhyMemopykManagement />
              </div>
            )}

            {/* Comment ça marche Steps */}
            {activeSection === 'how-it-works' && (
              <div className="space-y-6">
                <HowItWorksManagement />
              </div>
            )}

            {/* Legal Documents */}
            {activeSection === 'legal-docs' && (
              <div className="space-y-6">
                <LegalDocumentManagement />
              </div>
            )}

            {/* System Diagnostics */}
            {activeSection === 'diagnostics' && (
              <SystemDiagnostics />
            )}

            {/* AI Context (Brand Brain) */}
            {activeSection === 'ai-context' && (
              <div className="space-y-6">
                <AIContextManager />
              </div>
            )}

          </Suspense>
        </div>
      </div>

      {/* Help Drawer - fixed to right, pushes content via margin */}
      <div className={`fixed right-0 top-0 h-full z-50 transition-transform duration-300 ${isHelpOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <HelpDrawer
          isOpen={isHelpOpen}
          onClose={closeHelp}
          currentRoute={currentRoute}
        />
      </div>
    </div>
  );
}

// Wrapper component that provides help context
export default function AdminPage() {
  return (
    <HelpProvider>
      <AdminPageContent />
    </HelpProvider>
  );
}
