import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, UserCheck, Mail, Globe, CheckCircle, Trash2, Map, ChevronDown, ChevronRight, Copy, Save, MapPin, ExternalLink } from 'lucide-react';
import { DateTime } from 'luxon';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PartnerSubmission {
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  submitted: string;
  status: string;
  is_active: string;
  show_on_map: string;
  lat: string;
  lng: string;
  address: string;
  address_line2: string;
  postal_code: string;
  website: string;
}

interface PartnerSummaryData {
  partners: PartnerSubmission[];
  count: number;
}

export default function PartnersManagement() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<Record<number, Partial<PartnerSubmission>>>({});

  const { data: summary, isLoading } = useQuery<PartnerSummaryData>({
    queryKey: ['/api/partners/summary'],
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      const response = await fetch(`/api/partners/${partnerId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partners/summary'] });
      toast({
        title: "Partenaire supprimé",
        description: "Le partenaire a été supprimé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le partenaire",
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PartnerSubmission> }) => {
      const response = await fetch(`/api/partners/${id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partners/summary'] });
      setEditingData({});
      toast({
        title: "Partenaire mis à jour",
        description: "Les modifications ont été sauvegardées avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications",
        variant: "destructive",
      });
    }
  });

  const handleDownload = () => {
    window.open('/api/partners/download', '_blank');
  };

  const handleDelete = (partnerId: number, partnerName: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${partnerName} ?`)) {
      deleteMutation.mutate(partnerId);
    }
  };

  const handleSave = (partnerId: number) => {
    const data = editingData[partnerId];
    if (data && Object.keys(data).length > 0) {
      console.log('💾 Saving partner changes:', { partnerId, data });
      updateMutation.mutate({ id: partnerId, data });
    } else {
      console.log('⚠️ No changes to save for partner:', partnerId, 'editingData:', editingData);
      toast({
        title: "Aucune modification",
        description: "Aucune modification à sauvegarder",
        variant: "default",
      });
    }
  };

  const updateEditingData = (partnerId: number, field: string, value: any) => {
    console.log('📝 Updating editing data:', { partnerId, field, value });
    setEditingData(prev => {
      const updated = {
        ...prev,
        [partnerId]: {
          ...prev[partnerId],
          [field]: value
        }
      };
      console.log('📊 Updated editingData:', updated);
      return updated;
    });
  };

  const getEditValue = (partner: PartnerSubmission, field: keyof PartnerSubmission): string => {
    const value = editingData[partner.id]?.[field] ?? partner[field];
    return String(value ?? '');
  };

  const copyAddress = (partner: PartnerSubmission) => {
    const fullAddress = [
      partner.address,
      partner.address_line2,
      partner.postal_code,
      partner.city,
      partner.country
    ].filter(Boolean).join(', ');
    
    navigator.clipboard.writeText(fullAddress);
    toast({
      title: "Adresse copiée",
      description: "L'adresse complète a été copiée dans le presse-papiers",
    });
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    try {
      const dt = DateTime.fromISO(dateStr, { zone: 'Europe/Paris' });
      if (!dt.isValid) return dateStr;
      return dt.toFormat('dd/MM/yyyy HH:mm', { locale: 'fr' });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Partenaires</h2>
          <p className="text-gray-600 dark:text-gray-400">Gestion des demandes de partenariat</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/fr-FR/partenaires"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 text-white border-2 border-green-600 px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 hover:bg-green-700 transition-colors"
            data-testid="link-view-directory"
          >
            <ExternalLink className="h-4 w-4" />
            Voir l'annuaire
          </a>
          <button 
            onClick={handleDownload}
            className="bg-[#D67C4A] text-black border-2 border-[#D67C4A] px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
            data-testid="button-download-partners"
          >
            <Download className="h-4 w-4" />
            Télécharger Excel
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-[#D67C4A]" />
            Résumé des Demandes
          </CardTitle>
          <CardDescription>
            Total de {summary?.count || 0} demande{(summary?.count || 0) > 1 ? 's' : ''} reçue{(summary?.count || 0) > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : !summary || summary.partners.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune demande de partenariat pour le moment
            </div>
          ) : (
            <div className="space-y-2">
              {summary.partners.map((partner) => {
                const isExpanded = expandedId === partner.id;
                const hasChanges = editingData[partner.id] !== undefined;
                
                return (
                  <div 
                    key={partner.id} 
                    className="border border-gray-200 rounded-lg overflow-hidden"
                    data-testid={`partner-row-${partner.id}`}
                  >
                    {/* Collapsed Row */}
                    <div className="bg-white dark:bg-gray-800 p-4 flex items-center gap-4">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : partner.id)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>
                      
                      <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-gray-900 dark:text-white">{partner.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {partner.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Globe className="h-4 w-4 text-gray-400" />
                          {partner.city}, {partner.country}
                        </div>
                        <div>
                          <Badge className={`${getStatusBadgeColor(getEditValue(partner, 'status'))} border`}>
                            {getEditValue(partner, 'status')}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(partner.submitted)}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 p-6 space-y-6">
                        {/* Address Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-blue-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-blue-600" />
                              Adresse complète
                            </h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyAddress(partner)}
                              className="flex items-center gap-2"
                            >
                              <Copy className="h-3 w-3" />
                              Copier l'adresse
                            </Button>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {[partner.address, partner.address_line2, partner.postal_code, partner.city, partner.country]
                              .filter(Boolean)
                              .join(', ') || 'Aucune adresse fournie'}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            💡 Copiez cette adresse et utilisez Google Maps pour obtenir les coordonnées lat/lng
                          </p>
                        </div>

                        {/* Edit Fields */}
                        <div className="grid grid-cols-2 gap-6">
                          {/* Status */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Status
                            </label>
                            <Select
                              value={getEditValue(partner, 'status')}
                              onValueChange={(value) => updateEditingData(partner.id, 'status', value)}
                            >
                              <SelectTrigger className="bg-white dark:bg-gray-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Approved">Approved</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Is Active */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Is_Active
                            </label>
                            <Select
                              value={getEditValue(partner, 'is_active')}
                              onValueChange={(value) => updateEditingData(partner.id, 'is_active', value)}
                            >
                              <SelectTrigger className="bg-white dark:bg-gray-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FALSE">FALSE</SelectItem>
                                <SelectItem value="TRUE">TRUE</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Show On Map */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Show_On_Map
                            </label>
                            <Select
                              value={getEditValue(partner, 'show_on_map')}
                              onValueChange={(value) => updateEditingData(partner.id, 'show_on_map', value)}
                            >
                              <SelectTrigger className="bg-white dark:bg-gray-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FALSE">FALSE</SelectItem>
                                <SelectItem value="TRUE">TRUE</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Latitude */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Latitude
                            </label>
                            <Input
                              type="text"
                              placeholder="45.7640"
                              value={getEditValue(partner, 'lat')}
                              onChange={(e) => updateEditingData(partner.id, 'lat', e.target.value)}
                              className="bg-white dark:bg-gray-800"
                            />
                          </div>

                          {/* Longitude */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Longitude
                            </label>
                            <Input
                              type="text"
                              placeholder="4.8357"
                              value={getEditValue(partner, 'lng')}
                              onChange={(e) => updateEditingData(partner.id, 'lng', e.target.value)}
                              className="bg-white dark:bg-gray-800"
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                          <Button
                            onClick={() => handleSave(partner.id)}
                            disabled={!hasChanges || updateMutation.isPending}
                            className="bg-green-500 hover:bg-green-600 text-black font-semibold flex items-center gap-2 disabled:bg-gray-300 disabled:text-gray-500"
                          >
                            <Save className="h-4 w-4" />
                            {updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(partner.id, partner.name)}
                            disabled={deleteMutation.isPending}
                            className="flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p>• Les demandes sont sauvegardées automatiquement dans un fichier Excel</p>
            <p>• Cliquez sur "Télécharger Excel" pour obtenir le fichier complet avec tous les détails</p>
            <p>• Le tableau affiche les 10 dernières demandes reçues</p>
            <p>• Une notification email est envoyée automatiquement à ngoc@memopyk.com</p>
          </div>
          
          <div className="border-t-2 border-blue-300 dark:border-blue-700 pt-4">
            <div className="space-y-2 text-sm text-orange-800 dark:text-orange-300">
              <p className="font-semibold text-orange-900 dark:text-orange-200">📍 Pour afficher un partenaire sur la carte :</p>
              <p>• Modifier <strong>Status</strong> de "Pending" à <strong>"Approved"</strong></p>
              <p>• Modifier <strong>Is_Active</strong> de "FALSE" à <strong>"TRUE"</strong></p>
              <p>• Modifier <strong>Show_On_Map</strong> de "FALSE" à <strong>"TRUE"</strong></p>
              <p>• Ajouter les coordonnées <strong>lat</strong> et <strong>lng</strong></p>
              <p>• Cliquer sur <strong>"Mettre à jour la carte"</strong></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
