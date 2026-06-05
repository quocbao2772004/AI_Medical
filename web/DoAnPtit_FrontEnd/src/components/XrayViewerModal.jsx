/**
 * X-ray Image Viewer Modal
 * Professional medical image viewer with zoom, pan, brightness/contrast controls
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Slider,
  Paper,
  Tooltip,
  Divider,
  Chip,
  Button,
} from '@mui/material';
import {
  Close,
  ZoomIn,
  ZoomOut,
  RestartAlt,
  Brightness6,
  Contrast,
  InvertColors,
  Download,
  Fullscreen,
  FullscreenExit,
  FitScreen,
  RotateRight,
  FlipCameraAndroid,
} from '@mui/icons-material';
import config from '../config';

const XrayViewerModal = ({ open, onClose, imageUrl, title = 'X-ray Viewer' }) => {
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Transform states
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);

  // Image adjustment states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);

  // UI states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Reset all transformations
  const resetAll = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setBrightness(100);
    setContrast(100);
    setInvert(false);
  }, []);

  // Reset when modal opens with new image
  useEffect(() => {
    if (open) {
      resetAll();
    }
  }, [open, imageUrl, resetAll]);

  // Zoom handlers
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.25));
  const handleFitToScreen = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Rotation handlers
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleFlipX = () => setFlipX(prev => !prev);
  const handleFlipY = () => setFlipY(prev => !prev);

  // Download image handler
  const handleDownloadImage = async () => {
    if (!imageUrl) return;
    
    try {
      // Parse URL to extract patient_id, record_id, filename
      // URL format: {PUBLIC_URL}/patient_files/{patient_id}/{record_id}/{filename}
      const urlObj = new URL(imageUrl);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      
      // Check if it's a patient_files URL
      if (pathParts[0] === 'patient_files' && pathParts.length >= 4) {
        const patientId = pathParts[1];
        const recordId = pathParts[2];
        const filename = pathParts[3];
        
        // Use API endpoint for download (goes through CORS middleware)
        // Use internal API URL for API calls
        const token = localStorage.getItem('access_token');
        const apiUrl = `${config.API_URL}/medical-records/download/${patientId}/${recordId}/${filename}`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch image');
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
      
      // Fallback for other URLs: direct fetch
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const urlParts = imageUrl.split('/');
      link.download = urlParts[urlParts.length - 1] || 'xray_image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Failed to download image:', error);
      
      // Fallback: Open image in new tab for manual save
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(prev + delta, 0.25), 5));
  }, []);

  // Pan handlers
  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = () => setIsDragging(false);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Build CSS filter string
  const getImageFilters = () => {
    const filters = [
      `brightness(${brightness}%)`,
      `contrast(${contrast}%)`,
      invert ? 'invert(1)' : '',
    ].filter(Boolean).join(' ');
    return filters;
  };

  // Build CSS transform string
  const getImageTransform = () => {
    return `
      translate(${position.x}px, ${position.y}px)
      scale(${scale})
      rotate(${rotation}deg)
      scaleX(${flipX ? -1 : 1})
      scaleY(${flipY ? -1 : 1})
    `;
  };

  // Control button component
  const ControlButton = ({ icon, label, onClick, active = false, size = 'small' }) => (
    <Tooltip title={label} placement="top">
      <IconButton
        onClick={onClick}
        size={size}
        sx={{
          color: active ? 'primary.main' : 'grey.400',
          bgcolor: active ? 'primary.main' + '20' : 'transparent',
          '&:hover': {
            bgcolor: 'grey.800',
            color: 'white',
          },
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullScreen={isFullscreen}
      PaperProps={{
        ref: containerRef,
        sx: {
          bgcolor: '#0a0a0a',
          backgroundImage: 'none',
          width: isFullscreen ? '100vw' : '90vw',
          height: isFullscreen ? '100vh' : '90vh',
          maxWidth: '1600px',
          maxHeight: '900px',
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          bgcolor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
            {title}
          </Typography>
          <Chip
            size="small"
            label={`${Math.round(scale * 100)}%`}
            sx={{ bgcolor: 'grey.800', color: 'grey.300' }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download />}
            onClick={handleDownloadImage}
            sx={{
              color: 'grey.300',
              borderColor: 'grey.700',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'primary.main' + '20',
              },
            }}
          >
            Tải ảnh
          </Button>
          <IconButton onClick={toggleFullscreen} sx={{ color: 'grey.400' }}>
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
          <IconButton onClick={onClose} sx={{ color: 'grey.400' }}>
            <Close />
          </IconButton>
        </Box>
      </Box>

      {/* Main Image Area */}
      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#0a0a0a',
          cursor: isDragging ? 'grabbing' : 'grab',
          overflow: 'hidden',
          pt: '56px', // Header height
          pb: showControls ? '120px' : '16px', // Controls height
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {imageUrl && (
          <Box
            component="img"
            ref={imageRef}
            src={imageUrl}
            alt="X-ray"
            draggable={false}
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transform: getImageTransform(),
              filter: getImageFilters(),
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              userSelect: 'none',
            }}
          />
        )}

        {/* Zoom info overlay */}
        {scale !== 1 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: showControls ? 140 : 24,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'rgba(0,0,0,0.7)',
              px: 2,
              py: 0.5,
              borderRadius: 2,
            }}
          >
            <Typography variant="caption" sx={{ color: 'grey.400' }}>
              Cuộn chuột để zoom • Kéo để di chuyển
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* Bottom Controls */}
      {showControls && (
        <Paper
          elevation={0}
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            p: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {/* Zoom Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'grey.500', mr: 1, minWidth: 40 }}>
                Zoom
              </Typography>
              <ControlButton icon={<ZoomOut />} label="Thu nhỏ" onClick={handleZoomOut} />
              <ControlButton icon={<FitScreen />} label="Vừa màn hình" onClick={handleFitToScreen} />
              <ControlButton icon={<ZoomIn />} label="Phóng to" onClick={handleZoomIn} />
            </Box>

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'grey.800' }} />

            {/* Transform Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'grey.500', mr: 1, minWidth: 50 }}>
                Xoay
              </Typography>
              <ControlButton icon={<RotateRight />} label={`Xoay 90° (${rotation}°)`} onClick={handleRotate} active={rotation !== 0} />
              <ControlButton icon={<FlipCameraAndroid sx={{ transform: 'rotate(90deg)' }} />} label="Lật ngang" onClick={handleFlipX} active={flipX} />
              <ControlButton icon={<FlipCameraAndroid />} label="Lật dọc" onClick={handleFlipY} active={flipY} />
            </Box>

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'grey.800' }} />

            {/* Image Adjustment Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              {/* Brightness */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                <Tooltip title="Độ sáng">
                  <Brightness6 sx={{ color: 'grey.500', fontSize: 20 }} />
                </Tooltip>
                <Slider
                  value={brightness}
                  onChange={(e, val) => setBrightness(val)}
                  min={0}
                  max={200}
                  size="small"
                  sx={{
                    color: 'primary.main',
                    '& .MuiSlider-thumb': { width: 14, height: 14 },
                  }}
                />
                <Typography variant="caption" sx={{ color: 'grey.500', minWidth: 35 }}>
                  {brightness}%
                </Typography>
              </Box>

              {/* Contrast */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                <Tooltip title="Độ tương phản">
                  <Contrast sx={{ color: 'grey.500', fontSize: 20 }} />
                </Tooltip>
                <Slider
                  value={contrast}
                  onChange={(e, val) => setContrast(val)}
                  min={0}
                  max={200}
                  size="small"
                  sx={{
                    color: 'primary.main',
                    '& .MuiSlider-thumb': { width: 14, height: 14 },
                  }}
                />
                <Typography variant="caption" sx={{ color: 'grey.500', minWidth: 35 }}>
                  {contrast}%
                </Typography>
              </Box>

              {/* Invert */}
              <ControlButton
                icon={<InvertColors />}
                label="Đảo màu (hữu ích cho X-ray)"
                onClick={() => setInvert(!invert)}
                active={invert}
              />
            </Box>

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'grey.800' }} />

            {/* Reset */}
            <ControlButton
              icon={<RestartAlt />}
              label="Đặt lại tất cả"
              onClick={resetAll}
            />
          </Box>
        </Paper>
      )}
    </Dialog>
  );
};

export default XrayViewerModal;
