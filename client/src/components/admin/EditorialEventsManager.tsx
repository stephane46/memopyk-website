import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest, adminFetch } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ChevronDown, CalendarDays } from 'lucide-react';

// ── Types ──

interface EditorialEvent {
  id: string;
  name: string;
  markets: string[];
  baseDate: string;
  dateOverrides: Record<string, string> | null;
  reminderOffsetDays: number;
  recurring: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
  completions: EditorialEventCompletion[];
}

interface EditorialEventCompletion {
  id: string;
  eventId: string;
  market: string;
  status: string;
  linkedPostId: string | null;
  linkedTopicId: string | null;
  notes: string | null;
  updatedAt: string;
}

interface EventFormData {
  name: string;
  markets: string[];
  base_date: string;
  date_overrides: Record<string, string>;
  reminder_offset_days: number;
  recurring: boolean;
  color: string;
}

// ── Constants ──

const MARKETS = [
  { id: 'france', flag: '\u{1F1EB}\u{1F1F7}', label: 'France' },
  { id: 'us', flag: '\u{1F1FA}\u{1F1F8}', label: 'USA' },
  { id: 'quebec', flag: '\u269C\uFE0F', label: 'Qu\u00e9bec' },
  { id: 'canada_en', flag: '\u{1F1E8}\u{1F1E6}', label: 'Canada EN' },
] as const;

const MARKET_MAP: Record<string, { flag: string; label: string }> = Object.fromEntries(
  MARKETS.map(m => [m.id, { flag: m.flag, label: m.label }])
);

const COLOR_PRESETS = [
  '#DC2626', '#EC4899', '#F97316', '#EAB308',
  '#16A34A', '#2563EB', '#7C3AED', '#6B7280',
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  not_started: { label: 'Not Started', color: 'text-gray-600', bg: 'bg-gray-100' },
  in_review: { label: 'In Review', color: 'text-orange-600', bg: 'bg-orange-100' },
  published: { label: 'Published', color: 'text-green-600', bg: 'bg-green-100' },
};

const EMPTY_FORM: EventFormData = {
  name: '',
  markets: [],
  base_date: '',
  date_overrides: {},
  reminder_offset_days: 30,
  recurring: true,
  color: '#F97316',
};

// ── Helpers ──

function computeReminderDate(baseDate: string, offsetDays: number): string {
  const d = new Date(baseDate + 'T00:00:00');
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Component ──

export function EditorialEventsManager() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EditorialEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EditorialEvent | null>(null);
  const [formData, setFormData] = useState<EventFormData>(EMPTY_FORM);

  // ── Data fetching ──

  const { data: events = [], isLoading } = useQuery<EditorialEvent[]>({
    queryKey: ['/api/editorial-events'],
    queryFn: async () => {
      const response = await adminFetch('/api/editorial-events');
      if (!response.ok) throw new Error('Failed to fetch editorial events');
      return response.json();
    },
  });

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const res = await apiRequest('/api/editorial-events', 'POST', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/editorial-events'] });
      toast({ title: 'Event created' });
      closeForm();
    },
    onError: (err: Error) => {
      toast({ title: 'Error creating event', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EventFormData }) => {
      const res = await apiRequest(`/api/editorial-events/${id}`, 'PUT', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/editorial-events'] });
      toast({ title: 'Event updated' });
      closeForm();
    },
    onError: (err: Error) => {
      toast({ title: 'Error updating event', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/editorial-events/${id}`, 'DELETE');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/editorial-events'] });
      toast({ title: 'Event deleted' });
      setDeletingEvent(null);
    },
    onError: (err: Error) => {
      toast({ title: 'Error deleting event', description: err.message, variant: 'destructive' });
    },
  });

  const completionMutation = useMutation({
    mutationFn: async ({ eventId, market, data }: { eventId: string; market: string; data: Record<string, unknown> }) => {
      const res = await apiRequest(`/api/editorial-events/${eventId}/completions/${market}`, 'PUT', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/editorial-events'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Error updating completion', description: err.message, variant: 'destructive' });
    },
  });

  // ── Form helpers ──

  function openCreateForm() {
    setEditingEvent(null);
    setFormData(EMPTY_FORM);
    setIsFormOpen(true);
  }

  function openEditForm(event: EditorialEvent) {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      markets: event.markets,
      base_date: event.baseDate,
      date_overrides: event.dateOverrides || {},
      reminder_offset_days: event.reminderOffsetDays,
      recurring: event.recurring,
      color: event.color,
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingEvent(null);
    setFormData(EMPTY_FORM);
  }

  function handleSubmit() {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  function toggleMarket(marketId: string) {
    setFormData(prev => ({
      ...prev,
      markets: prev.markets.includes(marketId)
        ? prev.markets.filter(m => m !== marketId)
        : [...prev.markets, marketId],
    }));
  }

  // ── Stats ──

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const in30Str = in30.toISOString().split('T')[0];

    let upcoming = 0;
    const marketsSet = new Set<string>();
    for (const e of events) {
      if (e.baseDate >= today && e.baseDate <= in30Str) upcoming++;
      for (const m of e.markets) marketsSet.add(m);
    }
    return { total: events.length, upcoming, markets: marketsSet.size };
  }, [events]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Editorial Events
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage seasonal events, holidays, and editorial milestones
          </p>
        </div>
        <Button onClick={openCreateForm} className="bg-[#D67C4A] hover:bg-[#D67C4A]/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Events</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="text-sm text-gray-500">Upcoming (30 days)</div>
          <div className="text-2xl font-bold text-[#D67C4A]">{stats.upcoming}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="text-sm text-gray-500">Markets Covered</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.markets}/4</div>
        </div>
      </div>

      {/* Events table */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No editorial events yet. Click "Add Event" to create one.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Markets</TableHead>
                <TableHead>Event Date</TableHead>
                <TableHead>Reminder</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map(event => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {event.markets.map(m => (
                        <span key={m} title={MARKET_MAP[m]?.label || m}>
                          {MARKET_MAP[m]?.flag || m}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(event.baseDate)}</TableCell>
                  <TableCell className="text-gray-500">
                    {formatDate(computeReminderDate(event.baseDate, event.reminderOffsetDays))}
                    <span className="text-xs ml-1">(-{event.reminderOffsetDays}d)</span>
                  </TableCell>
                  <TableCell>
                    {event.recurring ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">Yearly</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">Once</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div
                      className="w-6 h-6 rounded-full border-2 border-gray-200"
                      style={{ backgroundColor: event.color }}
                      title={event.color}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditForm(event)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeletingEvent(event)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Completion tracking */}
      {events.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Content Completion Tracking</h3>
          {events.map(event => (
            <Collapsible key={event.id}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }} />
                    <span className="font-medium">{event.name}</span>
                    <span className="text-sm text-gray-500">
                      {event.markets.map(m => MARKET_MAP[m]?.flag || m).join(' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CompletionSummary event={event} />
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 bg-white dark:bg-gray-800 rounded-lg border divide-y">
                  {event.markets.map(market => {
                    const completion = event.completions.find(c => c.market === market);
                    return (
                      <CompletionRow
                        key={market}
                        eventId={event.id}
                        market={market}
                        completion={completion || null}
                        onUpdate={(data) => completionMutation.mutate({ eventId: event.id, market, data })}
                      />
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Create/Edit form dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'New Event'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Name */}
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Christmas, Mother's Day"
              />
            </div>

            {/* Markets */}
            <div>
              <Label>Markets *</Label>
              <div className="flex flex-wrap gap-3 mt-1">
                {MARKETS.map(m => (
                  <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.markets.includes(m.id)}
                      onCheckedChange={() => toggleMarket(m.id)}
                    />
                    <span>{m.flag} {m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Base date */}
            <div>
              <Label>Event Date *</Label>
              <Input
                type="date"
                value={formData.base_date}
                onChange={(e) => setFormData(prev => ({ ...prev, base_date: e.target.value }))}
              />
            </div>

            {/* Date overrides */}
            {formData.markets.length > 0 && (
              <div>
                <Label>Date Overrides (per market, if different)</Label>
                <div className="space-y-2 mt-1">
                  {formData.markets.map(m => (
                    <div key={m} className="flex items-center gap-2">
                      <span className="w-24 text-sm">{MARKET_MAP[m]?.flag} {MARKET_MAP[m]?.label}</span>
                      <Input
                        type="date"
                        value={formData.date_overrides[m] || ''}
                        onChange={(e) => {
                          const overrides = { ...formData.date_overrides };
                          if (e.target.value) {
                            overrides[m] = e.target.value;
                          } else {
                            delete overrides[m];
                          }
                          setFormData(prev => ({ ...prev, date_overrides: overrides }));
                        }}
                        placeholder="Same as base date"
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave blank to use the base event date</p>
              </div>
            )}

            {/* Reminder offset */}
            <div>
              <Label>Reminder (days before event)</Label>
              <Input
                type="number"
                min={0}
                max={365}
                value={formData.reminder_offset_days}
                onChange={(e) => setFormData(prev => ({ ...prev, reminder_offset_days: parseInt(e.target.value) || 0 }))}
              />
            </div>

            {/* Recurring */}
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.recurring}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, recurring: checked }))}
              />
              <Label>Recurring yearly</Label>
            </div>

            {/* Color */}
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-full transition-all ${
                      formData.color === c ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                    type="button"
                    title={c}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={isSaving || !formData.name || !formData.base_date || formData.markets.length === 0}
                className="bg-[#D67C4A] hover:bg-[#D67C4A]/90"
              >
                {isSaving ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingEvent} onOpenChange={(open) => { if (!open) setDeletingEvent(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deletingEvent?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this event and all its completion tracking data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingEvent && deleteMutation.mutate(deletingEvent.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Sub-components ──

function CompletionSummary({ event }: { event: EditorialEvent }) {
  const published = event.completions.filter(c => c.status === 'published').length;
  const total = event.markets.length;
  if (published === total && total > 0) {
    return <Badge className="bg-green-100 text-green-700">{published}/{total} done</Badge>;
  }
  if (published > 0) {
    return <Badge className="bg-orange-100 text-orange-700">{published}/{total} done</Badge>;
  }
  return <Badge variant="secondary">{published}/{total} done</Badge>;
}

function CompletionRow({
  eventId,
  market,
  completion,
  onUpdate,
}: {
  eventId: string;
  market: string;
  completion: EditorialEventCompletion | null;
  onUpdate: (data: Record<string, unknown>) => void;
}) {
  const status = completion?.status || 'not_started';
  const notes = completion?.notes || '';
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;

  return (
    <div className="p-3 flex items-start gap-4">
      <div className="flex items-center gap-2 min-w-[120px]">
        <span className="text-lg">{MARKET_MAP[market]?.flag}</span>
        <span className="text-sm font-medium">{MARKET_MAP[market]?.label}</span>
      </div>

      <div className="flex-1 flex items-center gap-3">
        <Select
          value={status}
          onValueChange={(val) => onUpdate({ status: val })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_started">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Not Started
              </span>
            </SelectItem>
            <SelectItem value="in_review">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                In Review
              </span>
            </SelectItem>
            <SelectItem value="published">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Published
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Notes..."
          defaultValue={notes}
          className="text-sm"
          onBlur={(e) => {
            if (e.target.value !== notes) {
              onUpdate({ notes: e.target.value || null });
            }
          }}
        />
      </div>
    </div>
  );
}

export default EditorialEventsManager;
