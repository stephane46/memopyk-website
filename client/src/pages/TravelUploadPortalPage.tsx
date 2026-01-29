import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2, Home, Upload, Mail, ExternalLink } from 'lucide-react';

const content = {
  'fr-FR': {
    title: 'Obtenez l\'accès à votre dossier personnel\npour y déposer vos photos et vidéos',
    formTitle: 'Vos informations',
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    agencyCode: 'Code',
    agencyCodeHint: 'Vous trouverez votre code sur le coupon ou dans l\'email envoyé par votre agence',
    submit: 'Envoyer',
    submitHint: 'En cliquant, vous recevrez un email avec des explications détaillées et votre lien de téléversement.',
    successMessage: 'Votre demande a été envoyée ! Vous recevrez un email avec votre lien de téléversement. Pensez à vérifier vos spams si vous ne le recevez pas.',
    errorMessage: 'Une erreur est survenue. Veuillez réessayer.',
    invalidCodeError: 'Code agence invalide. Veuillez vérifier le code reçu de votre agence de voyage.',
    codeValid: 'Code valide',
    codeInvalid: 'Code non reconnu',
    requiredField: 'Veuillez remplir ce champ.',
    invalidEmail: 'Veuillez entrer une adresse email valide.',
    confirmationTitle: 'Demande envoyée avec succès !',
    confirmationMessage: 'Votre demande a été enregistrée. Vous recevrez un email avec votre lien de téléversement dans quelques instants.',
    confirmationEmailNote: 'Pensez à vérifier vos spams si vous ne recevez pas l\'email.',
    goToHomepage: 'Découvrir MEMOPYK',
    goToUpload: 'Accéder au dossier de téléversement',
    uploadNotReady: 'Le lien de téléversement sera disponible dans l\'email que vous allez recevoir.',
  },
  'en-US': {
    title: 'Get access to your personal folder\nto upload your photos and videos',
    formTitle: 'Your information',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    agencyCode: 'Code',
    agencyCodeHint: 'You will find your code on the coupon or in the email sent by your agency',
    submit: 'Submit',
    submitHint: 'By clicking, you will receive an email with detailed instructions and your upload link.',
    successMessage: 'Your request has been sent! You will receive an email with your upload link. Please check your spam folder if you don\'t receive it.',
    errorMessage: 'An error occurred. Please try again.',
    invalidCodeError: 'Invalid agency code. Please check the code received from your travel agency.',
    codeValid: 'Valid code',
    codeInvalid: 'Code not recognized',
    requiredField: 'Please fill out this field.',
    invalidEmail: 'Please enter a valid email address.',
    confirmationTitle: 'Request submitted successfully!',
    confirmationMessage: 'Your request has been registered. You will receive an email with your upload link shortly.',
    confirmationEmailNote: 'Please check your spam folder if you don\'t receive the email.',
    goToHomepage: 'Discover MEMOPYK',
    goToUpload: 'Go to Upload Folder',
    uploadNotReady: 'The upload link will be available in the email you will receive.',
  }
};

export default function TravelUploadPortalPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const t = content[language as keyof typeof content] || content['fr-FR'];
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    agencyCode: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [nextcloudUrl, setNextcloudUrl] = useState<string | null>(null);
  const [codeValidation, setCodeValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    agencyName?: string;
  }>({ status: 'idle' });

  const validateAgencyCode = useCallback(async (code: string) => {
    if (!code || code.length < 2) {
      setCodeValidation({ status: 'idle' });
      return;
    }
    
    setCodeValidation({ status: 'checking' });
    
    try {
      const response = await fetch(`/api/travel-agency-codes/validate/${encodeURIComponent(code)}`);
      const result = await response.json();
      
      if (result.valid) {
        setCodeValidation({ status: 'valid', agencyName: result.agencyName });
      } else {
        setCodeValidation({ status: 'invalid' });
      }
    } catch (error) {
      setCodeValidation({ status: 'idle' });
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'agencyCode') {
      const trimmedValue = value.trim();
      if (trimmedValue.length >= 2) {
        const timeoutId = setTimeout(() => validateAgencyCode(trimmedValue), 500);
        return () => clearTimeout(timeoutId);
      } else {
        setCodeValidation({ status: 'idle' });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agencyCode || formData.agencyCode.length < 2) {
      toast({
        title: language === 'fr-FR' 
          ? 'Le code agence est requis'
          : 'Agency code is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (codeValidation.status === 'invalid') {
      toast({
        title: t.invalidCodeError,
        variant: 'destructive'
      });
      return;
    }
    
    if (codeValidation.status !== 'valid') {
      const codeToValidate = formData.agencyCode.trim();
      try {
        const response = await fetch(`/api/travel-agency-codes/validate/${encodeURIComponent(codeToValidate)}`);
        const result = await response.json();
        if (!result.valid) {
          toast({
            title: t.invalidCodeError,
            variant: 'destructive'
          });
          setCodeValidation({ status: 'invalid' });
          return;
        }
        setCodeValidation({ status: 'valid', agencyName: result.agencyName });
      } catch (error) {
        toast({
          title: t.errorMessage,
          variant: 'destructive'
        });
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/travel-upload/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          language,
          submittedAt: new Date().toISOString()
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setCodeValidation({ status: 'idle' });
        setNextcloudUrl(result.shareUrl || null);
        setShowConfirmation(true);
        window.scrollTo(0, 0);
      } else {
        // Show specific API error message if available
        toast({
          title: result.error || t.errorMessage,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: t.errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const homeUrl = language === 'fr-FR' ? '/fr-FR/' : '/en-US/';

  if (showConfirmation) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F2EBDC' }}>
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-3xl font-playfair font-bold text-memopyk-navy mb-4">
                  {t.confirmationTitle}
                </h1>
                <p className="text-gray-700 mb-2">
                  {t.confirmationMessage}
                </p>
                <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t.confirmationEmailNote}
                </p>
              </div>

              <div className="flex flex-col items-center gap-3 mt-8">
                {nextcloudUrl && (
                  <Button
                    onClick={() => window.open(nextcloudUrl, '_blank')}
                    className="bg-memopyk-orange hover:bg-memopyk-orange/90 text-white py-3 px-6 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-5 h-5" />
                    {t.goToUpload}
                  </Button>
                )}
                <Button
                  onClick={() => window.location.href = homeUrl}
                  variant={nextcloudUrl ? "outline" : "default"}
                  className={nextcloudUrl 
                    ? "border-memopyk-dark-blue text-memopyk-dark-blue hover:bg-memopyk-dark-blue/10 py-3 px-6 flex items-center justify-center gap-2"
                    : "bg-memopyk-dark-blue hover:bg-memopyk-dark-blue/90 text-white py-3 px-6 flex items-center justify-center gap-2"
                  }
                >
                  <Home className="w-5 h-5" />
                  {t.goToHomepage}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2EBDC' }}>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-playfair font-bold whitespace-pre-line" style={{ color: '#011526' }}>
            {t.title}
          </h1>
        </div>
        
        <Card className="bg-white shadow-lg max-w-lg mx-auto">
          <CardContent className="p-8">
            <h3 className="text-2xl font-playfair font-semibold text-memopyk-navy mb-6 text-center">
              {t.formTitle}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.firstName} *
                  </label>
                  <Input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    minLength={1}
                    maxLength={50}
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity(t.requiredField)}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.lastName} *
                  </label>
                  <Input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    minLength={1}
                    maxLength={50}
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity(t.requiredField)}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.email} *
                </label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  onInvalid={(e) => {
                    const input = e.target as HTMLInputElement;
                    if (input.validity.valueMissing) {
                      input.setCustomValidity(t.requiredField);
                    } else if (input.validity.typeMismatch) {
                      input.setCustomValidity(t.invalidEmail);
                    }
                  }}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.phone} *
                  </label>
                  <Input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity(t.requiredField)}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.agencyCode} *
                  </label>
                  <div className="relative">
                    <Input
                      name="agencyCode"
                      value={formData.agencyCode}
                      onChange={handleChange}
                      required
                      minLength={2}
                      className={`pr-10 ${
                        codeValidation.status === 'valid' ? 'border-green-500 focus:ring-green-500' :
                        codeValidation.status === 'invalid' ? 'border-red-500 focus:ring-red-500' : ''
                      }`}
                      onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity(t.requiredField)}
                      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {codeValidation.status === 'checking' && (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      )}
                      {codeValidation.status === 'valid' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {codeValidation.status === 'invalid' && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t.agencyCodeHint}</p>
                  {codeValidation.status === 'valid' && codeValidation.agencyName && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {t.codeValid}: {codeValidation.agencyName}
                    </p>
                  )}
                  {codeValidation.status === 'invalid' && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      {t.codeInvalid}
                    </p>
                  )}
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-memopyk-orange hover:bg-memopyk-orange/90 text-white py-3 mt-4"
              >
                {isSubmitting ? '...' : t.submit}
              </Button>
              <p className="text-xs text-gray-500 text-center mt-2">{t.submitHint}</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
