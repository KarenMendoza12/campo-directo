const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const { uploadMiddleware, handleUploadError, cleanupOnError, getFileUrl, deleteFile } = require('../middleware/upload');
const { logHelpers } = require('../config/logger');

/**
 * @swagger
 * /api/uploads/product/{productId}:
 *   post:
 *     summary: Upload product image
 *     description: Upload an image for a specific product
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               product_image:
 *                 type: string
 *                 format: binary
 *                 description: Imagen del producto (JPG, PNG, WEBP)
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Imagen subida exitosamente"
 *                 file:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                     url:
 *                       type: string
 *                     size:
 *                       type: integer
 *       400:
 *         description: Invalid file or upload error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/product/:productId', 
  authenticateToken,
  cleanupOnError,
  uploadMiddleware.productImage,
  handleUploadError,
  async (req, res) => {
    try {
      const { productId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se ha enviado ningún archivo',
          error: 'NO_FILE'
        });
      }

      // Log upload event
      logHelpers.business('file_upload', {
        userId: req.user.id,
        productId,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      res.json({
        success: true,
        message: 'Imagen subida exitosamente',
        file: {
          filename: req.file.filename,
          url: getFileUrl(req.file.filename, 'products'),
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });

    } catch (error) {
      logHelpers.error(error, { 
        context: 'product_image_upload',
        userId: req.user.id,
        productId: req.params.productId 
      });
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @swagger
 * /api/uploads/farm/{farmId}/documents:
 *   post:
 *     summary: Upload farm documents
 *     description: Upload certificates and images for a farm
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la finca
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               certificates:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Certificados (JPG, PNG, PDF)
 *               farm_images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Imágenes de la finca (JPG, PNG, WEBP)
 *     responses:
 *       200:
 *         description: Documents uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Documentos subidos exitosamente"
 *                 files:
 *                   type: object
 *                   properties:
 *                     certificates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           filename:
 *                             type: string
 *                           url:
 *                             type: string
 *                     farm_images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           filename:
 *                             type: string
 *                           url:
 *                             type: string
 */
router.post('/farm/:farmId/documents',
  authenticateToken,
  cleanupOnError,
  uploadMiddleware.farmDocuments,
  handleUploadError,
  async (req, res) => {
    try {
      const { farmId } = req.params;
      
      if (!req.files || ((!req.files.certificates || req.files.certificates.length === 0) && 
          (!req.files.farm_images || req.files.farm_images.length === 0))) {
        return res.status(400).json({
          success: false,
          message: 'No se han enviado archivos',
          error: 'NO_FILES'
        });
      }

      const uploadedFiles = {
        certificates: [],
        farm_images: []
      };

      // Process certificates
      if (req.files.certificates) {
        uploadedFiles.certificates = req.files.certificates.map(file => ({
          filename: file.filename,
          url: getFileUrl(file.filename, 'certificates'),
          size: file.size,
          mimetype: file.mimetype
        }));
      }

      // Process farm images
      if (req.files.farm_images) {
        uploadedFiles.farm_images = req.files.farm_images.map(file => ({
          filename: file.filename,
          url: getFileUrl(file.filename, 'products'),
          size: file.size,
          mimetype: file.mimetype
        }));
      }

      // Log upload event
      logHelpers.business('farm_documents_upload', {
        userId: req.user.id,
        farmId,
        certificateCount: uploadedFiles.certificates.length,
        imageCount: uploadedFiles.farm_images.length
      });

      res.json({
        success: true,
        message: 'Documentos subidos exitosamente',
        files: uploadedFiles
      });

    } catch (error) {
      logHelpers.error(error, { 
        context: 'farm_documents_upload',
        userId: req.user.id,
        farmId: req.params.farmId 
      });
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @swagger
 * /api/uploads/profile:
 *   post:
 *     summary: Upload profile image
 *     description: Upload a profile image for the authenticated user
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profile_image:
 *                 type: string
 *                 format: binary
 *                 description: Imagen de perfil (JPG, PNG)
 *     responses:
 *       200:
 *         description: Profile image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Imagen de perfil actualizada"
 *                 file:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                     url:
 *                       type: string
 */
router.post('/profile',
  authenticateToken,
  cleanupOnError,
  uploadMiddleware.profileImage,
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se ha enviado ningún archivo',
          error: 'NO_FILE'
        });
      }

      // Log upload event
      logHelpers.business('profile_image_upload', {
        userId: req.user.id,
        filename: req.file.filename,
        size: req.file.size
      });

      res.json({
        success: true,
        message: 'Imagen de perfil actualizada',
        file: {
          filename: req.file.filename,
          url: getFileUrl(req.file.filename, 'profiles'),
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });

    } catch (error) {
      logHelpers.error(error, { 
        context: 'profile_image_upload',
        userId: req.user.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @swagger
 * /api/uploads/delete:
 *   delete:
 *     summary: Delete uploaded file
 *     description: Delete a previously uploaded file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [filename, type]
 *             properties:
 *               filename:
 *                 type: string
 *                 description: Nombre del archivo a eliminar
 *                 example: "product-image-123456789.jpg"
 *               type:
 *                 type: string
 *                 enum: [products, certificates, profiles]
 *                 description: Tipo de archivo
 *                 example: "products"
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Archivo eliminado exitosamente"
 */
router.delete('/delete',
  authenticateToken,
  async (req, res) => {
    try {
      const { filename, type } = req.body;

      if (!filename || !type) {
        return res.status(400).json({
          success: false,
          message: 'Nombre de archivo y tipo son requeridos',
          error: 'MISSING_PARAMETERS'
        });
      }

      // Validate file type
      const allowedTypes = ['products', 'certificates', 'profiles'];
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de archivo no válido',
          error: 'INVALID_TYPE'
        });
      }

      // Construct file path
      const filePath = path.join(__dirname, '..', 'public', 'uploads', type, filename);

      // Delete file
      try {
        await deleteFile(filePath);
        
        logHelpers.business('file_delete', {
          userId: req.user.id,
          filename,
          type
        });

        res.json({
          success: true,
          message: 'Archivo eliminado exitosamente'
        });

      } catch (deleteError) {
        if (deleteError.code === 'ENOENT') {
          return res.status(404).json({
            success: false,
            message: 'Archivo no encontrado',
            error: 'FILE_NOT_FOUND'
          });
        }
        throw deleteError;
      }

    } catch (error) {
      logHelpers.error(error, { 
        context: 'file_delete',
        userId: req.user.id,
        filename: req.body.filename,
        type: req.body.type
      });
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }
);

module.exports = router;