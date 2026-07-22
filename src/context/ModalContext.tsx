import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ModalType = 'booking' | 'aiStylist' | 'voice' | 'skin' | 'cart' | null;

interface ModalState {
  type: ModalType;
  props: any;
}

interface ModalContextType {
  isOpen: boolean;
  modalType: ModalType;
  modalProps: any;
  openModal: (type: ModalType, props?: any) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    props: null,
  });

  const openModal = (type: ModalType, props: any = null) => {
    setModalState({ type, props });
  };

  const closeModal = () => {
    setModalState({ type: null, props: null });
  };

  const value: ModalContextType = {
    isOpen: modalState.type !== null,
    modalType: modalState.type,
    modalProps: modalState.props,
    openModal,
    closeModal,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

export { ModalContext };
