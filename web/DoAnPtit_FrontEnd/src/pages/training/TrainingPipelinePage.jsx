/**
 * Training Pipeline Page - Real Data Version với CT Viewer đầy đủ
 * Demo quy trình training từ LIDC DICOM → DiffDRR → CycleGAN → Xray2CT
 * Sử dụng API backend thật + DiffDRR thật + CycleGAN thật
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Card,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Divider,
  Alert,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  CircularProgress,
  alpha,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  RestartAlt as RestartIcon,
  CheckCircle as CheckIcon,
  Transform as TransformIcon,
  Image as ImageIcon,
  Storage as StorageIcon,
  ArrowForward as ArrowIcon,
  FolderOpen as FolderIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  ViewInAr as ViewInArIcon,
  Fullscreen as FullscreenIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon,
} from '@mui/icons-material';
import api from '../../services/api';

// ==================== Components ====================

const GlassCard = ({ children, sx = {}, ...props }) => (
  <Paper
    elevation={0}
    sx={{
      background: alpha('#ffffff', 0.9),
      backdropFilter: 'blur(20px)',
      border: `1px solid ${alpha('#E2E8F0', 0.8)}`,
      borderRadius: 3,
      overflow: 'hidden',
      ...sx,
    }}
    {...props}
  >
    {children}
  </Paper>
);

const StepCard = ({ title, description, status, children, expanded, onToggle, onRun, stepNumber }) => {
  const theme = useTheme();
  
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return theme.palette.success.main;
      case 'processing': return theme.palette.primary.main;
      case 'error': return theme.palette.error.main;
      default: return theme.palette.grey[400];
    }
  };

  return (
    <GlassCard sx={{ mb: 3, borderLeft: `4px solid ${getStatusColor()}` }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          sx={{
            width: 56, height: 56,
            background: status === 'completed'
              ? `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.light})`
              : status === 'processing'
                ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`
                : alpha(theme.palette.grey[400], 0.2),
            color: status === 'pending' ? theme.palette.grey[500] : '#fff',
            fontSize: '1.2rem', fontWeight: 700,
          }}
        >
          {status === 'completed' ? <CheckIcon /> : status === 'processing' ? <CircularProgress size={28} sx={{ color: '#fff' }} /> : stepNumber}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={600}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">{description}</Typography>
        </Box>
        <Chip
          label={status === 'completed' ? 'Hoàn thành' : status === 'processing' ? 'Đang xử lý...' : 'Chờ xử lý'}
          size="small"
          sx={{ bgcolor: alpha(getStatusColor(), 0.1), color: getStatusColor(), fontWeight: 600 }}
        />
        {onRun && status !== 'completed' && status !== 'processing' && (
          <Button variant="contained" size="small" startIcon={<PlayIcon />} onClick={onRun}
            sx={{ background: 'linear-gradient(135deg, #0891B2, #06B6D4)', textTransform: 'none', borderRadius: 2 }}>
            Chạy
          </Button>
        )}
        <IconButton onClick={onToggle} sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
          <ExpandMoreIcon />
        </IconButton>
      </Box>
      {status === 'processing' && <LinearProgress sx={{ height: 3 }} />}
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 3, bgcolor: alpha('#F8FAFC', 0.5) }}>{children}</Box>
      </Collapse>
    </GlassCard>
  );
};

// ==================== CT Viewer Component ====================
const CTViewer = ({ patientId, patientInfo, onClose }) => {
  const [allSlices, setAllSlices] = useState([]);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState('lung');
  const [viewMode, setViewMode] = useState('single'); // single, grid
  
  const windowPresets = [
    { value: 'lung', label: 'Lung' },
    { value: 'mediastinum', label: 'Mediastinum' },
    { value: 'bone', label: 'Bone' },
    { value: 'soft_tissue', label: 'Soft Tissue' },
  ];
  
  useEffect(() => {
    const fetchAllSlices = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/training-pipeline/patients/${patientId}/all-slices`);
        setAllSlices(response.data.slices || []);
      } catch (err) {
        console.error('Error fetching slices:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (patientId) {
      fetchAllSlices();
    }
  }, [patientId]);
  
  const handleSliceChange = (event, newValue) => {
    setCurrentSlice(newValue);
  };
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      setCurrentSlice(prev => Math.min(prev + 1, allSlices.length - 1));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      setCurrentSlice(prev => Math.max(prev - 1, 0));
    }
  }, [allSlices.length]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Đang tải {patientInfo?.num_slices || 0} slices...</Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" fontWeight={600}>
          Window Preset:
        </Typography>
        <ToggleButtonGroup
          value={window}
          exclusive
          onChange={(e, v) => v && setWindow(v)}
          size="small"
        >
          {windowPresets.map(preset => (
            <ToggleButton key={preset.value} value={preset.value} sx={{ textTransform: 'none' }}>
              {preset.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        
        <Box sx={{ flex: 1 }} />
        
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="single"><ViewListIcon /></ToggleButton>
          <ToggleButton value="grid"><GridViewIcon /></ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      {viewMode === 'single' ? (
        /* Single View */
        <Box>
          <Box sx={{ 
            bgcolor: '#000', 
            borderRadius: 2, 
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
          }}>
            {allSlices[currentSlice]?.image_data ? (
              <Box
                component="img"
                src={allSlices[currentSlice].image_data}
                alt={`Slice ${currentSlice}`}
                sx={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }}
              />
            ) : (
              <Typography color="grey.500">No image</Typography>
            )}
          </Box>
          
          {/* Slice Slider */}
          <Box sx={{ mt: 2, px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => setCurrentSlice(prev => Math.max(prev - 1, 0))} disabled={currentSlice === 0}>
                <PrevIcon />
              </IconButton>
              <Slider
                value={currentSlice}
                onChange={handleSliceChange}
                min={0}
                max={allSlices.length - 1}
                valueLabelDisplay="on"
                valueLabelFormat={(v) => `Slice ${v + 1}`}
                sx={{ flex: 1 }}
              />
              <IconButton onClick={() => setCurrentSlice(prev => Math.min(prev + 1, allSlices.length - 1))} disabled={currentSlice >= allSlices.length - 1}>
                <NextIcon />
              </IconButton>
            </Box>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              Slice {currentSlice + 1} / {allSlices.length} | Dùng ↑↓ hoặc ←→ để chuyển slice
            </Typography>
          </Box>
        </Box>
      ) : (
        /* Grid View */
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
          gap: 1,
          maxHeight: 500,
          overflow: 'auto',
        }}>
          {allSlices.map((slice, idx) => (
            <Box
              key={idx}
              onClick={() => { setCurrentSlice(idx); setViewMode('single'); }}
              sx={{
                cursor: 'pointer',
                border: idx === currentSlice ? '2px solid #0891B2' : '2px solid transparent',
                borderRadius: 1,
                overflow: 'hidden',
                transition: 'all 0.2s',
                '&:hover': { opacity: 0.8, transform: 'scale(1.02)' },
              }}
            >
              {slice.image_data ? (
                <Box component="img" src={slice.image_data} alt={`Slice ${idx}`} sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
              ) : (
                <Box sx={{ width: '100%', aspectRatio: '1', bgcolor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="caption" color="grey.500">N/A</Typography>
                </Box>
              )}
              <Box sx={{ bgcolor: '#1E293B', p: 0.5, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#fff' }}>{idx + 1}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

// ==================== Main Component ====================

const TrainingPipelinePage = () => {
  const theme = useTheme();
  
  // State
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Steps state
  const [expandedSteps, setExpandedSteps] = useState({ step1: true, step2: false, step3: false, step4: false });
  const [stepsStatus, setStepsStatus] = useState({
    step1: 'pending', step2: 'pending', step3: 'pending', step4: 'pending',
  });
  
  // Results state
  const [patientInfo, setPatientInfo] = useState(null);
  const [drrResult, setDrrResult] = useState(null);
  const [cycleganResult, setCycleganResult] = useState(null);
  const [xray2ctResult, setXray2ctResult] = useState(null);
  
  // Dialog & viewer state
  const [previewDialog, setPreviewDialog] = useState({ open: false, image: null, title: '' });
  const [ctViewerOpen, setCtViewerOpen] = useState(false);
  const [sliceIndex, setSliceIndex] = useState(0);
  
  // ==================== API Calls ====================
  
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/training-pipeline/patients');
      setPatients(response.data.patients || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Không thể tải danh sách bệnh nhân');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => { fetchPatients(); }, [fetchPatients]);
  
  const handlePatientSelect = async (patientId) => {
    setSelectedPatient(patientId);
    setStepsStatus({ step1: 'processing', step2: 'pending', step3: 'pending', step4: 'pending' });
    setDrrResult(null);
    setCycleganResult(null);
    setXray2ctResult(null);
    
    try {
      const infoResponse = await api.get(`/training-pipeline/patients/${patientId}/info`);
      setPatientInfo(infoResponse.data);
      setStepsStatus(prev => ({ ...prev, step1: 'completed' }));
      setExpandedSteps({ step1: true, step2: true, step3: false, step4: false });
    } catch (err) {
      console.error('Error fetching patient info:', err);
      setStepsStatus(prev => ({ ...prev, step1: 'error' }));
      setError('Không thể tải thông tin bệnh nhân');
    }
  };
  
  // Step 2: Generate DRR (sử dụng DiffDRR thật)
  const runDiffDRR = async () => {
    if (!selectedPatient) return;
    setStepsStatus(prev => ({ ...prev, step2: 'processing' }));
    
    try {
      const response = await api.post(`/training-pipeline/diffdrr/generate/${selectedPatient}`);
      setDrrResult(response.data);
      setStepsStatus(prev => ({ ...prev, step2: 'completed' }));
      setExpandedSteps(prev => ({ ...prev, step2: true, step3: true }));
    } catch (err) {
      console.error('Error generating DRR:', err);
      setStepsStatus(prev => ({ ...prev, step2: 'error' }));
      setError(`Lỗi DiffDRR: ${err.response?.data?.detail || err.message}`);
    }
  };
  
  // Step 3: CycleGAN (sử dụng model thật)
  const runCycleGAN = async () => {
    if (!selectedPatient || !drrResult) return;
    setStepsStatus(prev => ({ ...prev, step3: 'processing' }));
    
    try {
      const response = await api.post(`/training-pipeline/cyclegan/convert/${selectedPatient}`);
      setCycleganResult(response.data);
      setStepsStatus(prev => ({ ...prev, step3: 'completed' }));
      setExpandedSteps(prev => ({ ...prev, step3: true, step4: true }));
    } catch (err) {
      console.error('Error in CycleGAN:', err);
      setStepsStatus(prev => ({ ...prev, step3: 'error' }));
      setError(`Lỗi CycleGAN: ${err.response?.data?.detail || err.message}`);
    }
  };
  
  // Step 4: Xray2CT
  const runXray2CT = async () => {
    if (!selectedPatient || !cycleganResult) return;
    setStepsStatus(prev => ({ ...prev, step4: 'processing' }));
    
    try {
      const response = await api.post(`/training-pipeline/xray2ct/reconstruct/${selectedPatient}`);
      setXray2ctResult(response.data);
      setStepsStatus(prev => ({ ...prev, step4: 'completed' }));
    } catch (err) {
      console.error('Error in Xray2CT:', err);
      setStepsStatus(prev => ({ ...prev, step4: 'error' }));
      setError(`Lỗi Xray2CT: ${err.response?.data?.detail || err.message}`);
    }
  };
  
  const runFullPipeline = async () => {
    if (!selectedPatient) return;
    await runDiffDRR();
  };
  
  // Chạy tiếp sau DiffDRR
  useEffect(() => {
    if (stepsStatus.step2 === 'completed' && drrResult && !cycleganResult) {
      runCycleGAN();
    }
  }, [stepsStatus.step2, drrResult]);
  
  // Chạy tiếp sau CycleGAN
  useEffect(() => {
    if (stepsStatus.step3 === 'completed' && cycleganResult && !xray2ctResult) {
      runXray2CT();
    }
  }, [stepsStatus.step3, cycleganResult]);
  
  const resetPipeline = () => {
    setSelectedPatient('');
    setPatientInfo(null);
    setDrrResult(null);
    setCycleganResult(null);
    setXray2ctResult(null);
    setStepsStatus({ step1: 'pending', step2: 'pending', step3: 'pending', step4: 'pending' });
    setExpandedSteps({ step1: true, step2: false, step3: false, step4: false });
    setError(null);
  };
  
  const toggleStep = (step) => setExpandedSteps(prev => ({ ...prev, [step]: !prev[step] }));
  const openPreview = (image, title) => setPreviewDialog({ open: true, image, title });
  
  // ==================== Render ====================
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
            🔬 Training Pipeline Demo
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Demo quy trình xử lý dữ liệu thật: LIDC-IDRI Dataset → DiffDRR → CycleGAN → Xray2CT
          </Typography>
        </Box>
        
        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
        
        {/* Patient Selection */}
        <GlassCard sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Chọn bệnh nhân từ LIDC-IDRI Dataset</InputLabel>
                <Select
                  value={selectedPatient}
                  onChange={(e) => handlePatientSelect(e.target.value)}
                  label="Chọn bệnh nhân từ LIDC-IDRI Dataset"
                  disabled={loading}
                >
                  {patients.map((patient) => (
                    <MenuItem key={patient.patient_id} value={patient.patient_id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <FolderIcon sx={{ color: '#0891B2' }} />
                        <Box>
                          <Typography fontWeight={600}>{patient.patient_id}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {patient.num_slices} slices | {patient.has_xml ? 'Có annotation' : 'Không có annotation'}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="contained" startIcon={<PlayIcon />} onClick={runFullPipeline}
                  disabled={!selectedPatient || stepsStatus.step1 !== 'completed' || stepsStatus.step2 === 'processing'}
                  sx={{ background: 'linear-gradient(135deg, #10B981, #34D399)', textTransform: 'none', borderRadius: 2, px: 3 }}>
                  Chạy toàn bộ Pipeline
                </Button>
                <Button variant="outlined" startIcon={<RestartIcon />} onClick={resetPipeline} sx={{ textTransform: 'none', borderRadius: 2 }}>
                  Reset
                </Button>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPatients} sx={{ textTransform: 'none', borderRadius: 2 }}>
                  Refresh
                </Button>
              </Box>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, p: 2, bgcolor: alpha('#0891B2', 0.05), borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <InfoIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              <strong>LIDC-IDRI Dataset:</strong> Bộ dữ liệu CT scans thật của bệnh nhân ung thư phổi.
              Sử dụng <strong>DiffDRR</strong> và <strong>CycleGAN</strong> models thật để xử lý.
            </Typography>
          </Box>
        </GlassCard>
        
        {/* Pipeline Steps */}
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            {/* Step 1: LIDC Data với CT Viewer */}
            <StepCard stepNumber="1" title="Bước 1: LIDC-IDRI DICOM Data" description="Đọc và xem dữ liệu CT scan từ dataset LIDC-IDRI"
              status={stepsStatus.step1} expanded={expandedSteps.step1} onToggle={() => toggleStep('step1')}>
              {patientInfo ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 3 }}>
                    Đã tải: <strong>{patientInfo.patient_id}</strong> - {patientInfo.num_slices} DICOM slices
                  </Alert>
                  
                  {/* DICOM Stats */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {[
                      { value: patientInfo.num_slices, label: 'Số slices', color: '#0891B2' },
                      { value: patientInfo.dicom_info?.rows || 512, label: 'Rows', color: '#10B981' },
                      { value: patientInfo.dicom_info?.columns || 512, label: 'Columns', color: '#8B5CF6' },
                      { value: `${patientInfo.dicom_info?.pixel_spacing?.[0]?.toFixed(2) || '0.7'} mm`, label: 'Pixel Spacing', color: '#F59E0B' },
                    ].map((stat, i) => (
                      <Grid item xs={6} md={3} key={i}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(stat.color, 0.05) }}>
                          <Typography variant="h4" fontWeight={700} sx={{ color: stat.color }}>{stat.value}</Typography>
                          <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                  
                  {/* CT Viewer Button */}
                  <Button variant="contained" startIcon={<FullscreenIcon />} onClick={() => setCtViewerOpen(true)}
                    sx={{ mb: 3, background: 'linear-gradient(135deg, #0891B2, #06B6D4)', textTransform: 'none' }}>
                    Mở CT Viewer (xem tất cả {patientInfo.num_slices} slices)
                  </Button>
                  
                  {/* CT Viewer Dialog */}
                  <Dialog open={ctViewerOpen} onClose={() => setCtViewerOpen(false)} maxWidth="lg" fullWidth>
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <StorageIcon color="primary" />
                      CT Viewer - {patientInfo.patient_id}
                    </DialogTitle>
                    <DialogContent dividers>
                      <CTViewer patientId={selectedPatient} patientInfo={patientInfo} onClose={() => setCtViewerOpen(false)} />
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setCtViewerOpen(false)}>Đóng</Button>
                    </DialogActions>
                  </Dialog>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <FolderIcon sx={{ fontSize: 64, color: '#CBD5E1', mb: 2 }} />
                  <Typography color="text.secondary">Chọn bệnh nhân để xem dữ liệu DICOM</Typography>
                </Box>
              )}
            </StepCard>
            
            {/* Step 2: DiffDRR */}
            <StepCard stepNumber="2" title="Bước 2: DiffDRR - Tạo X-ray tổng hợp" description="Sử dụng DiffDRR thật để tạo ảnh DRR từ CT volume"
              status={stepsStatus.step2} expanded={expandedSteps.step2} onToggle={() => toggleStep('step2')} onRun={runDiffDRR}>
              {drrResult ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 3 }}>
                    {drrResult.message} {drrResult.source === 'cached' && '(từ cache)'}
                  </Alert>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>Kết quả DRR:</Typography>
                      <Card sx={{ cursor: 'pointer' }} onClick={() => openPreview(drrResult.image_data, 'DRR Result')}>
                        <Box component="img" src={drrResult.image_data} alt="DRR" sx={{ width: '100%', bgcolor: '#1E293B' }} />
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>Thông tin:</Typography>
                      <List dense>
                        <ListItem><ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText primary="DiffDRR Real" secondary="Sử dụng thư viện DiffDRR chính thức" /></ListItem>
                        <ListItem><ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText primary={`Kích thước: ${drrResult.image_shape?.join(' x ')}`} secondary="Pixels" /></ListItem>
                        <ListItem><ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText primary={`Device: ${drrResult.device_used || 'N/A'}`} secondary="GPU/CPU" /></ListItem>
                      </List>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ImageIcon sx={{ fontSize: 64, color: '#CBD5E1', mb: 2 }} />
                  <Typography color="text.secondary">
                    {stepsStatus.step1 === 'completed' ? 'Nhấn "Chạy" để tạo DRR' : 'Hoàn thành Bước 1 trước'}
                  </Typography>
                </Box>
              )}
            </StepCard>
            
            {/* Step 3: CycleGAN */}
            <StepCard stepNumber="3" title="Bước 3: CycleGAN - Ánh xạ sang miền X-ray thật" description="Sử dụng CycleGAN model đã train để chuyển đổi"
              status={stepsStatus.step3} expanded={expandedSteps.step3} onToggle={() => toggleStep('step3')} onRun={runCycleGAN}>
              {cycleganResult ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 3 }}>{cycleganResult.message}</Alert>
                  
                  <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={5}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>Input (DRR):</Typography>
                      <Card><Box component="img" src={drrResult?.image_data} alt="DRR" sx={{ width: '100%', bgcolor: '#1E293B' }} /></Card>
                    </Grid>
                    <Grid item xs={12} md={2} sx={{ textAlign: 'center' }}>
                      <ArrowIcon sx={{ fontSize: 48, color: '#0891B2' }} />
                      <Typography variant="caption" display="block" color="text.secondary">CycleGAN</Typography>
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>Output (Real X-ray):</Typography>
                      <Card sx={{ cursor: 'pointer' }} onClick={() => openPreview(cycleganResult.image_data, 'CycleGAN Result')}>
                        <Box component="img" src={cycleganResult.image_data} alt="CycleGAN" sx={{ width: '100%', bgcolor: '#1E293B' }} />
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <TransformIcon sx={{ fontSize: 64, color: '#CBD5E1', mb: 2 }} />
                  <Typography color="text.secondary">
                    {stepsStatus.step2 === 'completed' ? 'Nhấn "Chạy" để chuyển đổi' : 'Hoàn thành Bước 2 trước'}
                  </Typography>
                </Box>
              )}
            </StepCard>
            
            {/* Step 4: Xray2CT - Training Data */}
            <StepCard stepNumber="4" title="Bước 4: Xray2CT - Training Data Pair" description="Hiển thị cặp dữ liệu training: X-ray (input) + CT (ground truth)"
              status={stepsStatus.step4} expanded={expandedSteps.step4} onToggle={() => toggleStep('step4')} onRun={runXray2CT}>
              {xray2ctResult ? (
                <Box>
                  <Alert severity={xray2ctResult.status === 'demo_mode' ? 'info' : 'success'} sx={{ mb: 3 }}>
                    {xray2ctResult.message}
                  </Alert>
                  
                  {/* Training Mode - Show Input + Ground Truth */}
                  {xray2ctResult.training_data ? (
                    <Box>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: '#0891B2' }}>
                        🎯 Training Data Pair
                      </Typography>
                      
                      <Grid container spacing={3}>
                        {/* INPUT: X-ray from CycleGAN */}
                        <Grid item xs={12} md={5}>
                          <Paper sx={{ p: 2, bgcolor: '#1E293B', borderRadius: 2 }}>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#F59E0B', mb: 2 }}>
                              📥 INPUT: {xray2ctResult.training_data.input.type}
                            </Typography>
                            <Card sx={{ cursor: 'pointer' }} onClick={() => openPreview(xray2ctResult.training_data.input.image_data, 'X-ray Input')}>
                              <Box component="img" src={xray2ctResult.training_data.input.image_data} alt="X-ray Input" 
                                sx={{ width: '100%', aspectRatio: '1', objectFit: 'contain', bgcolor: '#000' }} />
                            </Card>
                            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 1 }}>
                              {xray2ctResult.training_data.input.description}
                            </Typography>
                          </Paper>
                        </Grid>
                        
                        {/* Arrow */}
                        <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Box sx={{ 
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                              p: 2, bgcolor: alpha('#0891B2', 0.1), borderRadius: 2
                            }}>
                              <ViewInArIcon sx={{ fontSize: 40, color: '#0891B2' }} />
                              <Typography variant="caption" fontWeight={600} sx={{ color: '#0891B2' }}>
                                Xray2CT Model
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                3D U-Net + Diffusion
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        
                        {/* GROUND TRUTH: CT Volume */}
                        <Grid item xs={12} md={5}>
                          <Paper sx={{ p: 2, bgcolor: '#1E293B', borderRadius: 2 }}>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#10B981', mb: 2 }}>
                              🎯 GROUND TRUTH: {xray2ctResult.training_data.ground_truth.type}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
                              Total: {xray2ctResult.training_data.ground_truth.total_slices} slices
                            </Typography>
                            
                            {/* CT Slices Preview Grid */}
                            <Grid container spacing={1}>
                              {xray2ctResult.training_data.ground_truth.slices_preview?.map((slice, idx) => (
                                <Grid item xs={6} sm={4} md={6} key={idx}>
                                  <Card sx={{ cursor: 'pointer' }}
                                    onClick={() => openPreview(slice.image_data, `CT Slice ${slice.slice_number}`)}>
                                    <Box component="img" src={slice.image_data} alt={`Slice ${slice.slice_number}`}
                                      sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', bgcolor: '#000' }} />
                                    <Box sx={{ p: 0.5, textAlign: 'center', bgcolor: '#0F172A' }}>
                                      <Typography variant="caption" sx={{ color: '#10B981' }}>
                                        Slice {slice.slice_number}
                                      </Typography>
                                    </Box>
                                  </Card>
                                </Grid>
                              ))}
                            </Grid>
                            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 2 }}>
                              {xray2ctResult.training_data.ground_truth.description}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                      
                      {/* Training Objective Info */}
                      <Paper sx={{ mt: 3, p: 2, bgcolor: alpha('#8B5CF6', 0.05), border: `1px solid ${alpha('#8B5CF6', 0.2)}`, borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#8B5CF6', mb: 1 }}>
                          📊 Training Objective
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {xray2ctResult.training_objective?.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
                          <Chip label={`Input: ${xray2ctResult.training_objective?.input_shape}`} size="small" sx={{ bgcolor: '#F59E0B', color: '#fff' }} />
                          <Chip label={`Output: ${xray2ctResult.training_objective?.output_shape}`} size="small" sx={{ bgcolor: '#10B981', color: '#fff' }} />
                          <Chip label={`Loss: ${xray2ctResult.training_objective?.loss}`} size="small" sx={{ bgcolor: '#8B5CF6', color: '#fff' }} />
                        </Box>
                      </Paper>
                      
                      {xray2ctResult.note && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          {xray2ctResult.note}
                        </Alert>
                      )}
                    </Box>
                  ) : (
                    /* Inference Mode - Show reconstructed slices */
                    <Box>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle2" fontWeight={600} gutterBottom>Input X-ray:</Typography>
                          <Card><Box component="img" src={cycleganResult?.image_data} alt="Input" sx={{ width: '100%', bgcolor: '#1E293B' }} /></Card>
                        </Grid>
                        <Grid item xs={12} md={8}>
                          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            Output CT Slices ({xray2ctResult.total_slices} slices):
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <IconButton onClick={() => setSliceIndex(Math.max(0, sliceIndex - 1))} disabled={sliceIndex === 0}><PrevIcon /></IconButton>
                            <Typography>Slice {sliceIndex + 1} / {xray2ctResult.slices_preview?.length || 0}</Typography>
                            <IconButton onClick={() => setSliceIndex(Math.min((xray2ctResult.slices_preview?.length || 1) - 1, sliceIndex + 1))}
                              disabled={sliceIndex >= (xray2ctResult.slices_preview?.length || 1) - 1}><NextIcon /></IconButton>
                          </Box>
                          <Grid container spacing={1}>
                            {xray2ctResult.slices_preview?.map((slice, idx) => (
                              <Grid item xs={3} key={idx}>
                                <Card sx={{ cursor: 'pointer', border: idx === sliceIndex ? '2px solid #0891B2' : 'none' }}
                                  onClick={() => { setSliceIndex(idx); openPreview(slice.image_data, `CT Slice ${slice.slice_number}`); }}>
                                  <Box component="img" src={slice.image_data} alt={`Slice ${slice.slice_number}`}
                                    sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', bgcolor: '#1E293B' }} />
                                  <Box sx={{ p: 0.5, textAlign: 'center', bgcolor: '#1E293B' }}>
                                    <Typography variant="caption" sx={{ color: '#fff' }}>Z={slice.slice_number}</Typography>
                                  </Box>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ViewInArIcon sx={{ fontSize: 64, color: '#CBD5E1', mb: 2 }} />
                  <Typography color="text.secondary">
                    {stepsStatus.step3 === 'completed' ? 'Nhấn "Chạy" để xem Training Data Pair' : 'Hoàn thành Bước 3 trước'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Hiển thị cặp Input (X-ray) + Ground Truth (CT) cho training
                  </Typography>
                </Box>
              )}
            </StepCard>
          </Grid>
          
          {/* Sidebar */}
          <Grid item xs={12} lg={4}>
            <GlassCard sx={{ p: 3, position: 'sticky', top: 100 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>📊 Pipeline Flow</Typography>
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { label: 'LIDC-IDRI Dataset', color: '#0891B2', step: 'step1' },
                  { label: 'DiffDRR (Real)', color: '#8B5CF6', step: 'step2' },
                  { label: 'CycleGAN (Real)', color: '#F59E0B', step: 'step3' },
                  { label: 'Xray2CT', color: '#10B981', step: 'step4' },
                ].map((item, index) => (
                  <React.Fragment key={item.step}>
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2,
                      bgcolor: stepsStatus[item.step] === 'completed' ? alpha(item.color, 0.1) : alpha('#64748B', 0.05),
                      border: `1px solid ${stepsStatus[item.step] === 'completed' ? item.color : 'transparent'}`,
                    }}>
                      <Avatar sx={{ bgcolor: stepsStatus[item.step] === 'completed' ? item.color : alpha(item.color, 0.3), width: 40, height: 40 }}>
                        {stepsStatus[item.step] === 'completed' ? <CheckIcon /> :
                         stepsStatus[item.step] === 'processing' ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : index + 1}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>{item.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stepsStatus[item.step] === 'completed' ? '✓ Hoàn thành' :
                           stepsStatus[item.step] === 'processing' ? 'Đang xử lý...' : 'Chờ xử lý'}
                        </Typography>
                      </Box>
                    </Box>
                    {index < 3 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <ArrowIcon sx={{ transform: 'rotate(90deg)', color: stepsStatus[item.step] === 'completed' ? item.color : '#CBD5E1' }} />
                      </Box>
                    )}
                  </React.Fragment>
                ))}
              </Box>
              
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Thống kê</Typography>
              <List dense>
                <ListItem><ListItemText primary="Bệnh nhân có sẵn" secondary={`${patients.length} cases`} /></ListItem>
                {patientInfo && (
                  <>
                    <ListItem><ListItemText primary="DICOM slices" secondary={`${patientInfo.num_slices} slices`} /></ListItem>
                    <ListItem><ListItemText primary="Image size" secondary={`${patientInfo.dicom_info?.rows || 512} x ${patientInfo.dicom_info?.columns || 512}`} /></ListItem>
                  </>
                )}
              </List>
            </GlassCard>
          </Grid>
        </Grid>
      </Container>
      
      {/* Image Preview Dialog */}
      <Dialog open={previewDialog.open} onClose={() => setPreviewDialog({ open: false, image: null, title: '' })} maxWidth="md" fullWidth>
        <DialogTitle>{previewDialog.title}</DialogTitle>
        <DialogContent>
          {previewDialog.image && <Box component="img" src={previewDialog.image} alt={previewDialog.title} sx={{ width: '100%', bgcolor: '#1E293B' }} />}
        </DialogContent>
        <DialogActions><Button onClick={() => setPreviewDialog({ open: false, image: null, title: '' })}>Đóng</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrainingPipelinePage;
