const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
const productsDir = path.join(uploadsDir, 'products');
const certificatesDir = path.join(uploadsDir, 'certificates');
const profilesDir = path.join(uploadsDir, 'profiles');

[uploadsDir, productsDir, certificatesDir, profilesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    
    switch (file.fieldname) {
      case 'product_image':
        uploadPath = productsDir;
        break;
      case 'certificate':
        uploadPath = certificatesDir;
        break;
      case 'profile_image':
        uploadPath = profilesDir;
        break;
      default:
        uploadPath = uploadsDir;
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension).replace(/[^a-zA-Z0-9]/g, '-');
    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    'product_image': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    'certificate': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    'profile_image': ['image/jpeg', 'image/jpg', 'image/png']
  };

  const fieldAllowedTypes = allowedTypes[file.fieldname] || allowedTypes['product_image'];
  
  if (fieldAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido para ${file.fieldname}. Tipos permitidos: ${fieldAllowedTypes.join(', ')}`), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: fileFilter
});

// Middleware functions for different upload types
const uploadMiddleware = {
  // Single product image
  productImage: upload.single('product_image'),
  
  // Multiple product images
  productImages: upload.array('product_images', 5),
  
  // Certificate documents
  certificates: upload.array('certificates', 3),
  
  // Profile image
  profileImage: upload.single('profile_image'),
  
  // Mixed uploads (for farms with multiple document types)
  farmDocuments: upload.fields([
    { name: 'certificates', maxCount: 3 },
    { name: 'farm_images', maxCount: 5 }
  ])
};

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 5MB permitido.',
        error: 'FILE_TOO_LARGE'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Demasiados archivos. Máximo 5 archivos permitidos.',
        error: 'TOO_MANY_FILES'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Campo de archivo inesperado.',
        error: 'UNEXPECTED_FIELD'
      });
    }
  }
  
  if (error.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'INVALID_FILE_TYPE'
    });
  }
  
  // For other errors, pass to general error handler
  next(error);
};

// Helper function to get file URL
const getFileUrl = (filename, type = 'products') => {
  if (!filename) return null;
  return `/uploads/${type}/${filename}`;
};

// Helper function to delete uploaded file
const deleteFile = (filepath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filepath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Cleanup middleware to remove files on error
const cleanupOnError = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  const cleanup = async () => {
    if (res.statusCode >= 400 && req.files) {
      const filesToDelete = [];
      
      if (Array.isArray(req.files)) {
        filesToDelete.push(...req.files.map(file => file.path));
      } else if (typeof req.files === 'object') {
        Object.values(req.files).forEach(fileArray => {
          if (Array.isArray(fileArray)) {
            filesToDelete.push(...fileArray.map(file => file.path));
          }
        });
      }
      
      if (req.file) {
        filesToDelete.push(req.file.path);
      }
      
      // Delete files
      for (const filepath of filesToDelete) {
        try {
          await deleteFile(filepath);
        } catch (err) {
          console.error('Error deleting file:', filepath, err);
        }
      }
    }
  };

  res.send = function(data) {
    cleanup().finally(() => originalSend.call(this, data));
  };

  res.json = function(data) {
    cleanup().finally(() => originalJson.call(this, data));
  };

  next();
};

module.exports = {
  upload,
  uploadMiddleware,
  handleUploadError,
  cleanupOnError,
  getFileUrl,
  deleteFile
};