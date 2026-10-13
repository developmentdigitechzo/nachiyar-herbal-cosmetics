/**
 * Nachiyar Herbals & Cosmetics
 * Unified Storage Service
 *
 * Implements environment-aware file storage:
 * - Local Development: saves to local ./uploads directory
 * - Production: saves to cPanel storage path (e.g. /home/user/public_html/uploads)
 *
 * Provides safe file operations, directory traversal prevention,
 * and unified public URL generation.
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/environment');

class StorageService {
  constructor() {
    this.storageType = config.storage.type;
    this.storageDir = config.storage.resolvedUploadDir;
    this.baseUrl = config.storage.baseUrl;
    this.init();
  }

  /**
   * Ensure target storage directory exists with proper read/write permissions
   */
  init() {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true, mode: 0o755 });
        console.log(`📁 [StorageService] Initialized storage directory (${this.storageType}): ${this.storageDir}`);
      }
    } catch (err) {
      console.error(`❌ [StorageService] Failed to initialize storage directory ${this.storageDir}:`, err.message);
      // Fallback to local uploads directory if cPanel path cannot be created on non-cPanel filesystem
      if (this.storageType === 'cpanel' && !fs.existsSync(this.storageDir)) {
        const fallbackDir = path.join(config.projectRoot, 'uploads');
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true, mode: 0o755 });
        }
        console.warn(`⚠️ [StorageService] Falling back to local upload directory: ${fallbackDir}`);
        this.storageDir = fallbackDir;
      }
    }
  }

  /**
   * Get active storage directory path
   */
  getStorageDirectory() {
    return this.storageDir;
  }

  /**
   * Get current storage type ('local' or 'cpanel')
   */
  getStorageType() {
    return this.storageType;
  }

  /**
   * Save a base64 encoded image payload
   * @param {string} base64Data - Data URL or raw base64 string
   * @param {string} [originalName] - Original file name for extension hint
   * @returns {Promise<{ success: boolean, url: string, filename: string, storageType: string, size: number }>}
   */
  async saveBase64Image(base64Data, originalName = '') {
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error('Image data is required and must be a valid base64 string.');
    }

    // Extract mime type and base64 payload
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let ext = 'jpg';
    let buffer;

    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('gif')) ext = 'gif';
      else if (mime.includes('svg')) ext = 'svg';
      else ext = 'jpg';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      if (originalName && originalName.includes('.')) {
        const parsedExt = path.extname(originalName).replace('.', '').toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(parsedExt)) {
          ext = parsedExt === 'jpeg' ? 'jpg' : parsedExt;
        }
      }
      buffer = Buffer.from(base64Data, 'base64');
    }

    if (!buffer || buffer.length === 0) {
      throw new Error('Decoded image buffer is empty.');
    }

    // Max 15MB limit
    if (buffer.length > 15 * 1024 * 1024) {
      throw new Error('Image size exceeds maximum allowed limit (15MB).');
    }

    // Generate collision-resistant filename
    const safeName = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
    const destinationPath = path.join(this.storageDir, safeName);

    // Write file to disk
    fs.writeFileSync(destinationPath, buffer);

    // Construct public URL
    // e.g. "uploads/prod_123.jpg" or "/uploads/prod_123.jpg"
    const publicUrl = this.baseUrl.startsWith('http')
      ? `${this.baseUrl}/${safeName}`
      : `${this.baseUrl.replace(/^\/+/, '')}/${safeName}`;

    return {
      success: true,
      url: publicUrl,
      filename: safeName,
      storageType: this.storageType,
      size: buffer.length,
      storagePath: destinationPath
    };
  }

  /**
   * Save a raw buffer to storage
   * @param {Buffer} buffer - File buffer
   * @param {string} originalName - Original filename
   * @returns {Promise<{ success: boolean, url: string, filename: string, storageType: string, size: number }>}
   */
  async saveBuffer(buffer, originalName = 'upload.jpg') {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Invalid buffer provided.');
    }

    const ext = path.extname(originalName).replace('.', '').toLowerCase() || 'jpg';
    const safeName = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
    const destinationPath = path.join(this.storageDir, safeName);

    fs.writeFileSync(destinationPath, buffer);

    const publicUrl = this.baseUrl.startsWith('http')
      ? `${this.baseUrl}/${safeName}`
      : `${this.baseUrl.replace(/^\/+/, '')}/${safeName}`;

    return {
      success: true,
      url: publicUrl,
      filename: safeName,
      storageType: this.storageType,
      size: buffer.length,
      storagePath: destinationPath
    };
  }

  /**
   * Safely locate a file within the storage directory, guarding against path traversal
   * @param {string} filename - Filename to locate
   * @returns {string|null} - Absolute path if found, null otherwise
   */
  getFilePath(filename) {
    if (!filename || typeof filename !== 'string') return null;

    // Sanitize filename to prevent directory traversal
    const safeBaseName = path.basename(filename);
    const resolvedPath = path.join(this.storageDir, safeBaseName);

    // Verify it stays inside storage directory
    if (!resolvedPath.startsWith(this.storageDir)) {
      return null;
    }

    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }

    return null;
  }

  /**
   * Delete a file from storage
   * @param {string} filename
   * @returns {boolean}
   */
  deleteFile(filename) {
    const filePath = this.getFilePath(filename);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch (e) {
        console.error(`Failed to delete file ${filename}:`, e.message);
        return false;
      }
    }
    return false;
  }
}

// Export singleton instance
module.exports = new StorageService();
