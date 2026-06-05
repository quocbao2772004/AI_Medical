/**
 * Socket.IO Service - Real-time notifications
 */
import { io } from 'socket.io-client';
import config from '../config';

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
        this.isConnecting = false;
    }

    // Connect to Socket.IO server
    connect(userId) {
        // Check if Socket.IO is enabled
        if (!config.ENABLE_SOCKET) {
            config.debug('Socket.IO is disabled');
            return;
        }
        
        // Prevent duplicate connections
        if (this.socket?.connected) {
            console.log('🔌 Socket already connected, skipping...');
            return;
        }
        
        // Prevent multiple connect attempts at the same time
        if (this.isConnecting) {
            console.log('🔌 Socket connection in progress, skipping...');
            return;
        }
        
        // If socket exists but not connected, disconnect first
        if (this.socket) {
            console.log('🔌 Cleaning up existing socket...');
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isConnecting = true;

        const token = localStorage.getItem('access_token');
        
        this.socket = io(config.SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],  // Only WebSocket, no polling (for Kong compatibility)
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            this.isConnecting = false;
            console.log('🔌 Socket.IO connected, socket id:', this.socket?.id);
            // User room is automatically joined by BE based on token
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 Socket.IO disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            this.isConnecting = false;
            console.log('❌ Socket.IO connection error:', error.message);
        });

        // Setup default listeners
        this.setupDefaultListeners();
    }

    // Disconnect from server
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Setup default event listeners
    setupDefaultListeners() {
        // Inference status updates
        this.socket.on('inference_status', (data) => {
            console.log('📊 Inference status:', data);
            this.notifyListeners('inference_status', data);
        });

        // Inference completed
        this.socket.on('inference_completed', (data) => {
            console.log('✅ Inference completed:', data);
            this.notifyListeners('inference_completed', data);
        });

        // Inference failed
        this.socket.on('inference_failed', (data) => {
            console.log('❌ Inference failed:', data);
            this.notifyListeners('inference_failed', data);
        });

        // General notifications
        this.socket.on('notification', (data) => {
            console.log('🔔 Notification:', data);
            this.notifyListeners('notification', data);
        });
        
        // Fallback for any inference_update events
        this.socket.on('inference_update', (data) => {
            console.log('📡 Inference update:', data);
            // Map to appropriate event based on status
            if (data.status === 'completed') {
                this.notifyListeners('inference_completed', data);
            } else if (data.status === 'failed') {
                this.notifyListeners('inference_failed', data);
            } else {
                this.notifyListeners('inference_status', data);
            }
        });
    }

    // Add event listener
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // Return cleanup function
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }

    // Remove event listener
    off(event, callback) {
        this.listeners.get(event)?.delete(callback);
    }

    // Notify all listeners for an event
    notifyListeners(event, data) {
        this.listeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                config.debug('Socket listener error:', error);
            }
        });
    }

    // Emit event to server
    emit(event, data) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        } else {
            config.debug('Socket not connected, cannot emit:', event);
        }
    }

    // Check if connected
    isConnected() {
        return this.socket?.connected || false;
    }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;
