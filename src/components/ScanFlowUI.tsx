// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Minimalist Scan Flow UI Component
// Text-only instruction display at bottom of screen (zero face obstruction)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { globalEventBus } from '../core/EventBus';
import { AREvents, ScanStateChangeEvent, PipelineStateChangeEvent } from '../core/EventTypes';
import { PipelineState } from '../engine/ARPipelineController';

interface ScanFlowUIProps {
  isActive: boolean;
}

const phaseInstructions: Record<string, string> = {
  VALIDATING: 'Position face in center',
  LOOK_STRAIGHT: 'Keep steady, looking front...',
  TURN_LEFT: 'Now, turn your face slightly LEFT 📲',
  TURN_RIGHT: 'Now, turn your face slightly RIGHT 📲',
  SCAN_COMPLETE: '✅ Scan Complete! Applying Style...',
};

export const ScanFlowUI: React.FC<ScanFlowUIProps> = ({ isActive }) => {
  const [scanState, setScanState] = useState<ScanStateChangeEvent | null>(null);
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Listen to SCAN_STATE_CHANGE events
    const handleScanStateChange = (data: ScanStateChangeEvent) => {
      setScanState(data);
    };

    // Listen to PIPELINE_STATE_CHANGE events to detect validation phase
    const handlePipelineStateChange = (data: PipelineStateChangeEvent) => {
      setPipelineState(data.toState);
      // Reset scanState when entering VALIDATING_FACE to show validation text
      if (data.toState === PipelineState.VALIDATING_FACE) {
        setScanState(null);
      }
    };

    const unsubscribeScanState = globalEventBus.on(AREvents.SCAN_STATE_CHANGE, handleScanStateChange);
    const unsubscribePipelineState = globalEventBus.on(AREvents.PIPELINE_STATE_CHANGE, handlePipelineStateChange);

    return () => {
      unsubscribeScanState();
      unsubscribePipelineState();
    };
  }, [isActive]);

  if (!isActive) return null;

  // Determine which instruction to show
  let instruction: string;
  if (pipelineState === PipelineState.VALIDATING_FACE) {
    instruction = phaseInstructions.VALIDATING;
  } else if (scanState) {
    instruction = phaseInstructions[scanState.state] || phaseInstructions.LOOK_STRAIGHT;
  } else {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <p className="text-white text-sm font-medium text-center">
        {instruction}
      </p>
    </div>
  );
};
