import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const content = {
  'fr-FR': {
    title: 'Portail de Téléversement',
    section1Title: 'Découvrez votre histoire',
    section1Text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    section2Title: 'Préservez vos souvenirs',
    section2Text: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
    section3Title: 'Partagez vos moments',
    section3Text: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore.',
    formTitle: 'Demandez votre lien de téléversement',
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    agencyCode: 'Code Agence',
    submit: 'Envoyer',
    successMessage: 'Votre demande a été envoyée ! Vous recevrez un email avec votre lien de téléversement.',
    errorMessage: 'Une erreur est survenue. Veuillez réessayer.',
  },
  'en-US': {
    title: 'Travel Upload Portal',
    section1Title: 'Discover your story',
    section1Text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    section2Title: 'Preserve your memories',
    section2Text: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
    section3Title: 'Share your moments',
    section3Text: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore.',
    formTitle: 'Request your upload link',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    agencyCode: 'Agency Code',
    submit: 'Submit',
    successMessage: 'Your request has been sent! You will receive an email with your upload link.',
    errorMessage: 'An error occurred. Please try again.',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
        toast({
          title: t.successMessage,
          variant: 'default'
        });
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          agencyCode: ''
        });
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2EBDC' }}>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-playfair font-bold text-center mb-12" style={{ color: '#011526' }}>
          {t.title}
        </h1>
        
        <div className="space-y-8 mb-12">
          <section>
            <h2 className="text-2xl font-playfair font-semibold text-memopyk-dark-blue mb-4">
              {t.section1Title}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t.section1Text}
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-playfair font-semibold text-memopyk-dark-blue mb-4">
              {t.section2Title}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t.section2Text}
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-playfair font-semibold text-memopyk-dark-blue mb-4">
              {t.section3Title}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t.section3Text}
            </p>
          </section>
        </div>
        
        <Card className="bg-white shadow-lg">
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
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.phone}
                  </label>
                  <Input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.agencyCode} *
                  </label>
                  <Input
                    name="agencyCode"
                    value={formData.agencyCode}
                    onChange={handleChange}
                    required
                    minLength={2}
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-memopyk-orange hover:bg-memopyk-orange/90 text-white py-3 mt-4"
              >
                {isSubmitting ? '...' : t.submit}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
