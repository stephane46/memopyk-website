# MEMOPYK Visual Assets Package

## 🎨 Asset Inventory for Rebuild

### **📋 Complete Asset Collection (7 Files)**

#### **🏢 Brand Identity**
- `logos/Primary_Logo.svg` - Main MEMOPYK logo with official branding
  - **Colors**: Navy (#2A4759) and Blue Gray (#8D9FA6)
  - **Usage**: Header, footer, admin panel
  - **Format**: Scalable SVG (1478x237px viewBox)
  - **Reference**: Used in `client/src/components/Header.tsx`

- `icons/favicon.svg` - Website favicon and browser tab icon
  - **Usage**: HTML head, browser bookmarks
  - **Format**: SVG icon optimized for small sizes
  - **Reference**: `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`

#### **🖼️ Website Content Images**
- `images/KeyVisual_Hero.png` - Main hero section background illustration
  - **Size**: 1777KB, high-resolution
  - **Usage**: Hero section background with cream (#F2EBDC) matching
  - **Reference**: Used in hero video overlay system
  - **Colors**: Matches official MEMOPYK palette

- `images/How_we_work_Step1.png` - Process illustration: Upload phase
  - **Size**: 1165KB
  - **Usage**: "How It Works" section, Step 1 card
  - **Content**: Client uploading photos/videos
  - **Reference**: HowItWorksSection component

- `images/How_we_work_Step2.png` - Process illustration: Creation phase  
  - **Size**: 1434KB
  - **Usage**: "How It Works" section, Step 2 card (highlighted with orange outline)
  - **Content**: MEMOPYK team creating the film
  - **Reference**: Card 2 highlighting system

- `images/How_we_work_Step3.png` - Process illustration: Delivery phase
  - **Size**: 1412KB  
  - **Usage**: "How It Works" section, Step 3 card
  - **Content**: Final film delivery to client
  - **Reference**: Process completion step

## 🎨 Official MEMOPYK Color Palette

```css
/* Brand Colors - Use these exact values */
--memopyk-navy: #011526;      /* Primary brand color */
--memopyk-dark-blue: #2A4759; /* Logo and headers */
--memopyk-sky-blue: #89BAD9;  /* Accent elements */
--memopyk-blue-gray: #8D9FA6; /* Secondary text */
--memopyk-cream: #F2EBDC;     /* Background highlights */
--memopyk-orange: #D67C4A;    /* CTA and highlights */
```

## 📁 Asset Integration Guide

### **For New Replit Project Setup:**

1. **Copy entire MEMOPYK_ASSETS folder** to new project root
2. **Move assets to public directory**:
   ```bash
   mkdir -p public/images public/icons
   cp MEMOPYK_ASSETS/logos/Primary_Logo.svg public/logo.svg
   cp MEMOPYK_ASSETS/icons/favicon.svg public/favicon.svg  
   cp MEMOPYK_ASSETS/images/* public/images/
   ```

3. **HTML References**:
   ```html
   <!-- Favicon -->
   <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
   
   <!-- Images in components -->
   <img src="/images/KeyVisual_Hero.png" alt="MEMOPYK Hero" />
   <img src="/images/How_we_work_Step1.png" alt="Upload Process" />
   ```

### **Component Integration**

#### **Header Component**
```jsx
import logoUrl from "/logo.svg";
<img src={logoUrl} alt="MEMOPYK" className="h-8" />
```

#### **Hero Section**  
```jsx
<div style={{ backgroundImage: "url('/images/KeyVisual_Hero.png')" }}>
```

#### **Process Steps**
```jsx
const stepImages = [
  "/images/How_we_work_Step1.png",
  "/images/How_we_work_Step2.png", 
  "/images/How_we_work_Step3.png"
];
```

## ⚠️ Asset Usage Requirements

### **Brand Consistency**
- Always use official MEMOPYK colors from palette above
- Primary logo must maintain aspect ratio and clear space
- Step images should appear in sequence (1→2→3)
- KeyVisual background must use cream (#F2EBDC) overlay

### **Performance Optimization**
- All images are high-resolution (1MB+ each)
- Consider WebP conversion for web delivery
- Implement lazy loading for step images
- Use responsive image sizing

### **File Structure in New Project**
```
new-memopyk-project/
├── public/
│   ├── favicon.svg
│   ├── logo.svg
│   └── images/
│       ├── KeyVisual_Hero.png
│       ├── How_we_work_Step1.png
│       ├── How_we_work_Step2.png
│       └── How_we_work_Step3.png
└── src/components/
    └── (reference these assets)
```

## 📋 Quality Assurance Checklist

When implementing in new project:
- [ ] Favicon appears in browser tab
- [ ] Logo displays in header with correct colors
- [ ] Hero background image loads properly  
- [ ] All 3 process step images display in sequence
- [ ] Colors match official MEMOPYK palette
- [ ] Images maintain aspect ratios on all screen sizes
- [ ] No broken image links or 404 errors

---

**Asset Package Created**: July 21, 2025  
**Source Project**: Current MEMOPYK platform  
**Purpose**: Visual consistency for rebuild project  
**Total Size**: ~7MB (high-resolution for professional quality)