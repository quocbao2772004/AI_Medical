/**
 * Medical Imaging Application
 * Main App with routing
 * UI Design: Neumorphism + Glassmorphism + Healthcare Clean Style
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, alpha } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './contexts/AuthContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import MainLayout from './layouts/MainLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Main Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import PatientsListPage from './pages/patients/PatientsListPage';
import PatientFormPage from './pages/patients/PatientFormPage';
import PatientDetailPage from './pages/patients/PatientDetailPage';
import MedicalRecordDetailPage from './pages/medical-records/MedicalRecordDetailPage';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';

// Training Pipeline Page
import TrainingPipelinePage from './pages/training/TrainingPipelinePage';

// Existing Pages (kept for compatibility)
import NiftiVisualization from './pages/NiftiVisualization';

// Healthcare Pro Color Palette
const colors = {
  primary: {
    main: '#0891B2',      // Medical Cyan
    light: '#22D3EE',
    dark: '#0E7490',
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
  },
  accent: {
    green: '#059669',     // Healthcare Green (CTA)
    greenLight: '#10B981',
    teal: '#14B8A6',
  },
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
};

// Create MUI theme - Healthcare Pro Max Style
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary.main,
      light: colors.primary.light,
      dark: colors.primary.dark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.accent.green,
      light: colors.accent.greenLight,
      dark: '#047857',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10B981',
      light: '#6EE7B7',
      dark: '#047857',
    },
    error: {
      main: '#EF4444',
      light: '#FCA5A5',
      dark: '#DC2626',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
      dark: '#D97706',
    },
    info: {
      main: '#3B82F6',
      light: '#93C5FD',
      dark: '#2563EB',
    },
    background: {
      default: '#F0FDFA',
      paper: '#ffffff',
    },
    text: {
      primary: colors.neutral[800],
      secondary: colors.neutral[500],
    },
    divider: colors.neutral[200],
  },
  typography: {
    fontFamily: '"Figtree", "Noto Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: { 
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: { 
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: { 
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h4: { 
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h5: { 
      fontWeight: 600,
    },
    h6: { 
      fontWeight: 600,
    },
    button: { 
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
    body1: {
      lineHeight: 1.7,
    },
    body2: {
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(0, 0, 0, 0.04)',
    '0 2px 4px rgba(0, 0, 0, 0.04)',
    '0 4px 8px rgba(0, 0, 0, 0.04)',
    '0 6px 12px rgba(0, 0, 0, 0.05)',
    '0 8px 16px rgba(0, 0, 0, 0.06)',
    '0 12px 24px rgba(0, 0, 0, 0.08)',
    '0 16px 32px rgba(0, 0, 0, 0.08)',
    '0 20px 40px rgba(0, 0, 0, 0.1)',
    ...Array(16).fill('0 24px 48px rgba(0, 0, 0, 0.12)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${colors.primary.light} ${colors.neutral[100]}`,
        },
        '*::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },
        '*::-webkit-scrollbar-track': {
          background: colors.neutral[100],
          borderRadius: 4,
        },
        '*::-webkit-scrollbar-thumb': {
          background: colors.primary.light,
          borderRadius: 4,
          '&:hover': {
            background: colors.primary.main,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          padding: '10px 24px',
          transition: 'all 0.2s ease-out',
        },
        contained: {
          boxShadow: `0 4px 14px ${alpha(colors.primary.main, 0.25)}`,
          '&:hover': {
            boxShadow: `0 6px 20px ${alpha(colors.primary.main, 0.35)}`,
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedSecondary: {
          boxShadow: `0 4px 14px ${alpha(colors.accent.green, 0.25)}`,
          '&:hover': {
            boxShadow: `0 6px 20px ${alpha(colors.accent.green, 0.35)}`,
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
            backgroundColor: alpha(colors.primary.main, 0.04),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
          borderRadius: 20,
          border: `1px solid ${alpha(colors.neutral[200], 0.5)}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        },
        elevation2: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: `0 0 0 4px ${alpha(colors.primary.main, 0.08)}`,
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 4px ${alpha(colors.primary.main, 0.12)}`,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 500,
        },
        filled: {
          '&.MuiChip-colorPrimary': {
            backgroundColor: alpha(colors.primary.main, 0.12),
            color: colors.primary.dark,
          },
          '&.MuiChip-colorSecondary': {
            backgroundColor: alpha(colors.accent.green, 0.12),
            color: '#047857',
          },
          '&.MuiChip-colorSuccess': {
            backgroundColor: alpha('#10B981', 0.12),
            color: '#047857',
          },
          '&.MuiChip-colorError': {
            backgroundColor: alpha('#EF4444', 0.12),
            color: '#DC2626',
          },
          '&.MuiChip-colorWarning': {
            backgroundColor: alpha('#F59E0B', 0.12),
            color: '#D97706',
          },
          '&.MuiChip-colorInfo': {
            backgroundColor: alpha('#3B82F6', 0.12),
            color: '#2563EB',
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '2px 0',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(colors.primary.main, 0.08),
          },
          '&.Mui-selected': {
            backgroundColor: colors.primary.main,
            color: '#ffffff',
            '&:hover': {
              backgroundColor: colors.primary.dark,
            },
            '& .MuiListItemIcon-root': {
              color: '#ffffff',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: colors.neutral[50],
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        standardSuccess: {
          backgroundColor: alpha('#10B981', 0.12),
          color: '#047857',
        },
        standardError: {
          backgroundColor: alpha('#EF4444', 0.12),
          color: '#DC2626',
        },
        standardWarning: {
          backgroundColor: alpha('#F59E0B', 0.12),
          color: '#D97706',
        },
        standardInfo: {
          backgroundColor: alpha('#3B82F6', 0.12),
          color: '#2563EB',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.8125rem',
          padding: '8px 12px',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

// Global Styles for smooth animations
const globalStyles = (
  <GlobalStyles
    styles={{
      '@import': "url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&family=Noto+Sans:wght@300;400;500;700&display=swap')",
      '@keyframes fadeIn': {
        from: { opacity: 0, transform: 'translateY(10px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
      '@keyframes slideInLeft': {
        from: { opacity: 0, transform: 'translateX(-20px)' },
        to: { opacity: 1, transform: 'translateX(0)' },
      },
      '@keyframes slideInRight': {
        from: { opacity: 0, transform: 'translateX(20px)' },
        to: { opacity: 1, transform: 'translateX(0)' },
      },
      '@keyframes scaleIn': {
        from: { opacity: 0, transform: 'scale(0.95)' },
        to: { opacity: 1, transform: 'scale(1)' },
      },
      '@keyframes pulse': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.5 },
      },
      '@keyframes shimmer': {
        '0%': { backgroundPosition: '-200% 0' },
        '100%': { backgroundPosition: '200% 0' },
      },
      '@media (prefers-reduced-motion: reduce)': {
        '*': {
          animationDuration: '0.01ms !important',
          animationIterationCount: '1 !important',
          transitionDuration: '0.01ms !important',
        },
      },
      'html, body': {
        scrollBehavior: 'smooth',
      },
      '.animate-fadeIn': {
        animation: 'fadeIn 0.4s ease-out',
      },
      '.animate-slideInLeft': {
        animation: 'slideInLeft 0.4s ease-out',
      },
      '.animate-slideInRight': {
        animation: 'slideInRight 0.4s ease-out',
      },
      '.animate-scaleIn': {
        animation: 'scaleIn 0.3s ease-out',
      },
      '.glass': {
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      },
      '.neumorphic': {
        background: '#F0FDFA',
        boxShadow: '8px 8px 16px #d4e9e6, -8px -8px 16px #ffffff',
        borderRadius: '16px',
      },
      '.gradient-primary': {
        background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
      },
      '.gradient-success': {
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      },
      '.gradient-accent': {
        background: 'linear-gradient(135deg, #22D3EE 0%, #0891B2 50%, #059669 100%)',
      },
    }}
  />
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {globalStyles}
      <AuthProvider>
        <Router basename={process.env.PUBLIC_URL || '/'}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected Routes with Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              
              {/* Patients */}
              <Route path="patients" element={<PatientsListPage />} />
              <Route path="patients/new" element={<PatientFormPage />} />
              <Route path="patients/:id" element={<PatientDetailPage />} />
              <Route path="patients/:id/edit" element={<PatientFormPage />} />
              
              {/* Medical Records */}
              <Route path="medical-records/new" element={<MedicalRecordDetailPage />} />
              <Route path="medical-records/:id" element={<MedicalRecordDetailPage />} />
              
              {/* Profile & Settings */}
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              
              {/* Training Pipeline */}
              <Route path="training-pipeline" element={<TrainingPipelinePage />} />
              
              {/* Viewer */}
              <Route path="viewer" element={<NiftiVisualization />} />
            </Route>
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#1E293B',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
              padding: '12px 16px',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;