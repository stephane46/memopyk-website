import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, CheckCircle, Languages, Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminFetch } from '@/lib/queryClient';

interface TranslationAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  currentTitle: string;
  currentSlug: string;
  currentDescription: string;
  targetLanguage: 'en-US' | 'fr-FR';
  onApplyTranslation: (translatedData: {
    title: string;
    slug: string;
    description: string;
    content: string;
  }) => void;
}

export function TranslationAssistant({
  isOpen,
  onClose,
  currentContent,
  currentTitle,
  currentSlug,
  currentDescription,
  targetLanguage,
  onApplyTranslation
}: TranslationAssistantProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [extractedText, setExtractedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [imageMap, setImageMap] = useState<string[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [showManualMode, setShowManualMode] = useState(false);

  const targetLangLabel = targetLanguage === 'en-US' ? 'English' : 'French';
  const targetLangCode = targetLanguage === 'en-US' ? 'en' : 'fr';
  // Source language is the opposite of target
  const sourceLanguage = targetLanguage === 'en-US' ? 'fr-FR' : 'en-US';

  // Step 1: Extract images and create placeholders
  const handleExtractText = () => {
    const images: string[] = [];
    let placeholderCount = 0;

    // Replace images (with or without wrapper elements like <figure>) with [IMAGE X] placeholders
    // This regex captures: <figure>...</figure>, <span>...</span> containing <img>, or bare <img> tags
    const textWithPlaceholders = currentContent.replace(
      /(<figure[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/figure>)|(<span[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/span>)|(<img[^>]*>)/gi,
      (fullMatch) => {
        placeholderCount++;
        images.push(fullMatch);
        return `[IMAGE ${placeholderCount}]`;
      }
    );

    setImageMap(images);
    setExtractedText(textWithPlaceholders);
    setCurrentStep(2);

    toast({
      title: "Text extracted! 📝",
      description: `Found ${images.length} image(s). Ready to translate.`
    });
  };

  // Step 2: Translate with AI (Claude API)
  const handleTranslateWithAI = async () => {
    setIsTranslating(true);
    setTranslationError(null);

    try {
      const response = await adminFetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: extractedText,
          targetLanguage,
          sourceLanguage,
          title: currentTitle,
          slug: currentSlug,
          description: currentDescription
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const result = await response.json();

      if (result.success && result.translatedText) {
        setTranslatedText(result.translatedText);
        setCurrentStep(3);
        toast({
          title: "Translation complete! ✨",
          description: `Content translated to ${targetLangLabel}. Review and apply.`
        });
      } else {
        throw new Error('No translation returned');
      }
    } catch (error) {
      console.error('Translation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Translation failed';
      setTranslationError(errorMessage);
      toast({
        title: "Translation failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsTranslating(false);
    }
  };

  // Step 2 (manual fallback): Copy prompt to clipboard
  const handleCopyPrompt = () => {
    const prompt = `Translate the following blog post metadata and content to ${targetLangLabel}.

IMPORTANT RULES:
1. Keep ALL HTML tags exactly as they are (including <h2>, <p>, <strong>, <ul>, <li>, etc.)
2. Keep ALL [IMAGE X] placeholders exactly as they are - DO NOT translate or modify them
3. Translate ONLY the text content between HTML tags
4. For the slug, create a ${targetLangLabel}-friendly URL (lowercase, hyphens, no accents)
5. NEVER use em dashes (—) - use regular hyphens (-) instead
6. Return your response in this EXACT format:

TITLE: [translated title here]
SLUG: [${targetLangCode}-url-slug-here]
DESCRIPTION: [translated description here]
CONTENT:
[translated HTML content here]

---

Current Title: ${currentTitle}
Current Slug: ${currentSlug}
Current Description: ${currentDescription}

Content to translate:
${extractedText}`;

    navigator.clipboard.writeText(prompt);

    toast({
      title: "Copied to clipboard! 📋",
      description: "Paste this into ChatGPT or Claude to get the translation"
    });
  };

  // Step 3: Apply translation and re-insert images
  const handleApplyTranslation = () => {
    if (!translatedText.trim()) {
      toast({
        title: "No translation provided",
        description: "Please paste the translated text from ChatGPT",
        variant: "destructive"
      });
      return;
    }

    // Parse the response to extract title, slug, description, and content
    // Handle both plain and markdown-formatted responses (e.g., **TITLE:** or TITLE:)
    const titleMatch = translatedText.match(/\*\*TITLE:\*\*\s*(.+)|TITLE:\s*(.+)/i);
    const slugMatch = translatedText.match(/\*\*SLUG:\*\*\s*(.+)|SLUG:\s*(.+)/i);
    const descMatch = translatedText.match(/\*\*DESCRIPTION:\*\*\s*(.+)|DESCRIPTION:\s*(.+)/i);
    const contentMatch = translatedText.match(/\*\*CONTENT:\*\*\s*([\s\S]+)|CONTENT:\s*([\s\S]+)/i);

    if (!titleMatch || !slugMatch || !descMatch || !contentMatch) {
      toast({
        title: "Invalid format",
        description: "The AI response doesn't match the expected format. Please check the prompt and try again.",
        variant: "destructive"
      });
      return;
    }

    // Extract the matched groups (handle both markdown and plain formats)
    const translatedTitle = (titleMatch[1] || titleMatch[2]).trim();
    const translatedSlug = (slugMatch[1] || slugMatch[2]).trim();
    const translatedDescription = (descMatch[1] || descMatch[2]).trim();
    let translatedContent = (contentMatch[1] || contentMatch[2]).trim();

    // Re-insert images by replacing [IMAGE X] placeholders
    imageMap.forEach((imgTag, index) => {
      const placeholder = `[IMAGE ${index + 1}]`;
      translatedContent = translatedContent.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), imgTag);
    });

    onApplyTranslation({
      title: translatedTitle,
      slug: translatedSlug,
      description: translatedDescription,
      content: translatedContent
    });
    
    toast({
      title: "Translation applied! ✅",
      description: `Title, slug, description, and content translated to ${targetLangLabel} with all images preserved`
    });

    // Reset and close
    setCurrentStep(1);
    setExtractedText('');
    setTranslatedText('');
    setImageMap([]);
    setIsTranslating(false);
    setTranslationError(null);
    setShowManualMode(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl" style={{ color: '#1F2937 !important' }}>
            <Languages className="h-6 w-6 text-[#D67C4A]" />
            Translation Assistant
          </DialogTitle>
          <p className="text-gray-600" style={{ color: '#4B5563 !important' }}>
            Translate your blog post to {targetLangLabel} using AI while preserving all images
          </p>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep >= 1 ? 'bg-[#D67C4A] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <span className={`text-sm ${currentStep >= 1 ? 'text-gray-900 font-medium' : 'text-gray-400'}`} style={{ color: currentStep >= 1 ? '#111827 !important' : '#9CA3AF !important' }}>
              Extract
            </span>
          </div>
          
          <ArrowRight className="h-4 w-4 text-gray-400" />
          
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep >= 2 ? 'bg-[#D67C4A] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <span className={`text-sm ${currentStep >= 2 ? 'text-gray-900 font-medium' : 'text-gray-400'}`} style={{ color: currentStep >= 2 ? '#111827 !important' : '#9CA3AF !important' }}>
              Translate
            </span>
          </div>
          
          <ArrowRight className="h-4 w-4 text-gray-400" />
          
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep >= 3 ? 'bg-[#D67C4A] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
            <span className={`text-sm ${currentStep >= 3 ? 'text-gray-900 font-medium' : 'text-gray-400'}`} style={{ color: currentStep >= 3 ? '#111827 !important' : '#9CA3AF !important' }}>
              Apply
            </span>
          </div>
        </div>

        {/* Step 1: Extract Text */}
        {currentStep === 1 && (
          <Card className="bg-gradient-to-br from-orange-50 to-white border-[#D67C4A]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: '#1F2937 !important' }}>
                <Sparkles className="h-5 w-5 text-[#D67C4A]" />
                Step 1: Extract Text for Translation
              </CardTitle>
              <CardDescription style={{ color: '#4B5563 !important' }}>
                We'll replace all images with placeholders like [IMAGE 1], [IMAGE 2], so ChatGPT can focus on the text
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleExtractText}
                className="w-full bg-[#D67C4A] hover:bg-[#B86A3E] text-white"
                size="lg"
                data-testid="button-extract-text"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Extract Text & Remove Images
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Translate with AI */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: '#1F2937 !important' }}>
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Step 2: Translate Content
                </CardTitle>
                <CardDescription style={{ color: '#4B5563 !important' }}>
                  Use AI to automatically translate your content to {targetLangLabel}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Translation Button */}
                <Button
                  onClick={handleTranslateWithAI}
                  disabled={isTranslating}
                  className="w-full bg-[#D67C4A] hover:bg-[#B86A3E] text-white h-14 text-lg"
                  data-testid="button-translate-ai"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Translate with AI
                    </>
                  )}
                </Button>

                {/* Error Message */}
                {translationError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-700 font-medium">Translation failed</p>
                      <p className="text-red-600 text-sm mt-1">{translationError}</p>
                      <button
                        onClick={() => setShowManualMode(true)}
                        className="text-red-600 text-sm underline mt-2 hover:text-red-800"
                      >
                        Try manual translation instead
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual Mode Link */}
                {!showManualMode && !translationError && (
                  <div className="text-center">
                    <button
                      onClick={() => setShowManualMode(true)}
                      className="text-gray-500 text-sm hover:text-gray-700 underline"
                    >
                      Prefer to translate manually?
                    </button>
                  </div>
                )}

                {/* Manual Mode UI */}
                {showManualMode && (
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">Manual Translation Mode</p>
                      <button
                        onClick={() => setShowManualMode(false)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="bg-white border rounded-lg p-4 max-h-[200px] overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap text-gray-700">
{`Translate the following blog post metadata and content to ${targetLangLabel}.

IMPORTANT RULES:
1. Keep ALL HTML tags exactly as they are
2. Keep ALL [IMAGE X] placeholders exactly as they are
3. Translate ONLY the text content between HTML tags
4. For the slug, create a ${targetLangLabel}-friendly URL (lowercase, hyphens, no accents)
5. Return your response in this EXACT format:

TITLE: [translated title here]
SLUG: [${targetLangCode}-url-slug-here]
DESCRIPTION: [translated description here]
CONTENT:
[translated HTML content here]

---

Current Title: ${currentTitle}
Current Slug: ${currentSlug}
Current Description: ${currentDescription}

Content to translate:
${extractedText}`}
                      </pre>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleCopyPrompt}
                        variant="outline"
                        className="flex-1"
                        data-testid="button-copy-prompt"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Prompt
                      </Button>
                      <Button
                        onClick={() => setCurrentStep(3)}
                        variant="outline"
                        data-testid="button-next-step"
                      >
                        Next Step
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Paste Translation */}
        {currentStep === 3 && (
          <Card className="bg-gradient-to-br from-orange-50 to-white border-[#D67C4A]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: '#1F2937 !important' }}>
                <CheckCircle className="h-5 w-5 text-[#D67C4A]" />
                Step 3: Paste Translated Content
              </CardTitle>
              <CardDescription style={{ color: '#4B5563 !important' }}>
                Paste the translated HTML from ChatGPT/Claude below. We'll automatically re-insert all images!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={`Paste the ${targetLangLabel} translation from ChatGPT here...`}
                value={translatedText}
                onChange={(e) => setTranslatedText(e.target.value)}
                className="h-[300px] font-mono text-sm"
                data-testid="textarea-translated-content"
              />
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentStep(2)}
                  variant="outline"
                  data-testid="button-back"
                >
                  Back
                </Button>
                <Button
                  onClick={handleApplyTranslation}
                  className="flex-1 bg-[#D67C4A] hover:bg-[#B86A3E] text-white"
                  disabled={!translatedText.trim()}
                  data-testid="button-apply-translation"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply Translation & Re-insert Images
                </Button>
              </div>

              {imageMap.length > 0 && (
                <p className="text-sm text-gray-600 text-center" style={{ color: '#4B5563 !important' }}>
                  ✨ {imageMap.length} image{imageMap.length !== 1 ? 's' : ''} will be automatically re-inserted
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600" style={{ color: '#4B5563 !important' }}>
          <p className="font-medium mb-2" style={{ color: '#374151 !important' }}>💡 Quick Guide:</p>
          <ol className="list-decimal list-inside space-y-1" style={{ color: '#4B5563 !important' }}>
            <li>Extract text (images become [IMAGE 1], [IMAGE 2], etc.)</li>
            <li>Click "Translate with AI" — the translation happens automatically!</li>
            <li>Review the translated content (title, slug, description, and body)</li>
            <li>Click "Apply" — images are re-inserted automatically!</li>
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}
