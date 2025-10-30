import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface PublishedAtPickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
}

export function PublishedAtPicker({ value, onChange, label = "Published At" }: PublishedAtPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value || undefined);
  const [hours, setHours] = useState(value ? value.getHours().toString().padStart(2, '0') : '12');
  const [minutes, setMinutes] = useState(value ? value.getMinutes().toString().padStart(2, '0') : '00');

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      updateDateTime(date, parseInt(hours), parseInt(minutes));
    }
  };

  const handleTimeChange = (newHours: string, newMinutes: string) => {
    setHours(newHours);
    setMinutes(newMinutes);
    if (selectedDate) {
      updateDateTime(selectedDate, parseInt(newHours) || 0, parseInt(newMinutes) || 0);
    }
  };

  const updateDateTime = (date: Date, h: number, m: number) => {
    const combined = new Date(date);
    combined.setHours(h, m, 0, 0);
    onChange(combined);
  };

  const setToNow = () => {
    const now = new Date();
    setSelectedDate(now);
    setHours(now.getHours().toString().padStart(2, '0'));
    setMinutes(now.getMinutes().toString().padStart(2, '0'));
    onChange(now);
  };

  const clearDate = () => {
    setSelectedDate(undefined);
    setHours('12');
    setMinutes('00');
    onChange(null);
  };

  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start text-left font-normal"
          onClick={() => setShowCalendar(!showCalendar)}
          data-testid="button-published-at"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, 'PPP', { locale: fr })
          ) : (
            <span>Choisir une date</span>
          )}
        </Button>
        {selectedDate && (
          <Button
            type="button"
            variant="outline"
            onClick={clearDate}
            data-testid="button-clear-date"
          >
            Effacer
          </Button>
        )}
      </div>
      
      {showCalendar && (
        <Card className="mt-2">
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              locale={fr}
            />
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => {
                    const val = Math.min(23, Math.max(0, parseInt(e.target.value) || 0));
                    handleTimeChange(val.toString().padStart(2, '0'), minutes);
                  }}
                  className="w-16 text-center"
                  data-testid="input-hours"
                />
                <span className="text-xl font-bold">:</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => {
                    const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                    handleTimeChange(hours, val.toString().padStart(2, '0'));
                  }}
                  className="w-16 text-center"
                  data-testid="input-minutes"
                />
              </div>
              <Button
                type="button"
                onClick={setToNow}
                variant="outline"
                className="w-full text-[#6366f1]"
                data-testid="button-set-to-now"
              >
                Définir maintenant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {selectedDate && (
        <p className="text-sm text-gray-600">
          {format(selectedDate, "PPP 'à' HH:mm", { locale: fr })}
        </p>
      )}
    </div>
  );
}
