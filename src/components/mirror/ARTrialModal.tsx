import React from 'react';
import { X, ScanFace, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '../../screens/MirrorScreen';

interface ARTrialModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
}

export function ARTrialModal({ isOpen, product, onClose }: ARTrialModalProps) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="w-full max-w-md bg-black p-0 text-white flex flex-col items-center justify-start h-screen">
        {/* Header */}
        <div className="p-4 w-full flex justify-between items-center bg-black/50 sticky top-0">
          <h3 className="text-lg text-white">AR Quick Trial</h3>
          <button onClick={onClose} className="text-white p-2 rounded-full hover:bg-white/20">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* AR View */}
        <div className="flex-grow w-full flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <ScanFace className="w-16 h-16 mb-4 animate-pulse text-pink-400 mx-auto" />
            <p className="text-lg mb-2">AR Trial: {product.name}</p>
            <p className="text-sm text-gray-400">Live AR simulation running...</p>
          </div>
        </div>

        {/* Product Info */}
        <div className="w-full p-4 bg-white text-gray-800">
          <h4 className="text-xl mb-2">{product.name}</h4>
          <p className="text-sm text-gray-600 mb-3">
            Category: {product.category} | Seller: {product.seller}
          </p>
          <p className="text-2xl text-pink-600 mb-4">₹{product.price}</p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                toast.success(`Added ${product.name} to cart!`);
                onClose();
              }}
              className="flex-1 bg-pink-500 text-white py-3 rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center"
            >
              <ShoppingBag className="w-5 h-5 mr-2" /> Add to Cart
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-colors"
            >
              Close Trial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
