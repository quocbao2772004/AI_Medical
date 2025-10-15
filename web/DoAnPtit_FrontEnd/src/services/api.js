/**
 * API Service - Centralized API calls
 */
import axios from 'axios';
import config from '../config';

// Create axios instance
const api = axios.create({
    baseURL: config.API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // NOTE: FastAPI now has redirect_slashes=False, so trailing slash doesn't matter
        // Just use URLs as-is without modifying them
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired - try refresh or logout
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ========== Auth API ==========
export const authAPI = {
    login: async (username, password) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        const response = await api.post('/auth/login', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    
    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },
    
    getCurrentUser: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },
    
    refreshToken: async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
        return response.data;
    },
    
    updateProfile: async (profileData) => {
        const response = await api.put('/auth/profile', profileData);
        return response.data;
    },
    
    changePassword: async (passwordData) => {
        const response = await api.post('/auth/change-password', passwordData);
        return response.data;
    },
    
    loginWithFace: async (faceData) => {
        const response = await api.post('/face/verify-login', faceData);
        return response.data;
    },
    
    // Register face images for current authenticated user
    // Backend uses current_user from token, no need to send user_id
    registerFace: async (faceImages) => {
        const response = await api.post('/face/register', {
            images: faceImages  // Backend expects 'images' field, not 'face_images'
        });
        return response.data;
    },
    
    // Get registered face images for current user
    getMyFaceImages: async () => {
        const response = await api.get('/face/my-images');
        return response.data;
    },
    
    // Delete a specific face image
    deleteFaceImage: async (filename) => {
        const response = await api.delete(`/face/images/${filename}`);
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    }
};

// ========== Patients API ==========
export const patientsAPI = {
    getAll: async (params = {}) => {
        const response = await api.get('/patients', { params });
        return response.data;
    },
    
    getById: async (id) => {
        const response = await api.get(`/patients/${id}`);
        return response.data;
    },
    
    create: async (patientData) => {
        const response = await api.post('/patients', patientData);
        return response.data;
    },
    
    update: async (id, patientData) => {
        const response = await api.put(`/patients/${id}`, patientData);
        return response.data;
    },
    
    delete: async (id) => {
        const response = await api.delete(`/patients/${id}`);
        return response.data;
    },
    
    search: async (query) => {
        const response = await api.get('/patients/search', { params: { q: query } });
        return response.data;
    }
};

// ========== Medical Records API ==========
export const medicalRecordsAPI = {
    getByPatient: async (patientId, params = {}) => {
        const response = await api.get(`/medical-records/patient/${patientId}`, { params });
        return response.data;
    },
    
    getById: async (id) => {
        const response = await api.get(`/medical-records/${id}`);
        return response.data;
    },
    
    create: async (recordData) => {
        const response = await api.post('/medical-records', recordData);
        return response.data;
    },
    
    update: async (id, recordData) => {
        const response = await api.put(`/medical-records/${id}`, recordData);
        return response.data;
    },
    
    delete: async (id) => {
        const response = await api.delete(`/medical-records/${id}`);
        return response.data;
    },
    
    getInferHistory: async (id) => {
        const response = await api.get(`/medical-records/${id}/infer-history`);
        return response.data;
    }
};

// ========== Inference API ==========
export const inferenceAPI = {
    startInference: async (medicalRecordId, xrayFile, options = {}) => {
        const formData = new FormData();
        formData.append('file', xrayFile);
        formData.append('medical_record_id', medicalRecordId);
        if (options.guidance_scale) {
            formData.append('guidance_scale', options.guidance_scale);
        }
        
        const response = await api.post('/inference/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    
    getStatus: async (inferenceId) => {
        const response = await api.get(`/inference/status/${inferenceId}`);
        return response.data;
    },
    
    getResult: async (inferenceId) => {
        const response = await api.get(`/inference/result/${inferenceId}`);
        return response.data;
    },
    
    cancelInference: async (inferenceId) => {
        const response = await api.delete(`/inference/${inferenceId}`);
        return response.data;
    }
};

// ========== Statistics API ==========
export const statisticsAPI = {
    getDashboard: async () => {
        const response = await api.get('/statistics/dashboard');
        return response.data;
    },
    
    getAll: async () => {
        const response = await api.get('/statistics');
        return response.data;
    }
};

// ========== Users API (Admin only) ==========
export const usersAPI = {
    getAll: async (params = {}) => {
        const response = await api.get('/users', { params });
        return response.data;
    },
    
    getById: async (id) => {
        const response = await api.get(`/users/${id}`);
        return response.data;
    },
    
    create: async (userData) => {
        const response = await api.post('/users', userData);
        return response.data;
    },
    
    update: async (id, userData) => {
        const response = await api.put(`/users/${id}`, userData);
        return response.data;
    },
    
    delete: async (id) => {
        const response = await api.delete(`/users/${id}`);
        return response.data;
    },
    
    toggleActive: async (id) => {
        const response = await api.patch(`/users/${id}/toggle-active`);
        return response.data;
    }
};

// ========== Profile API ==========
export const profileAPI = {
    // Get current user profile
    getProfile: async () => {
        const response = await api.get('/users/me');
        return response.data;
    },
    
    // Update current user profile
    updateProfile: async (profileData) => {
        const response = await api.put('/users/me', profileData);
        return response.data;
    },
    
    // Upload avatar
    uploadAvatar: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/users/me/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    
    // Delete avatar
    deleteAvatar: async () => {
        const response = await api.delete('/users/me/avatar');
        return response.data;
    },
    
    // Change password
    changePassword: async (currentPassword, newPassword) => {
        const response = await api.post('/users/me/change-password', {
            current_password: currentPassword,
            new_password: newPassword
        });
        return response.data;
    }
};

export default api;
