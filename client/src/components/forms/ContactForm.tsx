import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest } from '@/lib/queryClient';
import { trackCtaClick } from '@/lib/analytics';
import { trackEvent } from '@/utils/analytics';
import { Mail, Phone, User, MessageSquare } from 'lucide-react';

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  package: z.string().min(1, "Please select a package"),
  message: z.string().min(10, "Message must be at least 10 characters")
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  onSuccess?: () => void;
  className?: string;
}

export const ContactForm: React.FC<ContactFormProps> = ({ onSuccess, className = "" }) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      package: '',
      message: ''
    }
  });

  const createContactMutation = useMutation({
    mutationFn: (data: ContactFormData) => apiRequest('/api/contacts', 'POST', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      
      // Track form submission with conversion value
      trackEvent('form_submit', {
        form_name: 'contact_form',
        form_type: 'contact',
        package: variables.package,
        value: 40,
        currency: 'EUR'
      });
      
      toast({
        title: language === 'fr-FR' ? 'Message envoyé' : 'Message sent',
        description: language === 'fr-FR' 
          ? 'Votre message a été envoyé avec succès. Nous vous répondrons bientôt.'
          : 'Your message has been sent successfully. We will respond to you soon.'
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Contact form submission error:', error);
      toast({
        title: language === 'fr-FR' ? 'Erreur' : 'Error',
        description: language === 'fr-FR'
          ? 'Une erreur est survenue lors de l\'envoi de votre message.'
          : 'An error occurred while sending your message.',
        variant: 'destructive'
      });
    }
  });

  const onSubmit = (data: ContactFormData) => {
    createContactMutation.mutate(data);
  };

  const getText = (fr: string, en: string) => language === 'fr-FR' ? fr : en;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 ${className}`}>
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {getText('Contactez-nous', 'Contact Us')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {getText(
            'Nous serions ravis d\'entendre parler de votre projet. Envoyez-nous un message et nous vous répondrons dans les plus brefs délais.',
            'We would love to hear about your project. Send us a message and we will get back to you as soon as possible.'
          )}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-500" />
                    {getText('Nom complet', 'Full Name')} *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={getText('Votre nom complet', 'Your full name')}
                      {...field} 
                      className="border-gray-300 dark:border-gray-600"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-500" />
                    {getText('Adresse e-mail', 'Email Address')} *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder={getText('votre@email.com', 'your@email.com')}
                      {...field} 
                      className="border-gray-300 dark:border-gray-600"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-orange-500" />
                    {getText('Téléphone', 'Phone')} ({getText('optionnel', 'optional')})
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="tel"
                      placeholder={getText('+33 1 23 45 67 89', '+1 (555) 123-4567')}
                      {...field} 
                      className="border-gray-300 dark:border-gray-600"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="package"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-orange-500" />
                    {getText('Forfait souhaité', 'Package Selection')} *
                  </FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="border-gray-300 dark:border-gray-600">
                        <SelectValue placeholder={getText('Sélectionnez un forfait', 'Select a package')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="essential">
                          {getText('Essential - €299', 'Essential - €299')}
                        </SelectItem>
                        <SelectItem value="premium">
                          {getText('Premium - €499', 'Premium - €499')}  
                        </SelectItem>
                        <SelectItem value="luxe">
                          {getText('Luxe - €799', 'Luxe - €799')}
                        </SelectItem>
                        <SelectItem value="personnalise">
                          {getText('Personnalisé - Devis sur mesure', 'Custom - Tailored quote')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-500" />
                  {getText('Message', 'Message')} *
                </FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder={getText(
                      'Décrivez votre projet, vos besoins ou toute question que vous pourriez avoir...',
                      'Describe your project, needs, or any questions you might have...'
                    )}
                    className="min-h-32 border-gray-300 dark:border-gray-600"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-center">
            <Button 
              type="submit" 
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg"
              disabled={createContactMutation.isPending}
            >
              {createContactMutation.isPending ? (
                getText('Envoi en cours...', 'Sending...')
              ) : (
                getText('Envoyer le message', 'Send Message')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};