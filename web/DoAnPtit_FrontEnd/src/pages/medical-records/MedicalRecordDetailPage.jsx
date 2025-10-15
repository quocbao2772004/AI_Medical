/**
 * Medical Record Detail Page
 * With X-ray upload and CT inference functionality
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Button,
    Grid,
    Chip,
    CircularProgress,
    Breadcrumbs,
    Link,
    Paper,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    TextField,
    IconButton,
    LinearProgress,
} from '@mui/material';
import {
    ArrowBack,
    Delete,
    CloudUpload,
    Image,
    Biotech,
    CheckCircle,
    Error,
    HourglassEmpty,
    Refresh,
    Download,
    ThreeDRotation,
    CalendarMonth,
    Visibility,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { medicalRecordsAPI, inferenceAPI, patientsAPI } from '../../services/api';
import socketService from '../../services/socket';
import toast from 'react-hot-toast';
import config from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import CT3DPreviewModal from '../../components/CT3DPreviewModal';
import XrayViewerModal from '../../components/XrayViewerModal';

/**
 * Build PUBLIC URL for displaying files (images, etc.)
 * DB chỉ lưu relative path: patient_files/xxx/yyy.png
 * FE gắn PUBLIC_URL để hiển thị qua Kong
 * 
 * @param {string} relativePath - Relative path from DB
 * @returns {string} Full public URL
 */
const buildFileUrl = (relativePath) => {
    return config.getFileUrl(relativePath);
};

// Helper function to download file via API (with proper auth)
const downloadFile = async (fileUrl, defaultFilename = 'download') => {
    if (!fileUrl) return;
    
    try {
        // Parse URL to extract patient_id, record_id, filename
        const urlObj = new URL(fileUrl);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        
        // Check if it's a patient_files URL
        if (pathParts[0] === 'patient_files' && pathParts.length >= 4) {
            const patientId = pathParts[1];
            const recordId = pathParts[2];
            const filename = pathParts[3];
            
            // Use API endpoint for download
            const token = localStorage.getItem('access_token');
            const apiUrl = `${urlObj.origin}/api/v1/medical-records/download/${patientId}/${recordId}/${filename}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch file');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            return;
        }
        
        // Fallback: Open in new tab
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
        console.error('Failed to download file:', error);
        // Fallback: Open in new tab
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
};

const MedicalRecordDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const patientIdParam = searchParams.get('patient_id');
    const { user } = useAuth();
    
    // isNew = true when route is /medical-records/new (id is undefined) or id === 'new'
    const isNew = !id || id === 'new';
    
    // State to track highlighted inference (from notification click)
    const [highlightedInferenceId, setHighlightedInferenceId] = useState(null);
    
    const [record, setRecord] = useState(null);
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    
    // Check if current user can edit this record
    // User can edit if: 1) Creating new record, 2) Admin, 3) Created by this user
    const canEdit = isNew || user?.role === 'admin' || (record && record.created_by === user?.id);
    
    // Form data for new record
    const [formData, setFormData] = useState({
        patient_id: patientIdParam || '',
        visit_date: new Date().toISOString().split('T')[0],
        diagnosis: '',
        notes: '',
    });
    
    // Selected X-ray file
    const [xrayFile, setXrayFile] = useState(null);
    const [xrayPreview, setXrayPreview] = useState(null);
    
    // CT 3D Preview Modal state
    const [ct3dPreviewOpen, setCt3dPreviewOpen] = useState(false);
    const [selectedCtUrl, setSelectedCtUrl] = useState(null);
    const [selectedXrayUrl, setSelectedXrayUrl] = useState(null);
    
    // X-ray Viewer Modal state
    const [xrayViewerOpen, setXrayViewerOpen] = useState(false);
    const [viewingXrayUrl, setViewingXrayUrl] = useState(null);

    // Dropzone for X-ray upload
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg'],
        },
        maxFiles: 1,
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                const file = acceptedFiles[0];
                setXrayFile(file);
                setXrayPreview(URL.createObjectURL(file));
            }
        },
    });

    // Load data
    const loadData = useCallback(async () => {
        // If creating new record, only load patient info
        if (isNew) {
            if (patientIdParam) {
                try {
                    const patientData = await patientsAPI.getById(patientIdParam);
                    setPatient(patientData);
                } catch (err) {
                    console.error('Failed to load patient:', err);
                }
            }
            setLoading(false);
            return;
        }

        // Guard against undefined id - only for existing records
        if (!id || id === 'undefined' || id === 'new') {
            console.error('Invalid record ID:', id);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const recordData = await medicalRecordsAPI.getById(id);
            setRecord(recordData);
            
            if (recordData.patient_id) {
                const patientData = await patientsAPI.getById(recordData.patient_id);
                setPatient(patientData);
            }
        } catch (err) {
            console.error('Failed to load record:', err);
            toast.error('Không thể tải hồ sơ bệnh án');
        } finally {
            setLoading(false);
        }
    }, [id, isNew, patientIdParam]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Socket.IO listeners for inference updates
    useEffect(() => {
        const unsubStatus = socketService.on('inference_status', (data) => {
            if (data.medical_record_id === id) {
                // Update UI immediately from notification data
                setRecord(prev => {
                    if (!prev || !prev.infer_history) return prev;
                    const newHistory = prev.infer_history.map(item => 
                        item.id === data.inference_id 
                            ? { ...item, status: data.status }
                            : item
                    );
                    return { ...prev, infer_history: newHistory };
                });
            }
        });

        const unsubComplete = socketService.on('inference_completed', (data) => {
            if (data.medical_record_id === id) {
                toast.success('Tái tạo CT hoàn thành!');
                // Update UI immediately from notification data
                setRecord(prev => {
                    if (!prev || !prev.infer_history) return prev;
                    const newHistory = prev.infer_history.map(item => 
                        item.id === data.inference_id 
                            ? { 
                                ...item, 
                                status: 'completed',
                                ct_path: data.ct_path,
                                ct_gif_path: data.ct_gif_path,
                                completed_at: data.timestamp
                            }
                            : item
                    );
                    return { ...prev, infer_history: newHistory };
                });
                // Also reload to ensure DB sync
                loadData();
            }
        });

        const unsubFailed = socketService.on('inference_failed', (data) => {
            if (data.medical_record_id === id) {
                toast.error('Tái tạo CT thất bại: ' + (data.error || 'Lỗi không xác định'));
                // Update UI immediately from notification data
                setRecord(prev => {
                    if (!prev || !prev.infer_history) return prev;
                    const newHistory = prev.infer_history.map(item => 
                        item.id === data.inference_id 
                            ? { 
                                ...item, 
                                status: 'failed',
                                error: data.error,
                                failed_at: data.timestamp
                            }
                            : item
                    );
                    return { ...prev, infer_history: newHistory };
                });
            }
        });

        return () => {
            unsubStatus();
            unsubComplete();
            unsubFailed();
        };
    }, [id, loadData]);

    // Scroll to and highlight specific inference when navigating from notification
    useEffect(() => {
        const inferenceId = searchParams.get('inference_id');
        if (inferenceId && record?.infer_history?.length > 0) {
            // Wait for DOM to render
            setTimeout(() => {
                const element = document.getElementById(`inference-${inferenceId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Add highlight effect
                    setHighlightedInferenceId(inferenceId);
                    // Remove highlight after 3 seconds
                    setTimeout(() => setHighlightedInferenceId(null), 3000);
                    
                    // Clear inference_id from URL to allow clicking notification again
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('inference_id');
                    setSearchParams(newParams, { replace: true });
                }
            }, 500);
        }
    }, [searchParams, record?.infer_history, setSearchParams]);

    // Handle form change
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (isNew) {
            setFormData(prev => ({ ...prev, [name]: value }));
        } else {
            // Update existing record state
            setRecord(prev => ({ ...prev, [name]: value }));
        }
    };

    // Save record
    const handleSave = async () => {
        if (isNew && !formData.patient_id) {
            toast.error('Vui lòng chọn bệnh nhân');
            return;
        }

        setSaving(true);
        try {
            if (isNew) {
                const newRecord = await medicalRecordsAPI.create(formData);
                toast.success('Đã tạo hồ sơ bệnh án');
                navigate(`/medical-records/${newRecord.id}`, { replace: true });
            } else {
                // Update with current record values
                const updateData = {
                    diagnosis: record?.diagnosis || '',
                    notes: record?.notes || '',
                    symptoms: record?.symptoms || '',
                };
                await medicalRecordsAPI.update(id, updateData);
                toast.success('Đã cập nhật hồ sơ');
                loadData();
            }
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Không thể lưu hồ sơ';
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    // Start inference
    const handleStartInference = async () => {
        if (!xrayFile) {
            toast.error('Vui lòng chọn ảnh X-ray');
            return;
        }

        // Save current scroll position
        const scrollPosition = window.scrollY;
        
        setUploading(true);
        try {
            await inferenceAPI.startInference(id, xrayFile);
            toast.success('Đã bắt đầu tái tạo CT. Vui lòng đợi...');
            setXrayFile(null);
            setXrayPreview(null);
            await loadData();
            
            // Restore scroll position after data reload
            requestAnimationFrame(() => {
                window.scrollTo({ top: scrollPosition, behavior: 'instant' });
            });
        } catch (err) {
            toast.error('Không thể bắt đầu tái tạo CT');
        } finally {
            setUploading(false);
        }
    };

    // Delete record
    const handleDelete = async () => {
        try {
            await medicalRecordsAPI.delete(id);
            toast.success('Đã xóa hồ sơ bệnh án');
            navigate(`/patients/${record?.patient_id}`);
        } catch (err) {
            toast.error('Không thể xóa hồ sơ');
        }
        setDeleteDialogOpen(false);
    };

    if (loading) {
        return (
            <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
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
                {patient && (
                    <Link
                        underline="hover"
                        color="inherit"
                        onClick={() => navigate(`/patients/${patient.id}`)}
                        sx={{ cursor: 'pointer' }}
                    >
                        {patient.full_name}
                    </Link>
                )}
                <Typography color="text.primary">
                    {isNew ? 'Tạo hồ sơ mới' : 'Hồ sơ bệnh án'}
                </Typography>
            </Breadcrumbs>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>
                        Quay lại
                    </Button>
                    <Typography variant="h4" fontWeight="bold">
                        {isNew ? 'Tạo hồ sơ bệnh án' : 'Chi tiết hồ sơ'}
                    </Typography>
                </Box>
                {!isNew && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {/* Show creator info */}
                        {record?.doctor_name && (
                            <Chip 
                                label={`Bác sĩ: ${record.doctor_name}`}
                                size="small"
                                color={canEdit ? 'success' : 'default'}
                                variant="outlined"
                            />
                        )}
                        <IconButton onClick={loadData}>
                            <Refresh />
                        </IconButton>
                        {canEdit && (
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Delete />}
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                Xóa
                            </Button>
                        )}
                    </Box>
                )}
            </Box>

            {/* Permission notice */}
            {!isNew && !canEdit && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Bạn chỉ có quyền xem hồ sơ này. Chỉ bác sĩ tạo hồ sơ mới được sửa.
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Record Info */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 3, height: '100%' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                                Thông tin hồ sơ
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            {patient && (
                                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Bệnh nhân
                                    </Typography>
                                    <Typography variant="h6">{patient.full_name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {patient.gender === 'male' ? 'Nam' : 'Nữ'} • {patient.phone || 'Chưa có SĐT'}
                                    </Typography>
                                </Box>
                            )}

                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        name="visit_date"
                                        label="Ngày khám"
                                        type="date"
                                        value={isNew ? formData.visit_date : (record?.visit_date?.split('T')[0] || '')}
                                        onChange={handleChange}
                                        InputLabelProps={{ shrink: true }}
                                        disabled={!isNew}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        name="diagnosis"
                                        label="Chẩn đoán"
                                        value={isNew ? formData.diagnosis : (record?.diagnosis || '')}
                                        onChange={handleChange}
                                        multiline
                                        rows={3}
                                        disabled={!canEdit}
                                        helperText={!canEdit ? 'Bạn không có quyền sửa hồ sơ này' : ''}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        name="notes"
                                        label="Ghi chú"
                                        value={isNew ? formData.notes : (record?.notes || '')}
                                        onChange={handleChange}
                                        multiline
                                        rows={3}
                                        disabled={!canEdit}
                                    />
                                </Grid>
                            </Grid>

                            {/* Save button - show when creating new OR when can edit existing */}
                            {(isNew || canEdit) && (
                                <Box sx={{ mt: 3 }}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={handleSave}
                                        disabled={saving || !canEdit}
                                    >
                                        {saving ? <CircularProgress size={24} /> : (isNew ? 'Tạo hồ sơ' : 'Lưu thay đổi')}
                                    </Button>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* X-ray Upload & Inference */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 3, height: '100%' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                                Tái tạo CT 3D
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            {isNew ? (
                                <Alert severity="info">
                                    Vui lòng tạo hồ sơ trước khi tải ảnh X-ray
                                </Alert>
                            ) : !canEdit ? (
                                <Alert severity="warning">
                                    Bạn không có quyền tải ảnh X-ray lên hồ sơ này. Chỉ bác sĩ tạo hồ sơ hoặc admin mới được phép.
                                </Alert>
                            ) : (
                                <>
                                    {/* Upload Zone */}
                                    <Paper
                                        {...getRootProps()}
                                        sx={{
                                            p: 4,
                                            textAlign: 'center',
                                            border: '2px dashed',
                                            borderColor: isDragActive ? 'primary.main' : 'grey.300',
                                            bgcolor: isDragActive ? 'primary.50' : 'grey.50',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                borderColor: 'primary.main',
                                                bgcolor: 'primary.50',
                                            },
                                        }}
                                    >
                                        <input {...getInputProps()} />
                                        {xrayPreview ? (
                                            <Box>
                                                <img
                                                    src={xrayPreview}
                                                    alt="X-ray preview"
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: 200,
                                                        objectFit: 'contain',
                                                    }}
                                                />
                                                <Typography variant="body2" sx={{ mt: 1 }}>
                                                    {xrayFile?.name}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Box>
                                                <CloudUpload sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                                <Typography>
                                                    Kéo thả ảnh X-ray vào đây
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    hoặc click để chọn file
                                                </Typography>
                                            </Box>
                                        )}
                                    </Paper>

                                    {xrayFile && (
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            color="primary"
                                            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <Biotech />}
                                            onClick={handleStartInference}
                                            disabled={uploading}
                                            sx={{ mt: 2 }}
                                        >
                                            {uploading ? 'Đang tải lên...' : 'Bắt đầu tái tạo CT'}
                                        </Button>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Inference History - Full width with images */}
                {!isNew && (
                    <Grid item xs={12}>
                        <Card sx={{ borderRadius: 3 }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        Lịch sử tái tạo CT ({record?.infer_history?.length || 0} lần)
                                    </Typography>
                                </Box>
                                
                                {(!record?.infer_history || record.infer_history.length === 0) ? (
                                    <Paper 
                                        sx={{ 
                                            p: 4, 
                                            textAlign: 'center', 
                                            bgcolor: 'grey.50',
                                            borderRadius: 3,
                                            border: '2px dashed',
                                            borderColor: 'grey.300',
                                        }}
                                    >
                                        <Biotech sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            Chưa có lượt tái tạo CT nào
                                        </Typography>
                                        <Typography color="text.secondary">
                                            Tải ảnh X-ray ở trên và bấm "Bắt đầu tái tạo CT" để bắt đầu
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <Grid container spacing={3}>
                                        {record.infer_history.map((item, index) => (
                                            <Grid item xs={12} key={item.id || index}>
                                                <Card 
                                                    id={`inference-${item.id}`}
                                                    sx={{ 
                                                        borderRadius: 3,
                                                        overflow: 'hidden',
                                                        transition: 'all 0.3s ease',
                                                        border: highlightedInferenceId === item.id ? '3px solid' : '1px solid',
                                                        borderColor: highlightedInferenceId === item.id ? '#0891B2' :
                                                                     item.status === 'completed' ? 'success.light' : 
                                                                     item.status === 'failed' ? 'error.light' : 'divider',
                                                        boxShadow: highlightedInferenceId === item.id 
                                                            ? '0 0 20px rgba(8, 145, 178, 0.3)' 
                                                            : 'none',
                                                        animation: highlightedInferenceId === item.id 
                                                            ? 'pulse 1.5s ease-in-out 2' 
                                                            : 'none',
                                                        '@keyframes pulse': {
                                                            '0%, 100%': { boxShadow: '0 0 20px rgba(8, 145, 178, 0.3)' },
                                                            '50%': { boxShadow: '0 0 30px rgba(8, 145, 178, 0.5)' },
                                                        },
                                                        '&:hover': {
                                                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                                        },
                                                    }}
                                                >
                                                    {/* Header with status and time */}
                                                    <Box 
                                                        sx={{ 
                                                            px: 2, 
                                                            py: 1.5, 
                                                            bgcolor: item.status === 'completed' ? 'success.50' : 
                                                                     item.status === 'failed' ? 'error.50' : 
                                                                     item.status === 'processing' ? 'info.50' : 'warning.50',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            borderBottom: '1px solid',
                                                            borderColor: 'divider',
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <CalendarMonth sx={{ fontSize: 18 }} />
                                                            <Typography variant="body2" fontWeight="medium">
                                                                Lần {index + 1} - {new Date(item.created_at).toLocaleString('vi-VN')}
                                                            </Typography>
                                                        </Box>
                                                        <Chip
                                                            size="small"
                                                            icon={
                                                                item.status === 'completed' ? <CheckCircle /> :
                                                                item.status === 'failed' ? <Error /> :
                                                                item.status === 'processing' ? <Biotech /> :
                                                                <HourglassEmpty />
                                                            }
                                                            label={
                                                                item.status === 'completed' ? 'Hoàn thành' :
                                                                item.status === 'failed' ? 'Thất bại' :
                                                                item.status === 'processing' ? 'Đang xử lý' :
                                                                'Đang chờ'
                                                            }
                                                            color={
                                                                item.status === 'completed' ? 'success' :
                                                                item.status === 'failed' ? 'error' :
                                                                item.status === 'processing' ? 'info' :
                                                                'warning'
                                                            }
                                                        />
                                                    </Box>

                                                    {/* Images side-by-side */}
                                                    <Grid container>
                                                        {/* X-ray Image */}
                                                        <Grid item xs={12} md={6}>
                                                            <Box 
                                                                sx={{ 
                                                                    position: 'relative',
                                                                    height: 280,
                                                                    bgcolor: 'grey.900',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    overflow: 'hidden',
                                                                    borderRight: { md: '1px solid' },
                                                                    borderColor: { md: 'divider' },
                                                                }}
                                                            >
                                                                <Typography 
                                                                    variant="caption" 
                                                                    sx={{ 
                                                                        position: 'absolute', 
                                                                        top: 8, 
                                                                        left: 8, 
                                                                        bgcolor: 'rgba(0,0,0,0.7)',
                                                                        color: 'white',
                                                                        px: 1,
                                                                        py: 0.5,
                                                                        borderRadius: 1,
                                                                        fontWeight: 'bold',
                                                                    }}
                                                                >
                                                                    📷 ẢNH X-RAY
                                                                </Typography>
                                                                {item.xray_path ? (
                                                                    <img
                                                                        src={buildFileUrl(item.xray_path)}
                                                                        alt="X-ray"
                                                                        style={{
                                                                            maxWidth: '100%',
                                                                            maxHeight: '100%',
                                                                            objectFit: 'contain',
                                                                        }}
                                                                        onError={(e) => {
                                                                            e.target.style.display = 'none';
                                                                            e.target.nextSibling.style.display = 'flex';
                                                                        }}
                                                                    />
                                                                ) : null}
                                                                <Box 
                                                                    sx={{ 
                                                                        display: item.xray_path ? 'none' : 'flex',
                                                                        flexDirection: 'column',
                                                                        alignItems: 'center',
                                                                        color: 'grey.500',
                                                                    }}
                                                                >
                                                                    <Image sx={{ fontSize: 64, mb: 1 }} />
                                                                    <Typography variant="body2">Không có ảnh X-ray</Typography>
                                                                </Box>
                                                            </Box>
                                                        </Grid>

                                                        {/* CT Image / GIF Preview */}
                                                        <Grid item xs={12} md={6}>
                                                            <Box 
                                                                sx={{ 
                                                                    position: 'relative',
                                                                    height: 280,
                                                                    bgcolor: 'grey.900',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    overflow: 'hidden',
                                                                }}
                                                            >
                                                                <Typography 
                                                                    variant="caption" 
                                                                    sx={{ 
                                                                        position: 'absolute', 
                                                                        top: 8, 
                                                                        left: 8, 
                                                                        bgcolor: 'rgba(0,0,0,0.7)',
                                                                        color: 'white',
                                                                        px: 1,
                                                                        py: 0.5,
                                                                        borderRadius: 1,
                                                                        fontWeight: 'bold',
                                                                    }}
                                                                >
                                                                    🩻 KẾT QUẢ CT 3D
                                                                </Typography>
                                                                
                                                                {item.status === 'completed' && item.ct_path ? (
                                                                    <>
                                                                        {/* Try to show GIF preview if available */}
                                                                        <img
                                                                            src={buildFileUrl(item.ct_path.replace('.nii.gz', '.gif').replace('_denormalized_none_style', '_none_style'))}
                                                                            alt="CT Preview"
                                                                            style={{
                                                                                maxWidth: '100%',
                                                                                maxHeight: '100%',
                                                                                objectFit: 'contain',
                                                                            }}
                                                                            onError={(e) => {
                                                                                // If GIF not found, show static message
                                                                                e.target.style.display = 'none';
                                                                                e.target.nextSibling.style.display = 'flex';
                                                                            }}
                                                                        />
                                                                        <Box 
                                                                            sx={{ 
                                                                                display: 'none',
                                                                                flexDirection: 'column',
                                                                                alignItems: 'center',
                                                                                color: 'success.light',
                                                                            }}
                                                                        >
                                                                            <ThreeDRotation sx={{ fontSize: 64, mb: 1 }} />
                                                                            <Typography variant="body2">CT 3D sẵn sàng</Typography>
                                                                            <Typography variant="caption" color="grey.500">
                                                                                Bấm "Xem CT 3D" để xem chi tiết
                                                                            </Typography>
                                                                        </Box>
                                                                    </>
                                                                ) : item.status === 'processing' ? (
                                                                    <Box 
                                                                        sx={{ 
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            color: 'info.light',
                                                                        }}
                                                                    >
                                                                        <CircularProgress size={64} sx={{ mb: 2 }} />
                                                                        <Typography variant="body2">Đang xử lý AI...</Typography>
                                                                        <Typography variant="caption" color="grey.500">
                                                                            Vui lòng đợi 2-3 phút
                                                                        </Typography>
                                                                    </Box>
                                                                ) : item.status === 'failed' ? (
                                                                    <Box 
                                                                        sx={{ 
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            color: 'error.light',
                                                                        }}
                                                                    >
                                                                        <Error sx={{ fontSize: 64, mb: 1 }} />
                                                                        <Typography variant="body2">Tái tạo thất bại</Typography>
                                                                        <Typography variant="caption" color="grey.500" sx={{ maxWidth: 200, textAlign: 'center' }}>
                                                                            {item.error || 'Vui lòng thử lại'}
                                                                        </Typography>
                                                                    </Box>
                                                                ) : (
                                                                    <Box 
                                                                        sx={{ 
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            color: 'warning.light',
                                                                        }}
                                                                    >
                                                                        <HourglassEmpty sx={{ fontSize: 64, mb: 1 }} />
                                                                        <Typography variant="body2">Đang chờ xử lý</Typography>
                                                                    </Box>
                                                                )}
                                                                
                                                                {/* Processing overlay */}
                                                                {item.status === 'processing' && (
                                                                    <Box
                                                                        sx={{
                                                                            position: 'absolute',
                                                                            bottom: 0,
                                                                            left: 0,
                                                                            right: 0,
                                                                        }}
                                                                    >
                                                                        <LinearProgress />
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        </Grid>
                                                    </Grid>
                                                    
                                                    {/* Action buttons */}
                                                    <CardContent sx={{ p: 2, bgcolor: 'grey.50' }}>
                                                        {item.status === 'failed' && item.error && (
                                                            <Alert severity="error" sx={{ mb: 2 }}>
                                                                <Typography variant="body2">{item.error}</Typography>
                                                            </Alert>
                                                        )}
                                                        
                                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                            {item.status === 'completed' && item.ct_path && (
                                                                <>
                                                                    <Button
                                                                        variant="contained"
                                                                        size="small"
                                                                        startIcon={<ThreeDRotation />}
                                                                        onClick={() => {
                                                                            setSelectedCtUrl(buildFileUrl(item.ct_path));
                                                                            setSelectedXrayUrl(buildFileUrl(item.xray_path));
                                                                            setCt3dPreviewOpen(true);
                                                                        }}
                                                                    >
                                                                        Xem CT 3D
                                                                    </Button>
                                                                    {item.xray_path && (
                                                                        <>
                                                                            <Button
                                                                                variant="outlined"
                                                                                size="small"
                                                                                startIcon={<Visibility />}
                                                                                onClick={() => {
                                                                                    setViewingXrayUrl(buildFileUrl(item.xray_path));
                                                                                    setXrayViewerOpen(true);
                                                                                }}
                                                                            >
                                                                                Xem X-ray
                                                                            </Button>
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => downloadFile(buildFileUrl(item.xray_path), 'xray.png')}
                                                                                title="Tải X-ray"
                                                                                sx={{ border: 1, borderColor: 'divider' }}
                                                                            >
                                                                                <Image fontSize="small" />
                                                                            </IconButton>
                                                                        </>
                                                                    )}
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => downloadFile(buildFileUrl(item.ct_path), 'ct_result.nii.gz')}
                                                                        title="Tải NIfTI"
                                                                        sx={{ border: 1, borderColor: 'divider' }}
                                                                    >
                                                                        <Download fontSize="small" />
                                                                    </IconButton>
                                                                </>
                                                            )}
                                                            {item.status === 'processing' && (
                                                                <Typography variant="body2" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <CircularProgress size={16} />
                                                                    Đang xử lý... {item.progress ? `${item.progress}%` : ''}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>

            {/* Delete Confirmation */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc chắn muốn xóa hồ sơ bệnh án này? 
                        Tất cả dữ liệu tái tạo CT liên quan cũng sẽ bị xóa.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* CT 3D Preview Modal */}
            <CT3DPreviewModal
                open={ct3dPreviewOpen}
                onClose={() => {
                    setCt3dPreviewOpen(false);
                    setSelectedCtUrl(null);
                    setSelectedXrayUrl(null);
                }}
                ctFileUrl={selectedCtUrl}
                xrayUrl={selectedXrayUrl}
                patientName={patient?.full_name}
            />
            
            {/* X-ray Viewer Modal */}
            <XrayViewerModal
                open={xrayViewerOpen}
                onClose={() => {
                    setXrayViewerOpen(false);
                    setViewingXrayUrl(null);
                }}
                imageUrl={viewingXrayUrl}
                title={`X-ray - ${patient?.full_name || 'Bệnh nhân'}`}
            />
        </Container>
    );
};

export default MedicalRecordDetailPage;
