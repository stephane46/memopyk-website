import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Rocket, Terminal, Clock, CheckCircle, AlertCircle, Trash2, RefreshCw, Settings } from 'lucide-react';
import { formatFrenchDateTime } from '@/utils/date-format';

interface DeploymentMarker {
  filename: string;
  description: string;
  timestamp: string;
  version: string;
}

export default function DeploymentManagement() {
  const [description, setDescription] = useState('');
  const [keepCount, setKeepCount] = useState('10');
  const [isCreating, setIsCreating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [markers, setMarkers] = useState<DeploymentMarker[]>([]);
  const [lastCreated, setLastCreated] = useState<string | null>(null);
  const { toast } = useToast();

  const createDeploymentMarker = async () => {
    if (!description.trim()) {
      toast({
        title: "Description manquante",
        description: "Veuillez entrer une description pour le marqueur de déploiement",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/deployment/create-marker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description: description.trim(),
          keep: parseInt(keepCount) || 10
        })
      });

      if (response.ok) {
        const result = await response.json();
        setLastCreated(result.filename);
        setDescription('');
        toast({
          title: "Marqueur créé avec succès!",
          description: `Fichier: ${result.filename}`,
        });
        loadMarkers(); // Refresh the list
      } else {
        const error = await response.json();
        toast({
          title: "Erreur lors de la création",
          description: error.error || "Impossible de créer le marqueur",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur réseau",
        description: "Impossible de créer le marqueur de déploiement",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const cleanupMarkers = async () => {
    setIsCleaning(true);
    try {
      const response = await fetch('/api/deployment/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keep: parseInt(keepCount) || 10 })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Nettoyage terminé",
          description: `${result.deletedCount} marqueurs supprimés`,
        });
        loadMarkers(); // Refresh the list
      } else {
        const error = await response.json();
        toast({
          title: "Erreur lors du nettoyage",
          description: error.error || "Impossible de nettoyer les marqueurs",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur réseau",
        description: "Impossible de nettoyer les marqueurs",
        variant: "destructive"
      });
    } finally {
      setIsCleaning(false);
    }
  };

  const loadMarkers = async () => {
    try {
      const response = await fetch('/api/deployment/markers');
      if (response.ok) {
        const result = await response.json();
        setMarkers(result.markers || []);
      }
    } catch (error) {
      console.error('Failed to load markers:', error);
    }
  };

  React.useEffect(() => {
    loadMarkers();
  }, []);

  return (
    <div className="space-y-6">
      {/* Create Deployment Marker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Créer un Marqueur de Déploiement
          </CardTitle>
          <CardDescription>
            Créez un marqueur de déploiement pour garantir un déploiement avec du code frais (évite les caches Replit)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="description">Description du déploiement</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: gallery-sync-fix ou admin-menu-enhancement"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">Maximum 50 caractères</p>
            </div>
            <div>
              <Label htmlFor="keepCount">Garder les derniers</Label>
              <Input
                id="keepCount"
                type="number"
                value={keepCount}
                onChange={(e) => setKeepCount(e.target.value)}
                min="1"
                max="50"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={createDeploymentMarker}
              disabled={isCreating || !description.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Créer le Marqueur
                </>
              )}
            </Button>
            
            <Button
              onClick={cleanupMarkers}
              disabled={isCleaning}
              variant="outline"
            >
              {isCleaning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Nettoyage...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Nettoyer
                </>
              )}
            </Button>
          </div>

          {lastCreated && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Marqueur créé: {lastCreated}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Prêt pour le déploiement! Utilisez le bouton Deploy dans Replit.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Command Line Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Interface en Ligne de Commande
          </CardTitle>
          <CardDescription>
            Commandes pour utiliser le système de déploiement depuis la console
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <div className="space-y-2">
              <div># Créer un marqueur avec description</div>
              <div>node scripts/create-deployment-marker.js --description="gallery-fix"</div>
              <div className="mt-3"># Créer avec rétention personnalisée</div>
              <div>node scripts/create-deployment-marker.js --description="admin-update" --keep=5</div>
              <div className="mt-3"># Nettoyer seulement</div>
              <div>node scripts/create-deployment-marker.js --cleanup --keep=3</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deployment Process */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Processus de Déploiement
          </CardTitle>
          <CardDescription>
            Étapes recommandées pour un déploiement réussi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">1</Badge>
              <div>
                <h4 className="font-medium">Créer un marqueur de déploiement</h4>
                <p className="text-sm text-gray-600">Utilisez cette interface ou la ligne de commande</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">2</Badge>
              <div>
                <h4 className="font-medium">Déployer immédiatement</h4>
                <p className="text-sm text-gray-600">Cliquez sur le bouton Deploy dans Replit dans les minutes qui suivent</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">3</Badge>
              <div>
                <h4 className="font-medium">Vérifier le déploiement</h4>
                <p className="text-sm text-gray-600">Testez le site en production pour confirmer les changements</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Markers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Marqueurs Récents
          </CardTitle>
          <CardDescription>
            Historique des marqueurs de déploiement créés
          </CardDescription>
        </CardHeader>
        <CardContent>
          {markers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Rocket className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Aucun marqueur de déploiement trouvé</p>
              <p className="text-sm">Créez votre premier marqueur ci-dessus</p>
            </div>
          ) : (
            <div className="space-y-3">
              {markers.map((marker, index) => (
                <div key={marker.filename} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="font-medium text-sm">{marker.description}</div>
                      <div className="text-xs text-gray-500">{marker.filename}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFrenchDateTime(marker.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}