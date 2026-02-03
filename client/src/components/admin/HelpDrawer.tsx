import React from 'react';
import { X, HelpCircle, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <>
      {/* Drawer - no backdrop, stays open while user works */}
      <div className="fixed right-0 top-0 h-full w-[400px] max-w-[90vw] bg-background border-l shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Help</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Close help"
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
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
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  This Screen
                </h3>
                {screenLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : screenHelp ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: screenHelp.htmlContent }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No help content available for this screen yet.
                  </p>
                )}
              </section>

              {/* How do I... Section */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  How do I...
                </h3>
                {flowsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : flows && flows.length > 0 ? (
                  <div className="space-y-2">
                    {flows.map((flow) => (
                      <button
                        key={flow.id}
                        onClick={() => setSelectedFlowId(flow.id)}
                        className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <p className="font-medium text-sm">{flow.title}</p>
                        {flow.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {flow.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No guides available yet.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Need more help? Contact support.
          </p>
        </div>
      </div>
    </>
  );
}
