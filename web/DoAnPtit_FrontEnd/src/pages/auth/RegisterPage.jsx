/**
 * Register Page - Premium Healthcare UI
 * Design: Glassmorphism + Soft Shadows + Animations
 * Features: Multi-step form with Face Recognition capture
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Fade,
    Grow,
    Stepper,
    Step,
    StepLabel,
    alpha,
    Collapse,
    Switch,
    Chip,
    Divider,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    PersonOutlined,
    LockOutlined,
    EmailOutlined,
    LocalHospital,
    Badge,
    Phone,
    Business,
    MedicalServices,
    ArrowBack,
    ArrowForward,
    Check,
    PersonAddAlt1,
    Face as FaceIcon,
    SkipNext as SkipIcon,
    Security as SecurityIcon,
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

const steps = ['Thông tin cơ bản', 'Tài khoản', 'Nhận diện khuôn mặt', 'Hoàn tất'];

const RegisterPage = () => {
    const navigate = useNavigate();
    const { register, loading } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        role: 'doctor',
        // Doctor specific
        specialty: '',
        phone: '',
        hospital: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    
    // Face Recognition state
    const [enableFaceLogin, setEnableFaceLogin] = useState(false); // Default OFF - optional feature
    const [faceImages, setFaceImages] = useState([]);
    const [faceRegistrationStatus, setFaceRegistrationStatus] = useState('pending'); // pending | success | skipped

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleFaceCapture = (images) => {
        console.log('=== FACE CAPTURE ===');
        console.log('Received images:', images.length);
        setFaceImages(images);
    };

    const handleNext = () => {
        // Validation for step 0 - Basic Info
        if (activeStep === 0) {
            if (!formData.full_name) {
                setError('Vui lòng nhập họ và tên');
                return;
            }
        }
        // Validation for step 1 - Account
        if (activeStep === 1) {
            if (!formData.username || !formData.email || !formData.password) {
                setError('Vui lòng nhập đầy đủ thông tin');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Mật khẩu xác nhận không khớp');
                return;
            }
            if (formData.password.length < 6) {
                setError('Mật khẩu phải có ít nhất 6 ký tự');
                return;
            }
        }
        // Validation for step 2 - Face Recognition (OPTIONAL)
        if (activeStep === 2) {
            // Face is optional - need at least 1 image for registration
            if (enableFaceLogin && faceImages.length >= 1) {
                setFaceRegistrationStatus('success');
            } else if (enableFaceLogin && faceImages.length === 0) {
                setError('Cần chụp ít nhất 1 ảnh khuôn mặt để đăng ký');
                return;
            } else {
                setFaceRegistrationStatus('skipped');
            }
        }
        setError('');
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setError('');
        setActiveStep((prev) => prev - 1);
    };

    const handleSkipFace = () => {
        setFaceRegistrationStatus('skipped');
        setEnableFaceLogin(false);
        setFaceImages([]);
        setActiveStep((prev) => prev + 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Debug log
        console.log('=== REGISTER SUBMIT ===');
        console.log('enableFaceLogin:', enableFaceLogin);
        console.log('faceImages.length:', faceImages.length);
        console.log('faceImages:', faceImages);
        
        // Prepare data
        const userData = {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role,
            face_images: enableFaceLogin && faceImages.length >= 1 ? faceImages : null,
        };
        
        console.log('userData.face_images:', userData.face_images ? `${userData.face_images.length} images` : 'null');

        if (formData.role === 'doctor') {
            userData.doctor_info = {
                specialty: formData.specialty,
                phone: formData.phone,
                hospital: formData.hospital,
            };
        }

        const result = await register(userData);
        
        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } else {
            setError(result.error);
        }
    };

    const textFieldSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            transition: 'all 0.2s ease',
            '&:hover': {
                boxShadow: '0 0 0 4px rgba(8, 145, 178, 0.1)',
            },
            '&.Mui-focused': {
                boxShadow: '0 0 0 4px rgba(8, 145, 178, 0.15)',
            },
        },
    };

    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Fade in timeout={400}>
                        <Grid container spacing={2.5}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    name="full_name"
                                    label="Họ và tên *"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder="Nguyễn Văn A"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Badge sx={{ color: '#0891B2' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={textFieldSx}
                                />
                            </Grid>
                            {/* Role is fixed to doctor - removed admin option */}
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Vai trò"
                                    value="Bác sĩ"
                                    disabled
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <MedicalServices sx={{ color: '#0891B2' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={textFieldSx}
                                    helperText="Tài khoản mới chỉ được đăng ký với vai trò Bác sĩ"
                                />
                            </Grid>
                            
                            {/* Doctor specific fields */}
                            <Collapse in={formData.role === 'doctor'} sx={{ width: '100%' }}>
                                <Grid container spacing={2.5} sx={{ mt: 0, px: 1 }}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            name="specialty"
                                            label="Chuyên khoa"
                                            value={formData.specialty}
                                            onChange={handleChange}
                                            placeholder="Chẩn đoán hình ảnh"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <LocalHospital sx={{ color: '#10B981' }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={textFieldSx}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            name="phone"
                                            label="Số điện thoại"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="0912345678"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Phone sx={{ color: '#10B981' }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={textFieldSx}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            name="hospital"
                                            label="Bệnh viện / Phòng khám"
                                            value={formData.hospital}
                                            onChange={handleChange}
                                            placeholder="Bệnh viện Bạch Mai"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Business sx={{ color: '#10B981' }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={textFieldSx}
                                        />
                                    </Grid>
                                </Grid>
                            </Collapse>
                        </Grid>
                    </Fade>
                );
            case 1:
                return (
                    <Fade in timeout={400}>
                        <Grid container spacing={2.5}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    name="username"
                                    label="Tên đăng nhập *"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="nguyenvana"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PersonOutlined sx={{ color: '#0891B2' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={textFieldSx}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    name="email"
                                    label="Email *"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="email@example.com"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <EmailOutlined sx={{ color: '#0891B2' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={textFieldSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    name="password"
                                    label="Mật khẩu *"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleChange}
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
                                                    size="small"
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
                                    sx={textFieldSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    name="confirmPassword"
                                    label="Xác nhận mật khẩu *"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlined sx={{ color: '#0891B2' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={textFieldSx}
                                />
                            </Grid>
                        </Grid>
                    </Fade>
                );
            case 2:
                return (
                    <Fade in timeout={400}>
                        <Box>
                            {/* Face Login Toggle */}
                            <Box
                                sx={{
                                    p: 2,
                                    mb: 3,
                                    borderRadius: 3,
                                    bgcolor: alpha('#0891B2', 0.05),
                                    border: `1px solid ${alpha('#0891B2', 0.15)}`,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box
                                            sx={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 2,
                                                bgcolor: alpha('#0891B2', 0.1),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <SecurityIcon sx={{ color: '#0891B2' }} />
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={600}>
                                                Đăng nhập bằng khuôn mặt (Tùy chọn)
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Bạn có thể thiết lập sau trong phần Cài đặt
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Switch
                                        checked={enableFaceLogin}
                                        onChange={(e) => {
                                            setEnableFaceLogin(e.target.checked);
                                            if (!e.target.checked) {
                                                setFaceImages([]);
                                            }
                                        }}
                                        sx={{
                                            '& .MuiSwitch-switchBase.Mui-checked': {
                                                color: '#0891B2',
                                            },
                                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                                backgroundColor: '#0891B2',
                                            },
                                        }}
                                    />
                                </Box>
                            </Box>

                            {/* Face Capture Component */}
                            <Collapse in={enableFaceLogin}>
                                <FaceCapture
                                    onCapture={handleFaceCapture}
                                    minImages={1}
                                    maxImages={1}
                                    initialImages={faceImages}
                                    mode="register"
                                />
                            </Collapse>

                            {/* Skip Option */}
                            {!enableFaceLogin && (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <FaceIcon sx={{ fontSize: 64, color: alpha('#0891B2', 0.3), mb: 2 }} />
                                    <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                                        Bạn có thể thiết lập tính năng này sau
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Vào <strong>Hồ sơ → Nhận diện khuôn mặt</strong> để đăng ký
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Fade>
                );
            case 3:
                return (
                    <Fade in timeout={400}>
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                            {success ? (
                                <Box>
                                    <Box
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mx: 'auto',
                                            mb: 3,
                                            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                                            animation: 'scaleIn 0.5s ease-out',
                                            '@keyframes scaleIn': {
                                                from: { transform: 'scale(0)' },
                                                to: { transform: 'scale(1)' },
                                            },
                                        }}
                                    >
                                        <Check sx={{ fontSize: 40, color: 'white' }} />
                                    </Box>
                                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
                                        Đăng ký thành công! 🎉
                                    </Typography>
                                    <Typography color="text.secondary">
                                        Đang chuyển hướng đến trang đăng nhập...
                                    </Typography>
                                </Box>
                            ) : (
                                <Box>
                                    <Box
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mx: 'auto',
                                            mb: 3,
                                            boxShadow: '0 8px 24px rgba(8, 145, 178, 0.3)',
                                        }}
                                    >
                                        <PersonAddAlt1 sx={{ fontSize: 40, color: 'white' }} />
                                    </Box>
                                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
                                        Xác nhận thông tin
                                    </Typography>
                                    <Typography color="text.secondary" sx={{ mb: 3 }}>
                                        Kiểm tra lại thông tin trước khi đăng ký
                                    </Typography>
                                    
                                    <Box
                                        sx={{
                                            textAlign: 'left',
                                            p: 3,
                                            borderRadius: 3,
                                            bgcolor: alpha('#0891B2', 0.05),
                                            border: `1px solid ${alpha('#0891B2', 0.1)}`,
                                        }}
                                    >
                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">Họ và tên</Typography>
                                                <Typography fontWeight={600}>{formData.full_name || '-'}</Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">Vai trò</Typography>
                                                <Typography fontWeight={600}>
                                                    {formData.role === 'doctor' ? 'Bác sĩ' : 'Quản trị viên'}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Typography variant="caption" color="text.secondary">Email</Typography>
                                                <Typography fontWeight={600}>{formData.email}</Typography>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Typography variant="caption" color="text.secondary">Tên đăng nhập</Typography>
                                                <Typography fontWeight={600}>{formData.username}</Typography>
                                            </Grid>
                                            {formData.role === 'doctor' && formData.specialty && (
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">Chuyên khoa</Typography>
                                                    <Typography fontWeight={600}>{formData.specialty}</Typography>
                                                </Grid>
                                            )}
                                            {formData.role === 'doctor' && formData.hospital && (
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">Bệnh viện</Typography>
                                                    <Typography fontWeight={600}>{formData.hospital}</Typography>
                                                </Grid>
                                            )}
                                            
                                            {/* Face Recognition Status */}
                                            <Grid item xs={12}>
                                                <Divider sx={{ my: 1 }} />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Typography variant="caption" color="text.secondary">Đăng nhập khuôn mặt</Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                    <FaceIcon 
                                                        sx={{ 
                                                            color: faceRegistrationStatus === 'success' ? '#10B981' : '#94A3B8',
                                                            fontSize: 20,
                                                        }} 
                                                    />
                                                    {faceRegistrationStatus === 'success' ? (
                                                        <Chip
                                                            label={`Đã chụp ${faceImages.length} ảnh`}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: alpha('#10B981', 0.1),
                                                                color: '#10B981',
                                                                fontWeight: 600,
                                                            }}
                                                        />
                                                    ) : (
                                                        <Chip
                                                            label="Chưa đăng ký"
                                                            size="small"
                                                            sx={{
                                                                bgcolor: alpha('#94A3B8', 0.1),
                                                                color: '#94A3B8',
                                                                fontWeight: 600,
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Fade>
                );
            default:
                return null;
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 30%, #164E63 70%, #134E4A 100%)',
                py: 4,
            }}
        >
            {/* Animated Background Shapes */}
            <FloatingShape delay={0} duration={8} size={200} top="5%" left="5%" color="#22D3EE" />
            <FloatingShape delay={2} duration={10} size={150} top="70%" left="10%" color="#10B981" />
            <FloatingShape delay={4} duration={12} size={180} top="15%" left="85%" color="#22D3EE" />
            <FloatingShape delay={1} duration={9} size={120} top="80%" left="80%" color="#10B981" />
            
            <Container maxWidth="md" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                <Grow in={mounted} timeout={800}>
                    <Card
                        sx={{
                            borderRadius: 4,
                            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            width: '100%',
                            overflow: 'visible',
                        }}
                    >
                        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
                            {/* Logo & Title */}
                            <Box sx={{ textAlign: 'center', mb: 4 }}>
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
                                <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
                                    Đăng ký tài khoản
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Tạo tài khoản để sử dụng hệ thống Medical Imaging
                                </Typography>
                            </Box>

                            {/* Stepper */}
                            <Stepper 
                                activeStep={activeStep} 
                                alternativeLabel 
                                sx={{ 
                                    mb: 4,
                                    '& .MuiStepLabel-label': {
                                        fontSize: '0.75rem',
                                        mt: 1,
                                    },
                                    '& .MuiStepIcon-root': {
                                        fontSize: '1.5rem',
                                        '&.Mui-active': {
                                            color: '#0891B2',
                                        },
                                        '&.Mui-completed': {
                                            color: '#10B981',
                                        },
                                    },
                                }}
                            >
                                {steps.map((label, index) => (
                                    <Step key={label}>
                                        <StepLabel 
                                            icon={
                                                index === 2 ? (
                                                    <Box
                                                        sx={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: '50%',
                                                            bgcolor: activeStep > index ? '#10B981' : activeStep === index ? '#0891B2' : '#E2E8F0',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <FaceIcon sx={{ fontSize: 14, color: activeStep >= index ? 'white' : '#94A3B8' }} />
                                                    </Box>
                                                ) : undefined
                                            }
                                        >
                                            {label}
                                        </StepLabel>
                                    </Step>
                                ))}
                            </Stepper>

                            {/* Error Alert */}
                            {error && (
                                <Fade in>
                                    <Alert 
                                        severity="error" 
                                        sx={{ 
                                            mb: 3, 
                                            borderRadius: 3,
                                        }}
                                    >
                                        {error}
                                    </Alert>
                                </Fade>
                            )}

                            {/* Form Content */}
                            <form onSubmit={handleSubmit}>
                                {renderStepContent(activeStep)}

                                {/* Navigation Buttons */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, gap: 2 }}>
                                    <Button
                                        disabled={activeStep === 0}
                                        onClick={handleBack}
                                        startIcon={<ArrowBack />}
                                        sx={{
                                            visibility: activeStep === 0 ? 'hidden' : 'visible',
                                            borderRadius: 3,
                                            px: 3,
                                        }}
                                    >
                                        Quay lại
                                    </Button>
                                    
                                    {/* Skip button for face step */}
                                    {activeStep === 2 && enableFaceLogin && (
                                        <Button
                                            onClick={handleSkipFace}
                                            startIcon={<SkipIcon />}
                                            sx={{
                                                borderRadius: 3,
                                                px: 3,
                                                color: 'text.secondary',
                                            }}
                                        >
                                            Bỏ qua
                                        </Button>
                                    )}
                                    
                                    {activeStep === steps.length - 1 ? (
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            disabled={loading || success}
                                            sx={{
                                                flex: 1,
                                                py: 1.5,
                                                borderRadius: 3,
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                                    boxShadow: '0 12px 32px rgba(16, 185, 129, 0.45)',
                                                    transform: 'translateY(-2px)',
                                                },
                                            }}
                                        >
                                            {loading ? (
                                                <CircularProgress size={26} sx={{ color: 'white' }} />
                                            ) : (
                                                'Hoàn tất đăng ký'
                                            )}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="contained"
                                            onClick={handleNext}
                                            endIcon={<ArrowForward />}
                                            sx={{
                                                flex: 1,
                                                py: 1.5,
                                                borderRadius: 3,
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                                                boxShadow: '0 8px 24px rgba(8, 145, 178, 0.35)',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #0E7490 0%, #164E63 100%)',
                                                    boxShadow: '0 12px 32px rgba(8, 145, 178, 0.45)',
                                                    transform: 'translateY(-2px)',
                                                },
                                            }}
                                        >
                                            Tiếp theo
                                        </Button>
                                    )}
                                </Box>
                            </form>

                            {/* Login Link */}
                            <Box sx={{ textAlign: 'center', mt: 4 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Đã có tài khoản?{' '}
                                    <Link
                                        to="/login"
                                        style={{
                                            color: '#0891B2',
                                            textDecoration: 'none',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Đăng nhập
                                    </Link>
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grow>
            </Container>
        </Box>
    );
};

export default RegisterPage;
