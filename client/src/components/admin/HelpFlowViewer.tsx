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
  const steps = flow.stepsJson || [];
  const step = steps[currentStep];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <span className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      {/* Flow title */}
      <h3 className="text-lg font-semibold mt-4 mb-2">{flow.title}</h3>

      {/* Progress dots */}
      <div className="flex gap-2 mb-4">
        {steps.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentStep(idx)}
            className="p-0.5"
          >
            {idx < currentStep ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : idx === currentStep ? (
              <Circle className="h-5 w-5 text-primary fill-primary" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        ))}
      </div>

      {/* Current step content */}
      {step && (
        <div className="flex-1 overflow-y-auto">
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
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t mt-4">
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
