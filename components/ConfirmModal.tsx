
import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
}

export const ConfirmModal = ({ isOpen, onCancel, onConfirm, title, message, loading }: ConfirmModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200 dark:border-stone-800">
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">{message}</p>
          <div className="flex gap-3">
            <button 
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-xl font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
