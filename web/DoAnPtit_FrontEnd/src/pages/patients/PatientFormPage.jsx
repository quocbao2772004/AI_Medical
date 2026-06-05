/**
 * Patient Form Page (Create/Edit)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    Breadcrumbs,
    Link,
} from '@mui/material';
import {
    Save,
    ArrowBack,
} from '@mui/icons-material';
import { patientsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PatientFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        full_name: '',
        date_of_birth: '',
        gender: 'male',
        phone: '',
        email: '',
        address: '',
        notes: '',
    });

    // Load patient data for edit
    useEffect(() => {
        if (isEdit) {
            loadPatient();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadPatient = async () => {
        setLoading(true);
        try {
            const patient = await patientsAPI.getById(id);
            setFormData({
                full_name: patient.full_name || '',
                date_of_birth: patient.date_of_birth 
                    ? patient.date_of_birth.split('T')[0] 
                    : '',
                gender: patient.gender || 'male',
                phone: patient.phone || '',
                email: patient.email || '',
                address: patient.address || '',
                notes: patient.notes || '',
            });
        } catch (err) {
            setError('Không thể tải thông tin bệnh nhân');
            toast.error('Không thể tải thông tin bệnh nhân');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.full_name.trim()) {
            setError('Vui lòng nhập họ tên bệnh nhân');
            return;
        }

        setSaving(true);
        try {
            if (isEdit) {
                await patientsAPI.update(id, formData);
                toast.success('Đã cập nhật thông tin bệnh nhân');
            } else {
                const newPatient = await patientsAPI.create(formData);
                toast.success('Đã thêm bệnh nhân mới');
                navigate(`/patients/${newPatient.id}`);
                return;
            }
            navigate(`/patients/${id}`);
        } catch (err) {
            const message = err.response?.data?.detail || 'Có lỗi xảy ra';
            setError(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 3 }}>
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => navigate('/dashboard')}
                    sx={{ cursor: 'pointer' }}
                >
                    Dashboard
                </Link>
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => navigate('/patients')}
                    sx={{ cursor: 'pointer' }}
                >
                    Bệnh nhân
                </Link>
                <Typography color="text.primary">
                    {isEdit ? 'Chỉnh sửa' : 'Thêm mới'}
                </Typography>
            </Breadcrumbs>

            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate(-1)}
                >
                    Quay lại
                </Button>
                <Typography variant="h4" fontWeight="bold">
                    {isEdit ? 'Chỉnh sửa bệnh nhân' : 'Thêm bệnh nhân mới'}
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Grid container spacing={3}>
                            {/* Basic Info */}
                            <Grid item xs={12}>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>
                                    Thông tin cơ bản
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    name="full_name"
                                    label="Họ và tên *"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    required
                                />
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <FormControl fullWidth>
                                    <InputLabel>Giới tính</InputLabel>
                                    <Select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        label="Giới tính"
                                    >
                                        <MenuItem value="male">Nam</MenuItem>
                                        <MenuItem value="female">Nữ</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <TextField
                                    fullWidth
                                    name="date_of_birth"
                                    label="Ngày sinh"
                                    type="date"
                                    value={formData.date_of_birth}
                                    onChange={handleChange}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            {/* Contact Info */}
                            <Grid item xs={12}>
                                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                                    Thông tin liên hệ
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    name="phone"
                                    label="Số điện thoại"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    name="email"
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    name="address"
                                    label="Địa chỉ"
                                    value={formData.address}
                                    onChange={handleChange}
                                    multiline
                                    rows={2}
                                />
                            </Grid>

                            {/* Notes */}
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    name="notes"
                                    label="Ghi chú"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    multiline
                                    rows={3}
                                    placeholder="Ghi chú về tiền sử bệnh, dị ứng, v.v."
                                />
                            </Grid>
                        </Grid>

                        {/* Actions */}
                        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button
                                variant="outlined"
                                onClick={() => navigate(-1)}
                                disabled={saving}
                            >
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                                disabled={saving}
                            >
                                {saving ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Thêm bệnh nhân')}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </form>
        </Container>
    );
};

export default PatientFormPage;
