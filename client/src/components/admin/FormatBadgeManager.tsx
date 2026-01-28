import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit, Save, X, Monitor, Smartphone, Instagram, Tv, Tablet, Camera, Video, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FormatBadgeTemplate {
  id: string;
  platformEn: string;
  platformFr: string;
  typeEn: string;
  typeFr: string;
  category: 'social' | 'professional' | 'custom';
  iconName: string; // Icon identifier for manual selection
}

const FormatBadgeManager: React.FC = () => {
  const { toast } = useToast();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Available icons for format badges
  const availableIcons = [
    { name: 'Smartphone', component: Smartphone, label: 'Mobile Phone' },
    { name: 'Monitor', component: Monitor, label: 'Desktop/TV' },
    { name: 'Instagram', component: Instagram, label: 'Instagram' },
    { name: 'Tablet', component: Tablet, label: 'Tablet' },
    { name: 'Tv', component: Tv, label: 'Television' },
    { name: 'Camera', component: Camera, label: 'Camera' },
    { name: 'Video', component: Video, label: 'Video' },
    { name: 'PlayCircle', component: PlayCircle, label: 'Play Button' },
  ];
  
  // Get icon component by name
  const getIconComponent = (iconName: string) => {
    const icon = availableIcons.find(i => i.name === iconName);
    return icon ? icon.component : Monitor; // Default fallback
  };
  
  // Intelligent icon suggestion based on text content
  const suggestIcon = (typeText: string) => {
    const text = typeText.toLowerCase();
    if (text.includes('stories') || text.includes('mobile')) return 'Smartphone';
    if (text.includes('instagram') || text.includes('social')) return 'Instagram';
    if (text.includes('tv') || text.includes('television')) return 'Tv';
    if (text.includes('tablet')) return 'Tablet';
    if (text.includes('camera') || text.includes('photo')) return 'Camera';
    if (text.includes('video') || text.includes('film')) return 'Video';
    if (text.includes('play')) return 'PlayCircle';
    return 'Monitor'; // Default for desktop/professional
  };
  
  // Predefined format badge templates (simplified - platform is standardized)
  const [templates, setTemplates] = useState<FormatBadgeTemplate[]>([
    {
      id: '1',
      platformEn: 'Recommended Format', // Standardized
      platformFr: 'Format Recommandé', // Standardized
      typeEn: 'Mobile Stories',
      typeFr: 'Stories Mobiles',
      category: 'social',
      iconName: 'Smartphone'
    },
    {
      id: '2',
      platformEn: 'Recommended Format', // Standardized
      platformFr: 'Format Recommandé', // Standardized
      typeEn: 'Instagram Posts',
      typeFr: 'Posts Instagram',
      category: 'social',
      iconName: 'Instagram'
    },
    {
      id: '3',
      platformEn: 'Recommended Format', // Standardized
      platformFr: 'Format Recommandé', // Standardized
      typeEn: 'TV & Desktop',
      typeFr: 'TV & Bureau',
      category: 'professional',
      iconName: 'Monitor'
    }
  ]);

  const [newTemplate, setNewTemplate] = useState<Omit<FormatBadgeTemplate, 'id'>>({
    platformEn: 'Recommended Format', // Standardized - no need to edit
    platformFr: 'Format Recommandé', // Standardized - no need to edit
    typeEn: '',
    typeFr: '',
    category: 'custom',
    iconName: 'Monitor'
  });

  const [editingTemplate, setEditingTemplate] = useState<FormatBadgeTemplate | null>(null);

  const handleAddTemplate = () => {
    if (!newTemplate.typeEn) {
      toast({
        title: "Erreur", 
        description: "Le champ Format Type (English) est requis",
        variant: "destructive"
      });
      return;
    }

    const template: FormatBadgeTemplate = {
      ...newTemplate,
      id: Date.now().toString(),
      platformEn: 'Recommended Format', // Always standardized
      platformFr: 'Format Recommandé',  // Always standardized
      typeFr: newTemplate.typeFr || newTemplate.typeEn
    };

    setTemplates([...templates, template]);
    setNewTemplate({
      platformEn: 'Recommended Format', // Always standardized
      platformFr: 'Format Recommandé',  // Always standardized
      typeEn: '',
      typeFr: '',
      category: 'custom',
      iconName: 'Monitor'
    });
    setIsAddingNew(false);

    toast({
      title: "Succès",
      description: "Template format badge créé avec succès"
    });
  };

  const handleEditTemplate = (template: FormatBadgeTemplate) => {
    setEditingTemplate(template);
    setEditingId(template.id);
  };

  const handleSaveEdit = () => {
    if (!editingTemplate) return;

    setTemplates(templates.map(t => 
      t.id === editingTemplate.id ? editingTemplate : t
    ));
    setEditingId(null);
    setEditingTemplate(null);

    toast({
      title: "Succès",
      description: "Template format badge modifié avec succès"
    });
  };

  const handleDeleteTemplate = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (template && template.category !== 'custom') {
      toast({
        title: "Erreur",
        description: "Les templates prédéfinis ne peuvent pas être supprimés",
        variant: "destructive"
      });
      return;
    }

    setTemplates(templates.filter(t => t.id !== id));
    toast({
      title: "Succès",
      description: "Format badge template supprimé avec succès"
    });
  };

  // Auto-suggest icon when type text changes
  const handleTypeTextChange = (value: string, isEditing = false) => {
    const suggestedIcon = suggestIcon(value);
    
    if (isEditing && editingTemplate) {
      setEditingTemplate({ 
        ...editingTemplate, 
        typeEn: value,
        iconName: suggestedIcon 
      });
    } else {
      setNewTemplate({ 
        ...newTemplate, 
        typeEn: value,
        iconName: suggestedIcon 
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'social': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300';
      case 'professional': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <Card className="border-[#89BAD9] dark:border-[#2A4759]">
      <CardHeader>
        <CardTitle className="text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          Gestionnaire Format Badge Templates
        </CardTitle>
        <p className="text-sm text-[#2A4759] dark:text-[#89BAD9]">
          Gérez les templates de format badges avec icônes visuelles pour les appliquer rapidement aux éléments de galerie
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Existing Templates */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[#011526] dark:text-[#F2EBDC]">Templates Disponibles</h3>
          
          {templates.map((template) => {
            const CategoryIcon = getIconComponent(template.iconName);
            const isEditing = editingId === template.id;
            
            return (
              <div key={template.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="w-4 h-4 text-[#2A4759]" />
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {!isEditing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          className="border-[#89BAD9] text-[#2A4759] hover:bg-[#89BAD9]/10"
                        >
                          <Edit className="w-3 h-3" />
                          Modifier
                        </Button>
                        {template.category === 'custom' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            Supprimer
                          </Button>
                        )}
                      </>
                    )}
                    {isEditing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveEdit}
                          className="border-green-300 text-green-600 hover:bg-green-50"
                        >
                          <Save className="w-3 h-3" />
                          Sauvegarder
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditingTemplate(null);
                          }}
                          className="border-gray-300 text-gray-600 hover:bg-gray-50"
                        >
                          <X className="w-3 h-3" />
                          Annuler
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing && editingTemplate ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>English Platform</Label>
                        <Input
                          value={editingTemplate.platformEn}
                          onChange={(e) => setEditingTemplate({
                            ...editingTemplate,
                            platformEn: e.target.value
                          })}
                          className="bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>French Platform</Label>
                        <Input
                          value={editingTemplate.platformFr}
                          onChange={(e) => setEditingTemplate({
                            ...editingTemplate,
                            platformFr: e.target.value
                          })}
                          className="bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>English Type</Label>
                        <Input
                          value={editingTemplate.typeEn}
                          onChange={(e) => handleTypeTextChange(e.target.value, true)}
                          className="bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>French Type</Label>
                        <Input
                          value={editingTemplate.typeFr}
                          onChange={(e) => setEditingTemplate({
                            ...editingTemplate,
                            typeFr: e.target.value
                          })}
                          className="bg-white dark:bg-gray-800"
                        />
                      </div>
                    </div>
                    
                    {/* Icon Selection for Editing */}
                    <div className="space-y-2">
                      <Label>Icon Selection</Label>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-sm text-[#2A4759] dark:text-[#89BAD9]">
                          Current icon:
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-[#2A4759] text-white rounded-full text-xs">
                          <CategoryIcon className="w-3 h-3" />
                          <span>{availableIcons.find(i => i.name === editingTemplate.iconName)?.label}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {availableIcons.map((iconOption) => {
                          const IconComp = iconOption.component;
                          const isSelected = editingTemplate.iconName === iconOption.name;
                          return (
                            <button
                              key={iconOption.name}
                              type="button"
                              onClick={() => setEditingTemplate({
                                ...editingTemplate,
                                iconName: iconOption.name
                              })}
                              className={`flex flex-col items-center gap-1 p-2 rounded border transition-colors ${
                                isSelected 
                                  ? 'border-[#D67C4A] bg-[#D67C4A]/10 text-[#D67C4A]' 
                                  : 'border-gray-200 hover:border-[#89BAD9] hover:bg-[#89BAD9]/10'
                              }`}
                            >
                              <IconComp className="w-4 h-4" />
                              <span className="text-xs">{iconOption.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Visual Format Badge Preview */}
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-[#2A4759] dark:text-[#89BAD9]">Preview:</div>
                      <div className="bg-[#2A4759] text-white px-3 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-sm">
                        <CategoryIcon className="w-3 h-3" />
                        <div>
                          <div className="font-bold leading-tight">{template.platformEn}</div>
                          <div className="text-xs opacity-90 leading-tight">{template.typeEn}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Template Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                          {template.platformEn}
                        </div>
                        <div className="text-[#2A4759] dark:text-[#89BAD9]">
                          {template.typeEn}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                          {template.platformFr}
                        </div>
                        <div className="text-[#2A4759] dark:text-[#89BAD9]">
                          {template.typeFr}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add New Template */}
        <div className="border-t pt-6">
          {!isAddingNew ? (
            <Button
              onClick={() => setIsAddingNew(true)}
              className="bg-[#D67C4A] hover:bg-[#D67C4A]/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un nouveau template
            </Button>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-[#011526] dark:text-[#F2EBDC]">
                Nouveau Format Badge Template
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>English Platform *</Label>
                  <Input
                    value={newTemplate.platformEn}
                    onChange={(e) => setNewTemplate({
                      ...newTemplate,
                      platformEn: e.target.value
                    })}
                    placeholder="e.g., Social Media"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>French Platform</Label>
                  <Input
                    value={newTemplate.platformFr}
                    onChange={(e) => setNewTemplate({
                      ...newTemplate,
                      platformFr: e.target.value
                    })}
                    placeholder="e.g., Réseaux Sociaux"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>English Type *</Label>
                  <Input
                    value={newTemplate.typeEn}
                    onChange={(e) => handleTypeTextChange(e.target.value)}
                    placeholder="Mobile Stories, Instagram Posts, TV & Desktop..."
                    className="bg-white dark:bg-gray-800"
                  />
                  <div className="text-xs text-[#2A4759] dark:text-[#89BAD9]">
                    💡 Type keywords like "stories", "instagram", "tv" for automatic icon suggestions
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>French Type</Label>
                  <Input
                    value={newTemplate.typeFr}
                    onChange={(e) => setNewTemplate({
                      ...newTemplate,
                      typeFr: e.target.value
                    })}
                    placeholder="e.g., Stories Mobiles"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={newTemplate.category} 
                  onValueChange={(value: 'social' | 'professional' | 'custom') => 
                    setNewTemplate({ ...newTemplate, category: value })
                  }
                >
                  <SelectTrigger className="bg-white dark:bg-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Icon Selection for New Template */}
              <div className="space-y-2">
                <Label>Icon Selection</Label>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm text-[#2A4759] dark:text-[#89BAD9]">
                    Suggested icon:
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-[#2A4759] text-white rounded-full text-xs">
                    {(() => {
                      const SuggestedIcon = getIconComponent(newTemplate.iconName);
                      return <SuggestedIcon className="w-3 h-3" />;
                    })()}
                    <span>{availableIcons.find(i => i.name === newTemplate.iconName)?.label}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {availableIcons.map((iconOption) => {
                    const IconComp = iconOption.component;
                    const isSelected = newTemplate.iconName === iconOption.name;
                    return (
                      <button
                        key={iconOption.name}
                        type="button"
                        onClick={() => setNewTemplate({
                          ...newTemplate,
                          iconName: iconOption.name
                        })}
                        className={`flex flex-col items-center gap-1 p-2 rounded border transition-colors ${
                          isSelected 
                            ? 'border-[#D67C4A] bg-[#D67C4A]/10 text-[#D67C4A]' 
                            : 'border-gray-200 hover:border-[#89BAD9] hover:bg-[#89BAD9]/10'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-xs">{iconOption.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddTemplate}
                  className="bg-[#D67C4A] hover:bg-[#D67C4A]/90 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Créer Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewTemplate({
                      platformEn: '',
                      platformFr: '',
                      typeEn: '',
                      typeFr: '',
                      category: 'custom',
                      iconName: 'Monitor'
                    });
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Usage Instructions */}
        <div className="bg-[#F2EBDC]/50 dark:bg-[#011526]/20 p-4 rounded-lg">
          <h4 className="font-semibold text-[#011526] dark:text-[#F2EBDC] mb-2">
            Comment utiliser les templates avec icônes:
          </h4>
          <ul className="text-sm text-[#2A4759] dark:text-[#89BAD9] space-y-1">
            <li>• Les templates créés ici apparaîtront dans les dropdown du Gallery Management</li>
            <li>• Chaque template inclut une icône visuelle qui s'affiche automatiquement</li>
            <li>• Les icônes sont suggérées automatiquement basées sur le texte du type</li>
            <li>• Vous pouvez manuellement sélectionner une icône différente si nécessaire</li>
            <li>• Les templates personnalisés peuvent être modifiés ou supprimés</li>
            <li>• Si aucun template n'est choisi, le système utilise la détection automatique</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default FormatBadgeManager;