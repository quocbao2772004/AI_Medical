/**
 * Patients List Page - Premium Healthcare UI
 * Design: Modern Cards + Data Table + Smooth Animations
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Button,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    InputAdornment,
    IconButton,
    Chip,
    Avatar,
    Menu,
    MenuItem,
    ListItemIcon,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    LinearProgress,
    alpha,
    Fade,
    Grow,
    Tooltip,
    Paper,
    Skeleton,
} from '@mui/material';
import {
    Add,
    Search,
    MoreVert,
    Visibility,
    Edit,
    Delete,
    MedicalServices,
    Male,
    Female,
    PersonAdd,
    FilterList,
    Download,
    People,
    Close,
    Phone,
    Email,
    LocationOn,
    Cake,
} from '@mui/icons-material';
import { patientsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PatientsListPage = () => {
    const navigate = useNavigate();
    
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Menu & Dialog states
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);

    // Load patients
    const loadPatients = useCallback(async () => {
        setLoading(true);
        try {
            const response = await patientsAPI.getAll({
                page: page + 1,
                page_size: rowsPerPage,
                search: searchQuery || undefined,
            });
            
            const patientsList = response.patients || response.items || response || [];
            setPatients(Array.isArray(patientsList) ? patientsList : []);
            setTotalCount(response.total || patientsList.length || 0);
        } catch (err) {
            console.error('Failed to load patients:', err);
            toast.error('Không thể tải danh sách bệnh nhân');
            setPatients([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, searchQuery]);

    useEffect(() => {
        loadPatients();
    }, [loadPatients]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(0);
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    // Menu handlers
    const handleMenuOpen = (event, patient) => {
        setAnchorEl(event.currentTarget);
        setSelectedPatient(patient);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    // Delete handlers
    const handleDeleteClick = () => {
        handleMenuClose();
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            await patientsAPI.delete(selectedPatient.id);
            toast.success('Đã xóa bệnh nhân');
            loadPatients();
        } catch (err) {
            toast.error('Không thể xóa bệnh nhân');
        }
        setDeleteDialogOpen(false);
        setSelectedPatient(null);
    };

    // View handlers
    const handleViewClick = () => {
        handleMenuClose();
        setViewDialogOpen(true);
    };

    // Calculate age from date of birth
    const calculateAge = (dateOfBirth) => {
        if (!dateOfBirth) return '-';
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Fade in timeout={600}>
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <Avatar
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                                        boxShadow: '0 4px 14px rgba(8, 145, 178, 0.3)',
                                    }}
                                >
                                    <People />
                                </Avatar>
                                <Box>
                                    <Typography variant="h4" fontWeight="bold" sx={{ color: '#1E293B' }}>
                                        Quản lý bệnh nhân
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Quản lý danh sách và thông tin bệnh nhân • {totalCount} bệnh nhân
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Button
                                variant="outlined"
                                startIcon={<FilterList />}
                                sx={{
                                    borderRadius: 3,
                                    borderColor: '#E2E8F0',
                                    color: '#64748B',
                                    '&:hover': {
                                        borderColor: '#0891B2',
                                        bgcolor: alpha('#0891B2', 0.04),
                                    },
                                }}
                            >
                                Bộ lọc
                            </Button>
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

            {/* Search Bar */}
            <Grow in timeout={700}>
                <Card 
                    sx={{ 
                        mb: 3, 
                        borderRadius: 4,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                        border: '1px solid',
                        borderColor: alpha('#0891B2', 0.1),
                    }}
                >
                    <CardContent sx={{ py: 2.5 }}>
                        <TextField
                            fullWidth
                            placeholder="Tìm kiếm theo tên, số điện thoại, địa chỉ..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: '#0891B2' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchQuery && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearchQuery('')}>
                                            <Close fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: alpha('#0891B2', 0.02),
                                    '&:hover': {
                                        bgcolor: alpha('#0891B2', 0.04),
                                    },
                                    '&.Mui-focused': {
                                        bgcolor: 'white',
                                        boxShadow: `0 0 0 4px ${alpha('#0891B2', 0.1)}`,
                                    },
                                },
                            }}
                        />
                    </CardContent>
                </Card>
            </Grow>

            {loading && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

            {/* Patients Table */}
            <Grow in timeout={800}>
                <Card 
                    sx={{ 
                        borderRadius: 4,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                        overflow: 'hidden',
                    }}
                >
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha('#0891B2', 0.04) }}>
                                    <TableCell sx={{ fontWeight: 600, color: '#1E293B', py: 2 }}>
                                        Bệnh nhân
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Giới tính</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Tuổi</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Số điện thoại</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Địa chỉ</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: '#1E293B' }}>
                                        Thao tác
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Skeleton variant="circular" width={44} height={44} />
                                                    <Box>
                                                        <Skeleton width={120} />
                                                        <Skeleton width={80} />
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell><Skeleton width={60} /></TableCell>
                                            <TableCell><Skeleton width={30} /></TableCell>
                                            <TableCell><Skeleton width={100} /></TableCell>
                                            <TableCell><Skeleton width={150} /></TableCell>
                                            <TableCell><Skeleton width={40} /></TableCell>
                                        </TableRow>
                                    ))
                                ) : patients.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} sx={{ py: 10 }}>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Avatar
                                                    sx={{
                                                        width: 80,
                                                        height: 80,
                                                        bgcolor: alpha('#0891B2', 0.1),
                                                        mx: 'auto',
                                                        mb: 2,
                                                    }}
                                                >
                                                    <PersonAdd sx={{ fontSize: 40, color: '#0891B2' }} />
                                                </Avatar>
                                                <Typography variant="h6" sx={{ color: '#1E293B', mb: 1 }}>
                                                    {searchQuery 
                                                        ? 'Không tìm thấy bệnh nhân nào' 
                                                        : 'Chưa có bệnh nhân nào'
                                                    }
                                                </Typography>
                                                <Typography color="text.secondary" sx={{ mb: 3 }}>
                                                    {searchQuery 
                                                        ? 'Thử tìm kiếm với từ khóa khác' 
                                                        : 'Bắt đầu thêm bệnh nhân đầu tiên vào hệ thống'
                                                    }
                                                </Typography>
                                                {!searchQuery && (
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<Add />}
                                                        onClick={() => navigate('/patients/new')}
                                                        sx={{
                                                            borderRadius: 3,
                                                            background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                                                        }}
                                                    >
                                                        Thêm bệnh nhân đầu tiên
                                                    </Button>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    patients.map((patient, index) => (
                                        <Fade in key={patient.id} timeout={300 + index * 50}>
                                            <TableRow
                                                hover
                                                sx={{ 
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        bgcolor: alpha('#0891B2', 0.04),
                                                    },
                                                }}
                                                onClick={() => navigate(`/patients/${patient.id}`)}
                                            >
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Avatar 
                                                            sx={{ 
                                                                width: 44,
                                                                height: 44,
                                                                background: patient.gender === 'male' 
                                                                    ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                                                                    : 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {patient.full_name?.[0] || 'P'}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography fontWeight={600} sx={{ color: '#1E293B' }}>
                                                                {patient.full_name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                ID: {patient.id?.slice(0, 8)}...
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        icon={patient.gender === 'male' ? <Male /> : <Female />}
                                                        label={patient.gender === 'male' ? 'Nam' : 'Nữ'}
                                                        sx={{
                                                            borderRadius: 2,
                                                            fontWeight: 500,
                                                            bgcolor: patient.gender === 'male' 
                                                                ? alpha('#3B82F6', 0.1) 
                                                                : alpha('#EC4899', 0.1),
                                                            color: patient.gender === 'male' 
                                                                ? '#3B82F6' 
                                                                : '#EC4899',
                                                            '& .MuiChip-icon': {
                                                                color: 'inherit',
                                                            },
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography fontWeight={500}>
                                                        {calculateAge(patient.date_of_birth)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ color: patient.phone ? '#1E293B' : '#94A3B8' }}>
                                                        {patient.phone || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography 
                                                        sx={{ 
                                                            color: patient.address ? '#1E293B' : '#94A3B8',
                                                            maxWidth: 200,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {patient.address || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Tùy chọn">
                                                        <IconButton
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMenuOpen(e, patient);
                                                            }}
                                                            sx={{
                                                                '&:hover': {
                                                                    bgcolor: alpha('#0891B2', 0.1),
                                                                },
                                                            }}
                                                        >
                                                            <MoreVert />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        </Fade>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    
                    {patients.length > 0 && (
                        <TablePagination
                            component="div"
                            count={totalCount}
                            page={page}
                            onPageChange={(e, newPage) => setPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            labelRowsPerPage="Số hàng:"
                            sx={{
                                borderTop: '1px solid',
                                borderColor: 'divider',
                            }}
                        />
                    )}
                </Card>
            </Grow>

            {/* Context Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        minWidth: 180,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                    },
                }}
            >
                <MenuItem 
                    onClick={handleViewClick}
                    sx={{ py: 1.5 }}
                >
                    <ListItemIcon><Visibility fontSize="small" sx={{ color: '#0891B2' }} /></ListItemIcon>
                    Xem chi tiết
                </MenuItem>
                <MenuItem 
                    onClick={() => {
                        handleMenuClose();
                        navigate(`/patients/${selectedPatient?.id}/edit`);
                    }}
                    sx={{ py: 1.5 }}
                >
                    <ListItemIcon><Edit fontSize="small" sx={{ color: '#F59E0B' }} /></ListItemIcon>
                    Chỉnh sửa
                </MenuItem>
                <MenuItem 
                    onClick={() => {
                        handleMenuClose();
                        navigate(`/patients/${selectedPatient?.id}`);
                    }}
                    sx={{ py: 1.5 }}
                >
                    <ListItemIcon><MedicalServices fontSize="small" sx={{ color: '#10B981' }} /></ListItemIcon>
                    Hồ sơ bệnh án
                </MenuItem>
                <MenuItem 
                    onClick={handleDeleteClick} 
                    sx={{ py: 1.5, color: '#EF4444' }}
                >
                    <ListItemIcon><Delete fontSize="small" sx={{ color: '#EF4444' }} /></ListItemIcon>
                    Xóa
                </MenuItem>
            </Menu>

            {/* Delete Confirmation Dialog */}
            <Dialog 
                open={deleteDialogOpen} 
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{
                    sx: { borderRadius: 4, p: 1 },
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alpha('#EF4444', 0.1), color: '#EF4444' }}>
                            <Delete />
                        </Avatar>
                        <Typography variant="h6" fontWeight="bold">
                            Xác nhận xóa
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc chắn muốn xóa bệnh nhân <strong>{selectedPatient?.full_name}</strong>?
                    </Typography>
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                        Hành động này không thể hoàn tác.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button 
                        onClick={() => setDeleteDialogOpen(false)}
                        sx={{ borderRadius: 2 }}
                    >
                        Hủy
                    </Button>
                    <Button 
                        onClick={handleDeleteConfirm} 
                        variant="contained"
                        sx={{
                            borderRadius: 2,
                            bgcolor: '#EF4444',
                            '&:hover': { bgcolor: '#DC2626' },
                        }}
                    >
                        Xóa bệnh nhân
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Detail Dialog */}
            <Dialog 
                open={viewDialogOpen} 
                onClose={() => setViewDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 4 },
                }}
            >
                <DialogTitle sx={{ pb: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight="bold">
                            Thông tin bệnh nhân
                        </Typography>
                        <IconButton onClick={() => setViewDialogOpen(false)} size="small">
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedPatient && (
                        <Box sx={{ pt: 2 }}>
                            {/* Profile Header */}
                            <Box sx={{ textAlign: 'center', mb: 4 }}>
                                <Avatar
                                    sx={{
                                        width: 100,
                                        height: 100,
                                        mx: 'auto',
                                        mb: 2,
                                        background: selectedPatient.gender === 'male' 
                                            ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                                            : 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
                                        fontSize: 40,
                                        fontWeight: 600,
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    {selectedPatient.full_name?.[0]}
                                </Avatar>
                                <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
                                    {selectedPatient.full_name}
                                </Typography>
                                <Chip
                                    size="small"
                                    icon={selectedPatient.gender === 'male' ? <Male /> : <Female />}
                                    label={selectedPatient.gender === 'male' ? 'Nam' : 'Nữ'}
                                    sx={{
                                        bgcolor: selectedPatient.gender === 'male' 
                                            ? alpha('#3B82F6', 0.1) 
                                            : alpha('#EC4899', 0.1),
                                        color: selectedPatient.gender === 'male' 
                                            ? '#3B82F6' 
                                            : '#EC4899',
                                    }}
                                />
                            </Box>

                            {/* Info Cards */}
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Paper
                                        sx={{
                                            p: 2,
                                            borderRadius: 3,
                                            bgcolor: alpha('#0891B2', 0.04),
                                            border: '1px solid',
                                            borderColor: alpha('#0891B2', 0.1),
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Cake sx={{ fontSize: 18, color: '#0891B2' }} />
                                            <Typography variant="caption" color="text.secondary">
                                                Ngày sinh
                                            </Typography>
                                        </Box>
                                        <Typography fontWeight={600}>
                                            {selectedPatient.date_of_birth 
                                                ? new Date(selectedPatient.date_of_birth).toLocaleDateString('vi-VN')
                                                : '-'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6}>
                                    <Paper
                                        sx={{
                                            p: 2,
                                            borderRadius: 3,
                                            bgcolor: alpha('#10B981', 0.04),
                                            border: '1px solid',
                                            borderColor: alpha('#10B981', 0.1),
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Phone sx={{ fontSize: 18, color: '#10B981' }} />
                                            <Typography variant="caption" color="text.secondary">
                                                Số điện thoại
                                            </Typography>
                                        </Box>
                                        <Typography fontWeight={600}>
                                            {selectedPatient.phone || '-'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12}>
                                    <Paper
                                        sx={{
                                            p: 2,
                                            borderRadius: 3,
                                            bgcolor: alpha('#F59E0B', 0.04),
                                            border: '1px solid',
                                            borderColor: alpha('#F59E0B', 0.1),
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Email sx={{ fontSize: 18, color: '#F59E0B' }} />
                                            <Typography variant="caption" color="text.secondary">
                                                Email
                                            </Typography>
                                        </Box>
                                        <Typography fontWeight={600}>
                                            {selectedPatient.email || '-'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12}>
                                    <Paper
                                        sx={{
                                            p: 2,
                                            borderRadius: 3,
                                            bgcolor: alpha('#8B5CF6', 0.04),
                                            border: '1px solid',
                                            borderColor: alpha('#8B5CF6', 0.1),
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <LocationOn sx={{ fontSize: 18, color: '#8B5CF6' }} />
                                            <Typography variant="caption" color="text.secondary">
                                                Địa chỉ
                                            </Typography>
                                        </Box>
                                        <Typography fontWeight={600}>
                                            {selectedPatient.address || '-'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button 
                        onClick={() => setViewDialogOpen(false)}
                        sx={{ borderRadius: 2 }}
                    >
                        Đóng
                    </Button>
                    <Button 
                        variant="contained"
                        onClick={() => {
                            setViewDialogOpen(false);
                            navigate(`/patients/${selectedPatient?.id}`);
                        }}
                        sx={{
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                        }}
                    >
                        Xem đầy đủ
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default PatientsListPage;
