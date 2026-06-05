import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Slider,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Close,
  Fullscreen,
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  ZoomIn,
  ZoomOut,
  RestartAlt,
  Download,
  Image as ImageIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import * as nifti from 'nifti-reader-js';
import pako from 'pako';

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

// Medical windowing presets
const windowPresets = {
  soft_tissue: { center: 50, width: 350, name: 'Soft Tissue', color: '#4caf50' },
  lung: { center: -600, width: 1500, name: 'Lung', color: '#2196f3' },
  bone: { center: 400, width: 1500, name: 'Bone', color: '#ff9800' },
  brain: { center: 40, width: 80, name: 'Brain', color: '#9c27b0' },
};

const CT3DPreviewModal = ({ open, onClose, ctFileUrl, xrayUrl, patientName = '' }) => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const playIntervalRef = useRef(null);

  // NIfTI data state
  const [niftiData, setNiftiData] = useState(null);
  const [niftiHeader, setNiftiHeader] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Viewer state
  const [currentPlane, setCurrentPlane] = useState(0); // 0: axial, 1: sagittal, 2: coronal
  const [sliceIndex, setSliceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed] = useState(150);

  // Display settings
  const [windowCenter, setWindowCenter] = useState(50);
  const [windowWidth, setWindowWidth] = useState(350);
  const [currentPreset, setCurrentPreset] = useState('soft_tissue');
  const [zoom, setZoom] = useState(1);

  const planes = ['Axial', 'Sagittal', 'Coronal'];

  // Load NIfTI from URL
  const loadNiftiFromUrl = useCallback(async (fileUrl) => {
    if (!fileUrl) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const urlPath = new URL(fileUrl).pathname;
      const filename = urlPath.split('/').pop() || 'ct_scan.nii.gz';

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

      // Auto-adjust window/level
      let sum = 0, count = 0;
      for (let i = 0; i < Math.min(typedData.length, 100000); i++) {
        if (typedData[i] > -1000) {
          sum += typedData[i];
          count++;
        }
      }
      const avgVal = sum / count;
      setWindowCenter(avgVal);
      setWindowWidth(800);

    } catch (error) {
      console.error('Error loading NIfTI:', error);
      setError(`Không thể tải file: ${error.message}`);
      toast.error(`Lỗi tải file CT: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load when modal opens with URL
  useEffect(() => {
    if (open && ctFileUrl && !niftiData) {
      loadNiftiFromUrl(ctFileUrl);
    }
  }, [open, ctFileUrl, niftiData, loadNiftiFromUrl]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      stopAnimation();
      // Reset after animation
      setTimeout(() => {
        setNiftiData(null);
        setNiftiHeader(null);
        setError(null);
        setSliceIndex(0);
        setCurrentPlane(0);
        setZoom(1);
      }, 300);
    }
  }, [open]);

  // Get slice count for current plane
  const getSliceCount = useCallback(() => {
    if (!niftiHeader) return 0;
    const { dims } = niftiHeader;
    switch (currentPlane) {
      case 0: return dims[3]; // Axial
      case 1: return dims[1]; // Sagittal
      case 2: return dims[2]; // Coronal
      default: return 0;
    }
  }, [niftiHeader, currentPlane]);

  // Extract slice data
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

  // Apply windowing and render to canvas
  const renderSlice = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sliceInfo = getSliceData();
    if (!sliceInfo) return;

    const { data, width, height } = sliceInfo;
    const ctx = canvas.getContext('2d');

    // Set canvas size
    const displaySize = Math.min(400, width, height) * zoom;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize * (height / width)}px`;

    // Create image data
    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    // Apply windowing
    const windowMin = windowCenter - windowWidth / 2;
    const windowMax = windowCenter + windowWidth / 2;

    for (let i = 0; i < data.length; i++) {
      let value = data[i];

      // Apply window/level
      if (value <= windowMin) {
        value = 0;
      } else if (value >= windowMax) {
        value = 255;
      } else {
        value = ((value - windowMin) / windowWidth) * 255;
      }

      const pixelIndex = i * 4;
      pixels[pixelIndex] = value;     // R
      pixels[pixelIndex + 1] = value; // G
      pixels[pixelIndex + 2] = value; // B
      pixels[pixelIndex + 3] = 255;   // A
    }

    ctx.putImageData(imageData, 0, 0);
  }, [getSliceData, windowCenter, windowWidth, zoom]);

  // Re-render when dependencies change
  useEffect(() => {
    if (niftiData) {
      renderSlice();
    }
  }, [niftiData, sliceIndex, currentPlane, windowCenter, windowWidth, zoom, renderSlice]);

  // Animation controls
  const startAnimation = () => {
    if (playIntervalRef.current) return;
    setIsPlaying(true);
    playIntervalRef.current = setInterval(() => {
      setSliceIndex(prev => {
        const maxSlices = getSliceCount();
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

  const handlePlaneChange = (event, newValue) => {
    if (newValue !== null) {
      setCurrentPlane(newValue);
      setSliceIndex(0);
      stopAnimation();
    }
  };

  const handlePresetChange = (presetKey) => {
    const preset = windowPresets[presetKey];
    setCurrentPreset(presetKey);
    setWindowCenter(preset.center);
    setWindowWidth(preset.width);
  };

  const handleOpenFullscreen = () => {
    const encodedUrl = encodeURIComponent(ctFileUrl);
    let url = `/viewer?file=${encodedUrl}`;
    if (xrayUrl) {
      url += `&xray=${encodeURIComponent(xrayUrl)}`;
    }
    navigate(url);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 1
      }}>
        <Box>
          <Typography variant="h6" component="span">
            Xem trước CT 3D
          </Typography>
          {patientName && (
            <Typography variant="body2" color="text.secondary">
              Bệnh nhân: {patientName}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {loading && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: 300,
            gap: 2
          }}>
            <CircularProgress size={48} />
            <Typography color="text.secondary">
              Đang tải file CT...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && niftiData && (
          <Grid container spacing={2}>
            {/* Canvas viewer */}
            <Grid item xs={12} md={8}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                bgcolor: '#000',
                borderRadius: 1,
                p: 2,
              }}>
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                />

                {/* Slice slider */}
                <Box sx={{ width: '100%', mt: 2, px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => setSliceIndex(Math.max(0, sliceIndex - 1))}
                      sx={{ color: 'white' }}
                    >
                      <SkipPrevious />
                    </IconButton>

                    <IconButton 
                      size="small" 
                      onClick={isPlaying ? stopAnimation : startAnimation}
                      sx={{ color: 'white' }}
                    >
                      {isPlaying ? <Pause /> : <PlayArrow />}
                    </IconButton>

                    <IconButton 
                      size="small" 
                      onClick={() => setSliceIndex(Math.min(getSliceCount() - 1, sliceIndex + 1))}
                      sx={{ color: 'white' }}
                    >
                      <SkipNext />
                    </IconButton>

                    <Slider
                      value={sliceIndex}
                      min={0}
                      max={Math.max(0, getSliceCount() - 1)}
                      onChange={(e, val) => setSliceIndex(val)}
                      sx={{ flex: 1, mx: 2, color: 'primary.main' }}
                    />

                    <Typography variant="caption" sx={{ color: 'white', minWidth: 60 }}>
                      {sliceIndex + 1} / {getSliceCount()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Controls */}
            <Grid item xs={12} md={4}>
              {/* Plane selection */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Mặt cắt
                </Typography>
                <Tabs
                  value={currentPlane}
                  onChange={handlePlaneChange}
                  variant="fullWidth"
                  sx={{ 
                    minHeight: 36,
                    '& .MuiTab-root': { minHeight: 36, py: 0.5 }
                  }}
                >
                  {planes.map((plane, idx) => (
                    <Tab key={idx} label={plane} />
                  ))}
                </Tabs>
              </Box>

              {/* Window presets */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Preset
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {Object.entries(windowPresets).map(([key, preset]) => (
                    <Chip
                      key={key}
                      label={preset.name}
                      size="small"
                      onClick={() => handlePresetChange(key)}
                      sx={{
                        bgcolor: currentPreset === key ? preset.color : 'default',
                        color: currentPreset === key ? 'white' : 'inherit',
                        '&:hover': {
                          bgcolor: preset.color,
                          color: 'white',
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Zoom controls */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Zoom: {Math.round(zoom * 100)}%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton size="small" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>
                    <ZoomOut />
                  </IconButton>
                  <Slider
                    value={zoom}
                    min={0.5}
                    max={3}
                    step={0.25}
                    onChange={(e, val) => setZoom(val)}
                    sx={{ flex: 1 }}
                  />
                  <IconButton size="small" onClick={() => setZoom(Math.min(3, zoom + 0.25))}>
                    <ZoomIn />
                  </IconButton>
                  <Tooltip title="Reset zoom">
                    <IconButton size="small" onClick={() => setZoom(1)}>
                      <RestartAlt />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Metadata info */}
              {niftiHeader && (
                <Box sx={{ 
                  bgcolor: 'action.hover', 
                  borderRadius: 1, 
                  p: 1.5,
                  fontSize: '0.75rem'
                }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Thông tin
                  </Typography>
                  <Typography variant="caption" display="block">
                    Kích thước: {niftiHeader.dims[1]} × {niftiHeader.dims[2]} × {niftiHeader.dims[3]}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Voxel: {niftiHeader.pixDims[1].toFixed(2)} × {niftiHeader.pixDims[2].toFixed(2)} × {niftiHeader.pixDims[3].toFixed(2)} mm
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Đóng
        </Button>
        <Box sx={{ flex: 1 }} />
        {xrayUrl && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ImageIcon />}
            onClick={() => downloadFile(xrayUrl, 'xray.png')}
          >
            Tải X-ray
          </Button>
        )}
        <Button
          variant="outlined"
          size="small"
          startIcon={<Download />}
          onClick={() => downloadFile(ctFileUrl, 'ct_result.nii.gz')}
          disabled={loading || !!error || !ctFileUrl}
        >
          Tải NIfTI
        </Button>
        <Button
          variant="contained"
          startIcon={<Fullscreen />}
          onClick={handleOpenFullscreen}
          disabled={loading || !!error}
        >
          Xem toàn màn hình
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CT3DPreviewModal;
