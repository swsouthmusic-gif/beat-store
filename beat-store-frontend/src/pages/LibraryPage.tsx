import { Box, Typography } from '@mui/material';

const LibraryPage = () => {
  return (
    <Box sx={{ px: 3, py: 2, maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Library
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Your library content will appear here.
      </Typography>
    </Box>
  );
};

export default LibraryPage;
