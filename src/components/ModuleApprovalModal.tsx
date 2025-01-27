import { useState } from 'react';
import { Module, ModuleApprovalStatus } from '../lib/types';
import { supabase } from '../lib/supabase';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ModuleApprovalModalProps {
  module: Module;
  onClose: () => void;
  onUpdate: () => void;
}

export function ModuleApprovalModal({ module, onClose, onUpdate }: ModuleApprovalModalProps) {
  const [comment, setComment] = useState(module.approval_comment || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateStatus = async (newStatus: ModuleApprovalStatus) => {
    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('modules')
        .update({
          approval_status: newStatus,
          approval_comment: comment.trim() || null
        })
        .eq('id', module.id);

      if (updateError) throw updateError;

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating module status:', error);
      setError('Failed to update module status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg">
        <h2 className="modal-title">Review Module</h2>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-100 border border-red-400 p-4">
            <div className="text-sm font-medieval text-red-800">{error}</div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="comment" className="block text-sm font-medieval font-medium text-ink">
              Comment
            </label>
            <textarea
              id="comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="form-textarea"
              placeholder="Add a comment about this module..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleUpdateStatus('returned')}
              disabled={saving}
              className="btn btn-secondary btn-with-icon"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Return for Changes
            </button>
            <button
              type="button"
              onClick={() => handleUpdateStatus('approved')}
              disabled={saving}
              className="btn btn-primary btn-with-icon"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve Module
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}