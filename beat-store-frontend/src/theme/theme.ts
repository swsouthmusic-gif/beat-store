import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
    cssVarPrefix: 'beat',
  },
  colorSchemes: {
    light: {
      palette: {
        mode: 'light',
        background: {
          default: '#F1F1F1',
          paper: '#EEEEEE',
          container: '#E1E1E1',
        },
        text: {
          primary: '#333333',
          secondary: '#666666',
        },
      },
    },
    dark: {
      palette: {
        mode: 'dark',
        background: {
          default: '#121212',
          paper: '#252525',
          container: '#1B1B1B',
        },
        text: {
          primary: '#F2F2F2',
          secondary: '#9F9F9F',
        },
      },
    },
  },

  components: {
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: '12px',
          backgroundColor: 'rgba(var(--beat-palette-background-defaultChannel) / .6)',
          boxShadow: '1px 4px 12px rgba(0,0,0,0.3)',
          marginTop: '4px',
          backgroundImage: 'var(--beat-overlays-2)',
          backdropFilter: 'blur(10px)',
        },
        list: {
          padding: '4px 0',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '14px',
          padding: '8px 16px',
          '&.Mui-selected': {
            backgroundColor:
              'rgba(var(--beat-palette-action-activeChannel) / var(--beat-palette-action-selectedOpacity))',
          },
          '&.Mui-selected:hover': {
            backgroundColor:
              'rgba(var(--beat-palette-action-activeChannel) / var(--beat-palette-action-hoverOpacity))',
          },
        },
      },
    },
  },
});
