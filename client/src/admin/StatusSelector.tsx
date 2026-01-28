import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Edit, MessageSquare, CheckCircle } from 'lucide-react';

type BlogStatus = 'draft' | 'in_review' | 'published';

interface StatusSelectorProps {
  value: BlogStatus;
  onChange: (value: BlogStatus) => void;
  label?: string;
}

export function StatusSelector({ value, onChange, label = "Status" }: StatusSelectorProps) {
  const statusConfig = {
    draft: {
      icon: Edit,
      label: 'Draft',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    in_review: {
      icon: MessageSquare,
      label: 'In Review',
      color: 'text-[#D67C4A]',
      bgColor: 'bg-orange-100'
    },
    published: {
      icon: CheckCircle,
      label: 'Published',
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  };

  const CurrentIcon = statusConfig[value].icon;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(val) => onChange(val as BlogStatus)}>
        <SelectTrigger data-testid="select-status" className="w-full">
          <SelectValue>
            <div className="flex items-center gap-2">
              <CurrentIcon className={`h-4 w-4 ${statusConfig[value].color}`} />
              <span>{statusConfig[value].label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <SelectItem key={key} value={key} data-testid={`status-${key}`}>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${config.bgColor}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <span>{config.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
