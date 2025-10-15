/**
 * Application Configuration
 * All environment variables are centralized here
 * 
 * QUAN TRỌNG - 2 LOẠI URL:
 * 1. INTERNAL URL: FE gọi BE qua localhost (tốc độ cao, không qua Kong)
 *    - Dùng cho tất cả API calls
 * 2. PUBLIC URL: URL public qua Kong (để hiển thị ảnh)
 *    - Dùng cho static files (ảnh, video, etc.)
 * 
 * Usage:
 *   import config from './config';
 *   console.log(config.API_URL);         // Internal API calls
 *   console.log(config.getFileUrl(path)); // Public URL for images
 */

const config = {
    // ===========================================
    // INTERNAL URLs (FE gọi BE trực tiếp - tốc độ cao)
    // ===========================================
    
    // Internal API URL - dùng cho tất cả API calls
    // Backend dùng root_path=/api/v1/medical nên tất cả routes có prefix này
    API_URL: process.env.REACT_APP_INTERNAL_API_URL || 'http://localhost:8999/api/v1/medical',
    
    // Internal Socket URL - Socket.IO cần URL gốc (KHÔNG có prefix)
    SOCKET_URL: process.env.REACT_APP_INTERNAL_SOCKET_URL || 'http://localhost:8999',
    
    // ===========================================
    // PUBLIC URLs (để hiển thị ảnh, static files)
    // ===========================================
    
    // Public Backend URL - dùng để hiển thị ảnh, static files
    // Với root_path, static files cũng có prefix /api/v1/medical
    PUBLIC_URL: process.env.REACT_APP_PUBLIC_BACKEND_URL || 'http://localhost:8999/api/v1/medical',
    
    // ===========================================
    // App Configuration
    // ===========================================
    
    // App Name
    APP_NAME: process.env.REACT_APP_NAME || 'Medical Imaging System',
    
    // App Version
    APP_VERSION: process.env.REACT_APP_VERSION || '1.0.0',
    
    // ===========================================
    // Feature Flags
    // ===========================================
    
    // Debug mode
    DEBUG: process.env.REACT_APP_DEBUG === 'true',
    
    // Enable Socket.IO
    ENABLE_SOCKET: process.env.REACT_APP_ENABLE_SOCKET !== 'false',
    
    // ===========================================
    // File Upload Configuration
    // ===========================================
    
    // Maximum file size (in bytes)
    MAX_UPLOAD_SIZE: (parseInt(process.env.REACT_APP_MAX_UPLOAD_SIZE_MB) || 50) * 1024 * 1024,
    
    // Maximum file size (in MB) - for display
    MAX_UPLOAD_SIZE_MB: parseInt(process.env.REACT_APP_MAX_UPLOAD_SIZE_MB) || 50,
    
    // Allowed file types
    ALLOWED_FILE_TYPES: (process.env.REACT_APP_ALLOWED_FILE_TYPES || '.png,.jpg,.jpeg,.npy').split(','),
    
    // ===========================================
    // UI Configuration
    // ===========================================
    
    // Default language
    DEFAULT_LANGUAGE: process.env.REACT_APP_DEFAULT_LANGUAGE || 'vi',
    
    // Default page size
    DEFAULT_PAGE_SIZE: parseInt(process.env.REACT_APP_DEFAULT_PAGE_SIZE) || 10,
    
    // ===========================================
    // Helper Methods
    // ===========================================
    
    /**
     * Check if running in development mode
     */
    isDevelopment: () => {
        return process.env.NODE_ENV === 'development';
    },
    
    /**
     * Check if running in production mode
     */
    isProduction: () => {
        return process.env.NODE_ENV === 'production';
    },
    
    /**
     * Get full Internal API endpoint URL (cho API calls)
     * @param {string} path - API path (e.g., '/auth/login')
     * @returns {string} Full internal URL
     */
    getApiUrl: (path) => {
        const baseUrl = config.API_URL.replace(/\/$/, '');
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    },
    
    /**
     * Get Public URL for static files (ảnh, video, etc.)
     * Dùng PUBLIC_URL để hiển thị qua Kong
     * 
     * @param {string} relativePath - Relative path stored in DB (e.g., 'patient_files/123/456/xray.png')
     * @returns {string} Full public URL for displaying
     */
    getFileUrl: (relativePath) => {
        if (!relativePath) return null;
        
        // Nếu đã là full URL, extract path và rebuild với PUBLIC_URL
        if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
            // Extract relative path from full URL (e.g., http://localhost:8999/avatars/... → avatars/...)
            const match = relativePath.match(/(?:patient_files|uploads|avatars|static|face_images)\/.*/);
            if (match) {
                relativePath = match[0];
            } else {
                // Không match được pattern, trả về nguyên
                return relativePath;
            }
        }
        
        // Handle legacy absolute paths
        if (relativePath.startsWith('/home/') || relativePath.startsWith('C:')) {
            const match = relativePath.match(/(?:patient_files|uploads|avatars|static|face_images)\/.*/);
            if (match) {
                relativePath = match[0];
            }
        }
        
        const publicUrl = config.PUBLIC_URL.replace(/\/$/, '');
        const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
        return `${publicUrl}/${cleanPath}`;
    },
    
    /**
     * Alias cho getFileUrl - để tương thích ngược
     * @deprecated Sử dụng getFileUrl thay thế
     */
    getStaticUrl: (relativePath) => {
        return config.getFileUrl(relativePath);
    },
    
    /**
     * Get Public Static URL - chính xác cho static files
     * Alias cho getFileUrl
     */
    getPublicStaticUrl: (relativePath) => {
        return config.getFileUrl(relativePath);
    },
    
    /**
     * Get avatar URL
     * @param {string} avatarPath - Avatar path from DB
     * @returns {string} Full public URL
     */
    getAvatarUrl: (avatarPath) => {
        if (!avatarPath) return null;
        return config.getFileUrl(avatarPath);
    },
    
    /**
     * Log debug message (only in debug mode)
     * @param  {...any} args - Arguments to log
     */
    debug: (...args) => {
        if (config.DEBUG) {
            console.log('[DEBUG]', ...args);
        }
    },
};

// Freeze config to prevent modifications
Object.freeze(config);

export default config;
