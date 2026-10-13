import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function DeleteConfirmModal({
  isOpen,
  brand,
  onClose,
  onConfirm,
  deleting
}) {
  if (!isOpen || !brand) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-cyber-dark border border-cyber-rose/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-cyber-rose/10 border border-cyber-rose/30 flex items-center justify-center text-cyber-rose shadow-glowRose">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-cyber-textMuted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-white tracking-wide">
            Delete Brand Profile?
          </h3>
          <p className="text-xs text-cyber-textMuted mt-1.5 leading-relaxed">
            You are about to permanently delete{' '}
            <span className="text-white font-semibold font-mono">"{brand.name}"</span>.
          </p>
          <div className="mt-3 p-3 rounded-lg bg-cyber-rose/10 border border-cyber-rose/20 text-[11px] text-cyber-rose leading-relaxed">
            <strong>Warning:</strong> Cascading relational deletion will automatically remove all{' '}
            {brand.domains?.length || 0} verified domains,{' '}
            {brand.social_handles?.length || 0} social accounts, and{' '}
            {brand.app_identifiers?.length || 0} mobile app signatures. This action cannot be undone.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-cyber-textMuted hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(brand.id)}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyber-rose text-white text-xs font-semibold hover:bg-rose-600 transition-all shadow-glowRose disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
