# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Campo Directo is a web platform designed to connect agricultural producers directly with consumers, eliminating intermediaries and providing fresh, high-quality products at fair prices. The project is currently in early development phase.

**Key Features:**
- Direct connection between farmers and consumers
- Real-time product availability
- Quality assurance and traceability  
- Secure payment processing
- Delivery coordination

**Technology Stack:**
- Node.js web application
- Spanish language interface (primary language: es)
- Standard web technologies (HTML, CSS, JavaScript)

## Development Commands

**Note:** The development environment is not yet fully configured. Current package.json scripts are placeholders that need to be implemented.

### Basic Commands (Placeholders - Need Implementation)
```powershell
# Install dependencies (when configured)
npm install

# Start development server (not yet configured)
npm run dev

# Build for production (not yet configured)  
npm run build

# Run tests (not yet configured)
npm test

# Start production server (not yet configured)
npm start
```

### File Management
```powershell
# View project structure
Get-ChildItem -Recurse | Format-Table Name, FullName -AutoSize

# Check file contents
Get-Content filename
```

## Architecture & Structure

### Current Directory Structure
```
campo-directo/
├── src/           # Source code (empty - to be developed)
├── public/        # Static assets and HTML files
│   └── index.html # Basic landing page in Spanish
├── assets/        # Images, fonts, etc. (empty - to be developed)  
├── docs/          # Documentation (empty - to be developed)
├── tests/         # Test files (empty - to be developed)
├── package.json   # Node.js configuration with placeholder scripts
├── .gitignore     # Git ignore rules for Node.js projects
└── README.md      # Project documentation
```

### Application Entry Point
- Main entry defined as `src/index.js` in package.json (file does not exist yet)
- Current landing page: `public/index.html` (basic Spanish interface)

### Development Status
This is an early-stage project with:
- ✅ Basic project structure defined
- ✅ Package.json with project metadata  
- ✅ Simple HTML landing page in Spanish
- ❌ No dependencies or development tools configured
- ❌ No actual source code in src/ directory
- ❌ No build system or testing framework setup
- ❌ No development server configured

## Development Guidance

### Language Considerations
- Primary language is Spanish (es)
- User interface and content should be in Spanish
- Variable names and comments can be in English or Spanish
- Consider Spanish-speaking users for UX/UI decisions

### Next Development Steps
When setting up development tooling, consider:

1. **Frontend Framework**: Choose between vanilla JavaScript, React, Vue.js, or other frameworks
2. **Backend**: Node.js with Express.js or other web framework
3. **Database**: Consider options for storing producer/consumer data, products, orders
4. **Authentication**: User system for farmers and consumers
5. **Payment Integration**: Secure payment processing system
6. **Testing Framework**: Jest, Mocha, or other testing tools
7. **Build Tools**: Webpack, Vite, or other bundlers
8. **Development Server**: Hot reload capability for efficient development

### Agricultural Domain Context
When working on features, consider:
- Seasonal nature of agricultural products
- Perishability and freshness tracking
- Geographic location relevance for delivery
- Quality certifications and standards
- Inventory management for producers
- Order fulfillment logistics