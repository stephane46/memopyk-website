import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PartnerIntakeSchema, type PartnerIntake } from "@shared/partnerSchema";
import { PHOTO_FORMATS, FILM_FORMATS, VIDEO_CASSETTES, DELIVERY } from "@shared/partnerFormats";
import { apiRequest } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Send, Building2, Globe, Mail, Phone, MapPin, Package, FileImage, Film, Video, Truck } from "lucide-react";
import countries from "i18n-iso-countries";
import frLocale from "i18n-iso-countries/langs/fr.json";

countries.registerLocale(frLocale);

const restrictedCountries = [
  { code: "FR", name: "France", storeName: "France" },
  { code: "BE", name: "Belgique", storeName: "Belgium" },
  { code: "CA", name: "Canada", storeName: "Canada" },
  { code: "MC", name: "Monaco", storeName: "Monaco" },
  { code: "CH", name: "Suisse", storeName: "Switzerland" },
];

const serviceOptions = [
  { value: "Photo" as const, label: "Numérisation de photos", icon: FileImage },
  { value: "Film" as const, label: "Numérisation de films et vidéos", icon: Film },
];

export default function PartnerIntakeFR() {
  const [csrfToken, setCsrfToken] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<PartnerIntake>({
    resolver: zodResolver(PartnerIntakeSchema),
    defaultValues: {
      partner_name: "",
      email: "",
      email_public: true,
      phone: "",
      website: "",
      address: {
        street: "",
        line2: "",
        city: "",
        postal_code: "",
        country: "FR",
      },
      services: [],
      photo_formats: [],
      video_formats: [],
      film_formats: [],
      audio_formats: [],
      video_cassettes: [],
      other_photo_formats: "",
      other_film_formats: "",
      other_video_formats: "",
      delivery: [],
      other_delivery: "",
      output: [],
      turnaround: "",
      rush: false,
      languages: [],
      consent_listed: false,
      public_description: "",
      locale: "fr",
      csrfToken: "",
    },
  });

  const selectedServices = form.watch("services");
  const selectedDelivery = form.watch("delivery");

  useEffect(() => {
    fetch("/api/csrf")
      .then((res) => res.json())
      .then((data) => {
        setCsrfToken(data.token);
        form.setValue("csrfToken", data.token);
      })
      .catch((err) => {
        console.error("Failed to fetch CSRF token:", err);
        toast({
          title: "Erreur",
          description: "Impossible de charger le formulaire. Veuillez réessayer.",
          variant: "destructive",
        });
      });
  }, [toast, form]);

  const onSubmit = async (data: PartnerIntake) => {
    try {
      await apiRequest("/api/partners/intake", "POST", data);

      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur s'est produite";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2A4759] to-[#011526] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-[#2A4759] mb-4">
            Profil soumis !
          </h1>
          <p className="text-lg text-gray-700 mb-8">
            Merci pour votre inscription.
          </p>
          <Button
            onClick={() => window.location.href = "/fr-FR"}
            className="bg-[#D67C4A] hover:bg-[#D67C4A]/90 text-white"
            data-testid="button-return-home"
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2A4759] to-[#011526] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#D67C4A] to-[#D67C4A]/80 p-8 md:p-12 text-white relative">
            {/* Language Selector */}
            <div className="absolute top-4 right-4 md:top-8 md:right-8 flex gap-2">
              <button
                onClick={() => window.location.href = "/en-US/directory-pro/join"}
                className="p-2 rounded-md border-2 border-transparent hover:border-white/50 transition-all"
                title="Switch to English"
                data-testid="lang-switcher-en"
              >
                <img 
                  src="https://flagcdn.com/w40/us.png" 
                  alt="English"
                  className="w-8 h-5 object-cover rounded"
                />
              </button>
              <button
                onClick={() => window.location.href = "/fr-FR/annuaire-pro/devenir"}
                className="p-2 rounded-md border-2 border-white bg-white/20 shadow-md"
                title="Français"
                data-testid="lang-switcher-fr"
              >
                <img 
                  src="https://flagcdn.com/w40/fr.png" 
                  alt="Français"
                  className="w-8 h-5 object-cover rounded"
                />
              </button>
            </div>
            
            <h1 className="text-4xl font-bold mb-4">Inscription Annuaire MEMOPYK</h1>
            <p className="text-xl opacity-95">
              Professionnels de la numérisation
            </p>
          </div>

          {/* Form */}
          <div className="p-8 md:p-12">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Basic Information */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-[#2A4759] flex items-center gap-2">
                    <Building2 className="w-6 h-6" />
                    Informations de base
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="partner_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom de l'entreprise *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Votre entreprise"
                              {...field}
                              data-testid="input-partner-name"
                              className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A] placeholder:text-gray-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Site Web *
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://exemple.com"
                              {...field}
                              data-testid="input-website"
                              className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A] placeholder:text-gray-400"
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
                            <Mail className="w-4 h-4" />
                            Email *
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="contact@exemple.com"
                              {...field}
                              data-testid="input-email"
                              className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A] placeholder:text-gray-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email_public"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-300 p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-email-public"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Afficher mon e-mail dans l'annuaire
                            </FormLabel>
                            <FormDescription className="text-sm text-gray-600">
                              Si cette case est décochée, votre e-mail ne sera pas affiché dans l'annuaire.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Téléphone *
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+33 6 12 34 56 78"
                              {...field}
                              data-testid="input-phone"
                              className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A] placeholder:text-gray-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-[#2A4759] flex items-center gap-2">
                    <MapPin className="w-6 h-6" />
                    Adresse de la boutique
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="address.street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rue</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123 Rue de la République"
                              {...field}
                              data-testid="input-street"
                              className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A] placeholder:text-gray-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address.line2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complément d'adresse</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Bâtiment A, Étage 3"
                              {...field}
                              data-testid="input-line2"
                              className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A] placeholder:text-gray-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Paris"
                              {...field}
                              data-testid="input-city"
                              className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A] placeholder:text-gray-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address.postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code postal</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="75001"
                              {...field}
                              data-testid="input-postal-code"
                              className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A] placeholder:text-gray-400"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address.country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pays *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-country" className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A]">
                                <SelectValue placeholder="Sélectionnez un pays" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {restrictedCountries.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Services Offered */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-[#2A4759] flex items-center gap-2">
                    <Package className="w-6 h-6" />
                    Services proposés *
                  </h2>
                  
                  <FormField
                    control={form.control}
                    name="services"
                    render={() => (
                      <FormItem className="space-y-3">
                        <FormDescription>Sélectionnez au moins un type de service.</FormDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {serviceOptions.map((service) => (
                            <FormField
                              key={service.value}
                              control={form.control}
                              name="services"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(service.value)}
                                      onCheckedChange={(checked) => {
                                        const newValue = checked
                                          ? [...(field.value || []), service.value]
                                          : (field.value || []).filter((val) => val !== service.value);
                                        field.onChange(newValue);
                                      }}
                                      data-testid={`checkbox-service-${service.value.toLowerCase()}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer flex items-center gap-2">
                                    <service.icon className="w-4 h-4" />
                                    {service.label}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage className="text-[#D67C4A] font-medium" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Technical Capabilities */}
                {selectedServices && selectedServices.length > 0 && (
                  <div className="space-y-6">
                    
                    {/* Photo Digitization Group */}
                    {selectedServices.includes("Photo") && (
                      <div className="space-y-4 border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-[#2A4759] flex items-center gap-2">
                          <FileImage className="w-5 h-5" />
                          Numérisation de photos
                        </h3>
                        <FormField
                          control={form.control}
                          name="photo_formats"
                          render={() => (
                            <FormItem className="space-y-4">
                              <FormDescription>Cochez tout ce que vous prenez en charge :</FormDescription>
                              
                              {/* Tirages et albums */}
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-[#2A4759]">📷 Tirages et albums</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                                  <FormField
                                    control={form.control}
                                    name="photo_formats"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes("Prints")}
                                            onCheckedChange={(checked) => {
                                              const newValue = checked
                                                ? [...(field.value || []), "Prints"]
                                                : (field.value || []).filter((val) => val !== "Prints");
                                              field.onChange(newValue);
                                            }}
                                            data-testid="checkbox-photo-Prints"
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          Tirages papier
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="photo_formats"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes("Albums")}
                                            onCheckedChange={(checked) => {
                                              const newValue = checked
                                                ? [...(field.value || []), "Albums"]
                                                : (field.value || []).filter((val) => val !== "Albums");
                                              field.onChange(newValue);
                                            }}
                                            data-testid="checkbox-photo-Albums"
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          Albums (démontage possible)
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Films et négatifs */}
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-[#2A4759]">🎞️ Films et négatifs</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                                  <FormField
                                    control={form.control}
                                    name="photo_formats"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes("Negatives 35mm")}
                                            onCheckedChange={(checked) => {
                                              const newValue = checked
                                                ? [...(field.value || []), "Negatives 35mm"]
                                                : (field.value || []).filter((val) => val !== "Negatives 35mm");
                                              field.onChange(newValue);
                                            }}
                                            data-testid="checkbox-photo-Negatives 35mm"
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          Négatifs 35 mm
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="photo_formats"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes("Slides 35mm")}
                                            onCheckedChange={(checked) => {
                                              const newValue = checked
                                                ? [...(field.value || []), "Slides 35mm"]
                                                : (field.value || []).filter((val) => val !== "Slides 35mm");
                                              field.onChange(newValue);
                                            }}
                                            data-testid="checkbox-photo-Slides 35mm"
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          Diapositives 35 mm
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="photo_formats"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes("Medium format 120/220")}
                                            onCheckedChange={(checked) => {
                                              const newValue = checked
                                                ? [...(field.value || []), "Medium format 120/220"]
                                                : (field.value || []).filter((val) => val !== "Medium format 120/220");
                                              field.onChange(newValue);
                                            }}
                                            data-testid="checkbox-photo-Medium format 120/220"
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          Négatifs moyen format <span className="text-xs">(120 / 220 : 6×4,5, 6×6, 6×7, 6×9…)</span>
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="photo_formats"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes("Large format")}
                                            onCheckedChange={(checked) => {
                                              const newValue = checked
                                                ? [...(field.value || []), "Large format"]
                                                : (field.value || []).filter((val) => val !== "Large format");
                                              field.onChange(newValue);
                                            }}
                                            data-testid="checkbox-photo-Large format"
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          Négatifs grand format <span className="text-xs">(4×5", 8×10"…)</span>
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Autres formats */}
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-[#2A4759]">🧾 Autres formats</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                                  <FormField
                                    control={form.control}
                                    name="photo_formats"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes("Polaroid/Instax")}
                                            onCheckedChange={(checked) => {
                                              const newValue = checked
                                                ? [...(field.value || []), "Polaroid/Instax"]
                                                : (field.value || []).filter((val) => val !== "Polaroid/Instax");
                                              field.onChange(newValue);
                                            }}
                                            data-testid="checkbox-photo-Polaroid/Instax"
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          Polaroid / Instax
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                              
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="other_photo_formats"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Autres formats pris en charge</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Précisez..."
                                  {...field}
                                  maxLength={120}
                                  className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A] placeholder:text-gray-400"
                                  data-testid="input-photo-other"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Motion Picture Film Group */}
                    {selectedServices.includes("Film") && (
                      <div className="space-y-4 border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-[#2A4759] flex items-center gap-2">
                          <Film className="w-5 h-5" />
                          Numérisation de films
                        </h3>
                        <FormField
                          control={form.control}
                          name="film_formats"
                          render={() => (
                            <FormItem className="space-y-3">
                              <FormDescription>Cochez tout ce que vous prenez en charge.</FormDescription>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {FILM_FORMATS.map((format) => (
                                  <FormField
                                    key={format.v}
                                    control={form.control}
                                    name="film_formats"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(format.v)}
                                            onCheckedChange={(checked) => {
                                              const newValue = checked
                                                ? [...(field.value || []), format.v]
                                                : (field.value || []).filter((val) => val !== format.v);
                                              field.onChange(newValue);
                                            }}
                                            data-testid={`checkbox-film-${format.v}`}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          {format.fr}
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="other_film_formats"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Autres formats pris en charge</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Précisez..."
                                  {...field}
                                  maxLength={120}
                                  className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A] placeholder:text-gray-400"
                                  data-testid="input-film-other"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Video Cassettes Group */}
                    {selectedServices.includes("Film") && (
                      <div className="space-y-4 border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-[#2A4759] flex items-center gap-2">
                          <Video className="w-5 h-5" />
                          Numérisation de vidéos
                        </h3>
                        <FormField
                          control={form.control}
                          name="video_cassettes"
                          render={() => (
                            <FormItem className="space-y-3">
                              <FormDescription>Cochez tout ce que vous prenez en charge.</FormDescription>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {VIDEO_CASSETTES.map((format) => (
                                  <FormField
                                    key={format.v}
                                    control={form.control}
                                    name="video_cassettes"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(format.v)}
                                            onCheckedChange={(checked) => {
                                              const newValue = checked
                                                ? [...(field.value || []), format.v]
                                                : (field.value || []).filter((val) => val !== format.v);
                                              field.onChange(newValue);
                                            }}
                                            data-testid={`checkbox-video-${format.v}`}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          {format.fr}
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="other_video_formats"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Autres formats pris en charge</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Précisez..."
                                  {...field}
                                  maxLength={120}
                                  className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A] placeholder:text-gray-400"
                                  data-testid="input-video-other"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery Section */}
                {selectedServices && selectedServices.length > 0 && (
                  <div className="space-y-4 border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-[#2A4759] flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Livraison / Sortie
                    </h3>
                    <FormField
                      control={form.control}
                      name="delivery"
                      render={() => (
                        <FormItem className="space-y-3">
                          <FormDescription>Options de livraison proposées.</FormDescription>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {DELIVERY.map((option) => (
                              <FormField
                                key={option.v}
                                control={form.control}
                                name="delivery"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(option.v)}
                                        onCheckedChange={(checked) => {
                                          const newValue = checked
                                            ? [...(field.value || []), option.v]
                                            : (field.value || []).filter((val) => val !== option.v);
                                          field.onChange(newValue);
                                        }}
                                        data-testid={`checkbox-delivery-${option.v}`}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {option.fr}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="other_delivery"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Autres types de Livraison / Sortie</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Précisez..."
                              {...field}
                              maxLength={120}
                              className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A] placeholder:text-gray-400"
                              data-testid="input-delivery-other"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Description */}
                <FormField
                  control={form.control}
                  name="public_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ce texte sera affiché tel quel dans l'annuaire."
                          rows={5}
                          {...field}
                          maxLength={500}
                          data-testid="input-public-description"
                          className="border-gray-300 focus:border-[#D67C4A] focus:ring-[#D67C4A] resize-none placeholder:text-gray-400"
                        />
                      </FormControl>
                      <div className="text-sm text-gray-500 text-right mt-1">
                        {500 - (field.value?.length || 0)} caractères restants
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Consent */}
                <FormField
                  control={form.control}
                  name="consent_listed"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-300 p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-consent"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer">
                            J'accepte d'être répertorié dans l'annuaire MEMOPYK *
                          </FormLabel>
                          <FormDescription>
                            Votre profil sera visible par les clients cherchant des services de numérisation
                          </FormDescription>
                        </div>
                      </div>
                      <FormMessage className="text-[#D67C4A] font-medium" />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full !bg-[#D67C4A] hover:!bg-[#D67C4A]/90 !text-white text-lg py-6"
                  data-testid="button-submit"
                >
                  {form.formState.isSubmitting ? (
                    "Envoi en cours..."
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Soumettre
                    </>
                  )}
                </Button>

                <div className="text-sm text-gray-600 text-center space-y-2">
                  <p>
                    Questions ? N'hésitez pas à nous contacter à <a href="mailto:contact@memopyk.com" className="text-[#D67C4A] hover:underline">contact@memopyk.com</a>
                  </p>
                  <p>* Champs obligatoires</p>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
