import React from 'react';
import { useModal } from '../hooks/useModal';
import { BookingModal } from './BookingModal';
import { VoiceSearch } from './VoiceSearch';
import MirrorScreen from '../screens/MirrorScreen';

export const ModalRenderer: React.FC = () => {
  const { isOpen, modalType, modalProps, closeModal } = useModal();

  if (!isOpen) return null;

  const renderModal = () => {
    switch (modalType) {
      case 'booking':
        return (
          <BookingModal
            isOpen={true}
            onClose={closeModal}
            {...modalProps}
          />
        );

      case 'voice':
        return (
          <VoiceSearch
            isOpen={true}
            onClose={closeModal}
            {...modalProps}
          />
        );

      case 'skin':
        return (
          <MirrorScreen
            onNavigateHome={closeModal}
            {...modalProps}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 max-h-[90vh] overflow-y-auto">
        {renderModal()}
      </div>
    </div>
  );
};
