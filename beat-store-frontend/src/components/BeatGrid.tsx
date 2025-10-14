import { Box } from '@mui/material';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

import type { BeatType } from '@/store/beatApi';
import BeatCard from '@/components/BeatCard';

interface BeatGridProps {
  beats: BeatType[];
  onSelect: (beat: BeatType) => void;
}

const BeatGrid = ({ beats, onSelect }: BeatGridProps) => {
  return (
    <LayoutGroup>
      <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(180px, 1fr))">
        <AnimatePresence>
          {beats.map(beat => (
            <motion.div
              key={beat.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <BeatCard key={beat.id} {...beat} onClick={() => onSelect(beat)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </Box>
    </LayoutGroup>
  );
};

export default BeatGrid;
