import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HelpFlow } from '@/hooks/useHelp';

interface HelpFlowViewerProps {
  flow: HelpFlow;
  onBack: () => void;
}

export function HelpFlowViewer({ flow, onBack }: HelpFlowViewerProps) {
  const [currentStep, setCurrentStep] = React.useState(0);

  // Handle stepsJson being either an array or a JSON string
  const steps = React.useMemo(() => {
    const rawSteps = flow.stepsJson;
    if (!rawSteps) return [];
    if (Array.isArray(rawSteps)) return rawSteps;
    if (typeof rawSteps === 'string') {
      try {
        const parsed = JSON.parse(rawSteps);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [flow.stepsJson]);

  const step = steps[currentStep];

  return (
    <div className="space-y-4">
      {/* Header with Back button */}
      <div className="flex items-center gap-2 pb-3 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <span className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      {/* Flow title */}
      <h3 className="text-lg font-semibold">{flow.title}</h3>

      {/* Progress dots */}
      <div className="flex gap-2">
        {steps.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentStep(idx)}
            className="p-0.5 hover:scale-110 transition-transform"
            title={`Step ${idx + 1}`}
          >
            {idx < currentStep ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : idx === currentStep ? (
              <Circle className="h-6 w-6 text-orange-500 fill-orange-500" />
            ) : (
              <Circle className="h-6 w-6 text-gray-300" />
            )}
          </button>
        ))}
      </div>

      {/* Current step content */}
      {step && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium text-base mb-2">{step.title}</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {step.instruction}
          </p>
          {step.route && (
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
              Location: <code className="bg-muted px-1 rounded">{step.route}</code>
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
          disabled={currentStep === steps.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
