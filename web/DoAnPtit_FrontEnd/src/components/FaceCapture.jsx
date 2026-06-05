/**
 * FaceCapture Component
 * Component để chụp ảnh khuôn mặt với webcam
 * Sử dụng face-api.js để detect khuôn mặt real-time
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  LinearProgress,
  alpha,
  useTheme,
  Zoom,
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Face as FaceIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
  FlipCameraIos as FlipIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import * as faceapi from 'face-api.js';

const FaceCapture = ({
  onCapture,
  onSubmit, // callback when ready to submit (login: auto, register: after capture)
  minImages = 1,
  maxImages = 1, // Changed default to 1 for simpler registration
  initialImages = [],
  disabled = false,
  mode = 'register', // 'register' | 'login'
  autoLogin = true, // Auto capture and submit in login mode
  autoStart = false, // Auto start camera when component mounts
}) => {
  const theme = useTheme();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const autoLoginTimeoutRef = useRef(null);
  const hasAutoSubmittedRef = useRef(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImages, setCapturedImages] = useState(initialImages);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [loadingStatus, setLoadingStatus] = useState('');
  const [autoLoginProgress, setAutoLoginProgress] = useState(0);
  
  // Stop webcam function - needs to be defined first for useEffect cleanup
  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    if (autoLoginTimeoutRef.current) {
      clearTimeout(autoLoginTimeoutRef.current);
      autoLoginTimeoutRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setCameraActive(false);
    setFaceDetected(false);
    setAutoLoginProgress(0);
  }, []);

  // Face detection function with enhanced landmarks visualization
  const startFaceDetection = useCallback(() => {
    const detectFace = async () => {
      if (!videoRef.current) return;
      
      const video = videoRef.current;
      if (video.readyState !== 4) return;
      
      try {
        const options = new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5,
        });
        
        // Detect face with landmarks
        const detectionWithLandmarks = await faceapi
          .detectSingleFace(video, options)
          .withFaceLandmarks();
        
        if (detectionWithLandmarks) {
          setFaceDetected(true);
          
          const canvas = canvasRef.current;
          if (canvas) {
            const displaySize = { width: video.videoWidth, height: video.videoHeight };
            faceapi.matchDimensions(canvas, displaySize);
            
            const resizedResults = faceapi.resizeResults(detectionWithLandmarks, displaySize);
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const box = resizedResults.detection.box;
            const landmarks = resizedResults.landmarks;
            const positions = landmarks.positions;
            
            // Create gradient for face box
            const gradient = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height);
            gradient.addColorStop(0, '#00ff87');
            gradient.addColorStop(0.5, '#60efff');
            gradient.addColorStop(1, '#00ff87');
            
            // Draw animated face box with glow
            ctx.shadowColor = '#00ff87';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            ctx.setLineDash([]);
            
            // Draw corner brackets
            const cornerSize = 20;
            ctx.shadowBlur = 15;
            ctx.lineWidth = 4;
            
            // Top-left corner
            ctx.beginPath();
            ctx.moveTo(box.x, box.y + cornerSize);
            ctx.lineTo(box.x, box.y);
            ctx.lineTo(box.x + cornerSize, box.y);
            ctx.stroke();
            
            // Top-right corner
            ctx.beginPath();
            ctx.moveTo(box.x + box.width - cornerSize, box.y);
            ctx.lineTo(box.x + box.width, box.y);
            ctx.lineTo(box.x + box.width, box.y + cornerSize);
            ctx.stroke();
            
            // Bottom-left corner
            ctx.beginPath();
            ctx.moveTo(box.x, box.y + box.height - cornerSize);
            ctx.lineTo(box.x, box.y + box.height);
            ctx.lineTo(box.x + cornerSize, box.y + box.height);
            ctx.stroke();
            
            // Bottom-right corner
            ctx.beginPath();
            ctx.moveTo(box.x + box.width - cornerSize, box.y + box.height);
            ctx.lineTo(box.x + box.width, box.y + box.height);
            ctx.lineTo(box.x + box.width, box.y + box.height - cornerSize);
            ctx.stroke();
            
            // Reset shadow for landmarks
            ctx.shadowBlur = 0;
            
            // Draw face mesh connections
            const jawLine = positions.slice(0, 17);
            const leftEyebrow = positions.slice(17, 22);
            const rightEyebrow = positions.slice(22, 27);
            const noseBridge = positions.slice(27, 31);
            const nose = positions.slice(31, 36);
            const leftEye = positions.slice(36, 42);
            const rightEye = positions.slice(42, 48);
            const outerLip = positions.slice(48, 60);
            const innerLip = positions.slice(60, 68);
            
            // Draw mesh lines with gradient
            const drawPath = (points, closed = false, color = 'rgba(96, 239, 255, 0.6)') => {
              if (points.length < 2) return;
              ctx.beginPath();
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.5;
              ctx.moveTo(points[0].x, points[0].y);
              points.forEach(p => ctx.lineTo(p.x, p.y));
              if (closed) ctx.closePath();
              ctx.stroke();
            };
            
            // Draw face contours
            drawPath(jawLine, false, 'rgba(0, 255, 135, 0.5)');
            drawPath(leftEyebrow, false, 'rgba(96, 239, 255, 0.7)');
            drawPath(rightEyebrow, false, 'rgba(96, 239, 255, 0.7)');
            drawPath(noseBridge, false, 'rgba(255, 154, 158, 0.6)');
            drawPath(nose, false, 'rgba(255, 154, 158, 0.6)');
            drawPath(leftEye, true, 'rgba(96, 239, 255, 0.8)');
            drawPath(rightEye, true, 'rgba(96, 239, 255, 0.8)');
            drawPath(outerLip, true, 'rgba(255, 154, 158, 0.7)');
            drawPath(innerLip, true, 'rgba(255, 154, 158, 0.5)');
            
            // Draw landmark points with glow effect
            positions.forEach((point, i) => {
              let color, size;
              
              // Different colors for different facial features
              if (i < 17) { // Jaw
                color = '#00ff87';
                size = 2;
              } else if (i < 27) { // Eyebrows
                color = '#60efff';
                size = 2.5;
              } else if (i < 36) { // Nose
                color = '#ff9a9e';
                size = 2.5;
              } else if (i < 48) { // Eyes
                color = '#60efff';
                size = 3;
              } else { // Lips
                color = '#ff9a9e';
                size = 2.5;
              }
              
              // Glow effect
              ctx.shadowColor = color;
              ctx.shadowBlur = 8;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
              ctx.fill();
            });
            
            // Draw scanning line effect
            const time = Date.now() / 1000;
            const scanY = box.y + (Math.sin(time * 2) * 0.5 + 0.5) * box.height;
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#60efff';
            const scanGradient = ctx.createLinearGradient(box.x, scanY, box.x + box.width, scanY);
            scanGradient.addColorStop(0, 'rgba(96, 239, 255, 0)');
            scanGradient.addColorStop(0.5, 'rgba(96, 239, 255, 0.8)');
            scanGradient.addColorStop(1, 'rgba(96, 239, 255, 0)');
            ctx.strokeStyle = scanGradient;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(box.x, scanY);
            ctx.lineTo(box.x + box.width, scanY);
            ctx.stroke();
            
            // Reset shadow
            ctx.shadowBlur = 0;
          }
        } else {
          setFaceDetected(false);
          
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      } catch (err) {
        console.error('Face detection error:', err);
      }
    };
    
    detectionIntervalRef.current = setInterval(detectFace, 50);
  }, []);
  
  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true);
      setLoadingStatus('Đang tải mô hình nhận diện khuôn mặt...');
      
      try {
        // Sử dụng PUBLIC_URL để đúng path khi deploy qua Kong
        const MODEL_URL = `${process.env.PUBLIC_URL || ''}/models`;
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        
        setModelsLoaded(true);
        setLoadingStatus('');
      } catch (err) {
        console.error('Error loading face-api models:', err);
        setError('Không thể tải mô hình nhận diện. Vui lòng tải lại trang.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadModels();
    
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Start webcam
  const startCamera = useCallback(async () => {
    if (!modelsLoaded) {
      setError('Mô hình nhận diện chưa được tải xong. Vui lòng đợi.');
      return;
    }
    
    // Check if mediaDevices API is available (requires HTTPS or localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isSecure) {
        setError('Camera yêu cầu kết nối HTTPS. Vui lòng truy cập qua HTTPS hoặc localhost.');
      } else {
        setError('Trình duyệt không hỗ trợ truy cập camera. Vui lòng sử dụng Chrome, Firefox hoặc Edge.');
      }
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: facingMode,
        },
        audio: false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setCameraActive(true);
      startFaceDetection();
      
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Quyền truy cập camera bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt.');
      } else if (err.name === 'NotFoundError') {
        setError('Không tìm thấy camera. Vui lòng kiểm tra kết nối camera.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera đang được sử dụng bởi ứng dụng khác.');
      } else {
        setError('Không thể truy cập camera: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [modelsLoaded, facingMode, startFaceDetection]);

  // Auto start camera when models are loaded and autoStart is true
  useEffect(() => {
    if (autoStart && modelsLoaded && !cameraActive && !disabled) {
      startCamera();
    }
  }, [autoStart, modelsLoaded, cameraActive, disabled, startCamera]);

  // Toggle camera facing mode
  const toggleCamera = useCallback(async () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, [stopCamera]);

  // Effect to restart camera when facingMode changes
  useEffect(() => {
    if (cameraActive === false && modelsLoaded) {
      // Only auto-restart if it was just toggled (not initial state)
    }
  }, [facingMode, cameraActive, modelsLoaded]);

  // Capture image from video and submit
  const captureAndSubmit = useCallback(() => {
    if (!videoRef.current || !faceDetected || hasAutoSubmittedRef.current) return;
    
    hasAutoSubmittedRef.current = true;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    // Stop camera after capture
    stopCamera();
    
    // Submit immediately
    if (onSubmit) {
      onSubmit([imageData]);
    } else if (onCapture) {
      onCapture([imageData]);
    }
  }, [faceDetected, onCapture, onSubmit, facingMode, stopCamera]);

  // Auto login effect - when face is detected for 1.5 seconds, auto capture and submit
  useEffect(() => {
    if (mode === 'login' && autoLogin && cameraActive && faceDetected && !disabled && !hasAutoSubmittedRef.current) {
      // Start progress animation
      setAutoLoginProgress(0);
      const progressInterval = setInterval(() => {
        setAutoLoginProgress(prev => Math.min(prev + 6.67, 100)); // 100% in 1.5s (15 steps)
      }, 100);
      
      // Auto capture after 1.5 seconds of face detection
      autoLoginTimeoutRef.current = setTimeout(() => {
        clearInterval(progressInterval);
        setAutoLoginProgress(100);
        captureAndSubmit();
      }, 1500);
      
      return () => {
        clearInterval(progressInterval);
        if (autoLoginTimeoutRef.current) {
          clearTimeout(autoLoginTimeoutRef.current);
          autoLoginTimeoutRef.current = null;
        }
      };
    } else if (!faceDetected) {
      // Reset progress when face is lost
      setAutoLoginProgress(0);
      if (autoLoginTimeoutRef.current) {
        clearTimeout(autoLoginTimeoutRef.current);
        autoLoginTimeoutRef.current = null;
      }
    }
  }, [mode, autoLogin, cameraActive, faceDetected, disabled, captureAndSubmit]);

  // Capture image for register mode (add to array)
  const captureImage = useCallback(() => {
    if (!videoRef.current || !faceDetected) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    // Register mode: add to array and auto submit if reached max
    const newImages = [...capturedImages, imageData];
    setCapturedImages(newImages);
    
    console.log('[FaceCapture] Captured image, total:', newImages.length);
    
    // Always call onCapture to update parent state
    if (onCapture) {
      console.log('[FaceCapture] Calling onCapture with', newImages.length, 'images');
      onCapture(newImages);
    } else {
      console.log('[FaceCapture] onCapture is not defined!');
    }
    
    // Auto submit after capturing required images
    if (newImages.length >= maxImages) {
      stopCamera();
      if (onSubmit) {
        onSubmit(newImages);
      }
    }
  }, [faceDetected, capturedImages, onCapture, onSubmit, facingMode, maxImages, stopCamera]);

  // Auto capture with countdown
  const autoCapture = useCallback(() => {
    if (!faceDetected) {
      setError('Không phát hiện khuôn mặt. Vui lòng đưa mặt vào khung hình.');
      return;
    }
    
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          captureImage();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [faceDetected, captureImage]);

  // Remove captured image
  const removeImage = (index) => {
    const newImages = capturedImages.filter((_, i) => i !== index);
    setCapturedImages(newImages);
    if (onCapture) {
      onCapture(newImages);
    }
  };

  // Clear all images
  const clearAllImages = () => {
    setCapturedImages([]);
    if (onCapture) {
      onCapture([]);
    }
  };

  return (
    <Box>
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {loadingStatus && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">{loadingStatus}</Typography>
          </Box>
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: '#0F172A',
          aspectRatio: '4/3',
          mb: 2,
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            display: cameraActive ? 'block' : 'none',
            zIndex: 1,
          }}
        />
        
        {/* Canvas for face detection overlay - landmarks, mesh */}
        <canvas 
          ref={canvasRef} 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            pointerEvents: 'none',
            zIndex: 2,
          }} 
        />
        
        {!cameraActive && !isLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <VideocamOffIcon sx={{ fontSize: 64, opacity: 0.5, mb: 2 }} />
            <Typography variant="body1" sx={{ opacity: 0.7 }}>
              Camera chưa được bật
            </Typography>
            {!modelsLoaded && (
              <Typography variant="caption" sx={{ opacity: 0.5, mt: 1 }}>
                Đang tải mô hình nhận diện...
              </Typography>
            )}
          </Box>
        )}
        
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.7)',
            }}
          >
            <CircularProgress sx={{ color: 'white', mb: 2 }} />
            <Typography variant="body2" sx={{ color: 'white', opacity: 0.8 }}>
              {loadingStatus || 'Đang khởi động camera...'}
            </Typography>
          </Box>
        )}
        
        {cameraActive && (
          <>
            {/* Status chip - positioned at top */}
            <Chip
              icon={faceDetected ? <CheckIcon /> : <FaceIcon />}
              label={
                mode === 'login' 
                  ? (faceDetected ? '🔐 Đang xác thực...' : '🔍 Đưa mặt vào khung hình')
                  : (faceDetected ? '✨ Đã nhận diện - Ấn chụp' : '🔍 Đưa mặt vào khung hình')
              }
              color={faceDetected ? 'success' : 'warning'}
              size="small"
              sx={{
                position: 'absolute',
                top: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                fontWeight: 600,
                zIndex: 10,
              }}
            />
            
            {/* Auto login progress bar */}
            {mode === 'login' && autoLogin && faceDetected && autoLoginProgress > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 80,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '60%',
                  zIndex: 10,
                }}
              >
                <LinearProgress 
                  variant="determinate" 
                  value={autoLoginProgress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #00ff87 0%, #60efff 100%)',
                      borderRadius: 4,
                    },
                  }}
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'white', 
                    textAlign: 'center', 
                    display: 'block',
                    mt: 0.5,
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  }}
                >
                  Đang xác thực khuôn mặt...
                </Typography>
              </Box>
            )}
            
            {countdown !== null && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  zIndex: 20,
                }}
              >
                <Zoom in>
                  <Typography
                    variant="h1"
                    sx={{
                      color: 'white',
                      fontSize: 120,
                      fontWeight: 700,
                      textShadow: '0 0 20px rgba(255,255,255,0.5)',
                    }}
                  >
                    {countdown}
                  </Typography>
                </Zoom>
              </Box>
            )}
          </>
        )}
        
        {/* Camera control buttons */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 2,
            zIndex: 10,
          }}
        >
          {!cameraActive ? (
            <Button
              variant="contained"
              startIcon={<VideocamIcon />}
              onClick={startCamera}
              disabled={isLoading || disabled || !modelsLoaded}
              sx={{
                bgcolor: theme.palette.primary.main,
                '&:hover': { bgcolor: theme.palette.primary.dark },
              }}
            >
              Bật Camera
            </Button>
          ) : (
            <>
              <IconButton
                onClick={toggleCamera}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                <FlipIcon />
              </IconButton>
              
              <IconButton
                onClick={autoCapture}
                disabled={!faceDetected || countdown !== null || (mode === 'register' && capturedImages.length >= maxImages)}
                sx={{
                  bgcolor: faceDetected ? theme.palette.success.main : 'rgba(255,255,255,0.2)',
                  color: 'white',
                  width: 64,
                  height: 64,
                  '&:hover': { 
                    bgcolor: faceDetected ? theme.palette.success.dark : 'rgba(255,255,255,0.3)' 
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.3)',
                  },
                }}
              >
                <PhotoCameraIcon sx={{ fontSize: 32 }} />
              </IconButton>
              
              <IconButton
                onClick={stopCamera}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': { bgcolor: theme.palette.error.main },
                }}
              >
                <VideocamOffIcon />
              </IconButton>
            </>
          )}
        </Box>
      </Paper>

      {mode === 'register' && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Ảnh đã chụp: {capturedImages.length}/{maxImages}
            </Typography>
            <Typography variant="body2" color={capturedImages.length >= minImages ? 'success.main' : 'warning.main'}>
              {capturedImages.length >= minImages ? 'Đủ ảnh ✓' : `Cần tối thiểu ${minImages} ảnh`}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(capturedImages.length / maxImages) * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                background: capturedImages.length >= minImages
                  ? `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`
                  : `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                borderRadius: 4,
              },
            }}
          />
        </Box>
      )}

      {mode === 'register' && capturedImages.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              <AutoAwesomeIcon sx={{ mr: 1, fontSize: 18, verticalAlign: 'middle', color: theme.palette.primary.main }} />
              Ảnh đã chụp
            </Typography>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={clearAllImages}
            >
              Xóa tất cả
            </Button>
          </Box>
          <Grid container spacing={1}>
            {capturedImages.map((img, index) => (
              <Grid item xs={4} sm={3} md={2} key={index}>
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: 2,
                    overflow: 'hidden',
                    aspectRatio: '1',
                    '&:hover .delete-btn': {
                      opacity: 1,
                    },
                  }}
                >
                  <img
                    src={img}
                    alt={`Face ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <IconButton
                    className="delete-btn"
                    size="small"
                    onClick={() => removeImage(index)}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      '&:hover': {
                        bgcolor: theme.palette.error.main,
                      },
                    }}
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                  <Chip
                    label={index + 1}
                    size="small"
                    sx={{
                      position: 'absolute',
                      bottom: 4,
                      left: 4,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Alert 
        severity="info" 
        icon={<FaceIcon />}
        sx={{ 
          borderRadius: 2,
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
          Hướng dẫn chụp ảnh tốt:
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          <li>Đảm bảo ánh sáng đủ, tránh ngược sáng</li>
          <li>Đưa khuôn mặt vào giữa khung hình oval</li>
          <li>Giữ khuôn mặt thẳng, không nghiêng quá nhiều</li>
          {mode === 'register' && (
            <>
              <li>Chụp nhiều góc khác nhau (chính diện, nghiêng nhẹ)</li>
              <li>Tối thiểu {minImages} ảnh để đăng ký thành công</li>
            </>
          )}
        </Box>
      </Alert>

      {/* Submit Button for Register Mode */}
      {mode === 'register' && capturedImages.length >= minImages && onSubmit && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            disabled={disabled}
            onClick={() => {
              stopCamera();
              onSubmit(capturedImages);
            }}
            sx={{
              px: 6,
              py: 1.5,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #0891B2 0%, #06B6D4 50%, #22D3EE 100%)',
              fontWeight: 600,
              fontSize: '1rem',
              boxShadow: '0 4px 14px rgba(8, 145, 178, 0.4)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(8, 145, 178, 0.5)',
              },
            }}
          >
            {disabled ? (
              <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
            ) : (
              <CheckIcon sx={{ mr: 1 }} />
            )}
            Xác nhận đăng ký ({capturedImages.length} ảnh)
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default FaceCapture;
