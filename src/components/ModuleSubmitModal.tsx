import { useState } from 'react';
import { Module } from '../lib/types';
import { supabase } from '../lib/supabase';
import { Send } from 'lucide-react';

interface ModuleSubmitModalProps {
  module: Module;
  onClose: () => void;
  onUpdate: () => void;
}

export function ModuleSubmitModal({ module, onClose, onUpdate }: ModuleSubmitModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('modules')
        .update({
          approval_status: 'submitted',
          approval_comment: null
        })
        .eq('id', module.id);

      if (updateError) throw updateError;

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error submitting module:', error);
      setError('Failed to submit module');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg">
        <h2 className="modal-title">Submit Module for Approval</h2>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-100 border border-red-400 p-4">
            <div className="text-sm font-medieval text-red-800">{error}</div>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm font-medieval text-ink-light">
            Are you sure you want to submit this module for approval? 
            Once submitted, you won't be able to make changes unless it's returned by an administrator.
          </p>

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
              onClick={handleSubmit}
              disabled={saving}
              className="btn btn-primary btn-with-icon"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}