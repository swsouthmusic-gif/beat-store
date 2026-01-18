import { useAuthStore } from '@/store/authStore';
import { useCheckPurchaseQuery } from '@/store/beatApi';

/**
 * Custom hook to check if a beat has been purchased for any download type
 * @param beatId - The ID of the beat to check
 * @returns boolean indicating if the beat is purchased for any download type (mp3, wav, or stems)
 */
export const useBeatPurchaseCheck = (beatId: number): boolean => {
  const { isLoggedIn } = useAuthStore();

  // Check all three download types in parallel
  const { data: mp3Check } = useCheckPurchaseQuery(
    {
      beatId,
      downloadType: 'mp3',
    },
    {
      skip: !isLoggedIn,
    },
  );

  const { data: wavCheck } = useCheckPurchaseQuery(
    {
      beatId,
      downloadType: 'wav',
    },
    {
      skip: !isLoggedIn,
    },
  );

  const { data: stemsCheck } = useCheckPurchaseQuery(
    {
      beatId,
      downloadType: 'stems',
    },
    {
      skip: !isLoggedIn,
    },
  );

  // Return true if any download type is purchased
  return (
    mp3Check?.has_purchase === true ||
    wavCheck?.has_purchase === true ||
    stemsCheck?.has_purchase === true
  );
};
