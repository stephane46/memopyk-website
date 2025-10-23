import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Trash2, 
  Plus, 
  Save, 
  Edit3,
  ChevronUp,
  ChevronDown,
  Zap,
  Clock,
  Settings,
  Users,
  Shield,
  Star,
  X
} from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WhyMemopykCard {
  id: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  iconName: string;
  gradient: string;
  orderIndex: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Icon mapping
const ICON_MAP = {
  Zap,
  Clock,
  Settings,
  Users,
  Shield,
  Star
};

const GRADIENT_OPTIONS = [
  { value: "from-memopyk-dark-blue/20 to-memopyk-navy/10", label: "Blue Navy" },
  { value: "from-memopyk-sky-blue/20 to-memopyk-blue-gray/10", label: "Sky Blue" },
  { value: "from-memopyk-cream/40 to-memopyk-sky-blue/20", label: "Cream Sky" },
  { value: "from-memopyk-orange/20 to-memopyk-cream/30", label: "Orange Cream" },
  { value: "from-memopyk-navy/30 to-memopyk-dark-blue/20", label: "Navy Dark" },
  { value: "from-memopyk-navy/20 to-memopyk-dark-blue/10", label: "Navy Light" }
];

export function WhyMemopykManagement() {
  const [cards, setCards] = useState<WhyMemopykCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<WhyMemopykCard | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<WhyMemopykCard>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      console.log('🔄 Loading Why MEMOPYK cards...');
      const response = await fetch('/api/why-memopyk-cards');
      const data = await response.json();
      if (response.ok) {
        setCards(data.sort((a: WhyMemopykCard, b: WhyMemopykCard) => a.orderIndex - b.orderIndex));
        console.log('✅ Loaded', data.length, 'cards');
      } else {
        throw new Error(data.error || 'Failed to load cards');
      }
    } catch (error) {
      console.error('❌ Error loading cards:', error);
      toast({
        title: "Error",
        description: "Failed to load Why MEMOPYK cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCard = async () => {
    try {
      const url = editingCard 
        ? `/api/why-memopyk-cards/${editingCard.id}`
        : '/api/why-memopyk-cards';
      
      const method = editingCard ? 'PATCH' : 'POST';
      
      // Generate ID for new cards
      if (!editingCard && !formData.id) {
        formData.id = `card-${Date.now()}`;
      }
      
      // Set order index for new cards
      if (!editingCard) {
        formData.orderIndex = cards.length;
      }

      console.log('💾 Saving card:', method, url, formData);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: editingCard ? "Card updated successfully" : "Card created successfully",
        });
        
        // Clear form and reload data
        setEditingCard(null);
        setIsCreating(false);
        setFormData({});
        await loadCards(); // Ensure we reload to see the changes
        
        // 🚨 CRITICAL: Trigger event for public site cache refresh
        window.dispatchEvent(new CustomEvent('why-memopyk-updated'));
        console.log('📡 why-memopyk-updated event dispatched for cache refresh');
      } else {
        throw new Error(data.error || 'Failed to save card');
      }
    } catch (error) {
      console.error('❌ Error saving card:', error);
      toast({
        title: "Error", 
        description: "Failed to save card",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    
    try {
      console.log('🗑️ Deleting card:', id);
      const response = await fetch(`/api/why-memopyk-cards/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Card deleted successfully",
        });
        await loadCards(); // Reload to reflect changes
        
        // 🚨 CRITICAL: Trigger event for public site cache refresh
        window.dispatchEvent(new CustomEvent('why-memopyk-updated'));
        console.log('📡 why-memopyk-updated event dispatched for cache refresh');
      } else {
        throw new Error('Failed to delete card');
      }
    } catch (error) {
      console.error('❌ Error deleting card:', error);
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive",
      });
    }
  };

  const moveCard = async (cardId: string, direction: 'up' | 'down') => {
    const currentIndex = cards.findIndex(card => card.id === cardId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= cards.length) return;

    try {
      console.log('🔄 Moving card:', cardId, direction);
      
      // Swap order indices
      const currentCard = cards[currentIndex];
      const targetCard = cards[newIndex];
      
      // Update current card
      await fetch(`/api/why-memopyk-cards/${currentCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIndex: targetCard.orderIndex }),
      });
      
      // Update target card
      await fetch(`/api/why-memopyk-cards/${targetCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIndex: currentCard.orderIndex }),
      });
      
      await loadCards(); // Reload to reflect changes
      
      // 🚨 CRITICAL: Trigger event for public site cache refresh
      window.dispatchEvent(new CustomEvent('why-memopyk-updated'));
      console.log('📡 why-memopyk-updated event dispatched for cache refresh');
    } catch (error) {
      console.error('❌ Error moving card:', error);
      toast({
        title: "Error",
        description: "Failed to move card",
        variant: "destructive",
      });
    }
  };

  const handleNewCard = () => {
    setIsCreating(true);
    setEditingCard(null);
    setFormData({
      titleFr: '',
      titleEn: '',
      descriptionFr: '',
      descriptionEn: '',
      iconName: 'Star',
      gradient: GRADIENT_OPTIONS[0].value,
      isActive: true
    });
  };

  const handleEditCard = (card: WhyMemopykCard) => {
    console.log('🖊️ Editing card:', card);
    setEditingCard(card);
    setIsCreating(false);
    setFormData({ ...card });
    console.log('📝 Form data set for editing:', { ...card });
  };

  const handleCancel = () => {
    setEditingCard(null);
    setIsCreating(false);
    setFormData({});
  };

  const getIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName as keyof typeof ICON_MAP] || Star;
    return <IconComponent className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading Why MEMOPYK cards...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pourquoi MEMOPYK</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage the benefit cards section</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Cards List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Cartes Why MEMOPYK ({cards.length})</h3>
            <Button 
              onClick={handleNewCard} 
              className=""
              style={{
                backgroundColor: '#D67C4A !important',
                color: '#ffffff !important',
                border: '1px solid #D67C4A !important'
              }}
            >
              <Plus className="w-4 h-4 mr-2" style={{ color: '#ffffff !important' }} />
              <span style={{ color: '#ffffff !important', fontWeight: 'bold' }}>Nouvelle Carte</span>
            </Button>
          </div>

          {cards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No cards found. Create your first card!
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card, index) => (
                <Card key={card.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className={cn("p-2 rounded-lg bg-gradient-to-br", card.gradient)}>
                          {getIcon(card.iconName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900 truncate">{card.titleFr}</h4>
                            <Badge variant={card.isActive ? "default" : "secondary"}>
                              {card.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{card.titleEn}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveCard(card.id, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveCard(card.id, 'down')}
                          disabled={index === cards.length - 1}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCard(card)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCard(card.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Form */}
        <div className="space-y-6">
          {(isCreating || editingCard) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{editingCard ? 'Modifier la Carte' : 'Nouvelle Carte'}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Title - French and English columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title-fr">Titre (Français)</Label>
                    <Input
                      id="title-fr"
                      value={formData.titleFr || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, titleFr: e.target.value }))}
                      placeholder="Titre en français"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title-en">Title (English)</Label>
                    <Input
                      id="title-en"
                      value={formData.titleEn || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, titleEn: e.target.value }))}
                      placeholder="Title in English"
                    />
                  </div>
                </div>

                {/* Description - French and English columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="desc-fr">Description (Français)</Label>
                    <RichTextEditor
                      value={formData.descriptionFr || ''}
                      onChange={(value) => setFormData(prev => ({ ...prev, descriptionFr: value }))}
                      placeholder="Description en français"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc-en">Description (English)</Label>
                    <RichTextEditor
                      value={formData.descriptionEn || ''}
                      onChange={(value) => setFormData(prev => ({ ...prev, descriptionEn: value }))}
                      placeholder="Description in English"
                    />
                  </div>
                </div>

                <Separator />

                {/* Icon and Gradient */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select
                      value={formData.iconName || 'Star'}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, iconName: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(ICON_MAP).map(iconName => (
                          <SelectItem key={iconName} value={iconName}>
                            <div className="flex items-center space-x-2">
                              {getIcon(iconName)}
                              <span>{iconName}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Gradient</Label>
                    <Select
                      value={formData.gradient || GRADIENT_OPTIONS[0].value}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, gradient: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gradient" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADIENT_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center space-x-2">
                              <div className={cn("w-4 h-4 rounded bg-gradient-to-br", option.value)} />
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.isActive !== false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>

                {/* Preview */}
                {formData.titleFr && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className={cn("p-4 rounded-lg bg-gradient-to-br", formData.gradient || GRADIENT_OPTIONS[0].value)}>
                      <div className="flex items-center space-x-3 text-gray-800">
                        {getIcon(formData.iconName || 'Star')}
                        <div>
                          <h4 className="font-medium">{formData.titleFr}</h4>
                          <p className="text-sm opacity-80">{formData.titleEn}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveCard}
                    disabled={!formData.titleFr || !formData.titleEn}
                    className="px-6"
                    style={{
                      backgroundColor: '#D67C4A !important',
                      color: '#ffffff !important',
                      border: '1px solid #D67C4A !important',
                      fontWeight: 'bold !important'
                    }}
                  >
                    <span style={{ color: '#ffffff !important', fontWeight: 'bold' }}>
                      {editingCard ? 'Update Card' : 'Create Card'}
                    </span>
                  </Button>
                </div>

              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}