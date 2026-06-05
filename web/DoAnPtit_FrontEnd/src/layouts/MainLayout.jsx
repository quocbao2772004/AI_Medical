/**
 * Main Layout Component - Premium Healthcare UI
 * Sidebar navigation + Header + Main content
 * Design: Glassmorphism + Smooth Animations
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Avatar,
    Menu,
    MenuItem,
    Divider,
    Badge,
    useTheme,
    useMediaQuery,
    Tooltip,
    alpha,
    Chip,
    Fade,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard,
    People,
    Biotech,
    Settings,
    Logout,
    Person,
    Notifications,
    LocalHospital,
    AdminPanelSettings,
    Search,
    KeyboardArrowDown,
    Circle,
    School,
    CheckCircle,
    Error,
    OpenInNew,
    AccessTime,
    DoneAll,
    NotificationsActive,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';
import SearchDialog from '../components/SearchDialog';
import socketService from '../services/socket';
import toast from 'react-hot-toast';

const DRAWER_WIDTH = 280;

// Build avatar URL using PUBLIC_URL for static files
const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    return config.getPublicStaticUrl(avatarPath);
};

// Navigation items
const getNavItems = (isAdmin) => [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard', color: '#0891B2' },
    { text: 'Bệnh nhân', icon: <People />, path: '/patients', color: '#10B981' },
    { text: 'Xem CT Viewer', icon: <Biotech />, path: '/viewer', color: '#F59E0B' },
    { text: 'Training Pipeline', icon: <School />, path: '/training-pipeline', color: '#8B5CF6' },
    ...(isAdmin ? [
        { divider: true },
        { text: 'Quản lý Users', icon: <AdminPanelSettings />, path: '/admin/users', color: '#EF4444' },
        { text: 'Cài đặt', icon: <Settings />, path: '/settings', color: '#64748B' },
    ] : []),
];

const MainLayout = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, isAdmin } = useAuth();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [notificationAnchor, setNotificationAnchor] = useState(null);
    const [searchOpen, setSearchOpen] = useState(false);
    
    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Socket.IO notification listeners (socket connection is managed by AuthContext)
    useEffect(() => {
        if (user?.id) {
            // Socket is already connected by AuthContext, just setup listeners
            
            // Global notification listeners
            const unsubComplete = socketService.on('inference_completed', (data) => {
                console.log('🔔 Global notification: inference_completed', data);
                toast.success(data.message || 'Tái tạo CT hoàn thành!', {
                    duration: 5000,
                    icon: '✅',
                });
                
                // Add to notifications list (use unique ID to prevent duplicates)
                const notificationId = `${data.inference_id}-${Date.now()}`;
                const newNotification = {
                    id: notificationId,
                    inference_id: data.inference_id,
                    type: 'success',
                    title: 'Tái tạo CT hoàn thành',
                    message: 'Nhấn để xem kết quả chi tiết',
                    timestamp: data.timestamp || new Date().toISOString(),
                    read: false,
                    data: data,
                };
                // Prevent duplicate notifications for same inference_id
                setNotifications(prev => {
                    const exists = prev.some(n => n.inference_id === data.inference_id);
                    if (exists) return prev;
                    return [newNotification, ...prev].slice(0, 20);
                });
                setUnreadCount(prev => prev + 1);
            });
            
            const unsubFailed = socketService.on('inference_failed', (data) => {
                console.log('🔔 Global notification: inference_failed', data);
                toast.error(data.message || 'Tái tạo CT thất bại', {
                    duration: 5000,
                    icon: '❌',
                });
                
                const notificationId = `${data.inference_id}-${Date.now()}`;
                const newNotification = {
                    id: notificationId,
                    inference_id: data.inference_id,
                    type: 'error',
                    title: 'Tái tạo CT thất bại',
                    message: data.error || 'Nhấn để xem chi tiết lỗi',
                    timestamp: data.timestamp || new Date().toISOString(),
                    read: false,
                    data: data,
                };
                // Prevent duplicate notifications for same inference_id
                setNotifications(prev => {
                    const exists = prev.some(n => n.inference_id === data.inference_id);
                    if (exists) return prev;
                    return [newNotification, ...prev].slice(0, 20);
                });
                setUnreadCount(prev => prev + 1);
            });
            
            const unsubStatus = socketService.on('inference_status', (data) => {
                console.log('🔔 Global notification: inference_status', data);
                if (data.status === 'processing') {
                    toast.loading('Đang xử lý tái tạo CT...', {
                        id: `inference-${data.inference_id}`,
                        duration: 3000,
                    });
                }
            });
            
            return () => {
                // Cleanup listeners only, socket is managed by AuthContext
                unsubComplete();
                unsubFailed();
                unsubStatus();
            };
        }
    }, [user?.id]);

    // Format time ago helper - timestamp from backend is UTC
    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        // Backend sends UTC timestamp, ensure we parse it correctly
        // If timestamp doesn't end with 'Z', add it to indicate UTC
        const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
        const time = new Date(utcTimestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return time.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    };

    // Mark all notifications as read
    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    // Handle notification click
    const handleNotificationClick = (notification) => {
        // Mark as read
        setNotifications(prev => prev.map(n => 
            n.id === notification.id ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - (notification.read ? 0 : 1)));
        
        // Navigate to medical record with inference_id to scroll to specific history item
        if (notification.data?.medical_record_id) {
            const url = `/medical-records/${notification.data.medical_record_id}?inference_id=${notification.data.inference_id || notification.inference_id}`;
            navigate(url);
            setNotificationAnchor(null);
        }
    };

    // Keyboard shortcut for search (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleNavClick = (path) => {
        navigate(path);
        if (isMobile) {
            setMobileOpen(false);
        }
    };

    const handleLogout = () => {
        setAnchorEl(null);
        logout();
        navigate('/login');
    };

    const navItems = getNavItems(isAdmin());

    // Drawer content
    const drawer = (
        <Box 
            sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                background: 'linear-gradient(180deg, #ffffff 0%, #F8FAFC 100%)',
            }}
        >
            {/* Logo */}
            <Box
                sx={{
                    p: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                }}
            >
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(8, 145, 178, 0.3)',
                    }}
                >
                    <LocalHospital sx={{ fontSize: 28, color: 'white' }} />
                </Box>
                <Box>
                    <Typography variant="h6" fontWeight="bold" noWrap sx={{ color: '#0E7490' }}>
                        Medical Imaging
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1 }}>
                        X-RAY TO CT 3D
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ mx: 2, mb: 2 }} />

            {/* Navigation */}
            <List sx={{ flex: 1, px: 2 }}>
                {navItems.map((item, index) => (
                    item.divider ? (
                        <Divider key={index} sx={{ my: 2 }} />
                    ) : (
                        <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                onClick={() => handleNavClick(item.path)}
                                selected={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
                                sx={{
                                    borderRadius: 3,
                                    py: 1.5,
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        bgcolor: alpha(item.color, 0.08),
                                        transform: 'translateX(4px)',
                                    },
                                    '&.Mui-selected': {
                                        bgcolor: alpha(item.color, 0.12),
                                        borderLeft: `3px solid ${item.color}`,
                                        '&:hover': {
                                            bgcolor: alpha(item.color, 0.16),
                                        },
                                        '& .MuiListItemIcon-root': {
                                            color: item.color,
                                        },
                                        '& .MuiListItemText-primary': {
                                            color: item.color,
                                            fontWeight: 600,
                                        },
                                    },
                                }}
                            >
                                <ListItemIcon 
                                    sx={{ 
                                        minWidth: 44,
                                        color: location.pathname === item.path ? item.color : '#64748B',
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText 
                                    primary={item.text} 
                                    primaryTypographyProps={{
                                        fontWeight: location.pathname === item.path ? 600 : 500,
                                        fontSize: '0.95rem',
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    )
                ))}
            </List>

            {/* User info */}
            <Box sx={{ p: 2 }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 2,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
                        border: '1px solid rgba(8, 145, 178, 0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(8, 145, 178, 0.15)',
                        },
                    }}
                    onClick={() => navigate('/profile')}
                >
                    <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                            <Circle sx={{ fontSize: 12, color: '#10B981', stroke: '#fff', strokeWidth: 2 }} />
                        }
                    >
                        <Avatar 
                            src={getAvatarUrl(user?.avatar)}
                            sx={{ 
                                bgcolor: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                                width: 44,
                                height: 44,
                                boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)',
                            }}
                        >
                            {user?.full_name?.[0] || user?.username?.[0] || 'U'}
                        </Avatar>
                    </Badge>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight="bold" noWrap>
                            {user?.full_name || user?.username}
                        </Typography>
                        <Chip
                            size="small"
                            label={user?.role === 'admin' ? 'Admin' : 'Bác sĩ'}
                            sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                bgcolor: user?.role === 'admin' ? alpha('#EF4444', 0.1) : alpha('#0891B2', 0.1),
                                color: user?.role === 'admin' ? '#EF4444' : '#0891B2',
                            }}
                        />
                    </Box>
                </Box>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* App Bar */}
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    ml: { md: `${DRAWER_WIDTH}px` },
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Toolbar sx={{ gap: 1 }}>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ 
                            mr: 2, 
                            display: { md: 'none' },
                            color: '#1E293B',
                        }}
                    >
                        <MenuIcon />
                    </IconButton>

                    {/* Search Box - Desktop */}
                    <Box
                        onClick={() => setSearchOpen(true)}
                        sx={{
                            display: { xs: 'none', sm: 'flex' },
                            alignItems: 'center',
                            bgcolor: alpha('#0891B2', 0.06),
                            borderRadius: 3,
                            px: 2,
                            py: 1,
                            flex: 1,
                            maxWidth: 400,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: '1px solid transparent',
                            '&:hover': {
                                bgcolor: alpha('#0891B2', 0.1),
                                border: `1px solid ${alpha('#0891B2', 0.2)}`,
                                boxShadow: `0 0 0 3px ${alpha('#0891B2', 0.08)}`,
                            },
                        }}
                    >
                        <Search sx={{ color: '#0891B2', fontSize: 20, mr: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                            Tìm kiếm bệnh nhân...
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Chip 
                            label="⌘K" 
                            size="small" 
                            sx={{ 
                                height: 22, 
                                fontSize: '0.7rem',
                                bgcolor: 'white',
                                border: '1px solid #E2E8F0',
                                fontWeight: 600,
                            }} 
                        />
                    </Box>

                    {/* Mobile Search Button */}
                    <IconButton
                        onClick={() => setSearchOpen(true)}
                        sx={{
                            display: { xs: 'flex', sm: 'none' },
                            bgcolor: alpha('#0891B2', 0.08),
                            '&:hover': { bgcolor: alpha('#0891B2', 0.15) },
                        }}
                    >
                        <Search sx={{ color: '#0891B2' }} />
                    </IconButton>

                    <Box sx={{ flex: 1 }} />

                    {/* Notifications */}
                    <Tooltip title="Thông báo">
                        <IconButton 
                            id="notifications-button"
                            aria-controls={Boolean(notificationAnchor) ? 'notifications-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={Boolean(notificationAnchor) ? 'true' : undefined}
                            onClick={(e) => setNotificationAnchor(e.currentTarget)}
                            sx={{
                                bgcolor: alpha('#0891B2', 0.08),
                                '&:hover': {
                                    bgcolor: alpha('#0891B2', 0.12),
                                },
                            }}
                        >
                            <Badge badgeContent={unreadCount} color="error">
                                <Notifications sx={{ color: '#0891B2' }} />
                            </Badge>
                        </IconButton>
                    </Tooltip>

                    {/* User Menu */}
                    <Box
                        id="user-menu-button"
                        aria-controls={Boolean(anchorEl) ? 'user-menu' : undefined}
                        aria-haspopup="true"
                        aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            ml: 1,
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 3,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                bgcolor: alpha('#0891B2', 0.08),
                            },
                        }}
                    >
                        <Avatar 
                            src={getAvatarUrl(user?.avatar)}
                            sx={{ 
                                width: 38, 
                                height: 38, 
                                bgcolor: '#0891B2',
                                boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)',
                            }}
                        >
                            {user?.full_name?.[0] || user?.username?.[0] || 'U'}
                        </Avatar>
                        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            <Typography 
                                variant="body2" 
                                fontWeight={600}
                                sx={{ color: '#1E293B', lineHeight: 1.2 }}
                            >
                                {user?.full_name || user?.username}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>
                                {user?.role === 'admin' ? 'Quản trị viên' : 'Bác sĩ'}
                            </Typography>
                        </Box>
                        <KeyboardArrowDown sx={{ color: '#64748B', fontSize: 20 }} />
                    </Box>

                    {/* User Menu Popover */}
                    <Menu
                        id="user-menu"
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                        disableAutoFocusItem
                        autoFocus={false}
                        disableRestoreFocus
                        MenuListProps={{
                            'aria-labelledby': 'user-menu-button',
                            autoFocusItem: false,
                        }}
                        slotProps={{
                            paper: {
                                sx: {
                                    mt: 1,
                                    borderRadius: 3,
                                    minWidth: 220,
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                                },
                            },
                        }}
                    >
                        <Box sx={{ px: 2, py: 1.5 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {user?.full_name || user?.username}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {user?.email}
                            </Typography>
                        </Box>
                        <Divider />
                        <MenuItem 
                            onClick={() => { setAnchorEl(null); navigate('/profile'); }}
                            sx={{ py: 1.5 }}
                        >
                            <ListItemIcon><Person fontSize="small" sx={{ color: '#0891B2' }} /></ListItemIcon>
                            Hồ sơ cá nhân
                        </MenuItem>
                        <MenuItem 
                            onClick={() => { setAnchorEl(null); navigate('/settings'); }}
                            sx={{ py: 1.5 }}
                        >
                            <ListItemIcon><Settings fontSize="small" sx={{ color: '#64748B' }} /></ListItemIcon>
                            Cài đặt
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: '#EF4444' }}>
                            <ListItemIcon><Logout fontSize="small" sx={{ color: '#EF4444' }} /></ListItemIcon>
                            Đăng xuất
                        </MenuItem>
                    </Menu>

                    {/* Notifications Popover - Premium Healthcare Design */}
                    <Menu
                        id="notifications-menu"
                        anchorEl={notificationAnchor}
                        open={Boolean(notificationAnchor)}
                        onClose={() => setNotificationAnchor(null)}
                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                        disableAutoFocusItem
                        autoFocus={false}
                        disableRestoreFocus
                        MenuListProps={{
                            'aria-labelledby': 'notifications-button',
                            autoFocusItem: false,
                        }}
                        slotProps={{ 
                            paper: {
                                sx: { 
                                    width: 400, 
                                    maxHeight: 520,
                                    mt: 1.5,
                                    borderRadius: 3,
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    overflow: 'hidden',
                                },
                            },
                        }}
                    >
                        {/* Header */}
                        <Box sx={{ 
                            px: 2.5, 
                            py: 2, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                            color: 'white',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <NotificationsActive sx={{ fontSize: 24 }} />
                                <Typography variant="subtitle1" fontWeight={700}>
                                    Thông báo
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                {unreadCount > 0 && (
                                    <Chip 
                                        label={`${unreadCount} mới`} 
                                        size="small" 
                                        sx={{ 
                                            height: 24, 
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            bgcolor: 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            '& .MuiChip-label': { px: 1.5 },
                                        }} 
                                    />
                                )}
                                {unreadCount > 0 && (
                                    <Tooltip title="Đánh dấu tất cả đã đọc">
                                        <IconButton 
                                            size="small" 
                                            onClick={markAllAsRead}
                                            sx={{ 
                                                color: 'white',
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                                            }}
                                        >
                                            <DoneAll sx={{ fontSize: 20 }} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Box>
                        </Box>
                        
                        {/* Notification List */}
                        {notifications.length === 0 ? (
                            <Box sx={{ p: 5, textAlign: 'center' }}>
                                <Box sx={{ 
                                    width: 80, 
                                    height: 80, 
                                    borderRadius: '50%', 
                                    bgcolor: alpha('#0891B2', 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mx: 'auto',
                                    mb: 2,
                                }}>
                                    <Notifications sx={{ fontSize: 40, color: '#0891B2' }} />
                                </Box>
                                <Typography fontWeight={600} color="text.primary" sx={{ mb: 0.5 }}>
                                    Không có thông báo
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Các thông báo về quá trình xử lý sẽ xuất hiện ở đây
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ 
                                maxHeight: 400, 
                                overflow: 'auto',
                                '&::-webkit-scrollbar': { width: 6 },
                                '&::-webkit-scrollbar-thumb': { 
                                    bgcolor: alpha('#0891B2', 0.3), 
                                    borderRadius: 3,
                                },
                            }}>
                                {notifications.map((notification, index) => (
                                    <Box
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        sx={{ 
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 2,
                                            p: 2,
                                            cursor: 'pointer',
                                            bgcolor: notification.read ? 'transparent' : alpha('#0891B2', 0.04),
                                            borderLeft: notification.read ? '3px solid transparent' : '3px solid #0891B2',
                                            borderBottom: index < notifications.length - 1 ? '1px solid' : 'none',
                                            borderBottomColor: 'divider',
                                            transition: 'all 0.2s ease',
                                            '&:hover': { 
                                                bgcolor: alpha('#0891B2', 0.08),
                                                '& .notification-arrow': { opacity: 1, transform: 'translateX(0)' },
                                            },
                                        }}
                                    >
                                        {/* Icon */}
                                        <Box sx={{ 
                                            width: 44, 
                                            height: 44, 
                                            borderRadius: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: notification.type === 'success' 
                                                ? alpha('#10B981', 0.12) 
                                                : alpha('#EF4444', 0.12),
                                            flexShrink: 0,
                                        }}>
                                            {notification.type === 'success' ? (
                                                <CheckCircle sx={{ fontSize: 24, color: '#10B981' }} />
                                            ) : (
                                                <Error sx={{ fontSize: 24, color: '#EF4444' }} />
                                            )}
                                        </Box>
                                        
                                        {/* Content */}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography 
                                                    variant="body2" 
                                                    fontWeight={notification.read ? 500 : 700}
                                                    sx={{ 
                                                        color: notification.read ? 'text.primary' : '#0F172A',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                    }}
                                                >
                                                    {notification.title}
                                                    {!notification.read && (
                                                        <Circle sx={{ fontSize: 6, color: '#0891B2', ml: 0.5 }} />
                                                    )}
                                                </Typography>
                                            </Box>
                                            
                                            <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                    display: 'block', 
                                                    color: '#64748B',
                                                    mb: 1,
                                                    lineHeight: 1.4,
                                                }}
                                            >
                                                {notification.message}
                                            </Typography>
                                            
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <AccessTime sx={{ fontSize: 12, color: '#94A3B8' }} />
                                                    <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.7rem' }}>
                                                        {formatTimeAgo(notification.timestamp)}
                                                    </Typography>
                                                </Box>
                                                
                                                {notification.data?.medical_record_id && (
                                                    <Box 
                                                        className="notification-arrow"
                                                        sx={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: 0.5,
                                                            color: '#0891B2',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            opacity: 0,
                                                            transform: 'translateX(-8px)',
                                                            transition: 'all 0.2s ease',
                                                        }}
                                                    >
                                                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                            Xem chi tiết
                                                        </Typography>
                                                        <OpenInNew sx={{ fontSize: 12 }} />
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        )}
                        
                        {/* Footer - if there are notifications */}
                        {notifications.length > 0 && (
                            <Box sx={{ 
                                p: 1.5, 
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                textAlign: 'center',
                            }}>
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        color: '#64748B',
                                        fontSize: '0.7rem',
                                    }}
                                >
                                    Hiển thị {notifications.length} thông báo gần nhất
                                </Typography>
                            </Box>
                        )}
                    </Menu>
                </Toolbar>
            </AppBar>

            {/* Sidebar */}
            <Box
                component="nav"
                sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
            >
                {/* Mobile drawer */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: DRAWER_WIDTH,
                            border: 'none',
                        },
                    }}
                >
                    {drawer}
                </Drawer>

                {/* Desktop drawer */}
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: DRAWER_WIDTH,
                            border: 'none',
                            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.04)',
                        },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    minHeight: '100vh',
                    bgcolor: '#F0FDFA',
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 300,
                        background: 'linear-gradient(180deg, rgba(8, 145, 178, 0.04) 0%, transparent 100%)',
                        pointerEvents: 'none',
                    },
                }}
            >
                <Toolbar />
                <Fade in timeout={400}>
                    <Box sx={{ position: 'relative' }}>
                        <Outlet />
                    </Box>
                </Fade>
            </Box>

            {/* Search Dialog */}
            <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
        </Box>
    );
};

export default MainLayout;
