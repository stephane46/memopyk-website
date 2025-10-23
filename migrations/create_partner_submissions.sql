-- Create partner_submissions table
CREATE TABLE IF NOT EXISTS partner_submissions (
  id SERIAL PRIMARY KEY,
  partner_type VARCHAR(50) NOT NULL DEFAULT 'digitization',
  partner_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_public BOOLEAN DEFAULT false,
  phone TEXT,
  phone_public BOOLEAN DEFAULT false,
  website TEXT,
  
  -- Address fields
  address TEXT,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postal_code TEXT,
  country TEXT NOT NULL,
  
  -- Geolocation
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  
  -- Service offerings
  photo_formats TEXT,
  film_formats TEXT,
  video_cassettes TEXT,
  
  -- Public directory fields
  public_description TEXT,
  slug TEXT NOT NULL,
  
  -- Status and visibility
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  is_active BOOLEAN DEFAULT false,
  show_on_map BOOLEAN DEFAULT false,
  
  -- Additional information
  specialties TEXT,
  years_experience INTEGER,
  notes TEXT,
  
  -- Timestamps
  submitted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_partner_status ON partner_submissions(status);

-- Create index on partner_type for filtering
CREATE INDEX IF NOT EXISTS idx_partner_type ON partner_submissions(partner_type);

-- Create index on slug for lookups
CREATE INDEX IF NOT EXISTS idx_partner_slug ON partner_submissions(slug);

-- Comments
COMMENT ON TABLE partner_submissions IS 'Partner directory submissions and management';
COMMENT ON COLUMN partner_submissions.partner_type IS 'Type of partner (digitization, restoration, etc.)';
COMMENT ON COLUMN partner_submissions.status IS 'Approval status: Pending, Approved, Rejected';
