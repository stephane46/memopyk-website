import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit } from 'lucide-react';
import type { GalleryFormData } from './types';

interface GalleryItemFormProps {
  formData: GalleryFormData;
  setFormData: React.Dispatch<React.SetStateAction<GalleryFormData>>;
}

export default function GalleryItemForm({ formData, setFormData }: GalleryItemFormProps) {
  return (
    <>
      {/* Basic Information */}
      <Card className="border-[#89BAD9] dark:border-[#2A4759]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] mb-6 flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Informations de base
          </h3>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                {formData.useSameVideo ? (
                  <>
                    English <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">Source pour FR + EN</Badge>
                  </>
                ) : (
                  "English"
                )}
              </h4>
              <div>
                <Label htmlFor="titleEn">Titre</Label>
                <Input
                  id="titleEn"
                  value={formData.titleEn}
                  onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <Label htmlFor="priceEn">Prix</Label>
                <Input
                  id="priceEn"
                  value={formData.priceEn || ''}
                  onChange={(e) => setFormData({ ...formData, priceEn: e.target.value })}
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <Label htmlFor="sourceEn">Source</Label>
                <Input
                  id="sourceEn"
                  value={formData.sourceEn}
                  onChange={(e) => setFormData({ ...formData, sourceEn: e.target.value })}
                  placeholder="80 photos & 10 videos"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <Label htmlFor="durationEn">Durée</Label>
                <Input
                  id="durationEn"
                  value={formData.durationEn}
                  onChange={(e) => setFormData({ ...formData, durationEn: e.target.value })}
                  placeholder="2 minutes"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            {/* French Basic Information - Always visible for independent text management */}
            <div className="space-y-4">
              <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                Français
                {formData.useSameVideo && (
                  <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">
                    Texte indépendant
                  </Badge>
                )}
              </h4>
              <div>
                <Label htmlFor="titleFr">Titre</Label>
                <Input
                  id="titleFr"
                  value={formData.titleFr}
                  onChange={(e) => setFormData({ ...formData, titleFr: e.target.value })}
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <Label htmlFor="priceFr">Prix</Label>
                <Input
                  id="priceFr"
                  value={formData.priceFr || ''}
                  onChange={(e) => setFormData({ ...formData, priceFr: e.target.value })}
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <Label htmlFor="sourceFr">Source</Label>
                <Input
                  id="sourceFr"
                  value={formData.sourceFr}
                  onChange={(e) => setFormData({ ...formData, sourceFr: e.target.value })}
                  placeholder="80 photos et 10 vidéos"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <Label htmlFor="durationFr">Durée</Label>
                <Input
                  id="durationFr"
                  value={formData.durationFr}
                  onChange={(e) => setFormData({ ...formData, durationFr: e.target.value })}
                  placeholder="2 minutes"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Descriptions */}
      <Card className="border-[#89BAD9] dark:border-[#2A4759]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] mb-6 flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Descriptions du contenu
          </h3>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                {formData.useSameVideo ? (
                  <>
                    English <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">Source pour FR + EN</Badge>
                  </>
                ) : (
                  "English"
                )}
              </h4>
              <div>
                <Label htmlFor="storyEn">Histoire du film</Label>
                <Textarea
                  id="storyEn"
                  value={formData.storyEn}
                  onChange={(e) => setFormData({ ...formData, storyEn: e.target.value })}
                  placeholder="This film shows..."
                  className="bg-white dark:bg-gray-800 min-h-[80px]"
                />
              </div>
              <div>
                <Label htmlFor="situationEn">Situation du client</Label>
                <Textarea
                  id="situationEn"
                  value={formData.situationEn}
                  onChange={(e) => setFormData({ ...formData, situationEn: e.target.value })}
                  placeholder="The Client is a wife..."
                  className="bg-white dark:bg-gray-800 min-h-[80px]"
                />
              </div>
              <div>
                <Label htmlFor="sorryMessageEn">Message d'excuses</Label>
                <Textarea
                  id="sorryMessageEn"
                  value={formData.sorryMessageEn}
                  onChange={(e) => setFormData({ ...formData, sorryMessageEn: e.target.value })}
                  className="bg-white dark:bg-gray-800 min-h-[60px]"
                />
              </div>
            </div>

            {/* French Content Descriptions - Always visible for independent text management */}
            <div className="space-y-4">
              <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                Français
                {formData.useSameVideo && (
                  <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">
                    Texte indépendant
                  </Badge>
                )}
              </h4>
              <div>
                <Label htmlFor="storyFr">Histoire du film</Label>
                <Textarea
                  id="storyFr"
                  value={formData.storyFr}
                  onChange={(e) => setFormData({ ...formData, storyFr: e.target.value })}
                  placeholder="Ce film montre..."
                  className="bg-white dark:bg-gray-800 min-h-[80px]"
                />
              </div>
              <div>
                <Label htmlFor="situationFr">Situation du client</Label>
                <Textarea
                  id="situationFr"
                  value={formData.situationFr}
                  onChange={(e) => setFormData({ ...formData, situationFr: e.target.value })}
                  placeholder="Le client est une épouse..."
                  className="bg-white dark:bg-gray-800 min-h-[80px]"
                />
              </div>
              <div>
                <Label htmlFor="sorryMessageFr">Message d'excuses</Label>
                <Textarea
                  id="sorryMessageFr"
                  value={formData.sorryMessageFr}
                  onChange={(e) => setFormData({ ...formData, sorryMessageFr: e.target.value })}
                  className="bg-white dark:bg-gray-800 min-h-[60px]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
