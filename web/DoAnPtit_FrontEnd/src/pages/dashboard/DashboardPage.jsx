/**
 * Dashboard Page - Premium Healthcare UI
 * Design: Modern Cards + Glassmorphism + Smooth Animations
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Chip,
    LinearProgress,
    IconButton,
    Paper,
    alpha,
    Skeleton,
    Fade,
    Grow,
    Tooltip,
} from '@mui/material';
import {
    People,
    MedicalServices,
    LocalHospital,
    TrendingUp,
    Add,
    ArrowForward,
    Biotech,
    CheckCircle,
    Error,
    Pending,
    Refresh,
    AdminPanelSettings,
    PersonOutline,
    AssignmentTurnedIn,
    ViewInAr,
    AutoAwesome,
    Schedule,
    NavigateNext,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { statisticsAPI, patientsAPI } from '../../services/api';
import socketService from '../../services/socket';

// Premium Stat Card Component
const StatCard = ({ title, value, icon, color, subtitle, delay = 0 }) => (
    <Grow in timeout={600 + delay * 100}>
        <Card
            sx={{
                height: '100%',
                borderRadius: 4,
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                border: '1px solid',
                borderColor: alpha(color, 0.1),
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'visible',
                position: 'relative',
                '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: `0 12px 32px ${alpha(color, 0.2)}`,
                    '& .stat-icon': {
                        transform: 'scale(1.1) rotate(5deg)',
                    },
                },
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.5)} 100%)`,
                    borderRadius: '16px 16px 0 0',
                },
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                color: 'text.secondary',
                                fontWeight: 500,
                                mb: 1,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontSize: '0.75rem',
                            }}
                        >
                            {title}
                        </Typography>
                        <Typography 
                            variant="h3" 
                            fontWeight="bold" 
                            sx={{ 
                                color: color,
                                lineHeight: 1,
                                mb: 0.5,
                            }}
                        >
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: 'text.secondary',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                }}
                            >
                                <TrendingUp sx={{ fontSize: 14, color: '#10B981' }} />
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    <Avatar
                        className="stat-icon"
                        sx={{
                            bgcolor: alpha(color, 0.12),
                            color: color,
                            width: 56,
                            height: 56,
                            transition: 'transform 0.3s ease',
                        }}
                    >
                        {icon}
                    </Avatar>
                </Box>
            </CardContent>
        </Card>
    </Grow>
);

// Inference Status Badge with animation
const InferenceStatusBadge = ({ status }) => {
    const configs = {
        pending: { color: '#F59E0B', bgcolor: alpha('#F59E0B', 0.1), icon: <Pending fontSize="small" />, label: 'Đang chờ' },
        processing: { color: '#3B82F6', bgcolor: alpha('#3B82F6', 0.1), icon: <Biotech fontSize="small" />, label: 'Đang xử lý' },
        completed: { color: '#10B981', bgcolor: alpha('#10B981', 0.1), icon: <CheckCircle fontSize="small" />, label: 'Hoàn thành' },
        failed: { color: '#EF4444', bgcolor: alpha('#EF4444', 0.1), icon: <Error fontSize="small" />, label: 'Thất bại' },
    };
    const config = configs[status] || configs.pending;
    
    return (
        <Chip
            size="small"
            icon={config.icon}
            label={config.label}
            sx={{
                bgcolor: config.bgcolor,
                color: config.color,
                fontWeight: 600,
                borderRadius: 2,
                '& .MuiChip-icon': {
                    color: config.color,
                },
            }}
        />
    );
};

// Patient List Item
const PatientListItem = ({ patient, index, onClick }) => (
    <Fade in timeout={400 + index * 100}>
        <ListItem
            button
            onClick={onClick}
            sx={{
                borderRadius: 3,
                mb: 1,
                p: 2,
                bgcolor: alpha('#0891B2', 0.02),
                border: '1px solid',
                borderColor: 'transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                    bgcolor: alpha('#0891B2', 0.06),
                    borderColor: alpha('#0891B2', 0.1),
                    transform: 'translateX(8px)',
                    '& .arrow-icon': {
                        opacity: 1,
                        transform: 'translateX(0)',
                    },
                },
            }}
        >
            <ListItemAvatar>
                <Avatar 
                    sx={{ 
                        background: `linear-gradient(135deg, ${alpha('#0891B2', 0.8)} 0%, ${alpha('#0E7490', 0.8)} 100%)`,
                        fontWeight: 600,
                    }}
                >
                    {patient.full_name?.[0] || 'P'}
                </Avatar>
            </ListItemAvatar>
            <ListItemText
                primary={
                    <Typography fontWeight={600} sx={{ color: '#1E293B' }}>
                        {patient.full_name || patient.name}
                    </Typography>
                }
                secondary={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip 
                            label={patient.gender === 'male' ? 'Nam' : 'Nữ'} 
                            size="small" 
                            sx={{ 
                                height: 20, 
                                fontSize: '0.7rem',
                                bgcolor: patient.gender === 'male' ? alpha('#3B82F6', 0.1) : alpha('#EC4899', 0.1),
                                color: patient.gender === 'male' ? '#3B82F6' : '#EC4899',
                            }} 
                        />
                        {patient.phone && (
                            <Typography variant="caption" component="span" color="text.secondary">
                                {patient.phone}
                            </Typography>
                        )}
                    </Box>
                }
                secondaryTypographyProps={{ component: 'div' }}
            />
            <NavigateNext 
                className="arrow-icon"
                sx={{ 
                    color: '#0891B2', 
                    opacity: 0, 
                    transform: 'translateX(-10px)',
                    transition: 'all 0.2s ease',
                }} 
            />
        </ListItem>
    </Fade>
);

const DashboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    
    const [stats, setStats] = useState({
        total_patients: 0,
        total_records: 0,
        total_inferences: 0,
        completed_inferences: 0,
        my_patients: 0,
        my_records: 0,
        my_inferences: 0,
        my_completed_inferences: 0,
    });
    const [recentPatients, setRecentPatients] = useState([]);
    const [recentInferences, setRecentInferences] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load dashboard data
    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsData, patientsData] = await Promise.all([
                statisticsAPI.getDashboard().catch(() => ({})),
                patientsAPI.getAll({ limit: 5 }).catch(() => []),
            ]);

            setStats({
                total_patients: statsData.total_patients || 0,
                total_records: statsData.total_records || 0,
                total_inferences: statsData.total_inferences || 0,
                completed_inferences: statsData.completed_inferences || 0,
                my_patients: statsData.my_patients ?? 0,
                my_records: statsData.my_records ?? 0,
                my_inferences: statsData.my_inferences ?? 0,
                my_completed_inferences: statsData.my_completed_inferences ?? 0,
            });
            
            let patients = [];
            if (Array.isArray(patientsData)) {
                patients = patientsData;
            } else if (patientsData && Array.isArray(patientsData.patients)) {
                patients = patientsData.patients;
            } else if (patientsData && Array.isArray(patientsData.items)) {
                patients = patientsData.items;
            } else if (patientsData && typeof patientsData === 'object') {
                const arrays = Object.values(patientsData).filter(Array.isArray);
                patients = arrays.length > 0 ? arrays[0] : [];
            }
            setRecentPatients(patients);
            
            const inferences = Array.isArray(statsData.recent_inferences) 
                ? statsData.recent_inferences 
                : [];
            setRecentInferences(inferences);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
            setRecentPatients([]);
            setRecentInferences([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    useEffect(() => {
        const unsubComplete = socketService.on('inference_completed', () => loadDashboardData());
        const unsubFailed = socketService.on('inference_failed', () => loadDashboardData());
        return () => {
            unsubComplete();
            unsubFailed();
        };
    }, [loadDashboardData]);

    // Get current time greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Fade in timeout={600}>
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: '#64748B',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    mb: 0.5,
                                }}
                            >
                                <Schedule sx={{ fontSize: 16 }} />
                                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1E293B' }}>
                                    {getGreeting()}, {user?.full_name?.split(' ').pop() || user?.username}! 👋
                                </Typography>
                            </Box>
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                                {isAdmin 
                                    ? 'Quản lý và theo dõi hoạt động hệ thống Medical Imaging' 
                                    : 'Theo dõi và quản lý bệnh nhân của bạn'}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Làm mới">
                                <span>
                                    <IconButton 
                                        onClick={loadDashboardData} 
                                        disabled={loading}
                                        sx={{
                                            bgcolor: alpha('#0891B2', 0.08),
                                            '&:hover': { bgcolor: alpha('#0891B2', 0.12) },
                                        }}
                                    >
                                        <Refresh sx={{ color: '#0891B2' }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={() => navigate('/patients/new')}
                                sx={{
                                    borderRadius: 3,
                                    px: 3,
                                    background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                                    boxShadow: '0 4px 14px rgba(8, 145, 178, 0.3)',
                                    '&:hover': {
                                        boxShadow: '0 6px 20px rgba(8, 145, 178, 0.4)',
                                    },
                                }}
                            >
                                Thêm bệnh nhân
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Fade>

            {loading && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

            {/* Stats - Admin sees total, Doctor sees my_ */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PersonOutline sx={{ color: '#0891B2' }} />
                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#1E293B' }}>
                        {isAdmin ? 'Thống kê hệ thống' : 'Thống kê của bạn'}
                    </Typography>
                    {isAdmin && (
                        <Chip label="Admin" size="small" sx={{ bgcolor: alpha('#EF4444', 0.1), color: '#EF4444', fontWeight: 600 }} />
                    )}
                </Box>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Bệnh nhân"
                            value={isAdmin ? stats.total_patients : stats.my_patients}
                            icon={<People />}
                            color="#0891B2"
                            subtitle={isAdmin ? "Trong hệ thống" : "Đang quản lý"}
                            delay={0}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Hồ sơ bệnh án"
                            value={isAdmin ? stats.total_records : stats.my_records}
                            icon={<MedicalServices />}
                            color="#10B981"
                            subtitle={isAdmin ? "Tất cả hồ sơ" : "Đã tạo"}
                            delay={1}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Tái tạo CT"
                            value={isAdmin ? stats.total_inferences : stats.my_inferences}
                            icon={<ViewInAr />}
                            color="#F59E0B"
                            subtitle={`${isAdmin ? stats.completed_inferences : stats.my_completed_inferences} hoàn thành`}
                            delay={2}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Thành công"
                            value={(() => {
                                const total = isAdmin ? stats.total_inferences : stats.my_inferences;
                                const completed = isAdmin ? stats.completed_inferences : stats.my_completed_inferences;
                                return total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%';
                            })()}
                            icon={<AssignmentTurnedIn />}
                            color="#14B8A6"
                            subtitle={isAdmin ? "Toàn hệ thống" : "Của bạn"}
                            delay={3}
                        />
                    </Grid>
                </Grid>
            </Box>

            {/* Content Grid */}
            <Grid container spacing={3}>
                {/* Recent Patients */}
                <Grid item xs={12} md={6}>
                    <Grow in timeout={800}>
                        <Card 
                            sx={{ 
                                borderRadius: 4, 
                                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                                height: '100%',
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar sx={{ bgcolor: alpha('#0891B2', 0.1), color: '#0891B2' }}>
                                            <People />
                                        </Avatar>
                                        <Typography variant="h6" fontWeight="bold">
                                            Bệnh nhân gần đây
                                        </Typography>
                                    </Box>
                                    <Button
                                        size="small"
                                        endIcon={<ArrowForward />}
                                        onClick={() => navigate('/patients')}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        Xem tất cả
                                    </Button>
                                </Box>
                                
                                {loading ? (
                                    [...Array(3)].map((_, i) => (
                                        <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 1, borderRadius: 3 }} />
                                    ))
                                ) : recentPatients.length === 0 ? (
                                    <Box sx={{ textAlign: 'center', py: 6 }}>
                                        <Avatar sx={{ width: 64, height: 64, bgcolor: alpha('#0891B2', 0.1), mx: 'auto', mb: 2 }}>
                                            <People sx={{ fontSize: 32, color: '#0891B2' }} />
                                        </Avatar>
                                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                                            Chưa có bệnh nhân nào
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            startIcon={<Add />}
                                            onClick={() => navigate('/patients/new')}
                                            sx={{ borderRadius: 2 }}
                                        >
                                            Thêm bệnh nhân đầu tiên
                                        </Button>
                                    </Box>
                                ) : (
                                    <List disablePadding>
                                        {recentPatients.map((patient, index) => (
                                            <PatientListItem
                                                key={patient.id || index}
                                                patient={patient}
                                                index={index}
                                                onClick={() => navigate(`/patients/${patient.id}`)}
                                            />
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </Grow>
                </Grid>

                {/* Recent Inferences */}
                <Grid item xs={12} md={6}>
                    <Grow in timeout={900}>
                        <Card 
                            sx={{ 
                                borderRadius: 4, 
                                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                                height: '100%',
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar sx={{ bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B' }}>
                                            <Biotech />
                                        </Avatar>
                                        <Typography variant="h6" fontWeight="bold">
                                            Tái tạo CT gần đây
                                        </Typography>
                                    </Box>
                                </Box>
                                
                                {loading ? (
                                    [...Array(3)].map((_, i) => (
                                        <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 1, borderRadius: 3 }} />
                                    ))
                                ) : recentInferences.length === 0 ? (
                                    <Box sx={{ textAlign: 'center', py: 6 }}>
                                        <Avatar sx={{ width: 64, height: 64, bgcolor: alpha('#F59E0B', 0.1), mx: 'auto', mb: 2 }}>
                                            <Biotech sx={{ fontSize: 32, color: '#F59E0B' }} />
                                        </Avatar>
                                        <Typography color="text.secondary">
                                            Chưa có lượt tái tạo nào
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List disablePadding>
                                        {recentInferences.map((inference, index) => (
                                            <Fade in key={inference.id || inference.inference_id || index} timeout={400 + index * 100}>
                                                <ListItem
                                                    onClick={() => {
                                                        if (inference.record_id) {
                                                            // Navigate giống như notification click - dùng query param
                                                            const url = `/medical-records/${inference.record_id}?inference_id=${inference.inference_id}`;
                                                            navigate(url);
                                                        }
                                                    }}
                                                    sx={{
                                                        borderRadius: 3,
                                                        mb: 1,
                                                        p: 2,
                                                        bgcolor: alpha('#F59E0B', 0.02),
                                                        border: '1px solid',
                                                        borderColor: alpha('#F59E0B', 0.08),
                                                        cursor: inference.record_id ? 'pointer' : 'default',
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': inference.record_id ? {
                                                            bgcolor: alpha('#F59E0B', 0.08),
                                                            transform: 'translateX(4px)',
                                                            borderColor: alpha('#F59E0B', 0.2),
                                                        } : {},
                                                    }}
                                                >
                                                    <ListItemAvatar>
                                                        <Avatar sx={{ bgcolor: alpha('#10B981', 0.1), color: '#10B981' }}>
                                                            <LocalHospital />
                                                        </Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={
                                                            <Typography fontWeight={600}>
                                                                {inference.patient_name || `Bệnh nhân #${index + 1}`}
                                                            </Typography>
                                                        }
                                                        secondary={
                                                            new Date(inference.created_at).toLocaleString('vi-VN', {
                                                                timeZone: 'Asia/Ho_Chi_Minh',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                second: '2-digit',
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                year: 'numeric'
                                                            })
                                                        }
                                                    />
                                                    <InferenceStatusBadge status={inference.status} />
                                                </ListItem>
                                            </Fade>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </Grow>
                </Grid>

                {/* Quick Actions Banner */}
                <Grid item xs={12}>
                    <Grow in timeout={1000}>
                        <Paper 
                            sx={{ 
                                p: 4, 
                                borderRadius: 4, 
                                background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 50%, #164E63 100%)',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Decorative shapes */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: -50,
                                    right: -50,
                                    width: 200,
                                    height: 200,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.1)',
                                }}
                            />
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: -30,
                                    right: 100,
                                    width: 120,
                                    height: 120,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.05)',
                                }}
                            />
                            
                            <Grid container alignItems="center" spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
                                <Grid item xs={12} md={8}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                                            <AutoAwesome sx={{ color: 'white', fontSize: 28 }} />
                                        </Avatar>
                                        <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
                                            Tái tạo ảnh CT 3D từ X-ray
                                        </Typography>
                                    </Box>
                                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', maxWidth: 600 }}>
                                        Sử dụng công nghệ AI tiên tiến để tái tạo ảnh CT 3D từ ảnh X-ray 2D.
                                        Hỗ trợ chẩn đoán chính xác và nhanh chóng. Thời gian xử lý: 2-3 phút.
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        endIcon={<ArrowForward />}
                                        sx={{
                                            bgcolor: 'white',
                                            color: '#0891B2',
                                            px: 4,
                                            py: 1.5,
                                            borderRadius: 3,
                                            fontWeight: 600,
                                            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                                            '&:hover': { 
                                                bgcolor: '#F0FDFA',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                            },
                                        }}
                                        onClick={() => navigate('/patients')}
                                    >
                                        Bắt đầu ngay
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grow>
                </Grid>
            </Grid>
        </Container>
    );
};

export default DashboardPage;
