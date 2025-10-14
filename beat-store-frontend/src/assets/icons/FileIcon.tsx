import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

interface FileIconProps {
  type: string;
  sx?: SxProps<Theme>;
  color?: string;
}

export const FileIcon = ({ type, sx, color = '#FFFFFF' }: FileIconProps) => (
  <Box position="relative" display="inline-block" width={40} height={40} sx={sx}>
    <InsertDriveFileIcon sx={{ fontSize: 40, color: color }} />
    <Typography
      variant="caption"
      sx={{
        position: 'absolute',
        bottom: 4,
        left: 0,
        width: '100%',
        textAlign: 'center',
        fontWeight: 'bold',
        color: '#FFF',
        fontSize: '0.5rem',
      }}
    >
      {type.toUpperCase()}
    </Typography>
  </Box>
);
