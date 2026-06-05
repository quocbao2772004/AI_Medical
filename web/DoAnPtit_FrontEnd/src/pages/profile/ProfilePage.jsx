/**
 * Profile Page - Trang hồ sơ cá nhân chuyên nghiệp
 * UI/UX tối ưu cho ứng dụng y tế
 */
import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Button,
    Grid,
    Avatar,
    TextField,
    Chip,
    IconButton,
    Alert,
    InputAdornment,
    LinearProgress,
    Tab,
    Tabs,
    Badge,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Tooltip,
    Paper,
    alpha,
} from '@mui/material';
import {
    Person,
    Email,
    Phone,
    Lock,
    Edit,
    Save,
    Cancel,
    Visibility,
    VisibilityOff,
    MedicalServices,
    LocalHospital,
    AdminPanelSettings,
    CheckCircle,
    CameraAlt,
    Delete,
    Security,
    Verified,
    Work,
    Face as FaceIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { profileAPI, authAPI } from '../../services/api';
import config from '../../config';
import FaceCapture from '../../components/FaceCapture';
import toast from 'react-hot-toast';

// Medical themed gradient
const gradientBg = 'linear-gradient(135deg, #0891B2 0%, #06B6D4 50%, #22D3EE 100%)';

// Tab Panel Component
const TabPanel = ({ children, value, index, ...other }) => (
    <div role="tabpanel" hidden={value !== index} {...other}>
        {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
);

// Info Row Component
const InfoRow = ({ icon: Icon, label, value, color = 'primary' }) => (
    <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        py: 1.5,
        px: 2,
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette[color].main, 0.04),
        mb: 1.5,
    }}>
        <Box sx={{ 
            p: 1, 
            borderRadius: '50%', 
            bgcolor: (theme) => alpha(theme.palette[color].main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <Icon sx={{ color: `${color}.main`, fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={500}>
                {value || '—'}
            </Typography>
        </Box>
    </Box>
);

const ProfilePage = () => {
    const { user, updateUser } = useAuth();
    const fileInputRef = useRef(null);
    
    const [tabValue, setTabValue] = useState(0);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [deleteAvatarDialog, setDeleteAvatarDialog] = useState(false);
    const [previewAvatar, setPreviewAvatar] = useState(null);
    
    // Form data
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
    });
    
    // Password form
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    
    const [passwordError, setPasswordError] = useState('');
    
    // Face recognition states
    const [faceLoading, setFaceLoading] = useState(false);
    const [faceRegistered, setFaceRegistered] = useState(user?.face_registered || false);
    const [faceMessage, setFaceMessage] = useState(null);
    const [showFaceCapture, setShowFaceCapture] = useState(false);
    const [registeredFaceImages, setRegisteredFaceImages] = useState([]);
    const [faceRegisteredAt, setFaceRegisteredAt] = useState(null);
    
    // Build avatar URL using PUBLIC_URL for static files
    const getAvatarUrl = (avatarPath) => {
        if (!avatarPath) return null;
        return config.getPublicStaticUrl(avatarPath);
    };
    
    // Load registered face images when tab changes to face recognition
    useEffect(() => {
        const loadFaceImages = async () => {
            // Load images when switching to face tab OR when faceRegistered changes
            if (tabValue === 2) {
                try {
                    console.log('Loading face images... faceRegistered:', faceRegistered);
                    const response = await authAPI.getMyFaceImages();
                    console.log('Face images response:', response);
                    
                    if (response.success && response.images) {
                        setRegisteredFaceImages(response.images);
                        setFaceRegisteredAt(response.registered_at);
                        // Also sync faceRegistered state
                        if (response.face_registered !== faceRegistered) {
                            setFaceRegistered(response.face_registered);
                        }
                    } else if (response.face_registered === false) {
                        setRegisteredFaceImages([]);
                        setFaceRegistered(false);
                    }
                } catch (err) {
                    console.error('Failed to load face images:', err);
                }
            }
        };
        loadFaceImages();
    }, [faceRegistered, tabValue]);
    
    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                phone: user.phone || '',
            });
        }
    }, [user]);
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({
            ...prev,
            [name]: value
        }));
        setPasswordError('');
    };
    
    // Handle avatar file selection
    const handleAvatarSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)');
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Kích thước file tối đa là 5MB');
            return;
        }
        
        // Preview
        const reader = new FileReader();
        reader.onload = (e) => setPreviewAvatar(e.target.result);
        reader.readAsDataURL(file);
        
        // Upload
        setAvatarLoading(true);
        try {
            const updatedUser = await profileAPI.uploadAvatar(file);
            
            // Update user context using updateUser
            updateUser({ avatar: updatedUser.avatar });
            
            toast.success('Cập nhật ảnh đại diện thành công!');
            setPreviewAvatar(null);
        } catch (error) {
            console.error('Failed to upload avatar:', error);
            toast.error(error.response?.data?.detail || 'Tải ảnh thất bại');
            setPreviewAvatar(null);
        } finally {
            setAvatarLoading(false);
        }
    };
    
    // Handle delete avatar
    const handleDeleteAvatar = async () => {
        setAvatarLoading(true);
        try {
            await profileAPI.deleteAvatar();
            
            // Update user context using updateUser
            updateUser({ avatar: null });
            
            toast.success('Đã xóa ảnh đại diện');
            setDeleteAvatarDialog(false);
        } catch (error) {
            console.error('Failed to delete avatar:', error);
            toast.error('Xóa ảnh thất bại');
        } finally {
            setAvatarLoading(false);
        }
    };
    
    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            await profileAPI.updateProfile(formData);
            
            // Update user context using updateUser
            updateUser(formData);
            
            toast.success('Cập nhật thông tin thành công!');
            setEditMode(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
            toast.error(error.response?.data?.detail || 'Cập nhật thất bại');
        } finally {
            setLoading(false);
        }
    };
    
    const handleChangePassword = async () => {
        // Validation
        if (!passwordForm.current_password) {
            setPasswordError('Vui lòng nhập mật khẩu hiện tại');
            return;
        }
        if (!passwordForm.new_password) {
            setPasswordError('Vui lòng nhập mật khẩu mới');
            return;
        }
        if (passwordForm.new_password.length < 6) {
            setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setPasswordError('Mật khẩu xác nhận không khớp');
            return;
        }
        
        setLoading(true);
        try {
            await profileAPI.changePassword(
                passwordForm.current_password,
                passwordForm.new_password
            );
            
            toast.success('Đổi mật khẩu thành công!');
            setPasswordForm({
                current_password: '',
                new_password: '',
                confirm_password: '',
            });
        } catch (error) {
            console.error('Failed to change password:', error);
            setPasswordError(error.response?.data?.detail || 'Đổi mật khẩu thất bại');
        } finally {
            setLoading(false);
        }
    };
    
    // Handle face capture for registration/update
    const handleFaceCapture = async (images) => {
        if (!images || images.length < 1) {
            setFaceMessage({ type: 'error', text: 'Cần ít nhất 1 ảnh khuôn mặt để đăng ký' });
            return;
        }
        
        setFaceLoading(true);
        setFaceMessage(null);
        
        try {
            // Backend uses current_user from token, no need to send user_id
            const response = await authAPI.registerFace(images);
            
            if (response.success) {
                setFaceRegistered(true);
                setFaceMessage({ 
                    type: 'success', 
                    text: faceRegistered 
                        ? 'Cập nhật khuôn mặt thành công!' 
                        : 'Đăng ký khuôn mặt thành công! Bây giờ bạn có thể đăng nhập bằng khuôn mặt.'
                });
                setShowFaceCapture(false);
                
                // Update user context
                updateUser({ face_registered: true });
                
                // Reload face images to show newly registered faces
                try {
                    const faceImagesResponse = await authAPI.getMyFaceImages();
                    if (faceImagesResponse.success && faceImagesResponse.images) {
                        setRegisteredFaceImages(faceImagesResponse.images);
                        setFaceRegisteredAt(faceImagesResponse.registered_at);
                    }
                } catch (err) {
                    console.error('Failed to reload face images:', err);
                }
                
                toast.success(faceRegistered ? 'Cập nhật khuôn mặt thành công!' : 'Đăng ký khuôn mặt thành công!');
            } else {
                setFaceMessage({ type: 'error', text: response.message || 'Đăng ký khuôn mặt thất bại' });
            }
        } catch (error) {
            console.error('Face registration error:', error);
            setFaceMessage({ 
                type: 'error', 
                text: error.response?.data?.detail || 'Đăng ký khuôn mặt thất bại. Vui lòng thử lại.'
            });
        } finally {
            setFaceLoading(false);
        }
    };
    
    // Handle delete face image
    const handleDeleteFaceImage = async (imagePath) => {
        // Extract filename from path (e.g., "face_images/123/face_1.jpg" -> "face_1.jpg")
        const filename = imagePath.split('/').pop();
        
        if (!window.confirm(`Bạn có chắc muốn xóa ảnh ${filename}?`)) {
            return;
        }
        
        setFaceLoading(true);
        try {
            const response = await authAPI.deleteFaceImage(filename);
            
            if (response.success) {
                // Update local state
                setRegisteredFaceImages(prev => prev.filter(img => img !== imagePath));
                
                // Update face registration status if no images left
                if (!response.face_registered) {
                    setFaceRegistered(false);
                    updateUser({ face_registered: false });
                    toast.success('Đã xóa tất cả ảnh khuôn mặt. Face ID đã bị vô hiệu hóa.');
                } else {
                    toast.success(`Đã xóa ảnh. Còn lại ${response.remaining_images} ảnh.`);
                }
            }
        } catch (error) {
            console.error('Delete face image error:', error);
            toast.error(error.response?.data?.detail || 'Không thể xóa ảnh');
        } finally {
            setFaceLoading(false);
        }
    };
    
    const getRoleInfo = () => {
        switch (user?.role) {
            case 'admin':
                return { 
                    label: 'Quản trị viên', 
                    color: 'error', 
                    icon: <AdminPanelSettings fontSize="small" />,
                    description: 'Quyền quản trị hệ thống'
                };
            case 'doctor':
                return { 
                    label: 'Bác sĩ', 
                    color: 'primary', 
                    icon: <LocalHospital fontSize="small" />,
                    description: 'Bác sĩ chẩn đoán hình ảnh'
                };
            default:
                return { 
                    label: 'Người dùng', 
                    color: 'default', 
                    icon: <Person fontSize="small" />,
                    description: 'Tài khoản người dùng'
                };
        }
    };
    
    const roleInfo = getRoleInfo();
    const avatarUrl = previewAvatar || getAvatarUrl(user?.avatar);

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Hero Header */}
            <Paper
                elevation={0}
                sx={{
                    background: gradientBg,
                    borderRadius: 4,
                    p: 4,
                    mb: 4,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Decorative circles */}
                <Box sx={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.1)',
                }} />
                <Box sx={{
                    position: 'absolute',
                    bottom: -30,
                    right: 100,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.1)',
                }} />
                
                <Grid container spacing={3} alignItems="center">
                    <Grid item>
                        <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            badgeContent={
                                <Tooltip title="Thay đổi ảnh đại diện">
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={avatarLoading}
                                            sx={{
                                                bgcolor: 'white',
                                                boxShadow: 2,
                                                '&:hover': { bgcolor: 'grey.100' },
                                            }}
                                        >
                                            {avatarLoading ? (
                                                <CircularProgress size={20} />
                                            ) : (
                                                <CameraAlt fontSize="small" color="primary" />
                                            )}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            }
                        >
                            <Avatar
                                src={avatarUrl}
                                sx={{
                                    width: 120,
                                    height: 120,
                                    bgcolor: 'white',
                                    color: 'primary.main',
                                    fontSize: 48,
                                    fontWeight: 700,
                                    border: '4px solid rgba(255,255,255,0.3)',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                    },
                                }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {user?.full_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                            </Avatar>
                        </Badge>
                        <input
                            ref={fileInputRef}
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handleAvatarSelect}
                        />
                    </Grid>
                    
                    <Grid item xs>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Typography variant="h4" fontWeight={700} color="white">
                                {user?.full_name || user?.username}
                            </Typography>
                            {user?.is_active && (
                                <Tooltip title="Tài khoản đã xác minh">
                                    <Verified sx={{ color: 'white', opacity: 0.9 }} />
                                </Tooltip>
                            )}
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <Chip
                                icon={roleInfo.icon}
                                label={roleInfo.label}
                                sx={{
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    fontWeight: 600,
                                    '& .MuiChip-icon': { color: 'white' },
                                }}
                            />
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                @{user?.username}
                            </Typography>
                        </Box>
                        
                        {user?.avatar && (
                            <Button
                                size="small"
                                startIcon={<Delete />}
                                onClick={() => setDeleteAvatarDialog(true)}
                                sx={{ 
                                    mt: 1.5,
                                    color: 'rgba(255,255,255,0.8)',
                                    '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                                }}
                            >
                                Xóa ảnh đại diện
                            </Button>
                        )}
                    </Grid>
                    
                    <Grid item>
                        <Paper
                            elevation={0}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: 3,
                                p: 2,
                                minWidth: 180,
                            }}
                        >
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Ngày tham gia
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color="white">
                                {user?.created_at 
                                    ? new Date(user.created_at).toLocaleDateString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                    })
                                    : 'N/A'}
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>

            {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            <Grid container spacing={3}>
                {/* Quick Info Sidebar */}
                <Grid item xs={12} md={4}>
                    <Card 
                        elevation={0} 
                        sx={{ 
                            borderRadius: 3, 
                            border: '1px solid',
                            borderColor: 'divider',
                            mb: 3,
                        }}
                    >
                        <CardContent>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                                THÔNG TIN NHANH
                            </Typography>
                            
                            <InfoRow 
                                icon={Email} 
                                label="Email" 
                                value={user?.email}
                                color="info"
                            />
                            <InfoRow 
                                icon={Phone} 
                                label="Số điện thoại" 
                                value={user?.phone}
                                color="success"
                            />
                            <InfoRow 
                                icon={Work} 
                                label="Vai trò" 
                                value={roleInfo.label}
                            />
                            <InfoRow 
                                icon={CheckCircle} 
                                label="Trạng thái" 
                                value={user?.is_active ? 'Đang hoạt động' : 'Bị khóa'}
                                color={user?.is_active ? 'success' : 'error'}
                            />
                        </CardContent>
                    </Card>

                    {/* Doctor-specific info */}
                    {user?.role === 'doctor' && user?.doctor && (
                        <Card 
                            elevation={0} 
                            sx={{ 
                                borderRadius: 3, 
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <CardContent>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                                    THÔNG TIN BÁC SĨ
                                </Typography>
                                
                                <InfoRow 
                                    icon={MedicalServices} 
                                    label="Chuyên khoa" 
                                    value={user.doctor.specialty}
                                />
                                <InfoRow 
                                    icon={LocalHospital} 
                                    label="Bệnh viện" 
                                    value={user.doctor.hospital}
                                    color="secondary"
                                />
                            </CardContent>
                        </Card>
                    )}
                </Grid>

                {/* Main Content */}
                <Grid item xs={12} md={8}>
                    <Card 
                        elevation={0} 
                        sx={{ 
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Tabs
                            value={tabValue}
                            onChange={(e, newValue) => setTabValue(newValue)}
                            sx={{ 
                                borderBottom: 1, 
                                borderColor: 'divider', 
                                px: 3,
                                '& .MuiTab-root': {
                                    fontWeight: 600,
                                    textTransform: 'none',
                                }
                            }}
                        >
                            <Tab 
                                icon={<Person fontSize="small" />} 
                                label="Thông tin cá nhân" 
                                iconPosition="start" 
                            />
                            <Tab 
                                icon={<Security fontSize="small" />} 
                                label="Bảo mật" 
                                iconPosition="start" 
                            />
                            <Tab 
                                icon={<FaceIcon fontSize="small" />} 
                                label="Nhận diện khuôn mặt" 
                                iconPosition="start" 
                            />
                        </Tabs>

                        <CardContent sx={{ px: 3 }}>
                            {/* Personal Info Tab */}
                            <TabPanel value={tabValue} index={0}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                    <Typography variant="h6" fontWeight={600}>
                                        Chỉnh sửa thông tin
                                    </Typography>
                                    {editMode ? (
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                variant="outlined"
                                                startIcon={<Cancel />}
                                                onClick={() => {
                                                    setEditMode(false);
                                                    if (user) {
                                                        setFormData({
                                                            full_name: user.full_name || '',
                                                            email: user.email || '',
                                                            phone: user.phone || '',
                                                        });
                                                    }
                                                }}
                                            >
                                                Hủy
                                            </Button>
                                            <Button
                                                variant="contained"
                                                startIcon={<Save />}
                                                onClick={handleSaveProfile}
                                                disabled={loading}
                                            >
                                                Lưu thay đổi
                                            </Button>
                                        </Box>
                                    ) : (
                                        <Button
                                            variant="outlined"
                                            startIcon={<Edit />}
                                            onClick={() => setEditMode(true)}
                                        >
                                            Chỉnh sửa
                                        </Button>
                                    )}
                                </Box>

                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Họ và tên"
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleInputChange}
                                            disabled={!editMode}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Person color="action" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Email"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            disabled={!editMode}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Email color="action" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Số điện thoại"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            disabled={!editMode}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Phone color="action" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Grid>
                                </Grid>

                                <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
                                    Thông tin chuyên khoa và bệnh viện chỉ có thể được cập nhật bởi quản trị viên.
                                </Alert>
                            </TabPanel>

                            {/* Security Tab */}
                            <TabPanel value={tabValue} index={1}>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Đổi mật khẩu
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu với người khác.
                                </Typography>
                                
                                {passwordError && (
                                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                                        {passwordError}
                                    </Alert>
                                )}
                                
                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Mật khẩu hiện tại"
                                            name="current_password"
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            value={passwordForm.current_password}
                                            onChange={handlePasswordChange}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Lock color="action" />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                            edge="end"
                                                        >
                                                            {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Mật khẩu mới"
                                            name="new_password"
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={passwordForm.new_password}
                                            onChange={handlePasswordChange}
                                            helperText="Mật khẩu phải có ít nhất 6 ký tự"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Lock color="action" />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                                            edge="end"
                                                        >
                                                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Xác nhận mật khẩu mới"
                                            name="confirm_password"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={passwordForm.confirm_password}
                                            onChange={handlePasswordChange}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Lock color="action" />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            edge="end"
                                                        >
                                                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Button
                                            variant="contained"
                                            onClick={handleChangePassword}
                                            disabled={loading}
                                            startIcon={<Security />}
                                            size="large"
                                        >
                                            Đổi mật khẩu
                                        </Button>
                                    </Grid>
                                </Grid>
                            </TabPanel>

                            {/* Face Recognition Tab */}
                            <TabPanel value={tabValue} index={2}>
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" fontWeight={600} gutterBottom>
                                        Nhận diện khuôn mặt
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Đăng ký khuôn mặt để đăng nhập nhanh chóng và bảo mật hơn
                                    </Typography>
                                </Box>

                                {/* Status Card */}
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        mb: 3,
                                        borderRadius: 3,
                                        bgcolor: faceRegistered 
                                            ? (theme) => alpha(theme.palette.success.main, 0.08)
                                            : (theme) => alpha(theme.palette.warning.main, 0.08),
                                        border: '1px solid',
                                        borderColor: faceRegistered ? 'success.light' : 'warning.light',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box
                                            sx={{
                                                p: 1.5,
                                                borderRadius: '50%',
                                                bgcolor: faceRegistered ? 'success.main' : 'warning.main',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <FaceIcon sx={{ color: 'white', fontSize: 28 }} />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle1" fontWeight={600}>
                                                {faceRegistered ? 'Khuôn mặt đã được đăng ký' : 'Chưa đăng ký khuôn mặt'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {faceRegistered 
                                                    ? `Đăng ký lúc: ${faceRegisteredAt ? new Date(faceRegisteredAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'N/A'}`
                                                    : 'Đăng ký khuôn mặt để sử dụng tính năng đăng nhập bằng khuôn mặt'
                                                }
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={faceRegistered ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                                            color={faceRegistered ? 'success' : 'warning'}
                                            size="small"
                                        />
                                    </Box>
                                </Paper>

                                {/* Registered Face Images Preview - Always show when has images */}
                                {registeredFaceImages.length > 0 && (
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 3,
                                            mb: 3,
                                            borderRadius: 3,
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    >
                                        <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <FaceIcon color="primary" fontSize="small" />
                                            Ảnh khuôn mặt đã đăng ký ({registeredFaceImages.length}/3 ảnh)
                                        </Typography>
                                        <Grid container spacing={2} sx={{ mt: 1 }}>
                                            {registeredFaceImages.map((imagePath, index) => (
                                                <Grid item xs={4} sm={3} md={2} key={index}>
                                                    <Box
                                                        sx={{
                                                            position: 'relative',
                                                            borderRadius: 2,
                                                            overflow: 'hidden',
                                                            aspectRatio: '1',
                                                            border: '2px solid',
                                                            borderColor: 'success.main',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                            '&:hover .delete-btn': {
                                                                opacity: 1,
                                                            },
                                                        }}
                                                    >
                                                        <img
                                                            src={config.getFileUrl(imagePath)}
                                                            alt={`Khuôn mặt ${index + 1}`}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover',
                                                            }}
                                                            onError={(e) => {
                                                                e.target.src = '/placeholder-face.png';
                                                            }}
                                                        />
                                                        {/* Delete button */}
                                                        <IconButton
                                                            className="delete-btn"
                                                            size="small"
                                                            onClick={() => handleDeleteFaceImage(imagePath)}
                                                            disabled={faceLoading}
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 4,
                                                                right: 4,
                                                                bgcolor: 'rgba(255,255,255,0.9)',
                                                                color: 'error.main',
                                                                opacity: 0,
                                                                transition: 'opacity 0.2s',
                                                                '&:hover': {
                                                                    bgcolor: 'error.main',
                                                                    color: 'white',
                                                                },
                                                                width: 28,
                                                                height: 28,
                                                            }}
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                        <Chip
                                                            label={index + 1}
                                                            size="small"
                                                            color="success"
                                                            sx={{
                                                                position: 'absolute',
                                                                bottom: 4,
                                                                left: 4,
                                                                fontSize: '0.7rem',
                                                                height: 20,
                                                            }}
                                                        />
                                                    </Box>
                                                </Grid>
                                            ))}
                                        </Grid>
                                        {faceRegisteredAt && (
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                                Đăng ký lúc: {new Date(faceRegisteredAt).toLocaleString('vi-VN')}
                                            </Typography>
                                        )}
                                    </Paper>
                                )}

                                {/* Face Message */}
                                {faceMessage && (
                                    <Alert 
                                        severity={faceMessage.type} 
                                        sx={{ mb: 3, borderRadius: 2 }}
                                        onClose={() => setFaceMessage(null)}
                                    >
                                        {faceMessage.text}
                                    </Alert>
                                )}

                                {/* Face Capture or Action Buttons */}
                                {showFaceCapture ? (
                                    <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                                            <Button
                                                variant="outlined"
                                                onClick={() => setShowFaceCapture(false)}
                                                startIcon={<Cancel />}
                                            >
                                                Hủy
                                            </Button>
                                        </Box>
                                        <FaceCapture
                                            onSubmit={handleFaceCapture}
                                            minImages={1}
                                            maxImages={1}
                                            mode="register"
                                            disabled={faceLoading}
                                        />
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                        <Button
                                            variant="contained"
                                            startIcon={faceLoading ? <CircularProgress size={20} color="inherit" /> : (faceRegistered ? <RefreshIcon /> : <FaceIcon />)}
                                            onClick={() => setShowFaceCapture(true)}
                                            disabled={faceLoading}
                                            size="large"
                                            sx={{ 
                                                px: 4,
                                                background: faceRegistered 
                                                    ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                                                    : gradientBg,
                                            }}
                                        >
                                            {faceRegistered ? 'Cập nhật khuôn mặt' : 'Đăng ký khuôn mặt'}
                                        </Button>
                                    </Box>
                                )}

                                {/* Instructions */}
                                <Alert 
                                    severity="info" 
                                    sx={{ 
                                        mt: 3, 
                                        borderRadius: 2,
                                        '& .MuiAlert-message': { width: '100%' }
                                    }}
                                >
                                    <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                                        Hướng dẫn đăng ký khuôn mặt:
                                    </Typography>
                                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                        <li>Đảm bảo ánh sáng đủ, tránh ngược sáng</li>
                                        <li>Đưa khuôn mặt vào giữa khung hình</li>
                                        <li>Chụp ít nhất 3 ảnh với các góc khác nhau</li>
                                        <li>Không đeo kính râm hoặc khẩu trang</li>
                                    </Box>
                                </Alert>
                            </TabPanel>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Delete Avatar Dialog */}
            <Dialog 
                open={deleteAvatarDialog} 
                onClose={() => setDeleteAvatarDialog(false)}
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Delete color="error" />
                        Xóa ảnh đại diện?
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc chắn muốn xóa ảnh đại diện? Hành động này không thể hoàn tác.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteAvatarDialog(false)}>
                        Hủy
                    </Button>
                    <Button 
                        onClick={handleDeleteAvatar} 
                        color="error" 
                        variant="contained"
                        disabled={avatarLoading}
                        startIcon={avatarLoading ? <CircularProgress size={16} /> : <Delete />}
                    >
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default ProfilePage;
