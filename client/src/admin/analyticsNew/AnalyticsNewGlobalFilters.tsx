import React, { useState, useCallback } from 'react';
import { Calendar, ChevronDown, Filter, X, Clock, CalendarIcon, Info, Globe, Languages } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAnalyticsNewFilters, DATE_PRESETS, formatParisDateWindow } from './analyticsNewFilters.store';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import './analyticsNew.tokens.css';

interface AnalyticsNewGlobalFiltersProps {
  className?: string;
  hideDateFilters?: boolean;
}

// Simple English date formatter for Start Override badge
const formatEnglishDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export const AnalyticsNewGlobalFilters: React.FC<AnalyticsNewGlobalFiltersProps> = ({ 
  className = '',
  hideDateFilters = false
}) => {
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [sinceCalendarOpen, setSinceCalendarOpen] = useState(false);
  const {
    datePreset,
    customDateStart,
    customDateEnd,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    setDatePreset,
    setCustomDateRange,
    setSinceDate,
    setSinceDateEnabled,
    setLanguage,
    setCountry,
    getActiveFilters,
    getDateRange,
    reset,
  } = useAnalyticsNewFilters();

  const activeFilters = getActiveFilters();
  const activeFilterCount = Object.keys(activeFilters).length;

  
  // Display logic: Show what the user actually selected (ignoring exclusions)
  const getDisplayDateRange = () => {
    const ZONE = 'Europe/Paris';
    const todayParis = DateTime.now().setZone(ZONE).startOf('day');
    
    if (datePreset === 'custom') {
      if (!customDateStart || !customDateEnd) {
        const todayStr = todayParis.toFormat('yyyy-LL-dd');
        return { start: todayStr, end: todayStr };
      }
      return { start: customDateStart, end: customDateEnd };
    }
    
    if (datePreset === 'today') {
      const todayStr = todayParis.toFormat('yyyy-LL-dd');
      return { start: todayStr, end: todayStr };
    }
    
    if (datePreset === 'yesterday') {
      const yesterdayStr = todayParis.minus({ days: 1 }).toFormat('yyyy-LL-dd');
      return { start: yesterdayStr, end: yesterdayStr };
    }
    
    // Handle day-based presets without exclusions
    const days = datePreset === '7d' ? 7 : datePreset === '30d' ? 30 : 90;
    const startDate = todayParis.minus({ days });
    
    return {
      start: startDate.toFormat('yyyy-LL-dd'),
      end: todayParis.toFormat('yyyy-LL-dd')
    };
  };
  
  const displayRange = getDisplayDateRange();
  const windowDisplay = formatParisDateWindow(displayRange.start, displayRange.end);

  return (
    <div className={`w-full py-2 px-0 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
            
            {/* Language/Country Filters - Always on the left */}
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-sm font-medium text-gray-600 shrink-0">Filters:</span>
              
              {/* Language Filter - Working Implementation */}
              <div className="flex items-center gap-1 border border-gray-200 rounded-md p-2 bg-white relative z-[60] isolation-isolate pointer-events-auto">
                <Languages className="h-4 w-4 text-gray-500 ml-1" />
                <button
                  type="button"
                  onClick={() => setLanguage('all')}
                  className={`h-7 px-3 text-sm font-medium rounded cursor-pointer transition-colors border-0 outline-none pointer-events-auto ${
                    language === 'all' 
                      ? 'seo-language-btn-active' 
                      : 'seo-language-btn-inactive'
                  }`}
                  data-testid="filter-language-all"
                >
                  ALL
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`h-7 px-3 text-sm font-medium rounded cursor-pointer transition-colors border-0 outline-none pointer-events-auto ${
                    language === 'en' 
                      ? 'seo-language-btn-active' 
                      : 'seo-language-btn-inactive'
                  }`}
                  data-testid="filter-language-en"
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('fr')}
                  className={`h-7 px-3 text-sm font-medium rounded cursor-pointer transition-colors border-0 outline-none pointer-events-auto ${
                    language === 'fr' 
                      ? 'seo-language-btn-active' 
                      : 'seo-language-btn-inactive'
                  }`}
                  data-testid="filter-language-fr"
                >
                  FR
                </button>
              </div>

              {/* Country Filter - Match Language Style */}
              <div className="flex items-center gap-1 border border-gray-200 rounded-md p-2 bg-white relative z-[60] isolation-isolate pointer-events-auto">
                <Globe className="h-4 w-4 text-gray-500 ml-1" />
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-7 px-3 text-sm w-[140px] shrink-0 bg-orange-500 border-orange-500 text-white country-select-trigger border-0" data-testid="filter-country">
                    <SelectValue placeholder="Market" />
                  </SelectTrigger>
                <SelectContent className="max-h-48 text-sm z-[1010]" position="popper" avoidCollisions={false}>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      ALL
                    </div>
                  </SelectItem>
                  <SelectItem value="France">
                    <div className="flex items-center gap-2">
                      France
                    </div>
                  </SelectItem>
                  <SelectItem value="United States">
                    <div className="flex items-center gap-2">
                      United States
                    </div>
                  </SelectItem>
                  <SelectItem value="Canada">
                    <div className="flex items-center gap-2">
                      Canada
                    </div>
                  </SelectItem>
                  <SelectItem value="United Kingdom">
                    <div className="flex items-center gap-2">
                      United Kingdom
                    </div>
                  </SelectItem>
                  <SelectItem value="Germany">
                    <div className="flex items-center gap-2">
                      Germany
                    </div>
                  </SelectItem>
                  <SelectItem value="Australia">
                    <div className="flex items-center gap-2">
                      Australia
                    </div>
                  </SelectItem>
                  <SelectItem value="Spain">
                    <div className="flex items-center gap-2">
                      Spain
                    </div>
                  </SelectItem>
                  <SelectItem value="Italy">
                    <div className="flex items-center gap-2">
                      Italy
                    </div>
                  </SelectItem>
                  <SelectItem value="Brazil">
                    <div className="flex items-center gap-2">
                      Brazil
                    </div>
                  </SelectItem>
                  <SelectItem value="Japan">
                    <div className="flex items-center gap-2">
                      Japan
                    </div>
                  </SelectItem>
                </SelectContent>
                </Select>
              </div>

              {/* Reset Button - Icon Only */}
              {activeFilterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={reset}
                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 shrink-0"
                  data-testid="filter-reset"
                  aria-label="Reset filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Date Filters - On the right */}
            {!hideDateFilters && (
              <div className="flex flex-wrap items-center gap-4">
                {/* Date Range Label and Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 flex items-center shrink-0">
                    <Calendar className="h-4 w-4 mr-1" />
                    Date Range:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {DATE_PRESETS.map((preset) => (
                    <Button
                      key={preset.key}
                      variant={datePreset === preset.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDatePreset(preset.key)}
                      className={`h-8 px-3 ${datePreset === preset.key ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}`}
                      data-testid={`filter-preset-${preset.key}`}
                    >
                      {preset.label}
                    </Button>
                  ))}
                  </div>
                </div>

                {/* Custom Date Range - Show when custom is selected */}
                {datePreset === 'custom' && (
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Start Date with Calendar */}
                    <div className="relative">
                      <Input
                        type="text"
                        value={(() => {
                          if (!customDateStart) return '';
                          // If it's already in DD/MM/YYYY format, return as-is
                          if (customDateStart.includes('/')) return customDateStart;
                          // Otherwise convert from YYYY-MM-DD to DD/MM/YYYY
                          const date = new Date(customDateStart);
                          if (isNaN(date.getTime())) return customDateStart;
                          const day = date.getDate().toString().padStart(2, '0');
                          const month = (date.getMonth() + 1).toString().padStart(2, '0');
                          const year = date.getFullYear();
                          return `${day}/${month}/${year}`;
                        })()}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow typing - store the display value temporarily
                          if (value.length <= 10) {
                            // If complete DD/MM/YYYY format, convert to YYYY-MM-DD for backend
                            const parts = value.split('/');
                            if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                              const [day, month, year] = parts;
                              if (!isNaN(Number(day)) && !isNaN(Number(month)) && !isNaN(Number(year))) {
                                const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                                setCustomDateRange(isoDate, customDateEnd);
                                return;
                              }
                            }
                            // Otherwise store as display format for partial input
                            setCustomDateRange(value, customDateEnd);
                          }
                        }}
                        className="w-32 h-8 pr-8"
                        data-testid="filter-custom-start"
                        placeholder="dd/mm/yyyy"
                        maxLength={10}
                      />
                      <Dialog open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                            data-testid="start-date-calendar-trigger"
                          >
                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-auto">
                          <CalendarComponent
                            mode="single"
                            selected={customDateStart ? new Date(customDateStart.includes('/') ? 
                              customDateStart.split('/').reverse().join('-') : customDateStart) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                // Fix timezone issue - use local date formatting
                                const year = date.getFullYear();
                                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                const day = date.getDate().toString().padStart(2, '0');
                                const isoDate = `${year}-${month}-${day}`;
                                setCustomDateRange(isoDate, customDateEnd);
                              }
                              setStartCalendarOpen(false);
                            }}
                            weekStartsOn={1}
                            initialFocus
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <span className="text-sm text-gray-500 shrink-0">to</span>
                    
                    {/* End Date with Calendar */}
                    <div className="relative">
                      <Input
                        type="text"
                        value={(() => {
                          if (!customDateEnd) return '';
                          // If it's already in DD/MM/YYYY format, return as-is
                          if (customDateEnd.includes('/')) return customDateEnd;
                          // Otherwise convert from YYYY-MM-DD to DD/MM/YYYY
                          const date = new Date(customDateEnd);
                          if (isNaN(date.getTime())) return customDateEnd;
                          const day = date.getDate().toString().padStart(2, '0');
                          const month = (date.getMonth() + 1).toString().padStart(2, '0');
                          const year = date.getFullYear();
                          return `${day}/${month}/${year}`;
                        })()}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow typing - store the display value temporarily
                          if (value.length <= 10) {
                            // If complete DD/MM/YYYY format, convert to YYYY-MM-DD for backend
                            const parts = value.split('/');
                            if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                              const [day, month, year] = parts;
                              if (!isNaN(Number(day)) && !isNaN(Number(month)) && !isNaN(Number(year))) {
                                const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                                setCustomDateRange(customDateStart, isoDate);
                                return;
                              }
                            }
                            // Otherwise store as display format for partial input
                            setCustomDateRange(customDateStart, value);
                          }
                        }}
                        className="w-32 h-8 pr-8"
                        data-testid="filter-custom-end"
                        placeholder="dd/mm/yyyy"
                        maxLength={10}
                      />
                      <Dialog open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                            data-testid="end-date-calendar-trigger"
                          >
                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-auto">
                          <CalendarComponent
                            mode="single"
                            selected={customDateEnd ? new Date(customDateEnd.includes('/') ? 
                              customDateEnd.split('/').reverse().join('-') : customDateEnd) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                // Fix timezone issue - use local date formatting
                                const year = date.getFullYear();
                                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                const day = date.getDate().toString().padStart(2, '0');
                                const isoDate = `${year}-${month}-${day}`;
                                setCustomDateRange(customDateStart, isoDate);
                              }
                              setEndCalendarOpen(false);
                            }}
                            weekStartsOn={1}
                            initialFocus
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}

                {/* Active Window Display - Blue pill - Always visible when date filters shown */}
                <div className="flex items-center gap-2 shrink-0">
                  <Badge 
                    variant="outline" 
                    className="bg-blue-50 border-blue-300 text-blue-800 text-sm font-medium px-3 py-1 whitespace-nowrap"
                    data-testid="active-window-badge"
                  >
                    <div className="text-center">
                      <div>{windowDisplay}</div>
                      {sinceDateEnabled && sinceDate && (
                        <div className="text-orange-700 text-xs mt-0.5">
                          ⚠️ Excluding data before: {formatEnglishDate(sinceDate)}
                        </div>
                      )}
                    </div>
                  </Badge>
                  
                  {/* Badge System Info */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="text-sm space-y-1">
                          <div className="font-medium">Data Source Legend:</div>
                          <div>🟠 IP Filtered = Data that respects your IP exclusions (Supabase analytics)</div>
                          <div>No badge = Raw GA4 data that cannot be filtered by IP</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </div>
        </div>
  );
};