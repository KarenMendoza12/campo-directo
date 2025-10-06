# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Campo Directo is a web platform designed to connect agricultural producers directly with consumers in Colombia, eliminating intermediaries and providing fresh, high-quality products at fair prices.

**Technology Stack:**
- Frontend: Vanilla HTML/CSS/JavaScript (static site)
- Primary Language: Spanish (es-CO locale)
- Responsive design with mobile-first approach
- No build tools or framework dependencies currently

**Key Features:**
- User registration for both farmers ("campesinos") and buyers ("compradores")
- Form validation and user experience flows
- Agricultural-themed UI with green color scheme (#2d5016)
- Responsive design for mobile and desktop

## Development Commands

### Current Static Site Development
```powershell
# Serve static files locally (use any web server)
python -m http.server 8000  # Python 3
# or
php -S localhost:8000       # PHP
# or install serve globally and use:
npm install -g serve
serve public

# View project structure
Get-ChildItem -Recurse public/ | Format-Table Name, Directory

# Check file contents
Get-Content public/index.html
```

### Future Development (Placeholders in package.json)
```powershell
# Install dependencies (when configured)
npm install

# Development server (placeholder)
npm run dev

# Build for production (placeholder)  
npm run build

# Run tests (placeholder)
npm test

# Start production server (placeholder)
npm start
```

### Testing HTML/CSS/JS Changes
```powershell
# Quick file editing and testing cycle
# 1. Edit files in public/ directory
# 2. Refresh browser to see changes
# 3. Test forms by filling them out
# 4. Check console for JavaScript errors: F12 > Console

# Test responsive design
# F12 > Toggle device toolbar, test different screen sizes
```

## Architecture & Current Structure

### Project Organization
```
campo-directo/
├── public/                    # Static website files (main codebase)
│   ├── css/
│   │   ├── styles.css         # Global styles and layout
│   │   ├── login.css          # Login page specific styles
│   │   ├── registro.css       # Registration form styles
│   │   └── registro-exitoso.css # Success page styles
│   ├── js/
│   │   ├── login.js           # Login form validation & simulation
│   │   ├── registro.js        # Registration form logic
│   │   └── registro-exitoso.js # Success page animations
│   ├── images/                # Logo and illustration assets
│   ├── index.html             # Landing page
│   ├── login.html             # Farmer login page
│   ├── registro.html          # User registration form
│   └── registro-exitoso.html  # Registration success page
├── src/                       # Empty - future backend code
├── package.json              # Node.js project config (placeholder scripts)
├── .gitignore               # Standard Node.js gitignore
├── README.md                # Basic project description
└── WARP.md                  # This file
```

### User Flow Architecture
1. **Landing Page** (`index.html`): Main entry with navigation to user types
2. **Registration Flow**: 
   - `registro.html` → form validation → `registro-exitoso.html`
   - Handles both farmers and buyers with conditional fields
3. **Login Flow**: 
   - `login.html` → validation → simulated authentication
   - Currently designed for farmers ("campesinos")

### Frontend Architecture Patterns

**CSS Organization:**
- `styles.css`: Global reset, layout, components, responsive breakpoints
- Page-specific CSS files for specialized styling
- CSS custom properties for consistent color scheme
- Mobile-first responsive design with specific breakpoints

**JavaScript Patterns:**
- Module pattern with DOMContentLoaded initialization
- Form validation with real-time feedback
- SessionStorage/LocalStorage for temporary data persistence
- Event-driven architecture for form interactions
- Simulation functions for authentication (no backend yet)

**Form Validation Strategy:**
- Client-side validation with Spanish error messages
- Real-time validation on blur events
- Visual feedback with error states and animations
- Conditional field display based on user type selection

### Key Technical Implementation Details

**Authentication Simulation:**
- Login accepts demo credentials ("campesino"/"admin" in username/password)
- Session data stored in sessionStorage
- "Remember me" functionality using localStorage

**Registration System:**
- Dual user types: farmers require farm name, buyers don't
- Colombian phone number formatting
- Age validation (18+ required)
- Email format validation
- Data temporarily stored in sessionStorage for success page

**Responsive Design:**
- Breakpoints: 575px (mobile), 768px (tablet), 992px (desktop), 1200px+ (large)
- Grid-based layouts with CSS Grid and Flexbox
- Image optimization for different screen sizes

## Development Guidance

### Language & Localization
- **All UI text must be in Spanish (Colombian Spanish preferred)**
- Use formal "usted" for user interactions
- Error messages, placeholders, and labels in Spanish
- Consider Colombian cultural context for agricultural terms
- Phone number validation should accommodate Colombian formats

### UI/UX Patterns
- **Color Scheme**: Primary green #2d5016, secondary colors in earth tones
- **Typography**: Segoe UI font stack for Spanish text readability
- **Icons**: Use agricultural/nature emojis (🌱, 🌾) sparingly but meaningfully
- **Forms**: Clear validation feedback, loading states, success animations
- **Mobile Priority**: Design mobile-first, enhance for desktop

### Code Patterns to Follow
- **CSS**: Use kebab-case for class names, BEM methodology preferred
- **JavaScript**: Use camelCase, descriptive Spanish variable names acceptable
- **HTML**: Semantic elements, proper accessibility attributes
- **File Organization**: Keep page-specific assets grouped logically

### Testing & Validation
- Test forms with various Colombian data formats (names, phones, emails)
- Validate responsive behavior at all breakpoints
- Test JavaScript functionality in different browsers
- Verify Spanish text displays correctly without encoding issues

### Future Development Considerations
- Current architecture supports easy migration to React/Vue frameworks
- CSS is organized for component-based development
- Form validation patterns can be extracted into reusable modules
- API integration points are clearly marked in JavaScript files

### Agricultural Domain Context
- Target users: Colombian farmers and urban consumers
- Forms collect farm names, indicating small-to-medium agricultural operations
- Consider seasonal aspects of Colombian agriculture
- Geographic focus likely on major Colombian cities and rural areas
- Payment methods should consider Colombian banking preferences
