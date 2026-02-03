import React from 'react';
import { X, HelpCircle, BookOpen, Loader2 } from 'lucide-react';
import { useHelpScreen, useHelpFlows, useHelpFlow } from '@/hooks/useHelp';
import { HelpFlowViewer } from './HelpFlowViewer';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute: string;
}

export function HelpDrawer({ isOpen, onClose, currentRoute }: HelpDrawerProps) {
  const [selectedFlowId, setSelectedFlowId] = React.useState<string | null>(null);

  // Only fetch when drawer is open to avoid unnecessary requests
  const { data: screenHelp, isLoading: screenLoading } = useHelpScreen(currentRoute, isOpen);
  const { data: flows, isLoading: flowsLoading } = useHelpFlows(isOpen);
  const { data: selectedFlow } = useHelpFlow(selectedFlowId);

  // Reset flow selection when drawer closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFlowId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="w-80 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 shadow-lg">
      {/* Sticky Header with X button - always visible */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-orange-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Help</h2>
        </div>
        <button
          onClick={onClose}
          title="Close help"
          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedFlow ? (
          <HelpFlowViewer
            flow={selectedFlow}
            onBack={() => setSelectedFlowId(null)}
          />
        ) : (
          <div className="space-y-6">
            {/* Screen Help Section */}
            <section>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                This Screen
              </h3>
              {screenLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : screenHelp ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: screenHelp.htmlContent }}
                />
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No help content available for this screen yet.
                </p>
              )}
            </section>

            {/* How do I... Section */}
            <section>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                How do I...
              </h3>
              {flowsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : flows && flows.length > 0 ? (
                <div className="space-y-2">
                  {flows.map((flow) => (
                    <button
                      key={flow.id}
                      onClick={() => setSelectedFlowId(flow.id)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{flow.title}</p>
                      {flow.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {flow.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No guides available yet.
                </p>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center bg-gray-50 dark:bg-gray-800">
        <p className="text-xs text-gray-400">
          Need more help? Contact support.
        </p>
      </div>
    </div>
  );
}
