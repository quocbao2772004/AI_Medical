/**
 * SearchDialog Component - Healthcare Search Modal
 * Tìm kiếm bệnh nhân với UI chuyên nghiệp
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    Box,
    TextField,
    Typography,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Chip,
    CircularProgress,
    InputAdornment,
    IconButton,
    Divider,
    alpha,
    useTheme,
} from '@mui/material';
import {
    Search as SearchIcon,
    Close as CloseIcon,
    Person as PersonIcon,
    MedicalServices as MedicalIcon,
    History as HistoryIcon,
    TrendingUp as TrendingIcon,
    LocalHospital,
    Male as MaleIcon,
    Female as FemaleIcon,
    Cake as CakeIcon,
    Phone as PhoneIcon,
    ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { patientsAPI } from '../services/api';

// Debounce hook
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

// Calculate age from date
const calculateAge = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// Format date
const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
};

const SearchDialog = ({ open, onClose }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const inputRef = useRef(null);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Load recent searches from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('recentPatientSearches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {
                setRecentSearches([]);
            }
        }
    }, []);

    // Focus input when dialog opens
    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [open]);

    // Search patients
    useEffect(() => {
        const searchPatients = async () => {
            if (!debouncedSearch || debouncedSearch.length < 2) {
                setResults([]);
                return;
            }
            
            setLoading(true);
            try {
                const response = await patientsAPI.getAll({
                    search: debouncedSearch,
                    limit: 10,
                });
                const patientsList = response.patients || response.items || response || [];
                setResults(Array.isArray(patientsList) ? patientsList : []);
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };
        
        searchPatients();
    }, [debouncedSearch]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e) => {
        const totalItems = results.length;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % totalItems);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
        } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
            e.preventDefault();
            handleSelectPatient(results[selectedIndex]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [results, selectedIndex, onClose]);

    // Add to recent searches
    const addToRecentSearches = (patient) => {
        const recent = {
            id: patient.id,
            name: patient.full_name,
            searchedAt: new Date().toISOString(),
        };
        
        const updated = [
            recent,
            ...recentSearches.filter(r => r.id !== patient.id).slice(0, 4)
        ];
        
        setRecentSearches(updated);
        localStorage.setItem('recentPatientSearches', JSON.stringify(updated));
    };

    // Handle patient selection
    const handleSelectPatient = (patient) => {
        addToRecentSearches(patient);
        onClose();
        navigate(`/patients/${patient.id}`);
    };

    // Clear search
    const handleClear = () => {
        setSearchQuery('');
        setResults([]);
        setSelectedIndex(-1);
        inputRef.current?.focus();
    };

    // Clear recent searches
    const clearRecentSearches = () => {
        setRecentSearches([]);
        localStorage.removeItem('recentPatientSearches');
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    bgcolor: 'background.paper',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    overflow: 'hidden',
                    maxHeight: '80vh',
                },
            }}
        >
            {/* Search Header */}
            <Box
                sx={{
                    p: 2,
                    background: `linear-gradient(135deg, ${alpha('#0891B2', 0.08)} 0%, ${alpha('#10B981', 0.04)} 100%)`,
                    borderBottom: `1px solid ${alpha('#0891B2', 0.1)}`,
                }}
            >
                <TextField
                    inputRef={inputRef}
                    fullWidth
                    placeholder="Tìm bệnh nhân theo tên, mã BN, số điện thoại..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                {loading ? (
                                    <CircularProgress size={22} sx={{ color: '#0891B2' }} />
                                ) : (
                                    <SearchIcon sx={{ color: '#0891B2', fontSize: 24 }} />
                                )}
                            </InputAdornment>
                        ),
                        endAdornment: searchQuery && (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={handleClear}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                        sx: {
                            bgcolor: 'white',
                            borderRadius: 3,
                            '& fieldset': { border: 'none' },
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            px: 1,
                            '& input': {
                                fontSize: '1rem',
                                py: 1.5,
                            },
                        },
                    }}
                />
                
                {/* Quick filters */}
                <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                    <Chip
                        icon={<LocalHospital sx={{ fontSize: 16 }} />}
                        label="Bệnh nhân"
                        size="small"
                        sx={{
                            bgcolor: alpha('#0891B2', 0.1),
                            color: '#0891B2',
                            fontWeight: 500,
                            '&:hover': { bgcolor: alpha('#0891B2', 0.2) },
                        }}
                    />
                    <Chip
                        label="⌘ + K"
                        size="small"
                        sx={{
                            bgcolor: 'white',
                            border: `1px solid ${alpha('#000', 0.1)}`,
                            fontSize: '0.7rem',
                            height: 24,
                        }}
                    />
                    <Chip
                        label="↑↓ điều hướng"
                        size="small"
                        sx={{
                            bgcolor: 'white',
                            border: `1px solid ${alpha('#000', 0.1)}`,
                            fontSize: '0.7rem',
                            height: 24,
                        }}
                    />
                    <Chip
                        label="Enter chọn"
                        size="small"
                        sx={{
                            bgcolor: 'white',
                            border: `1px solid ${alpha('#000', 0.1)}`,
                            fontSize: '0.7rem',
                            height: 24,
                        }}
                    />
                </Box>
            </Box>

            <DialogContent sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
                {/* Search Results */}
                {results.length > 0 ? (
                    <Box>
                        <Box sx={{ px: 2, py: 1.5, bgcolor: alpha('#0891B2', 0.03) }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                <TrendingIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                Tìm thấy {results.length} kết quả
                            </Typography>
                        </Box>
                        <List sx={{ py: 0 }}>
                            {results.map((patient, index) => (
                                    <ListItem
                                        key={patient.id}
                                        button
                                        onClick={() => handleSelectPatient(patient)}
                                        selected={selectedIndex === index}
                                        sx={{
                                            py: 2,
                                            px: 2,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            borderBottom: `1px solid ${alpha('#000', 0.04)}`,
                                            '&:hover': {
                                                bgcolor: alpha('#0891B2', 0.06),
                                            },
                                            '&.Mui-selected': {
                                                bgcolor: alpha('#0891B2', 0.1),
                                                borderLeft: `3px solid #0891B2`,
                                            },
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar
                                                sx={{
                                                    bgcolor: patient.gender === 'Nam' 
                                                        ? alpha('#3B82F6', 0.1) 
                                                        : alpha('#EC4899', 0.1),
                                                    color: patient.gender === 'Nam' ? '#3B82F6' : '#EC4899',
                                                    width: 48,
                                                    height: 48,
                                                }}
                                            >
                                                {patient.gender === 'Nam' ? <MaleIcon /> : <FemaleIcon />}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography fontWeight={600} color="text.primary">
                                                        {patient.full_name}
                                                    </Typography>
                                                    <Chip
                                                        label={patient.patient_code || `BN${String(patient.id).slice(-6)}`}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.65rem',
                                                            bgcolor: alpha('#10B981', 0.1),
                                                            color: '#10B981',
                                                            fontWeight: 600,
                                                        }}
                                                    />
                                                </Box>
                                            }
                                            secondary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                                                    {patient.date_of_birth && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <CakeIcon sx={{ fontSize: 14, color: '#64748B' }} />
                                                            <Typography variant="caption" color="text.secondary">
                                                                {formatDate(patient.date_of_birth)} ({calculateAge(patient.date_of_birth)} tuổi)
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {patient.phone && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <PhoneIcon sx={{ fontSize: 14, color: '#64748B' }} />
                                                            <Typography variant="caption" color="text.secondary">
                                                                {patient.phone}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            }
                                        />
                                        <ArrowIcon sx={{ color: '#CBD5E1', fontSize: 20 }} />
                                    </ListItem>
                            ))}
                        </List>
                    </Box>
                ) : searchQuery.length >= 2 && !loading ? (
                    /* No Results */
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <PersonIcon sx={{ fontSize: 64, color: '#E2E8F0', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Không tìm thấy kết quả
                        </Typography>
                        <Typography variant="body2" color="text.disabled">
                            Thử tìm kiếm với từ khóa khác
                        </Typography>
                    </Box>
                ) : (
                    /* Recent Searches & Suggestions */
                    <Box>
                        {recentSearches.length > 0 && (
                            <>
                                <Box sx={{ px: 2, py: 1.5, bgcolor: alpha('#0891B2', 0.03), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        <HistoryIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                        Tìm kiếm gần đây
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: '#0891B2', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                        onClick={clearRecentSearches}
                                    >
                                        Xóa tất cả
                                    </Typography>
                                </Box>
                                <List sx={{ py: 0 }}>
                                    {recentSearches.map((item) => (
                                        <ListItem
                                            key={item.id}
                                            button
                                            onClick={() => navigate(`/patients/${item.id}`)}
                                            sx={{
                                                py: 1.5,
                                                px: 2,
                                                '&:hover': { bgcolor: alpha('#0891B2', 0.04) },
                                            }}
                                        >
                                            <ListItemAvatar>
                                                <Avatar sx={{ bgcolor: alpha('#64748B', 0.1), width: 36, height: 36 }}>
                                                    <HistoryIcon sx={{ fontSize: 18, color: '#64748B' }} />
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={item.name}
                                                primaryTypographyProps={{ fontSize: '0.9rem' }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                                <Divider />
                            </>
                        )}
                        
                        {/* Quick Actions */}
                        <Box sx={{ px: 2, py: 1.5, bgcolor: alpha('#10B981', 0.03) }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                <MedicalIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                Thao tác nhanh
                            </Typography>
                        </Box>
                        <List sx={{ py: 0 }}>
                            <ListItem
                                button
                                onClick={() => { onClose(); navigate('/patients'); }}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    '&:hover': { bgcolor: alpha('#10B981', 0.04) },
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: alpha('#10B981', 0.1), width: 36, height: 36 }}>
                                        <PersonIcon sx={{ fontSize: 18, color: '#10B981' }} />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary="Xem danh sách bệnh nhân"
                                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                                />
                            </ListItem>
                            <ListItem
                                button
                                onClick={() => { onClose(); navigate('/patients/new'); }}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    '&:hover': { bgcolor: alpha('#10B981', 0.04) },
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: alpha('#0891B2', 0.1), width: 36, height: 36 }}>
                                        <LocalHospital sx={{ fontSize: 18, color: '#0891B2' }} />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary="Thêm bệnh nhân mới"
                                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                                />
                            </ListItem>
                        </List>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default SearchDialog;
