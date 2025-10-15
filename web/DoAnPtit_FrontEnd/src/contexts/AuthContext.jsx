/**
 * Auth Context - Global authentication state
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import socketService from '../services/socket';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initialize auth state from localStorage
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('access_token');
            const savedUser = localStorage.getItem('user');
            
            if (token && savedUser) {
                try {
                    const userData = JSON.parse(savedUser);
                    setUser(userData);
                    // Connect to socket
                    socketService.connect(userData.id);
                } catch (err) {
                    console.error('Failed to parse saved user:', err);
                    localStorage.removeItem('user');
                    localStorage.removeItem('access_token');
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    // Login
    const login = useCallback(async (username, password) => {
        setError(null);
        setLoading(true);
        
        try {
            const response = await authAPI.login(username, password);
            
            // Save tokens
            localStorage.setItem('access_token', response.access_token);
            if (response.refresh_token) {
                localStorage.setItem('refresh_token', response.refresh_token);
            }
            
            // Save user data
            const userData = {
                id: response.user.id,
                username: response.user.username,
                email: response.user.email,
                role: response.user.role,
                full_name: response.user.full_name,
                avatar: response.user.avatar,
                phone: response.user.phone,
                is_active: response.user.is_active ?? true,
                created_at: response.user.created_at,
                face_registered: response.user.face_registered ?? false,
            };
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            
            // Connect to socket
            socketService.connect(userData.id);
            
            return { success: true, user: userData };
        } catch (err) {
            const message = err.response?.data?.detail || 'Đăng nhập thất bại';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Register
    const register = useCallback(async (userData) => {
        setError(null);
        setLoading(true);
        
        try {
            const response = await authAPI.register(userData);
            return { success: true, data: response };
        } catch (err) {
            const message = err.response?.data?.detail || 'Đăng ký thất bại';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Logout
    const logout = useCallback(() => {
        authAPI.logout();
        setUser(null);
        socketService.disconnect();
    }, []);

    // Check if user has role
    const hasRole = useCallback((role) => {
        if (!user) return false;
        if (Array.isArray(role)) {
            return role.includes(user.role);
        }
        return user.role === role;
    }, [user]);

    // Check if user is admin
    const isAdmin = useCallback(() => {
        return user?.role === 'admin';
    }, [user]);

    // Check if user is doctor
    const isDoctor = useCallback(() => {
        return user?.role === 'doctor';
    }, [user]);

    // Update user data (for profile updates)
    const updateUser = useCallback((newData) => {
        setUser(prev => {
            const updated = { ...prev, ...newData };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    }, []);

    // Login with face recognition
    const loginWithFace = useCallback(async (faceData) => {
        setError(null);
        setLoading(true);
        
        try {
            const response = await authAPI.loginWithFace(faceData);
            
            if (response.success) {
                // Save tokens
                localStorage.setItem('access_token', response.access_token);
                if (response.refresh_token) {
                    localStorage.setItem('refresh_token', response.refresh_token);
                }
                
                // Save user data
                const userData = {
                    id: response.user.id,
                    username: response.user.username,
                    email: response.user.email,
                    role: response.user.role,
                    full_name: response.user.full_name,
                    avatar: response.user.avatar,
                    phone: response.user.phone,
                    is_active: response.user.is_active ?? true,
                    created_at: response.user.created_at,
                    face_registered: true, // If login with face succeeded, it's registered
                };
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
                
                // Connect to socket
                socketService.connect(userData.id);
                
                return { success: true, user: userData };
            } else {
                const message = response.message || 'Xác thực khuôn mặt thất bại';
                setError(message);
                return { success: false, error: message };
            }
        } catch (err) {
            const message = err.response?.data?.detail || 'Xác thực khuôn mặt thất bại';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    const value = {
        user,
        setUser,
        updateUser,
        loading,
        error,
        login,
        loginWithFace,
        register,
        logout,
        hasRole,
        isAdmin,
        isDoctor,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
