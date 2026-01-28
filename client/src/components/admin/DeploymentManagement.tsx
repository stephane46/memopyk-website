import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Rocket, Terminal, Clock, CheckCircle, AlertCircle, Trash2, RefreshCw, Settings, FileText, MapPin, ExternalLink } from 'lucide-react';
import { formatFrenchDateTime } from '@/utils/date-format';

interface DeploymentMarker {
  filename: string;
  description: string;
  timestamp: string;
  version: string;
}

interface SitemapStatus {
  exists: boolean;
  lastModified?: string;
  urlCount?: number;
  sizeBytes?: number;
  sampleUrls?: string[];
  message?: string;
}

export default function DeploymentManagement() {
  const [activeTab, setActiveTab] = useState<'markers' | 'sitemap'>('markers');
  const [description, setDescription] = useState('');
  const [keepCount, setKeepCount] = useState('10');
  const [isCreating, setIsCreating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [markers, setMarkers] = useState<DeploymentMarker[]>([]);
  const [lastCreated, setLastCreated] = useState<string | null>(null);
  const [sitemapStatus, setSitemapStatus] = useState<SitemapStatus | null>(null);
  const [isGeneratingSitemap, setIsGeneratingSitemap] = useState(false);
  const [isLoadingSitemapStatus, setIsLoadingSitemapStatus] = useState(false);
  const [lastPingStatus, setLastPingStatus] = useState<{ status: string; error?: string | null } | null>(null);
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

  const loadSitemapStatus = async () => {
    setIsLoadingSitemapStatus(true);
    try {
      const response = await fetch('/api/deployment/sitemap/status');
      if (response.ok) {
        const result = await response.json();
        setSitemapStatus(result);
      }
    } catch (error) {
      console.error('Failed to load sitemap status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le statut du sitemap",
        variant: "destructive"
      });
    } finally {
      setIsLoadingSitemapStatus(false);
    }
  };

  const generateSitemap = async () => {
    setIsGeneratingSitemap(true);
    try {
      const response = await fetch('/api/deployment/sitemap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        
        // Store Google ping status
        if (result.googlePing) {
          setLastPingStatus(result.googlePing);
        }
        
        // Show success message with Google ping status
        const pingMessage = result.googlePing?.status === 'success' 
          ? ' Google a été notifié automatiquement.' 
          : result.googlePing?.status === 'failed' || result.googlePing?.status === 'error'
          ? ' ⚠️ Google ping a échoué, mais le sitemap est actif.'
          : '';
        
        toast({
          title: "Sitemap généré avec succès!",
          description: `${result.urlCount} URLs incluses (${result.blogPostCount} articles de blog).${pingMessage}`,
        });
        await loadSitemapStatus(); // Refresh status
      } else {
        const error = await response.json();
        toast({
          title: "Erreur lors de la génération",
          description: error.error || "Impossible de générer le sitemap",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur réseau",
        description: "Impossible de générer le sitemap",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingSitemap(false);
    }
  };

  React.useEffect(() => {
    loadMarkers();
    loadSitemapStatus(); // Load sitemap status on mount to show current state
  }, []);

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button 
              className={activeTab === 'markers' ? 'deployment-tab-active' : ''} 
              variant={activeTab === 'markers' ? undefined : 'outline'}
              onClick={() => setActiveTab('markers')}
            >
              <Rocket className="h-4 w-4 mr-2" />
              Marqueurs de Déploiement
            </Button>
            <Button 
              className={activeTab === 'sitemap' ? 'deployment-tab-active' : ''} 
              variant={activeTab === 'sitemap' ? undefined : 'outline'}
              onClick={() => setActiveTab('sitemap')}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Sitemap SEO
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sitemap Tab */}
      {activeTab === 'sitemap' && (
        <div className="space-y-6">
          {/* Generate Sitemap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Générateur de Sitemap Dynamique
              </CardTitle>
              <CardDescription>
                Générez automatiquement un sitemap.xml avec tous vos articles de blog et pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="deployment-tab-active"
                onClick={generateSitemap}
                disabled={isGeneratingSitemap}
              >
                {isGeneratingSitemap ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Générer le Sitemap
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Sitemap Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Statut du Sitemap
              </CardTitle>
              <CardDescription>
                Informations sur le sitemap actuel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sitemapStatus === null ? (
                <div className="text-center py-8 text-gray-500">
                  <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-20 animate-spin" />
                  <p>Chargement du statut...</p>
                </div>
              ) : !sitemapStatus.exists ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Aucun sitemap trouvé</span>
                  </div>
                  <p className="text-sm text-yellow-600 mt-1">
                    Générez votre premier sitemap ci-dessus
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs text-blue-600 font-medium mb-1">URLs</div>
                      <div className="text-2xl font-bold text-blue-900">{sitemapStatus.urlCount}</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-xs text-green-600 font-medium mb-1">Taille</div>
                      <div className="text-2xl font-bold text-green-900">
                        {((sitemapStatus.sizeBytes || 0) / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="col-span-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="text-xs text-purple-600 font-medium mb-1">Dernière mise à jour</div>
                      <div className="text-sm font-medium text-purple-900">
                        {formatFrenchDateTime(sitemapStatus.lastModified || '')}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      ✅ Sitemap actif
                    </Badge>
                    {lastPingStatus && lastPingStatus.status === 'success' && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        🔔 Google notifié
                      </Badge>
                    )}
                    {lastPingStatus && (lastPingStatus.status === 'failed' || lastPingStatus.status === 'error') && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        ⚠️ Google ping échoué
                      </Badge>
                    )}
                    <a 
                      href="/sitemap.xml" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Voir le sitemap
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sample URLs */}
          {sitemapStatus?.exists && sitemapStatus.sampleUrls && sitemapStatus.sampleUrls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Aperçu des URLs ({sitemapStatus.sampleUrls.length} premières)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sitemapStatus.sampleUrls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700 truncate">{url}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Google Search Console Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Optimisation Google Search Console
              </CardTitle>
              <CardDescription>
                Le sitemap est automatiquement accessible à https://memopyk.com/sitemap.xml et Google est notifié automatiquement à chaque génération.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">✓</Badge>
                  <div>
                    <h4 className="font-medium">Sitemap accessible</h4>
                    <p className="text-sm text-gray-600">Votre sitemap est disponible à /sitemap.xml</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">✓</Badge>
                  <div>
                    <h4 className="font-medium">Référence robots.txt</h4>
                    <p className="text-sm text-gray-600">Le sitemap est déclaré dans robots.txt</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">✓</Badge>
                  <div>
                    <h4 className="font-medium">Notification Google automatique</h4>
                    <p className="text-sm text-gray-600">Google est automatiquement notifié via ping à chaque génération</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">2</Badge>
                  <div>
                    <h4 className="font-medium">Aller à Google Search Console</h4>
                    <p className="text-sm text-gray-600">
                      Ouvrez{' '}
                      <a 
                        href="https://search.google.com/search-console" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Google Search Console
                      </a>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">3</Badge>
                  <div>
                    <h4 className="font-medium">Soumettre le sitemap</h4>
                    <p className="text-sm text-gray-600">
                      Allez dans Sitemaps → Entrez <code className="bg-gray-100 px-1 rounded">sitemap.xml</code> → Cliquez sur Soumettre
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deployment Markers Tab */}
      {activeTab === 'markers' && (
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
      )}
    </div>
  );
}