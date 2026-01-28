import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
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

const FRENCH_TZ = 'Europe/Paris';

export function PublishedAtPicker({ value, onChange, label = "Published At" }: PublishedAtPickerProps) {
  // Convert incoming Date to French timezone DateTime
  const valueDT = value ? DateTime.fromJSDate(value).setZone(FRENCH_TZ) : null;
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    valueDT ? valueDT.toJSDate() : undefined
  );
  const [hours, setHours] = useState(valueDT ? valueDT.hour.toString().padStart(2, '0') : '12');
  const [minutes, setMinutes] = useState(valueDT ? valueDT.minute.toString().padStart(2, '0') : '00');

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
    // Create DateTime in French timezone
    const frenchDT = DateTime.fromJSDate(date, { zone: FRENCH_TZ })
      .set({ hour: h, minute: m, second: 0, millisecond: 0 });
    
    // Pass back as JavaScript Date (internally stored in French timezone)
    onChange(frenchDT.toJSDate());
  };

  const setToNow = () => {
    // Get current time in French timezone
    const nowFrench = DateTime.now().setZone(FRENCH_TZ);
    setSelectedDate(nowFrench.toJSDate());
    setHours(nowFrench.hour.toString().padStart(2, '0'));
    setMinutes(nowFrench.minute.toString().padStart(2, '0'));
    onChange(nowFrench.toJSDate());
  };

  const clearDate = () => {
    setSelectedDate(undefined);
    setHours('12');
    setMinutes('00');
    onChange(null);
  };

  const [showCalendar, setShowCalendar] = useState(false);

  // Format date for display in French timezone
  const formatDateDisplay = (date: Date | undefined): string => {
    if (!date) return '';
    const dt = DateTime.fromJSDate(date).setZone(FRENCH_TZ);
    return dt.toFormat('dd MMMM yyyy', { locale: 'fr' });
  };

  const formatDateTimeDisplay = (date: Date | undefined): string => {
    if (!date) return '';
    const dt = DateTime.fromJSDate(date).setZone(FRENCH_TZ);
    return dt.toFormat("dd MMMM yyyy 'à' HH:mm", { locale: 'fr' });
  };

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
            formatDateDisplay(selectedDate)
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
                Définir maintenant (heure française)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {selectedDate && (
        <p className="text-sm text-gray-600">
          {formatDateTimeDisplay(selectedDate)} (Europe/Paris)
        </p>
      )}
    </div>
  );
}
