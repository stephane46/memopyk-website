import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, TrendingUp } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ContentKeyword {
  id: string;
  keyword: string;
  monthly_searches: number;
  competition: string;
  intent: string;
  tier: number;
  market: string;
  seasonal?: boolean;
  seasonal_months?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface KeywordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyword?: ContentKeyword | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function KeywordFormModal({ isOpen, onClose, keyword }: KeywordFormModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [keywordText, setKeywordText] = useState('');
  const [monthlySearches, setMonthlySearches] = useState('');
  const [competition, setCompetition] = useState('');
  const [intent, setIntent] = useState('');
  const [tier, setTier] = useState('');
  const [market, setMarket] = useState('fr');
  const [seasonal, setSeasonal] = useState(false);
  const [seasonalMonths, setSeasonalMonths] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const isEditMode = !!keyword;

  // Populate form when editing
  useEffect(() => {
    if (keyword) {
      setKeywordText(keyword.keyword || '');
      setMonthlySearches(keyword.monthly_searches?.toString() || '');
      setCompetition(keyword.competition || '');
      setIntent(keyword.intent || '');
      setTier(keyword.tier?.toString() || '');
      setMarket(keyword.market || 'fr');
      setSeasonal(keyword.seasonal || false);
      setSeasonalMonths(keyword.seasonal_months || []);
      setNotes(keyword.notes || '');
    } else {
      // Reset form for create mode
      setKeywordText('');
      setMonthlySearches('');
      setCompetition('');
      setIntent('medium');
      setTier('3');
      setMarket('fr');
      setSeasonal(false);
      setSeasonalMonths([]);
      setNotes('');
    }
  }, [keyword, isOpen]);

  const handleSubmit = async () => {
    // Validation
    if (!keywordText.trim()) {
      toast({ title: 'Keyword is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const keywordData = {
        keyword: keywordText.trim(),
        monthly_searches: monthlySearches ? parseInt(monthlySearches) : null,
        competition: competition || null,
        intent: intent || 'medium',
        tier: tier ? parseInt(tier) : 3,
        market: market || 'fr',
        seasonal,
        seasonal_months: seasonal && seasonalMonths.length > 0 ? seasonalMonths : null,
        notes: notes.trim() || null,
      };

      if (isEditMode && keyword) {
        // Update existing keyword
        await apiRequest(`/api/admin/content/keywords/${keyword.id}`, 'PATCH', keywordData);
        toast({ title: 'Keyword updated successfully' });
      } else {
        // Create new keyword
        await apiRequest('/api/admin/content/keywords', 'POST', keywordData);
        toast({ title: 'Keyword created successfully' });
      }

      // Invalidate queries to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/content/keywords'] });
      onClose();
    } catch (error: any) {
      console.error('Error saving keyword:', error);
      toast({
        title: isEditMode ? 'Failed to update keyword' : 'Failed to create keyword',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSeasonalMonth = (month: string) => {
    setSeasonalMonths(prev =>
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[#D67C4A]" />
            {isEditMode ? 'Edit Keyword' : 'New Keyword'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {isEditMode ? 'Update the keyword details below' : 'Add a new SEO keyword to track'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">Basic Info</h3>

            <div>
              <Label className="text-gray-900 dark:text-white">Keyword *</Label>
              <Input
                value={keywordText}
                onChange={(e) => setKeywordText(e.target.value)}
                placeholder="Enter keyword"
                className="text-gray-900 dark:text-white"
                data-testid="input-keyword"
              />
              <p className="text-xs text-gray-500 mt-0.5">The exact search term people use</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900 dark:text-white">Monthly Searches</Label>
                <Input
                  type="number"
                  value={monthlySearches}
                  onChange={(e) => setMonthlySearches(e.target.value)}
                  placeholder="e.g., 500"
                  className="text-gray-900 dark:text-white"
                  data-testid="input-monthly-searches"
                />
                <p className="text-xs text-gray-500 mt-0.5">Average monthly search volume</p>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-white">Competition</Label>
                <Select value={competition} onValueChange={setCompetition}>
                  <SelectTrigger data-testid="select-competition">
                    <SelectValue placeholder="Select competition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-0.5">How hard is it to rank?</p>
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">Classification</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900 dark:text-white">Market</Label>
                <Select value={market} onValueChange={setMarket}>
                  <SelectTrigger data-testid="select-market">
                    <SelectValue placeholder="Select market" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">🇫🇷 France</SelectItem>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-0.5">Target market/language</p>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-white">Tier</Label>
                <Select value={tier} onValueChange={setTier}>
                  <SelectTrigger data-testid="select-tier">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Tier 1 - Direct Service</SelectItem>
                    <SelectItem value="2">Tier 2 - High Relevance</SelectItem>
                    <SelectItem value="3">Tier 3 - Secondary</SelectItem>
                    <SelectItem value="4">Tier 4 - Low Relevance</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-0.5">How relevant to MEMOPYK services?</p>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-white">Search Intent</Label>
                <Select value={intent} onValueChange={setIntent}>
                  <SelectTrigger data-testid="select-intent">
                    <SelectValue placeholder="Select intent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High (Ready to buy)</SelectItem>
                    <SelectItem value="medium">Medium (Exploring options)</SelectItem>
                    <SelectItem value="low">Low (Just researching)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-0.5">How likely to convert?</p>
              </div>
            </div>
          </div>

          {/* Seasonal & Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">Additional Info</h3>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-900 dark:text-white">Seasonal Keyword</Label>
                <p className="text-xs text-gray-500">Does this keyword peak at certain times of year?</p>
              </div>
              <Switch
                checked={seasonal}
                onCheckedChange={setSeasonal}
                data-testid="switch-seasonal"
              />
            </div>

            {seasonal && (
              <div>
                <Label className="text-gray-900 dark:text-white">Peak Months</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {MONTHS.map(month => (
                    <Button
                      key={month}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSeasonalMonth(month)}
                      className={seasonalMonths.includes(month)
                        ? 'bg-[#D67C4A] text-white border-[#D67C4A] hover:bg-[#C56B3A] hover:text-white'
                        : ''
                      }
                      data-testid={`button-month-${month.toLowerCase()}`}
                    >
                      {month.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-gray-900 dark:text-white">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about this keyword..."
                className="text-gray-900 dark:text-white h-20"
                data-testid="textarea-notes"
              />
              <p className="text-xs text-gray-500 mt-0.5">EN keywords show cluster info here (e.g., gift_anniversary)</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} data-testid="button-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#D67C4A] hover:bg-[#C56B3A] text-white"
            data-testid="button-save"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? 'Update Keyword' : 'Add Keyword'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
