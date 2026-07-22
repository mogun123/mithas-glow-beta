import { useState, useCallback } from 'react';

interface BidData {
  userOffer: number;
  currentBid: number;
  minBid: number;
  maxBid: number;
  timeLeft: number;
  showBidModal: boolean;
  isBidding: boolean;
}

export const useGlowBid = (
  selectedProduct: any,
  userId: string | null,
  setGlowPoints: (points: number | ((prev: number) => number)) => void
) => {
  const [bidData, setBidData] = useState<BidData>({
    userOffer: 0,
    currentBid: 100,
    minBid: 50,
    maxBid: 1000,
    timeLeft: 300, // 5 minutes
    showBidModal: false,
    isBidding: false
  });

  const setUserOffer = useCallback((offer: string | number) => {
    const numOffer = typeof offer === 'string' ? parseFloat(offer) : offer;
    setBidData(prev => ({ ...prev, userOffer: numOffer }));
  }, []);

  const setShowBidModal = useCallback((show: boolean) => {
    setBidData(prev => ({ ...prev, showBidModal: show }));
  }, []);

  const placeBid = useCallback(async () => {
    if (!userId || !selectedProduct || bidData.userOffer < bidData.minBid) {
      return;
    }

    setBidData(prev => ({ ...prev, isBidding: true }));

    // Simulate bidding process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock bid success
    setBidData(prev => ({
      ...prev,
      currentBid: Math.max(prev.userOffer, prev.currentBid),
      isBidding: false,
      showBidModal: false
    }));

    // Award glow points for bidding
    setGlowPoints(prev => prev + 10);
  }, [userId, selectedProduct, bidData.userOffer, bidData.minBid, setGlowPoints]);

  const resetBid = useCallback(() => {
    setBidData({
      userOffer: 0,
      currentBid: 100,
      minBid: 50,
      maxBid: 1000,
      timeLeft: 300,
      showBidModal: false,
      isBidding: false
    });
  }, []);

  return {
    ...bidData,
    setUserOffer,
    setShowBidModal,
    placeBid,
    resetBid
  };
};
