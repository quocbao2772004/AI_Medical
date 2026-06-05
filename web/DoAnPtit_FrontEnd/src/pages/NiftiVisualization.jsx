import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import config from '../config';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  Grid,
  Chip,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  Slider,
  Switch,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import {
  CloudUpload,
  Download,
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  WifiOff,
  Computer,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import OfflineNiftiViewer from '../components/OfflineNiftiViewer';

const NiftiVisualization = () => {
  const [searchParams] = useSearchParams();
  const [currentSession, setCurrentSession] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(true);
  
  // Check if file URL param exists - if so, use offline viewer to load it
  const fileUrlParam = searchParams.get('file');
  
  // Viewer state
  const [currentPlane, setCurrentPlane] = useState(0); // 0: axial, 1: sagittal, 2: coronal
  const [sliceIndex, setSliceIndex] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [sliceData, setSliceData] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(200);
  
  // Window/Level settings
  const [windowCenter, setWindowCenter] = useState(50);
  const [windowWidth, setWindowWidth] = useState(350);
  const [useWindowing, setUseWindowing] = useState(true);
  const [currentPreset, setCurrentPreset] = useState('soft_tissue');
  
  const playIntervalRef = useRef(null);
  const canvasRef = useRef(null);

  // Medical windowing presets
  const windowPresets = {
    soft_tissue: { center: 50, width: 350, name: 'Soft Tissue', color: '#4caf50' },
    lung: { center: -600, width: 1500, name: 'Lung', color: '#2196f3' },
    bone: { center: 400, width: 1500, name: 'Bone', color: '#ff9800' },
    brain: { center: 40, width: 80, name: 'Brain', color: '#9c27b0' },
    liver: { center: 60, width: 160, name: 'Liver', color: '#795548' },
    angiography: { center: 300, width: 600, name: 'Angiography', color: '#f44336' },
  };

  const planes = ['Axial', 'Sagittal', 'Coronal'];
  const planeDescriptions = {
    0: 'Horizontal cross-sections (top-down view)',
    1: 'Vertical cross-sections (side view)',
    2: 'Vertical cross-sections (front view)'
  };

  // Check server availability
  React.useEffect(() => {
    const checkServerAvailability = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${config.API_URL}/health`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          setServerAvailable(true);
          setIsOfflineMode(false);
        } else {
          setServerAvailable(false);
          setIsOfflineMode(true);
        }
      } catch (error) {
        setServerAvailable(false);
        setIsOfflineMode(true);
        console.log('Server not available, switching to offline mode');
      }
    };

    checkServerAvailability();
    
    // Check server availability every 30 seconds
    const interval = setInterval(checkServerAvailability, 30000);
    return () => clearInterval(interval);
  }, []);

  // File upload handling with fallback to offline mode
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.endsWith('.nii') && !file.name.endsWith('.nii.gz')) {
      setError('Chỉ hỗ trợ file NIfTI (.nii, .nii.gz)');
      toast.error('Chỉ hỗ trợ file NIfTI (.nii, .nii.gz)');
      return;
    }

    // Try server upload first if available
    if (serverAvailable && !isOfflineMode) {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${config.API_URL}/nifti/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
          setCurrentSession(result.session_id);
          await loadMetadata(result.session_id);
          toast.success('Upload thành công!');
        } else {
          throw new Error(result.message || 'Upload failed');
        }

      } catch (error) {
        console.error('Server upload failed, falling back to offline mode:', error);
        setIsOfflineMode(true);
        toast.warning('Server không khả dụng, chuyển sang chế độ offline');
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    } else {
      // Force offline mode
      setIsOfflineMode(true);
      toast.info('Đang sử dụng chế độ offline');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverAvailable, isOfflineMode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.nii', '.nii.gz'],
      'application/gzip': ['.nii.gz']
    },
    maxFiles: 1,
    disabled: uploading
  });

  // Load metadata (only for online mode)
  const loadMetadata = async (sessionId) => {
    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/nifti/metadata/${sessionId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        const metadata = result.metadata;
        setMetadata(metadata);
        setSliceIndex(Math.floor(metadata.slice_data.axial.num_slices / 2));
        await loadSlice(sessionId, 0, Math.floor(metadata.slice_data.axial.num_slices / 2));
      } else {
        throw new Error('Failed to load metadata');
      }
    } catch (err) {
      console.error('Error loading metadata:', err);
      setError('Không thể load metadata của file NIfTI');
      // Fallback to offline mode
      setIsOfflineMode(true);
    } finally {
      setLoading(false);
    }
  };

  // Load slice data (only for online mode)
  const loadSlice = async (sessionId, plane, index) => {
    setViewerLoading(true);
    try {
      const planeNames = ['axial', 'sagittal', 'coronal'];
      let url = `${config.API_URL}/nifti/slice/${sessionId}/${planeNames[plane]}/${index}`;
      
      if (useWindowing) {
        url += `?window_center=${windowCenter}&window_width=${windowWidth}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setSliceData(result.slice_data);
        updateCanvas(result.slice_data);
      }
    } catch (err) {
      console.error('Error loading slice:', err);
      setError('Không thể load slice data');
      // Fallback to offline mode
      setIsOfflineMode(true);
    } finally {
      setViewerLoading(false);
    }
  };

  // Update canvas (for online mode)
  const updateCanvas = (imageData) => {
    if (!canvasRef.current || !imageData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Create image from base64 data
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = `data:image/png;base64,${imageData}`;
  };

  // Animation controls (for online mode)
  const startAnimation = () => {
    if (playIntervalRef.current || !currentSession) return;
    
    setIsPlaying(true);
    playIntervalRef.current = setInterval(() => {
      setSliceIndex(prev => {
        const maxSlices = getCurrentSliceCount();
        const nextIndex = prev >= maxSlices - 1 ? 0 : prev + 1;
        loadSlice(currentSession, currentPlane, nextIndex);
        return nextIndex;
      });
    }, playSpeed);
  };

  const stopAnimation = () => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setIsPlaying(false);
  };

  const getCurrentSliceCount = () => {
    if (!metadata || !metadata.slice_data) return 0;
    const planeNames = ['axial', 'sagittal', 'coronal'];
    return metadata.slice_data[planeNames[currentPlane]]?.num_slices || 0;
  };

  const handlePlaneChange = (event, newValue) => {
    setCurrentPlane(newValue);
    setSliceIndex(0);
    stopAnimation();
    if (currentSession) {
      loadSlice(currentSession, newValue, 0);
    }
  };

  const handleSliceChange = (event, newValue) => {
    setSliceIndex(newValue);
    if (currentSession) {
      loadSlice(currentSession, currentPlane, newValue);
    }
  };

  const handlePrevSlice = () => {
    const newIndex = Math.max(0, sliceIndex - 1);
    setSliceIndex(newIndex);
    if (currentSession) {
      loadSlice(currentSession, currentPlane, newIndex);
    }
  };

  const handleNextSlice = () => {
    const maxSlices = getCurrentSliceCount();
    const newIndex = Math.min(maxSlices - 1, sliceIndex + 1);
    setSliceIndex(newIndex);
    if (currentSession) {
      loadSlice(currentSession, currentPlane, newIndex);
    }
  };

  const handlePresetChange = (presetKey) => {
    const preset = windowPresets[presetKey];
    setCurrentPreset(presetKey);
    setWindowCenter(preset.center);
    setWindowWidth(preset.width);
    if (currentSession) {
      loadSlice(currentSession, currentPlane, sliceIndex);
    }
  };

  const handleWindowingChange = (type, value) => {
    if (type === 'center') {
      setWindowCenter(value);
    } else if (type === 'width') {
      setWindowWidth(value);
    }
    
    // Debounce the API call
    setTimeout(() => {
      if (currentSession) {
        loadSlice(currentSession, currentPlane, sliceIndex);
      }
    }, 300);
  };

  const handleDownload = async (format) => {
    if (!currentSession) return;
    
    try {
      const response = await fetch(`${config.API_URL}/nifti/download/${currentSession}/${format}`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nifti_export.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Không thể download file');
    }
  };

  const handleNewUpload = () => {
    setCurrentSession(null);
    setMetadata(null);
    setSliceData(null);
    setError(null);
    setIsOfflineMode(false);
    stopAnimation();
  };

  // If file URL param exists or in offline mode, use the offline viewer (which handles URL params)
  if (fileUrlParam || isOfflineMode) {
    return <OfflineNiftiViewer />;
  }

  // Online mode UI
  if (!currentSession) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Connection Status */}
          <Alert 
            severity={serverAvailable ? "success" : "warning"} 
            sx={{ mb: 3 }}
            icon={serverAvailable ? <Computer /> : <WifiOff />}
          >
            {serverAvailable ? 
              "Server connected - Full online features available" :
              "Server not available - Will use offline mode for file processing"
            }
          </Alert>

          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              Advanced NIfTI Viewer
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Upload and visualize NIfTI medical imaging files with advanced features
            </Typography>

            {uploading ? (
              <Box sx={{ width: '100%', mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Uploading and processing file...
                </Typography>
                <LinearProgress />
              </Box>
            ) : (
              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  borderRadius: 2,
                  p: 6,
                  cursor: 'pointer',
                  bgcolor: isDragActive ? 'action.hover' : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  }
                }}
              >
                <input {...getInputProps()} />
                <CloudUpload sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive ? 'Drop NIfTI file here' : 'Upload NIfTI File'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Drag and drop or click to select .nii or .nii.gz files
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  {serverAvailable ? 'Server processing with full features' : 'Will fallback to offline mode if server unavailable'}
                </Typography>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Paper>
        </motion.div>
      </Container>
    );
  }

  // Rest of the online viewer code remains the same...
  const maxSlices = getCurrentSliceCount();

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <Paper elevation={2} sx={{ mb: 2, p: 2 }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs>
              <Typography variant="h5" component="h1">
                Advanced NIfTI Viewer
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {metadata && (
                  <>
                    Dimensions: {metadata.shape.join(' × ')} | 
                    Spacing: {metadata.spacing.map(s => s.toFixed(2)).join(' × ')} mm
                  </>
                )}
              </Typography>
            </Grid>
            <Grid item>
              <Chip 
                icon={<Computer />}
                label="Online Mode"
                color="success"
                variant="outlined"
              />
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<CloudUpload />}
                onClick={handleNewUpload}
              >
                Upload New File
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2}>
          {/* Viewer */}
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 2 }}>
              {/* Viewer Controls */}
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item>
                    <Tabs value={currentPlane} onChange={handlePlaneChange}>
                      {planes.map((plane, index) => (
                        <Tab key={plane} label={plane} />
                      ))}
                    </Tabs>
                  </Grid>
                  <Grid item xs>
                    <Typography variant="body2" color="text.secondary">
                      {planeDescriptions[currentPlane]}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Canvas Container */}
              <Box
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'black',
                  minHeight: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {viewerLoading && (
                  <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }}>
                    <LinearProgress sx={{ width: 200 }} />
                  </Box>
                )}
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    imageRendering: 'pixelated'
                  }}
                />
              </Box>

              {/* Slice Navigation */}
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item>
                    <IconButton onClick={handlePrevSlice} disabled={sliceIndex === 0}>
                      <SkipPrevious />
                    </IconButton>
                  </Grid>
                  <Grid item>
                    <IconButton onClick={isPlaying ? stopAnimation : startAnimation}>
                      {isPlaying ? <Pause /> : <PlayArrow />}
                    </IconButton>
                  </Grid>
                  <Grid item>
                    <IconButton onClick={handleNextSlice} disabled={sliceIndex === maxSlices - 1}>
                      <SkipNext />
                    </IconButton>
                  </Grid>
                  <Grid item xs>
                    <Typography variant="body2" gutterBottom>
                      Slice {sliceIndex + 1} of {maxSlices}
                    </Typography>
                    <Slider
                      value={sliceIndex}
                      onChange={handleSliceChange}
                      min={0}
                      max={maxSlices - 1}
                      marks
                      valueLabelDisplay="auto"
                    />
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>

          {/* Settings Panel */}
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Display Settings
              </Typography>

              {/* Windowing Toggle */}
              <FormControlLabel
                control={
                  <Switch
                    checked={useWindowing}
                    onChange={(e) => setUseWindowing(e.target.checked)}
                  />
                }
                label="Use Windowing"
                sx={{ mb: 2 }}
              />

              {/* Window Presets */}
              <Typography variant="subtitle2" gutterBottom>
                Window Presets
              </Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {Object.entries(windowPresets).map(([key, preset]) => (
                  <Grid item key={key}>
                    <Chip
                      label={preset.name}
                      onClick={() => handlePresetChange(key)}
                      color={currentPreset === key ? 'primary' : 'default'}
                      variant={currentPreset === key ? 'filled' : 'outlined'}
                      size="small"
                      sx={{ bgcolor: currentPreset === key ? preset.color : undefined }}
                    />
                  </Grid>
                ))}
              </Grid>

              {/* Window/Level Controls */}
              <Typography variant="subtitle2" gutterBottom>
                Window Center: {windowCenter}
              </Typography>
              <Slider
                value={windowCenter}
                onChange={(e, value) => handleWindowingChange('center', value)}
                min={-1000}
                max={1000}
                step={1}
                disabled={!useWindowing}
                sx={{ mb: 2 }}
              />

              <Typography variant="subtitle2" gutterBottom>
                Window Width: {windowWidth}
              </Typography>
              <Slider
                value={windowWidth}
                onChange={(e, value) => handleWindowingChange('width', value)}
                min={1}
                max={2000}
                step={1}
                disabled={!useWindowing}
                sx={{ mb: 2 }}
              />

              {/* Animation Speed */}
              <Typography variant="subtitle2" gutterBottom>
                Animation Speed: {playSpeed}ms
              </Typography>
              <Slider
                value={playSpeed}
                onChange={(e, value) => setPlaySpeed(value)}
                min={50}
                max={1000}
                step={50}
                sx={{ mb: 2 }}
              />

              {/* Download Options */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Download Options
              </Typography>
              <Grid container spacing={1}>
                <Grid item>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleDownload('png')}
                    startIcon={<Download />}
                  >
                    PNG
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleDownload('nii')}
                    startIcon={<Download />}
                  >
                    NIfTI
                  </Button>
                </Grid>
              </Grid>

              {/* File Information */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                File Information
              </Typography>
              {metadata && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Dimensions:</strong> {metadata.shape.join(' × ')}<br />
                  <strong>Voxel Size:</strong> {metadata.spacing.map(s => s.toFixed(2)).join(' × ')} mm<br />
                  <strong>Data Range:</strong> {metadata.min_value.toFixed(2)} → {metadata.max_value.toFixed(2)}<br />
                  <strong>File Size:</strong> {(metadata.file_size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  );
};

export default NiftiVisualization; 