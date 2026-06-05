/**
 * Settings Page - Trang cài đặt
 */
import React, { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Button,
    Grid,
    Switch,
    Divider,
    Select,
    MenuItem,
    FormControl,
    Slider,
    Alert,
    Chip,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Language,
    Notifications,
    VolumeUp,
    Speed,
    Security,
    Storage,
    Info,
    Save,
    Restore,
    Delete,
    Warning,
    Palette,
    TextFields,
    Accessibility,
    BugReport,
    CloudDownload,
    CloudUpload,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Default settings
const defaultSettings = {
    // Language & Display
    language: 'vi',
    theme: 'light',
    fontSize: 14,
    compactMode: false,
    
    // Notifications
    enableNotifications: true,
    soundEnabled: true,
    emailNotifications: true,
    pushNotifications: false,
    
    // Inference Settings
    defaultGuidanceScale: 7.5,
    autoSaveResults: true,
    keepHistory: 30, // days
    
    // Privacy & Security
    shareAnonymousData: false,
    twoFactorAuth: false,
    sessionTimeout: 30, // minutes
    
    // Advanced
    debugMode: false,
    highQualityRendering: true,
    autoLoadPreviousSession: false,
};

const SettingsPage = () => {
    const { user } = useAuth();
    
    const [settings, setSettings] = useState(() => {
        // Load from localStorage or use defaults
        const saved = localStorage.getItem('app_settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    });
    
    const [hasChanges, setHasChanges] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
    
    // Save settings to localStorage
    const handleSaveSettings = () => {
        localStorage.setItem('app_settings', JSON.stringify(settings));
        setHasChanges(false);
        toast.success('Đã lưu cài đặt!');
        
        // Apply some settings immediately
        if (settings.theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    };
    
    // Update a single setting
    const updateSetting = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
        setHasChanges(true);
    };
    
    // Reset to defaults
    const handleResetSettings = () => {
        setSettings(defaultSettings);
        setHasChanges(true);
        setResetDialogOpen(false);
        toast.info('Đã khôi phục cài đặt mặc định');
    };
    
    // Clear all local data
    const handleClearData = () => {
        localStorage.removeItem('app_settings');
        localStorage.removeItem('inference_history');
        localStorage.removeItem('recent_patients');
        setSettings(defaultSettings);
        setHasChanges(false);
        setClearDataDialogOpen(false);
        toast.success('Đã xóa tất cả dữ liệu cục bộ');
    };
    
    // Export settings
    const handleExportSettings = () => {
        const dataStr = JSON.stringify(settings, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileName = `xray2ctpa_settings_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
        toast.success('Đã xuất cài đặt');
    };
    
    // Import settings
    const handleImportSettings = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    setSettings({ ...defaultSettings, ...imported });
                    setHasChanges(true);
                    toast.success('Đã nhập cài đặt');
                } catch (err) {
                    toast.error('File không hợp lệ');
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Cài đặt
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Tùy chỉnh ứng dụng theo sở thích của bạn
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {hasChanges && (
                        <Chip 
                            label="Có thay đổi chưa lưu" 
                            color="warning" 
                            size="small"
                            sx={{ mr: 1 }}
                        />
                    )}
                    <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSaveSettings}
                        disabled={!hasChanges}
                    >
                        Lưu cài đặt
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Language & Display */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 3, height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <Language color="primary" />
                                <Typography variant="h6" fontWeight="bold">
                                    Ngôn ngữ & Hiển thị
                                </Typography>
                            </Box>

                            <List disablePadding>
                                <ListItem>
                                    <ListItemIcon><Language /></ListItemIcon>
                                    <ListItemText 
                                        primary="Ngôn ngữ" 
                                        secondary="Chọn ngôn ngữ hiển thị"
                                    />
                                    <ListItemSecondaryAction>
                                        <FormControl size="small" sx={{ minWidth: 120 }}>
                                            <Select
                                                value={settings.language}
                                                onChange={(e) => updateSetting('language', e.target.value)}
                                            >
                                                <MenuItem value="vi">🇻🇳 Tiếng Việt</MenuItem>
                                                <MenuItem value="en">🇺🇸 English</MenuItem>
                                                <MenuItem value="ja">🇯🇵 日本語</MenuItem>
                                                <MenuItem value="ko">🇰🇷 한국어</MenuItem>
                                                <MenuItem value="zh">🇨🇳 中文</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                
                                <Divider component="li" />
                                
                                <ListItem>
                                    <ListItemIcon><Palette /></ListItemIcon>
                                    <ListItemText 
                                        primary="Giao diện" 
                                        secondary="Chọn theme sáng hoặc tối"
                                    />
                                    <ListItemSecondaryAction>
                                        <FormControl size="small" sx={{ minWidth: 120 }}>
                                            <Select
                                                value={settings.theme}
                                                onChange={(e) => updateSetting('theme', e.target.value)}
                                            >
                                                <MenuItem value="light">☀️ Sáng</MenuItem>
                                                <MenuItem value="dark">🌙 Tối</MenuItem>
                                                <MenuItem value="system">💻 Theo hệ thống</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                
                                <Divider component="li" />
                                
                                <ListItem>
                                    <ListItemIcon><TextFields /></ListItemIcon>
                                    <ListItemText 
                                        primary={`Cỡ chữ: ${settings.fontSize}px`}
                                        secondary="Điều chỉnh kích thước chữ"
                                    />
                                    <ListItemSecondaryAction sx={{ width: 150 }}>
                                        <Slider
                                            value={settings.fontSize}
                                            onChange={(e, value) => updateSetting('fontSize', value)}
                                            min={12}
                                            max={20}
                                            step={1}
                                            marks
                                            size="small"
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                
                                <Divider component="li" />
                                
                                <ListItem>
                                    <ListItemIcon><Accessibility /></ListItemIcon>
                                    <ListItemText 
                                        primary="Chế độ gọn" 
                                        secondary="Thu gọn giao diện để hiển thị nhiều hơn"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch
                                            checked={settings.compactMode}
                                            onChange={(e) => updateSetting('compactMode', e.target.checked)}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Notifications */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 3, height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <Notifications color="primary" />
                                <Typography variant="h6" fontWeight="bold">
                                    Thông báo
                                </Typography>
                            </Box>

                            <List disablePadding>
                                <ListItem>
                                    <ListItemIcon><Notifications /></ListItemIcon>
                                    <ListItemText 
                                        primary="Thông báo" 
                                        secondary="Bật/tắt tất cả thông báo"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch
                                            checked={settings.enableNotifications}
                                            onChange={(e) => updateSetting('enableNotifications', e.target.checked)}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                
                                <Divider component="li" />
                                
                                <ListItem>
                                    <ListItemIcon><VolumeUp /></ListItemIcon>
                                    <ListItemText 
                                        primary="Âm thanh" 
                                        secondary="Phát âm thanh khi có thông báo"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch
                                            checked={settings.soundEnabled}
                                            onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
                                            disabled={!settings.enableNotifications}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                
                                <Divider component="li" />
                                
                                <ListItem>
                                    <ListItemIcon><Email /></ListItemIcon>
                                    <ListItemText 
                                        primary="Email" 
                                        secondary="Nhận thông báo qua email"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch
                                            checked={settings.emailNotifications}
                                            onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                                            disabled={!settings.enableNotifications}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                
                                <Divider component="li" />
                                
                                <ListItem>
                                    <ListItemIcon><CloudDownload /></ListItemIcon>
                                    <ListItemText 
                                        primary="Push Notifications" 
                                        secondary="Nhận thông báo đẩy trên trình duyệt"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch
                                            checked={settings.pushNotifications}
                                            onChange={(e) => updateSetting('pushNotifications', e.target.checked)}
                                            disabled={!settings.enableNotifications}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Inference Settings */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 3, height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <Speed color="primary" />
                                <Typography variant="h6" fontWeight="bold">
                                    Cài đặt tái tạo CT
                                </Typography>
                            </Box>

                            <List disablePadding>
                                <ListItem>
                                    <ListItemIcon><Speed /></ListItemIcon>
                                    <ListItemText 
                                        primary={`Guidance Scale: ${settings.defaultGuidanceScale}`}
                                        secondary="Mức độ hướng dẫn cho AI (1-20)"
                                    />
                                    <ListItemSecondaryAction sx={{ width: 150 }}>
                                        <Slider
                                            value={settings.defaultGuidanceScale}
                                            onChange={(e, value) => updateSetting('defaultGuidanceScale', value)}
                                            min={1}
                                            max={20}
                                            step={0.5}
                                            size="small"
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                
                                <Divider component="li" />
                                
                                <ListItem>
                                    <ListItemIcon><Save /></ListItemIcon>
                                    <ListItemText 
                                        primary="Tự động lưu kết quả" 
                                        secondary="Lưu kết quả tái tạo tự động"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch
                                            checked={settings.autoSaveResults}
                                            onChange={(e) => updateSetting('autoSaveResults', e.target.checked)}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                
                                <Divider component="li" />
                                
                                <ListItem>
                                    <ListItemIcon><Storage /></ListItemIcon>
                                    <ListItemText 
                                        primary="Lưu lịch sử (ngày)" 
                                        secondary="Số ngày giữ lịch sử tái tạo"
                                    />
                                    <ListItemSecondaryAction>
                                        <FormControl size="small" sx={{ minWidth: 100 }}>
                                            <Select
                                                value={settings.keepHistory}
                                                onChange={(e) => updateSetting('keepHistory', e.target.value)}
                                            >
                                                <MenuItem value={7}>7 ngày</MenuItem>
                                                <MenuItem value={14}>14 ngày</MenuItem>
                                                <MenuItem value={30}>30 ngày</MenuItem>
                                                <MenuItem value={60}>60 ngày</MenuItem>
                                                <MenuItem value={90}>90 ngày</MenuItem>
                                                <MenuItem value={-1}>Vĩnh viễn</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                
                                <Divider component="li" />
                                
                                <ListItem>
                                    <ListItemIcon><Palette /></ListItemIcon>
                                    <ListItemText 
                                        primary="Render chất lượng cao" 
                                        secondary="Hiển thị ảnh CT với chất lượng cao"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch
                                            checked={settings.highQualityRendering}
                                            onChange={(e) => updateSetting('highQualityRendering', e.target.checked)}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Security & Privacy */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 3, height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <Security color="primary" />
                                <Typography variant="h6" fontWeight="bold">
                                    Bảo mật & Quyền riêng tư
                                </Typography>
                            </Box>

                            <List disablePadding>
                                <ListItem>
                                    <ListItemIcon><Security /></ListItemIcon>
                                    <ListItemText 
                                        primary="Xác thực 2 lớp" 
                                        secondary="Bảo mật tài khoản bằng 2FA"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch
                                            checked={settings.twoFactorAuth}
                                            onChange={(e) => updateSetting('twoFactorAuth', e.target.checked)}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                
                                <Divider component="li" />
                                
                                <ListItem>
                                    <ListItemIcon><Storage /></ListItemIcon>
                                    <ListItemText 
                                        primary="Thời gian phiên làm việc" 
                                        secondary="Tự động đăng xuất sau thời gian không hoạt động"
                                    />
                                    <ListItemSecondaryAction>
                                        <FormControl size="small" sx={{ minWidth: 100 }}>
                                            <Select
                                                value={settings.sessionTimeout}
                                                onChange={(e) => updateSetting('sessionTimeout', e.target.value)}
                                            >
                                                <MenuItem value={15}>15 phút</MenuItem>
                                                <MenuItem value={30}>30 phút</MenuItem>
                                                <MenuItem value={60}>1 giờ</MenuItem>
                                                <MenuItem value={120}>2 giờ</MenuItem>
                                                <MenuItem value={-1}>Không giới hạn</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                
                                <Divider component="li" />
                                
                                <ListItem>
                                    <ListItemIcon><Info /></ListItemIcon>
                                    <ListItemText 
                                        primary="Chia sẻ dữ liệu ẩn danh" 
                                        secondary="Giúp cải thiện ứng dụng"
                                    />
                                    <ListItemSecondaryAction>
                                        <Switch
                                            checked={settings.shareAnonymousData}
                                            onChange={(e) => updateSetting('shareAnonymousData', e.target.checked)}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Data Management */}
                <Grid item xs={12}>
                    <Card sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <Storage color="primary" />
                                <Typography variant="h6" fontWeight="bold">
                                    Quản lý dữ liệu
                                </Typography>
                            </Box>

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        startIcon={<CloudDownload />}
                                        onClick={handleExportSettings}
                                    >
                                        Xuất cài đặt
                                    </Button>
                                </Grid>
                                
                                <Grid item xs={12} sm={6} md={3}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        component="label"
                                        startIcon={<CloudUpload />}
                                    >
                                        Nhập cài đặt
                                        <input
                                            type="file"
                                            hidden
                                            accept=".json"
                                            onChange={handleImportSettings}
                                        />
                                    </Button>
                                </Grid>
                                
                                <Grid item xs={12} sm={6} md={3}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        color="warning"
                                        startIcon={<Restore />}
                                        onClick={() => setResetDialogOpen(true)}
                                    >
                                        Khôi phục mặc định
                                    </Button>
                                </Grid>
                                
                                <Grid item xs={12} sm={6} md={3}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        color="error"
                                        startIcon={<Delete />}
                                        onClick={() => setClearDataDialogOpen(true)}
                                    >
                                        Xóa dữ liệu cục bộ
                                    </Button>
                                </Grid>
                            </Grid>
                            
                            <Alert severity="info" sx={{ mt: 3 }}>
                                <Typography variant="body2">
                                    Các cài đặt được lưu trên trình duyệt của bạn. 
                                    Khi xóa cache trình duyệt, cài đặt sẽ bị mất.
                                    Hãy xuất cài đặt để sao lưu.
                                </Typography>
                            </Alert>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Debug Mode (Admin only) */}
                {user?.role === 'admin' && (
                    <Grid item xs={12}>
                        <Card sx={{ borderRadius: 3, border: '1px dashed', borderColor: 'warning.main' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                    <BugReport color="warning" />
                                    <Typography variant="h6" fontWeight="bold" color="warning.main">
                                        Cài đặt nâng cao (Admin)
                                    </Typography>
                                </Box>

                                <List disablePadding>
                                    <ListItem>
                                        <ListItemIcon><BugReport /></ListItemIcon>
                                        <ListItemText 
                                            primary="Chế độ Debug" 
                                            secondary="Hiển thị thông tin debug trong console"
                                        />
                                        <ListItemSecondaryAction>
                                            <Switch
                                                checked={settings.debugMode}
                                                onChange={(e) => updateSetting('debugMode', e.target.checked)}
                                            />
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    
                                    <Divider component="li" />
                                    
                                    <ListItem>
                                        <ListItemIcon><Restore /></ListItemIcon>
                                        <ListItemText 
                                            primary="Tự động tải phiên trước" 
                                            secondary="Khôi phục trạng thái làm việc khi mở lại ứng dụng"
                                        />
                                        <ListItemSecondaryAction>
                                            <Switch
                                                checked={settings.autoLoadPreviousSession}
                                                onChange={(e) => updateSetting('autoLoadPreviousSession', e.target.checked)}
                                            />
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {/* App Info */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'grey.50', textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            X-ray2CTPA - AI Medical Imaging
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Phiên bản 1.0.0 • © 2024 Medical Imaging Team
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Xây dựng bằng React, FastAPI và PyTorch
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Reset Confirmation Dialog */}
            <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Warning color="warning" />
                        Khôi phục cài đặt mặc định?
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Tất cả cài đặt sẽ được đặt lại về giá trị mặc định.
                        Bạn có thể lưu lại sau khi xem xét.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResetDialogOpen(false)}>Hủy</Button>
                    <Button onClick={handleResetSettings} color="warning" variant="contained">
                        Khôi phục
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Clear Data Confirmation Dialog */}
            <Dialog open={clearDataDialogOpen} onClose={() => setClearDataDialogOpen(false)}>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Delete color="error" />
                        Xóa tất cả dữ liệu cục bộ?
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                            <strong>Lưu ý:</strong> Hành động này không thể hoàn tác!
                        </Typography>
                    </Alert>
                    <Typography>
                        Các dữ liệu sau sẽ bị xóa:
                    </Typography>
                    <List dense>
                        <ListItem>• Cài đặt ứng dụng</ListItem>
                        <ListItem>• Lịch sử tái tạo cục bộ</ListItem>
                        <ListItem>• Cache bệnh nhân gần đây</ListItem>
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setClearDataDialogOpen(false)}>Hủy</Button>
                    <Button onClick={handleClearData} color="error" variant="contained">
                        Xóa tất cả
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

// Missing Email icon import
const Email = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" {...props}>
        <path d="M0 0h24v24H0z" fill="none"/>
        <path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>
);

export default SettingsPage;
