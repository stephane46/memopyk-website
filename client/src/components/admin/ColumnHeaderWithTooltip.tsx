import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ColumnHeaderWithTooltipProps {
  label: string;
  tip: string;
}

export const ColumnHeaderWithTooltip = ({ label, tip }: ColumnHeaderWithTooltipProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help font-medium">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm">
        {tip}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);