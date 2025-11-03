# QR Code Scanner & Generator

A modern, full-featured QR code scanner and generator application built with React, TypeScript, and Vite. Features seamless integration with Xano database for storing QR code data.

## Features

### Vendor Code QR Generator (NEW!)
- 📦 **Bulk generation** from vendor-supplied codes
- 📝 Single entry form for individual vendor codes
- 📊 CSV bulk import for multiple codes at once
- 🏷️ Track vendor name, product name, and description
- 📥 Download all generated QR codes
- 🔄 Batch save to Xano database
- 📋 Live preview table with QR thumbnails

### Vendor Code Lookup (NEW!)
- 🔍 Search by vendor code or vendor name
- 📱 Visual grid display of search results
- 🖼️ Modal view with detailed information
- 📥 Download individual QR codes
- 💾 View all metadata and timestamps

### QR Code Generator
- ✨ Generate QR codes from any text or URL
- 🎨 Customize colors (dark and light)
- 📏 Adjustable size and margin
- 💾 Download generated QR codes as PNG
- 🔄 Auto-save to Xano database (optional)

### QR Code Scanner
- 📷 Camera-based scanning with real-time detection
- 📁 Upload and scan QR codes from image files
- 🔦 Torch/flashlight support (if device supports)
- 🔍 Zoom controls for better scanning
- 💾 Auto-save scanned data to Xano (optional)

### General Features
- 🌐 Xano database integration for storing QR codes
- 📱 Responsive design - works on desktop and mobile
- 🎯 Clean, modern UI with smooth animations
- 🔒 Secure API configuration with environment variables
- ⚡ Built with Vite for fast development and optimized production builds

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **QR Code Libraries**:
  - `html5-qrcode` - For scanning QR codes
  - `qrcode` - For generating QR codes
- **HTTP Client**: Axios
- **Database**: Xano (Backend-as-a-Service)

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 16 or higher)
- npm or yarn
- A Xano account with an API endpoint set up

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd qr-reader
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Xano API**

   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Xano credentials:
   ```env
   VITE_XANO_BASE_URL=https://your-instance.xano.io/api:your-api-group
   VITE_XANO_API_KEY=your-api-key-if-required
   ```

## Xano Database Setup

To use the Xano integration, you need to set up a table in your Xano database:

### Table Structure

Create a table named `qr_codes` with the following fields:

| Field Name | Type | Description |
|------------|------|-------------|
| `id` | Integer | Auto-increment primary key |
| `qr_text` | Text | The text/data encoded in the QR code |
| `qr_image` | Text | Base64 encoded image data (optional) |
| `vendor_code` | Text | Vendor-supplied code (optional) |
| `vendor_name` | Text | Name of the vendor (optional) |
| `product_name` | Text | Product name (optional) |
| `created_at` | Timestamp | Auto-generated timestamp |
| `metadata` | JSON | Additional metadata (optional) |

### API Endpoints

Create the following endpoints in Xano:

#### Basic CRUD Operations
1. **POST** `/qr_codes` - Create a new QR code record
2. **GET** `/qr_codes` - Get all QR codes
3. **GET** `/qr_codes/{id}` - Get a specific QR code by ID
4. **PATCH** `/qr_codes/{id}` - Update a QR code
5. **DELETE** `/qr_codes/{id}` - Delete a QR code

#### Vendor Code Operations (for new features)
6. **GET** `/qr_codes/search?vendor_code={code}` - Search by vendor code
7. **GET** `/qr_codes/vendor/{vendor_name}` - Get all QR codes for a vendor
8. **POST** `/qr_codes/batch` - Batch create multiple QR codes (accepts array of QR code objects)

> **Note**: Update the endpoint names in `src/services/xanoApi.ts` if you use different names. You may need to create custom functions in Xano for the search and batch endpoints.

## Usage

### Development Mode

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Application Guide

### Generating QR Codes

1. Click on the "Generate QR Code" tab
2. Enter the text or URL you want to encode
3. (Optional) Customize the appearance:
   - Adjust size (100-1000px)
   - Change margin (0-10)
   - Select custom colors
4. Click "Generate QR Code"
5. Download the QR code or save it to Xano

### Scanning QR Codes

1. Click on the "Scan QR Code" tab
2. Choose scanning method:
   - **Camera**: Uses your device's camera for real-time scanning
   - **Upload File**: Upload an image containing a QR code
3. For camera mode:
   - Click "Start Camera Scanner"
   - Grant camera permissions when prompted
   - Point camera at QR code
   - The result will be displayed automatically
4. For file upload:
   - Click "Choose File" and select an image
   - The QR code will be decoded automatically

### Using Vendor Code Generator

**Single Entry Mode:**
1. Click on the "Vendor Codes" tab
2. Fill in the form:
   - **Vendor Code** (required): The unique code from your vendor
   - **Vendor Name** (required): Name of the vendor
   - **Product Name** (optional): Product associated with the code
   - **Description** (optional): Additional details
3. Click "Add to List"
4. Repeat for additional codes

**Bulk Import Mode:**
1. Click on the "Vendor Codes" tab
2. Scroll to "Bulk Import Vendor Codes"
3. Enter vendor codes in CSV format, one per line:
   ```
   VEN-001,ACME Corp,Widget A,Premium widget
   VEN-002,XYZ Inc,Gadget B,Standard gadget
   VEN-003,ABC Ltd,Tool C
   ```
4. Click "Import from CSV"

**Generating QR Codes:**
1. After adding vendor codes to the list, click "Generate All QR Codes"
2. QR codes will appear as thumbnails in the table
3. Options:
   - **Download All**: Save all QR codes as PNG files
   - **Save All to Xano**: Batch save to database
   - **Clear All**: Remove all codes from the list

### Looking Up Vendor Codes

1. Click on the "Lookup" tab
2. Choose search type:
   - **Search by Vendor Code**: Find a specific code
   - **Search by Vendor Name**: Find all codes for a vendor
3. Enter your search term and click "Search"
4. View results in a card grid format
5. Click "View Details" to see full information in a modal
6. Download individual QR codes as needed

### Auto-Save Feature

Toggle the "Auto-save to Xano" option to automatically save:
- Generated QR codes to your Xano database
- Scanned QR codes to your Xano database

When disabled, you can manually save using the "Save to Xano" button.

## Project Structure

```
qr-reader/
├── src/
│   ├── components/
│   │   ├── QRScanner.tsx           # QR code scanning component
│   │   ├── QRGenerator.tsx         # QR code generation component
│   │   ├── VendorCodeGenerator.tsx # Vendor code batch generator (NEW!)
│   │   └── VendorCodeLookup.tsx    # Vendor code lookup/search (NEW!)
│   ├── services/
│   │   └── xanoApi.ts              # Xano API integration
│   ├── types/
│   │   └── qr.types.ts             # TypeScript type definitions
│   ├── App.tsx                # Main application component
│   ├── App.css                # Application styles
│   ├── main.tsx               # Application entry point
│   └── vite-env.d.ts          # Vite type definitions
├── public/                     # Static assets
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── index.html                 # HTML entry point
├── package.json               # Project dependencies
├── tsconfig.json              # TypeScript configuration
└── vite.config.ts             # Vite configuration
```

## API Service

The `xanoApi` service (`src/services/xanoApi.ts`) provides the following methods:

- `saveQRCode(qrData)` - Save a new QR code
- `getAllQRCodes()` - Retrieve all QR codes
- `getQRCodeById(id)` - Get a specific QR code
- `updateQRCode(id, qrData)` - Update an existing QR code
- `deleteQRCode(id)` - Delete a QR code

## Customization

### Updating Xano Endpoints

If your Xano endpoints have different names, update them in `src/services/xanoApi.ts`:

```typescript
// Example: Change '/qr_codes' to '/my_qr_table'
const response = await this.api.post('/my_qr_table', qrData);
```

### Styling

Modify `src/App.css` to customize the appearance of the application.

### QR Code Options

Adjust default QR code generation options in `src/components/QRGenerator.tsx`:

```typescript
const [options, setOptions] = useState<GenerateOptions>({
  width: 300,        // Change default size
  margin: 2,         // Change default margin
  color: {
    dark: '#000000', // Change default dark color
    light: '#FFFFFF' // Change default light color
  }
});
```

## Camera Permissions

The QR scanner requires camera access. Ensure:
- Your browser supports camera access (modern browsers)
- The site is served over HTTPS (required for camera access in production)
- Users grant camera permissions when prompted

## Troubleshooting

### Camera not working
- Ensure you're using HTTPS (required for camera access)
- Check browser permissions
- Try a different browser
- On mobile, ensure the app has camera permissions

### Xano API errors
- Verify your `.env` file has correct credentials
- Check Xano endpoint names match your configuration
- Ensure your Xano API allows CORS from your domain
- Check browser console for detailed error messages

### Build errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Ensure you're using Node.js 16 or higher

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 11+)
- Opera: ✅ Full support

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

## Acknowledgments

- [html5-qrcode](https://github.com/mebjas/html5-qrcode) - QR code scanning library
- [node-qrcode](https://github.com/soldair/node-qrcode) - QR code generation library
- [Xano](https://www.xano.com/) - Backend-as-a-Service platform
