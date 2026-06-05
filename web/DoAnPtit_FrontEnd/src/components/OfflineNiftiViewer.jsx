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
  CloudOff,
  ZoomIn,
  ZoomOut,
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  WifiOff,
  Computer,
  Download,
  Image as ImageIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import * as nifti from 'nifti-reader-js';
import pako from 'pako';
import localforage from 'localforage';

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

const OfflineNiftiViewer = () => {
  const [searchParams] = useSearchParams();
  const [niftiData, setNiftiData] = useState(null);
  const [niftiHeader, setNiftiHeader] = useState(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [loadingFromUrl, setLoadingFromUrl] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState(null);
  const [currentFileUrl, setCurrentFileUrl] = useState(null);
  
  // Viewer state
  const [currentPlane, setCurrentPlane] = useState(0); // 0: axial, 1: sagittal, 2: coronal
  const [sliceIndex, setSliceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(200);
  
  // Display settings
  const [windowCenter, setWindowCenter] = useState(50);
  const [windowWidth, setWindowWidth] = useState(350);
  const [useWindowing, setUseWindowing] = useState(true);
  const [currentPreset, setCurrentPreset] = useState('soft_tissue');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // UI state
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
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

  // Check server connection
  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        const response = await fetch(`${config.API_URL}/health`, { 
          method: 'GET',
        });
        if (response.ok) {
          setIsOfflineMode(false);
        } else {
          setIsOfflineMode(true);
        }
      } catch (error) {
        setIsOfflineMode(true);
        console.log('Server not available, switching to offline mode');
      }
    };

    checkServerConnection();
    // Check connection every 30 seconds
    const interval = setInterval(checkServerConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Process NIfTI file client-side
  const processNiftiFile = useCallback(async (file, filename = null) => {
    setProcessing(true);
    setError(null);

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const actualFilename = filename || file.name;
      
      // Handle gzipped files
      let data;
      if (actualFilename.endsWith('.gz')) {
        const compressed = new Uint8Array(arrayBuffer);
        data = pako.inflate(compressed).buffer;
      } else {
        data = arrayBuffer;
      }

      // Parse NIfTI header
      if (!nifti.isNIFTI(data)) {
        throw new Error('File is not a valid NIfTI format');
      }

      const header = nifti.readHeader(data);
      const image = nifti.readImage(header, data);

      if (!header || !image) {
        throw new Error('Failed to read NIfTI file');
      }

      // Convert to typed array based on data type
      let typedData;
      switch (header.datatypeCode) {
        case nifti.NIFTI1.TYPE_UINT8:
          typedData = new Uint8Array(image);
          break;
        case nifti.NIFTI1.TYPE_INT16:
          typedData = new Int16Array(image);
          break;
        case nifti.NIFTI1.TYPE_INT32:
          typedData = new Int32Array(image);
          break;
        case nifti.NIFTI1.TYPE_FLOAT32:
          typedData = new Float32Array(image);
          break;
        case nifti.NIFTI1.TYPE_FLOAT64:
          typedData = new Float64Array(image);
          break;
        default:
          typedData = new Float32Array(image);
      }

      setNiftiHeader(header);
      setNiftiData(typedData);
      
      // Set initial slice to middle
      setSliceIndex(Math.floor(header.dims[3] / 2));
      
      // Auto-adjust window/level based on data (use loop to avoid stack overflow)
      let minVal = Infinity, maxVal = -Infinity;
      const sampleSize = Math.min(typedData.length, 500000);
      const step = Math.max(1, Math.floor(typedData.length / sampleSize));
      for (let i = 0; i < typedData.length; i += step) {
        const val = typedData[i];
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
      const range = maxVal - minVal;
      setWindowCenter((maxVal + minVal) / 2);
      setWindowWidth(range || 800);

      // Store in local storage for persistence
      await localforage.setItem('nifti_header', header);
      await localforage.setItem('nifti_data', typedData);
      await localforage.setItem('nifti_filename', filename || file?.name);

      toast.success('NIfTI file loaded successfully!');
      
    } catch (error) {
      console.error('Error processing NIfTI file:', error);
      setError(error.message);
      toast.error(`Error processing file: ${error.message}`);
    } finally {
      setProcessing(false);
      setLoadingFromUrl(false);
    }
  }, []);

  // Fetch and process NIfTI file from URL
  const loadNiftiFromUrl = useCallback(async (fileUrl) => {
    setLoadingFromUrl(true);
    setProcessing(true);
    setError(null);
    setCurrentFileUrl(fileUrl); // Save URL for download

    try {
      // Extract filename from URL
      const urlPath = new URL(fileUrl).pathname;
      const filename = urlPath.split('/').pop() || 'ct_scan.nii.gz';
      setLoadedFileName(filename);

      toast.loading('Đang tải file NIfTI từ server...', { id: 'loading-nifti' });

      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Handle gzipped files
      let data;
      if (filename.endsWith('.gz')) {
        const compressed = new Uint8Array(arrayBuffer);
        data = pako.inflate(compressed).buffer;
      } else {
        data = arrayBuffer;
      }

      // Parse NIfTI header
      if (!nifti.isNIFTI(data)) {
        throw new Error('File is not a valid NIfTI format');
      }

      const header = nifti.readHeader(data);
      const image = nifti.readImage(header, data);

      if (!header || !image) {
        throw new Error('Failed to read NIfTI file');
      }

      // Convert to typed array based on data type
      let typedData;
      switch (header.datatypeCode) {
        case nifti.NIFTI1.TYPE_UINT8:
          typedData = new Uint8Array(image);
          break;
        case nifti.NIFTI1.TYPE_INT16:
          typedData = new Int16Array(image);
          break;
        case nifti.NIFTI1.TYPE_INT32:
          typedData = new Int32Array(image);
          break;
        case nifti.NIFTI1.TYPE_FLOAT32:
          typedData = new Float32Array(image);
          break;
        case nifti.NIFTI1.TYPE_FLOAT64:
          typedData = new Float64Array(image);
          break;
        default:
          typedData = new Float32Array(image);
      }

      setNiftiHeader(header);
      setNiftiData(typedData);
      
      // Set initial slice to middle
      setSliceIndex(Math.floor(header.dims[3] / 2));
      
      // Auto-adjust window/level based on data (use loop to avoid stack overflow)
      let minVal = Infinity, maxVal = -Infinity;
      const sampleSize = Math.min(typedData.length, 500000);
      const step = Math.max(1, Math.floor(typedData.length / sampleSize));
      for (let i = 0; i < typedData.length; i += step) {
        const val = typedData[i];
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
      const range = maxVal - minVal;
      setWindowCenter((maxVal + minVal) / 2);
      setWindowWidth(range || 800);

      toast.dismiss('loading-nifti');
      toast.success('File CT đã được tải thành công!');
      
    } catch (error) {
      console.error('Error loading NIfTI from URL:', error);
      setError(`Không thể tải file: ${error.message}`);
      toast.dismiss('loading-nifti');
      toast.error(`Lỗi tải file: ${error.message}`);
    } finally {
      setProcessing(false);
      setLoadingFromUrl(false);
    }
  }, []);

  // Get xray URL from params
  const xrayUrl = searchParams.get('xray');

  // Auto-load from URL param on mount
  useEffect(() => {
    const fileUrl = searchParams.get('file');
    if (fileUrl && !niftiData && !processing) {
      loadNiftiFromUrl(fileUrl);
    }
  }, [searchParams, niftiData, processing, loadNiftiFromUrl]);

  // File upload handling
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.endsWith('.nii') && !file.name.endsWith('.nii.gz')) {
      setError('Only NIfTI files (.nii, .nii.gz) are supported');
      toast.error('Only NIfTI files (.nii, .nii.gz) are supported');
      return;
    }

    setLoadedFileName(file.name);
    await processNiftiFile(file, file.name);
  }, [processNiftiFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.nii', '.nii.gz'],
      'application/gzip': ['.nii.gz']
    },
    maxFiles: 1,
    disabled: processing
  });

  // Extract slice data for current plane and index
  const getSliceData = useCallback(() => {
    if (!niftiData || !niftiHeader) return null;

    const { dims } = niftiHeader;
    const [, nx, ny, nz] = dims;
    
    let sliceData;
    let width, height;

    switch (currentPlane) {
      case 0: // Axial
        width = nx;
        height = ny;
        sliceData = new Array(width * height);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = x + y * width + sliceIndex * width * height;
            sliceData[y * width + x] = niftiData[idx];
          }
        }
        break;
      case 1: // Sagittal
        width = ny;
        height = nz;
        sliceData = new Array(width * height);
        for (let z = 0; z < height; z++) {
          for (let y = 0; y < width; y++) {
            const idx = sliceIndex + y * nx + z * nx * ny;
            sliceData[z * width + y] = niftiData[idx];
          }
        }
        break;
      case 2: // Coronal
        width = nx;
        height = nz;
        sliceData = new Array(width * height);
        for (let z = 0; z < height; z++) {
          for (let x = 0; x < width; x++) {
            const idx = x + sliceIndex * nx + z * nx * ny;
            sliceData[z * width + x] = niftiData[idx];
          }
        }
        break;
      default:
        return null;
    }

    return { data: sliceData, width, height };
  }, [niftiData, niftiHeader, currentPlane, sliceIndex]);

  // Apply windowing to slice data
  const applyWindowing = useCallback((data, width, height) => {
    if (!useWindowing) {
      // Auto-scale to 0-255
      const minVal = Math.min(...data);
      const maxVal = Math.max(...data);
      const range = maxVal - minVal;
      return data.map(val => Math.round(((val - minVal) / range) * 255));
    }

    const windowMin = windowCenter - windowWidth / 2;
    const windowMax = windowCenter + windowWidth / 2;
    
    return data.map(val => {
      if (val <= windowMin) return 0;
      if (val >= windowMax) return 255;
      return Math.round(((val - windowMin) / windowWidth) * 255);
    });
  }, [useWindowing, windowCenter, windowWidth]);

  // Render slice to canvas
  const renderSlice = useCallback(() => {
    if (!canvasRef.current || !niftiData || !niftiHeader) return;

    const sliceInfo = getSliceData();
    if (!sliceInfo) return;

    const { data, width, height } = sliceInfo;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Apply windowing
    const windowedData = applyWindowing(data, width, height);

    // Create image data
    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    for (let i = 0; i < windowedData.length; i++) {
      const pixelIndex = i * 4;
      const value = windowedData[i];
      pixels[pixelIndex] = value;     // Red
      pixels[pixelIndex + 1] = value; // Green
      pixels[pixelIndex + 2] = value; // Blue
      pixels[pixelIndex + 3] = 255;   // Alpha
    }

    ctx.putImageData(imageData, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSliceData, applyWindowing]);

  // Update canvas when slice changes
  useEffect(() => {
    renderSlice();
  }, [renderSlice]);

  // Get current slice count for the selected plane
  const getCurrentSliceCount = useCallback(() => {
    if (!niftiHeader) return 0;
    const { dims } = niftiHeader;
    switch (currentPlane) {
      case 0: return dims[3]; // Axial
      case 1: return dims[1]; // Sagittal
      case 2: return dims[2]; // Coronal
      default: return 0;
    }
  }, [niftiHeader, currentPlane]);

  // Animation controls
  const startAnimation = () => {
    if (playIntervalRef.current) return;
    
    setIsPlaying(true);
    playIntervalRef.current = setInterval(() => {
      setSliceIndex(prev => {
        const maxSlices = getCurrentSliceCount();
        return prev >= maxSlices - 1 ? 0 : prev + 1;
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

  // Navigation controls
  const handlePlaneChange = (event, newValue) => {
    setCurrentPlane(newValue);
    setSliceIndex(0);
    stopAnimation();
  };

  const handleSliceChange = (event, newValue) => {
    setSliceIndex(newValue);
  };

  const handlePrevSlice = () => {
    setSliceIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextSlice = () => {
    const maxSlices = getCurrentSliceCount();
    setSliceIndex(prev => Math.min(maxSlices - 1, prev + 1));
  };

  const handlePresetChange = (presetKey) => {
    const preset = windowPresets[presetKey];
    setCurrentPreset(presetKey);
    setWindowCenter(preset.center);
    setWindowWidth(preset.width);
  };

  const handleWindowingChange = (type, value) => {
    if (type === 'center') {
      setWindowCenter(value);
    } else if (type === 'width') {
      setWindowWidth(value);
    }
  };

  // Canvas mouse events for pan and zoom
  const handleCanvasMouseDown = (e) => {
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left - pan.x,
      y: e.clientY - rect.top - pan.y
    });
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setPan({
      x: e.clientX - rect.left - dragStart.x,
      y: e.clientY - rect.top - dragStart.y
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Load saved data on mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedHeader = await localforage.getItem('nifti_header');
        const savedData = await localforage.getItem('nifti_data');
        const savedFilename = await localforage.getItem('nifti_filename');
        
        if (savedHeader && savedData) {
          setNiftiHeader(savedHeader);
          setNiftiData(savedData);
          setSliceIndex(Math.floor(savedHeader.dims[3] / 2));
          toast.success(`Restored previous session: ${savedFilename || 'Unknown file'}`);
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    };

    loadSavedData();
  }, []);

  if (!niftiData || !niftiHeader) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Connection Status */}
          <Alert 
            severity={isOfflineMode ? "warning" : "info"} 
            sx={{ mb: 3 }}
            icon={isOfflineMode ? <WifiOff /> : <Computer />}
          >
            {isOfflineMode ? 
              "Server not available - Working in offline mode. You can still upload and view NIfTI files directly in your browser." :
              "Server connected - You can use both online and offline features."
            }
          </Alert>

          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              {isOfflineMode ? 'Offline ' : ''}NIfTI Viewer
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              {isOfflineMode ? 
                'Upload and view NIfTI files directly in your browser without server connection' :
                'Advanced medical imaging viewer with both online and offline capabilities'
              }
            </Typography>

            {processing ? (
              <Box sx={{ width: '100%', mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Processing NIfTI file...
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
                  {isOfflineMode ? 'Files are processed entirely in your browser' : 'Supports both online and offline processing'}
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
                {isOfflineMode ? 'Offline ' : ''}NIfTI Viewer
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dimensions: {niftiHeader.dims.slice(1, 4).join(' × ')} | 
                Spacing: {niftiHeader.pixDims.slice(1, 4).map(s => s?.toFixed(2) || '1.00').join(' × ')} mm
              </Typography>
            </Grid>
            <Grid item>
              <Chip 
                icon={isOfflineMode ? <CloudOff /> : <Computer />}
                label={isOfflineMode ? 'Offline Mode' : 'Online Mode'}
                color={isOfflineMode ? 'warning' : 'success'}
                variant="outlined"
              />
            </Grid>
            {xrayUrl && (
              <Grid item>
                <Button
                  variant="outlined"
                  startIcon={<ImageIcon />}
                  onClick={() => downloadFile(xrayUrl, 'xray.png')}
                >
                  Tải X-ray
                </Button>
              </Grid>
            )}
            {currentFileUrl && (
              <Grid item>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => downloadFile(currentFileUrl, 'ct_result.nii.gz')}
                >
                  Tải NIfTI
                </Button>
              </Grid>
            )}
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<CloudUpload />}
                onClick={() => window.location.reload()}
              >
                Load New File
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
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  style={{
                    transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                    cursor: isDragging ? 'grabbing' : 'grab',
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

              {/* Zoom Controls */}
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item>
                    <IconButton onClick={handleZoomOut}>
                      <ZoomOut />
                    </IconButton>
                  </Grid>
                  <Grid item>
                    <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'center' }}>
                      {Math.round(zoom * 100)}%
                    </Typography>
                  </Grid>
                  <Grid item>
                    <IconButton onClick={handleZoomIn}>
                      <ZoomIn />
                    </IconButton>
                  </Grid>
                  <Grid item>
                    <Button size="small" onClick={handleResetView}>
                      Reset View
                    </Button>
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

              {/* File Information */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                File Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Dimensions:</strong> {niftiHeader.dims.slice(1, 4).join(' × ')}<br />
                <strong>Voxel Size:</strong> {niftiHeader.pixDims.slice(1, 4).map(s => s?.toFixed(2) || '1.00').join(' × ')} mm<br />
                <strong>Data Type:</strong> {niftiHeader.datatypeCode}<br />
                <strong>Orientation:</strong> {niftiHeader.qform_code > 0 ? 'Qform' : 'Sform'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  );
};

export default OfflineNiftiViewer; 