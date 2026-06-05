/**
 * Login Page - Premium Healthcare UI
 * Design: Glassmorphism + Soft Shadows + Animations
 * Features: Password login + Face Recognition login
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    InputAdornment,
    IconButton,
    CircularProgress,
    Container,
    Fade,
    Grow,
    alpha,
    Divider,
    Tabs,
    Tab,
    Chip,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    PersonOutlined,
    LockOutlined,
    LocalHospital,
    ViewInAr,
    AutoAwesome,
    Face as FaceIcon,
    Key as KeyIcon,
    Security as SecurityIcon,
    CheckCircle as CheckIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import FaceCapture from '../../components/FaceCapture';

// Animated Background Shapes
const FloatingShape = ({ delay, duration, size, top, left, color }) => (
    <Box
        sx={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${alpha(color, 0.3)} 0%, ${alpha(color, 0.1)} 100%)`,
            top,
            left,
            animation: `float ${duration}s ease-in-out infinite`,
            animationDelay: `${delay}s`,
            filter: 'blur(1px)',
            '@keyframes float': {
                '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                '50%': { transform: 'translateY(-30px) rotate(180deg)' },
            },
        }}
    />
);

// Feature Badge
const FeatureBadge = ({ icon, text, delay }) => (
    <Grow in timeout={800 + delay * 200}>
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
        >
            {icon}
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 500 }}>
                {text}
            </Typography>
        </Box>
    </Grow>
);

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, loginWithFace, loading, error } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [loginMode, setLoginMode] = useState(0); // 0 = password, 1 = face
    
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState('');
    
    // Face login state
    const [faceLoginStatus, setFaceLoginStatus] = useState('idle'); // idle | capturing | processing | success | error
    const [faceLoginMessage, setFaceLoginMessage] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFormError('');
    };

    const handleModeChange = (event, newValue) => {
        setLoginMode(newValue);
        setFormError('');
        setFaceLoginStatus('idle');
        setFaceLoginMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.username || !formData.password) {
            setFormError('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        const result = await login(formData.username, formData.password);
        
        if (result.success) {
            navigate('/dashboard');
        } else {
            setFormError(result.error);
        }
    };

    const handleFaceCapture = async (images) => {
        if (!images || images.length === 0) return;
        
        setFaceLoginStatus('processing');
        setFaceLoginMessage('Đang xác thực khuôn mặt...');
        
        try {
            // Use loginWithFace from auth context
            // NO username - system will search and verify strictly
            const result = await loginWithFace({
                face_image: images[0], // Use the first captured image
                username: null, // Always null - let backend verify strictly
            });
            
            if (result.success) {
                setFaceLoginStatus('success');
                setFaceLoginMessage(`Xác thực thành công! Xin chào ${result.user?.full_name || result.user?.username || ''}`);
                
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1000);
            } else {
                setFaceLoginStatus('error');
                setFaceLoginMessage(result.error || 'Không nhận diện được khuôn mặt');
            }
        } catch (err) {
            setFaceLoginStatus('error');
            setFaceLoginMessage('Lỗi kết nối. Vui lòng thử lại.');
        }
    };

    // Handle retry face login
    const handleRetryFaceLogin = () => {
        setFaceLoginStatus('idle');
        setFaceLoginMessage('');
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 30%, #164E63 70%, #134E4A 100%)',
            }}
        >
            {/* Animated Background Shapes */}
            <FloatingShape delay={0} duration={8} size={200} top="10%" left="5%" color="#22D3EE" />
            <FloatingShape delay={2} duration={10} size={150} top="60%" left="15%" color="#10B981" />
            <FloatingShape delay={4} duration={12} size={180} top="20%" left="80%" color="#22D3EE" />
            <FloatingShape delay={1} duration={9} size={120} top="70%" left="70%" color="#10B981" />
            <FloatingShape delay={3} duration={11} size={100} top="40%" left="90%" color="#14B8A6" />
            
            {/* Left Panel - Branding */}
            <Box
                sx={{
                    display: { xs: 'none', lg: 'flex' },
                    flex: 1,
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: 6,
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                <Fade in={mounted} timeout={1000}>
                    <Box sx={{ textAlign: 'center', mb: 6 }}>
                        <Box
                            sx={{
                                width: 100,
                                height: 100,
                                borderRadius: '24px',
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 3,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                            }}
                        >
                            <LocalHospital sx={{ fontSize: 50, color: 'white' }} />
                        </Box>
                        <Typography 
                            variant="h3" 
                            fontWeight="bold" 
                            sx={{ 
                                color: 'white', 
                                mb: 2,
                                textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                            }}
                        >
                            Medical Imaging
                        </Typography>
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                color: 'rgba(255,255,255,0.85)',
                                fontWeight: 400,
                                maxWidth: 400,
                            }}
                        >
                            Hệ thống tái tạo ảnh CT 3D từ X-ray với công nghệ AI tiên tiến
                        </Typography>
                    </Box>
                </Fade>

                {/* Feature Badges */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                    <FeatureBadge 
                        icon={<ViewInAr sx={{ color: 'white', fontSize: 18 }} />}
                        text="Tái tạo CT 3D"
                        delay={0}
                    />
                    <FeatureBadge 
                        icon={<AutoAwesome sx={{ color: 'white', fontSize: 18 }} />}
                        text="AI Powered"
                        delay={1}
                    />
                    <FeatureBadge 
                        icon={<FaceIcon sx={{ color: 'white', fontSize: 18 }} />}
                        text="Face Login"
                        delay={2}
                    />
                </Box>
            </Box>

            {/* Right Panel - Login Form */}
            <Box
                sx={{
                    flex: { xs: 1, lg: '0 0 550px' },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 3,
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                <Container maxWidth="sm">
                    <Grow in={mounted} timeout={800}>
                        <Card
                            sx={{
                                borderRadius: 4,
                                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                overflow: 'visible',
                            }}
                        >
                            <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
                                {/* Mobile Logo */}
                                <Box sx={{ textAlign: 'center', mb: 4, display: { lg: 'none' } }}>
                                    <Box
                                        sx={{
                                            width: 70,
                                            height: 70,
                                            borderRadius: '18px',
                                            background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mx: 'auto',
                                            mb: 2,
                                            boxShadow: '0 8px 24px rgba(8, 145, 178, 0.3)',
                                        }}
                                    >
                                        <LocalHospital sx={{ fontSize: 36, color: 'white' }} />
                                    </Box>
                                    <Typography variant="h5" fontWeight="bold" color="primary">
                                        Medical Imaging
                                    </Typography>
                                </Box>

                                {/* Welcome Text */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography 
                                        variant="h4" 
                                        fontWeight="bold" 
                                        sx={{ 
                                            color: '#1E293B',
                                            mb: 1,
                                        }}
                                    >
                                        Chào mừng trở lại! 👋
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary">
                                        Đăng nhập để tiếp tục sử dụng hệ thống
                                    </Typography>
                                </Box>

                                {/* Login Mode Tabs */}
                                <Tabs
                                    value={loginMode}
                                    onChange={handleModeChange}
                                    sx={{
                                        mb: 3,
                                        '& .MuiTabs-indicator': {
                                            backgroundColor: '#0891B2',
                                            height: 3,
                                            borderRadius: 2,
                                        },
                                        '& .MuiTab-root': {
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            fontSize: '0.95rem',
                                            minHeight: 48,
                                            '&.Mui-selected': {
                                                color: '#0891B2',
                                            },
                                        },
                                    }}
                                >
                                    <Tab 
                                        icon={<KeyIcon sx={{ fontSize: 20 }} />} 
                                        iconPosition="start" 
                                        label="Mật khẩu" 
                                    />
                                    <Tab 
                                        icon={<FaceIcon sx={{ fontSize: 20 }} />} 
                                        iconPosition="start" 
                                        label="Khuôn mặt" 
                                    />
                                </Tabs>

                                {/* Error Alert */}
                                {(formError || error) && (
                                    <Fade in>
                                        <Alert 
                                            severity="error" 
                                            sx={{ 
                                                mb: 3, 
                                                borderRadius: 3,
                                                '& .MuiAlert-icon': {
                                                    alignItems: 'center',
                                                },
                                            }}
                                        >
                                            {formError || error}
                                        </Alert>
                                    </Fade>
                                )}

                                {/* Password Login Mode */}
                                {loginMode === 0 && (
                                    <Fade in timeout={400}>
                                        <form onSubmit={handleSubmit}>
                                            <TextField
                                                fullWidth
                                                name="username"
                                                label="Tên đăng nhập"
                                                value={formData.username}
                                                onChange={handleChange}
                                                margin="normal"
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <PersonOutlined sx={{ color: '#0891B2' }} />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 3,
                                                        '&:hover': {
                                                            boxShadow: '0 0 0 4px rgba(8, 145, 178, 0.1)',
                                                        },
                                                        '&.Mui-focused': {
                                                            boxShadow: '0 0 0 4px rgba(8, 145, 178, 0.15)',
                                                        },
                                                    },
                                                }}
                                            />

                                            <TextField
                                                fullWidth
                                                name="password"
                                                label="Mật khẩu"
                                                type={showPassword ? 'text' : 'password'}
                                                value={formData.password}
                                                onChange={handleChange}
                                                margin="normal"
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <LockOutlined sx={{ color: '#0891B2' }} />
                                                        </InputAdornment>
                                                    ),
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                edge="end"
                                                                sx={{
                                                                    '&:hover': {
                                                                        backgroundColor: alpha('#0891B2', 0.08),
                                                                    },
                                                                }}
                                                            >
                                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 3,
                                                        '&:hover': {
                                                            boxShadow: '0 0 0 4px rgba(8, 145, 178, 0.1)',
                                                        },
                                                        '&.Mui-focused': {
                                                            boxShadow: '0 0 0 4px rgba(8, 145, 178, 0.15)',
                                                        },
                                                    },
                                                }}
                                            />

                                            <Button
                                                type="submit"
                                                fullWidth
                                                variant="contained"
                                                size="large"
                                                disabled={loading}
                                                sx={{ 
                                                    mt: 4, 
                                                    mb: 2, 
                                                    py: 1.75,
                                                    borderRadius: 3,
                                                    fontSize: '1rem',
                                                    fontWeight: 600,
                                                    background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                                                    boxShadow: '0 8px 24px rgba(8, 145, 178, 0.35)',
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        background: 'linear-gradient(135deg, #0E7490 0%, #164E63 100%)',
                                                        boxShadow: '0 12px 32px rgba(8, 145, 178, 0.45)',
                                                        transform: 'translateY(-2px)',
                                                    },
                                                    '&:active': {
                                                        transform: 'translateY(0)',
                                                    },
                                                }}
                                            >
                                                {loading ? (
                                                    <CircularProgress size={26} sx={{ color: 'white' }} />
                                                ) : (
                                                    'Đăng nhập'
                                                )}
                                            </Button>
                                        </form>
                                    </Fade>
                                )}

                                {/* Face Login Mode */}
                                {loginMode === 1 && (
                                    <Fade in timeout={400}>
                                        <Box>
                                            {/* Face Login Info */}
                                            <Box
                                                sx={{
                                                    mb: 2,
                                                    p: 2,
                                                    borderRadius: 2,
                                                    bgcolor: alpha('#10B981', 0.08),
                                                    border: `1px solid ${alpha('#10B981', 0.2)}`,
                                                }}
                                            >
                                                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <FaceIcon sx={{ color: '#10B981', fontSize: 20 }} />
                                                    Đưa khuôn mặt vào camera để đăng nhập tự động
                                                </Typography>
                                            </Box>

                                            {/* Face Login Status */}
                                            {faceLoginStatus !== 'idle' && (
                                                <Alert
                                                    severity={
                                                        faceLoginStatus === 'success' ? 'success' :
                                                        faceLoginStatus === 'error' ? 'error' : 'info'
                                                    }
                                                    icon={
                                                        faceLoginStatus === 'processing' ? (
                                                            <CircularProgress size={20} />
                                                        ) : faceLoginStatus === 'success' ? (
                                                            <CheckIcon />
                                                        ) : undefined
                                                    }
                                                    sx={{ mb: 2, borderRadius: 2 }}
                                                    action={
                                                        faceLoginStatus === 'error' && (
                                                            <Button
                                                                color="inherit"
                                                                size="small"
                                                                onClick={handleRetryFaceLogin}
                                                                startIcon={<RefreshIcon />}
                                                                sx={{ fontWeight: 600 }}
                                                            >
                                                                Thử lại
                                                            </Button>
                                                        )
                                                    }
                                                >
                                                    {faceLoginMessage}
                                                </Alert>
                                            )}

                                            {/* Retry Button - Standalone */}
                                            {faceLoginStatus === 'error' && (
                                                <Box sx={{ mb: 2, textAlign: 'center' }}>
                                                    <Button
                                                        variant="contained"
                                                        onClick={handleRetryFaceLogin}
                                                        startIcon={<RefreshIcon />}
                                                        sx={{
                                                            borderRadius: 3,
                                                            py: 1.5,
                                                            px: 4,
                                                            background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                                                            boxShadow: '0 4px 15px rgba(8, 145, 178, 0.3)',
                                                            '&:hover': {
                                                                background: 'linear-gradient(135deg, #0E7490 0%, #164E63 100%)',
                                                            },
                                                        }}
                                                    >
                                                        Thử lại nhận diện
                                                    </Button>
                                                </Box>
                                            )}

                                            {/* Face Capture */}
                                            {faceLoginStatus !== 'success' && faceLoginStatus !== 'error' && (
                                                <FaceCapture
                                                    onSubmit={handleFaceCapture}
                                                    mode="login"
                                                    autoLogin={true}
                                                    autoStart={true}
                                                    disabled={faceLoginStatus === 'processing'}
                                                />
                                            )}

                                            {/* Security Info */}
                                            <Box
                                                sx={{
                                                    mt: 2,
                                                    p: 2,
                                                    borderRadius: 2,
                                                    bgcolor: alpha('#0891B2', 0.05),
                                                    border: `1px solid ${alpha('#0891B2', 0.1)}`,
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                    <SecurityIcon sx={{ color: '#0891B2', fontSize: 20 }} />
                                                    <Typography variant="subtitle2" fontWeight={600}>
                                                        Bảo mật cao
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    Khuôn mặt của bạn được xử lý hoàn toàn an toàn và không được lưu trữ trên server.
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Fade>
                                )}

                                {/* Divider */}
                                <Divider sx={{ my: 3 }}>
                                    <Chip label="hoặc" size="small" sx={{ fontSize: '0.75rem' }} />
                                </Divider>

                                {/* Register Link */}
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Chưa có tài khoản?{' '}
                                        <Link
                                            to="/register"
                                            style={{
                                                color: '#0891B2',
                                                textDecoration: 'none',
                                                fontWeight: 600,
                                                transition: 'color 0.2s',
                                            }}
                                        >
                                            Đăng ký ngay
                                        </Link>
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grow>
                </Container>
            </Box>
        </Box>
    );
};

export default LoginPage;
