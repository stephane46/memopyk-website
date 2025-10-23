import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const EXCEL_FILE = path.join(process.cwd(), "partner-submissions.xlsx");

// Excel column headers (27 columns total)
const HEADERS = [
  "Timestamp", "Partner Type", "Partner Name", "Email", "Email_Public", "Phone", "Phone_Public", "Website",
  "Address", "Address Line 2", "City", "Postal Code", "Country", 
  "Photo Formats", "Other Photo", "Film Formats", "Other Film", 
  "Video Cassettes", "Other Video", "Delivery", "Other Delivery",
  "Public Description", "Consent",
  "Status", "Is_Active", "Show_On_Map", "lat", "lng", "slug"
];

export interface PartnerRow {
  id: number; // Row index
  timestamp: string;
  partner_type: string;
  partner_name: string;
  email: string;
  email_public: string;
  phone: string;
  phone_public: string;
  website: string;
  address: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  photo_formats: string;
  other_photo: string;
  film_formats: string;
  other_film: string;
  video_cassettes: string;
  other_video: string;
  delivery: string;
  other_delivery: string;
  public_description: string;
  consent: string;
  status: string;
  is_active: string;
  show_on_map: string;
  lat: string;
  lng: string;
  slug: string;
}

export interface PartnerFilters {
  search?: string;
  status?: string;
  partner_type?: string;
  services?: string[];
}

export interface PaginatedResult {
  partners: PartnerRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ExcelPartnerStore {
  private cache: PartnerRow[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  private readExcel(): PartnerRow[] {
    const now = Date.now();
    
    // Return cached data if fresh
    if (this.cache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cache;
    }

    if (!fs.existsSync(EXCEL_FILE)) {
      this.cache = [];
      this.cacheTimestamp = now;
      return [];
    }

    const workbook = XLSX.readFile(EXCEL_FILE);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const partners: PartnerRow[] = data.map((row: any, index) => ({
      id: index,
      timestamp: row["Timestamp"] || "",
      partner_type: row["Partner Type"] || "digitization", // Default for legacy rows
      partner_name: row["Partner Name"] || "",
      email: row["Email"] || "",
      email_public: row["Email_Public"] || "FALSE",
      phone: row["Phone"] || "",
      phone_public: row["Phone_Public"] || "FALSE",
      website: row["Website"] || "",
      address: row["Address"] || "",
      address_line2: row["Address Line 2"] || "",
      city: row["City"] || "",
      postal_code: row["Postal Code"] || "",
      country: row["Country"] || "",
      photo_formats: row["Photo Formats"] || "",
      other_photo: row["Other Photo"] || "",
      film_formats: row["Film Formats"] || "",
      other_film: row["Other Film"] || "",
      video_cassettes: row["Video Cassettes"] || "",
      other_video: row["Other Video"] || "",
      delivery: row["Delivery"] || "",
      other_delivery: row["Other Delivery"] || "",
      public_description: row["Public Description"] || "",
      consent: row["Consent"] || "",
      status: row["Status"] || "Pending",
      is_active: row["Is_Active"] || "FALSE",
      show_on_map: row["Show_On_Map"] || "FALSE",
      lat: row["lat"] || "",
      lng: row["lng"] || "",
      slug: row["slug"] || ""
    }));

    this.cache = partners;
    this.cacheTimestamp = now;
    return partners;
  }

  private writeExcel(partners: PartnerRow[]): void {
    const rows = partners.map(p => [
      p.timestamp, p.partner_type, p.partner_name, p.email, p.email_public,
      p.phone, p.phone_public, p.website, p.address, p.address_line2, 
      p.city, p.postal_code, p.country, p.photo_formats, p.other_photo,
      p.film_formats, p.other_film, p.video_cassettes, p.other_video,
      p.delivery, p.other_delivery, p.public_description, p.consent,
      p.status, p.is_active, p.show_on_map, p.lat, p.lng, p.slug
    ]);

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");
    XLSX.writeFile(workbook, EXCEL_FILE);

    // Invalidate cache
    this.cache = null;
  }

  getAll(filters?: PartnerFilters, page: number = 1, limit: number = 10): PaginatedResult {
    let partners = this.readExcel();

    // Apply filters
    if (filters) {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        partners = partners.filter(p =>
          p.partner_name.toLowerCase().includes(search) ||
          p.city.toLowerCase().includes(search) ||
          p.email.toLowerCase().includes(search)
        );
      }

      if (filters.status) {
        partners = partners.filter(p => p.status === filters.status);
      }

      if (filters.partner_type) {
        partners = partners.filter(p => p.partner_type === filters.partner_type);
      }

      if (filters.services && filters.services.length > 0) {
        partners = partners.filter(p => {
          return filters.services!.some(service => {
            if (service === "Photo") return p.photo_formats.length > 0;
            if (service === "Film") return p.film_formats.length > 0;
            if (service === "Video") return p.video_cassettes.length > 0;
            return false;
          });
        });
      }
    }

    // Calculate pagination
    const total = partners.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedPartners = partners.slice(offset, offset + limit);

    // Convert string booleans to actual booleans for frontend
    const convertedPartners = paginatedPartners.map(p => ({
      ...p,
      is_active: p.is_active === "TRUE",
      show_on_map: p.show_on_map === "TRUE",
      email_public: p.email_public === "TRUE",
      phone_public: p.phone_public === "TRUE"
    }));

    return {
      partners: convertedPartners as any,
      total,
      page,
      limit,
      totalPages
    };
  }

  getSummary(): { partners: PartnerRow[]; count: number } {
    const all = this.readExcel();
    // Return last 10 for backwards compatibility
    return {
      partners: all.slice(-10).reverse(),
      count: all.length
    };
  }

  getById(id: number): PartnerRow | null {
    const partners = this.readExcel();
    return partners[id] || null;
  }

  update(id: number, updates: Partial<PartnerRow>): boolean {
    const partners = this.readExcel();
    
    if (id < 0 || id >= partners.length) {
      return false;
    }

    partners[id] = { ...partners[id], ...updates };
    this.writeExcel(partners);
    return true;
  }

  delete(id: number): boolean {
    const partners = this.readExcel();
    
    if (id < 0 || id >= partners.length) {
      return false;
    }

    partners.splice(id, 1);
    // Reindex after deletion
    const reindexed = partners.map((p, index) => ({ ...p, id: index }));
    this.writeExcel(reindexed);
    return true;
  }

  add(partner: Omit<PartnerRow, 'id'>): PartnerRow {
    const partners = this.readExcel();
    const newPartner: PartnerRow = {
      ...partner,
      id: partners.length
    };
    partners.push(newPartner);
    this.writeExcel(partners);
    return newPartner;
  }

  create(partner: Omit<PartnerRow, 'id'>): boolean {
    try {
      this.add(partner);
      return true;
    } catch {
      return false;
    }
  }

  getMapData(): any[] {
    const partners = this.readExcel();
    
    return partners
      .filter(p => {
        const hasLat = p.lat && String(p.lat).trim() !== "";
        const hasLng = p.lng && String(p.lng).trim() !== "";
        if (!hasLat || !hasLng) return false;
        
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        
        return (
          p.status === "Approved" && 
          p.is_active === "TRUE" && 
          p.show_on_map === "TRUE" &&
          Number.isFinite(lat) &&
          Number.isFinite(lng)
        );
      })
      .map(p => ({
        name: p.partner_name,
        city: p.city,
        country: p.country,
        lat: Number(p.lat),
        lng: Number(p.lng),
        services: [
          ...(p.photo_formats ? ["Photo"] : []),
          ...(p.film_formats ? ["Film"] : []),
          ...(p.video_cassettes ? ["Video"] : [])
        ],
        formats: {
          photo: p.photo_formats ? p.photo_formats.split(", ") : [],
          film: p.film_formats ? p.film_formats.split(", ") : [],
          video: p.video_cassettes ? p.video_cassettes.split(", ") : []
        },
        website: p.website,
        phone: p.phone,
        phone_public: p.phone_public === "TRUE",
        email: p.email_public === "TRUE" ? p.email : "",
        email_public: p.email_public === "TRUE",
        public_description: p.public_description,
        slug: p.slug,
        address: p.address || "",
        address_line2: p.address_line2 || "",
        postal_code: p.postal_code || "",
        delivery: p.delivery ? p.delivery.split(", ") : [],
        other_photo: p.other_photo || "",
        other_film: p.other_film || "",
        other_video: p.other_video || "",
        other_delivery: p.other_delivery || "",
        status: p.status,
        is_active: p.is_active === "TRUE",
        show_on_map: p.show_on_map === "TRUE"
      }));
  }
}

// Singleton instance
export const partnerStore = new ExcelPartnerStore();
