import React, { useState } from 'react';
import './NonCompletionModal.scss';

const NON_COMPLETION_REASONS = [
  { value: 'lesão', label: 'Lesão' },
  { value: 'doença', label: 'Doença' },
  { value: 'falta_tempo', label: 'Falta de Tempo' },
  { value: 'motivos_pessoais', label: 'Motivos Pessoais' },
  { value: 'fadiga', label: 'Fadiga/Exaustão' },
  { value: 'outros', label: 'Outros' }
];

export default function NonCompletionModal({ isOpen, onClose, onSubmit, workoutDate }) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!reason) {
      setError('Por favor, selecione um motivo');
      return;
    }

    if (reason === 'outros' && !notes.trim()) {
      setError('Por favor, descreva o motivo quando selecionar "Outros"');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        nonCompletionReason: reason,
        nonCompletionNotes: reason === 'outros' ? notes.trim() : undefined
      });
      // Reset form
      setReason('');
      setNotes('');
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao marcar treino como não concluído');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setReason('');
      setNotes('');
      setError('');
      onClose();
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="non-completion-modal-overlay" onClick={handleClose}>
      <div className="non-completion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Marcar Treino como Não Concluído</h2>
          <button 
            className="close-btn" 
            onClick={handleClose}
            disabled={submitting}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {workoutDate && (
            <p className="workout-date-info">
              <strong>Data do treino:</strong> {formatDate(workoutDate)}
            </p>
          )}

          <p className="modal-description">
            Por favor, informe o motivo pelo qual o treino não foi concluído. 
            Esta informação será compartilhada com o seu personal trainer.
          </p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="reason" className="required">
                Motivo de Não Cumprimento
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
                required
              >
                <option value="">-- Selecione um motivo --</option>
                {NON_COMPLETION_REASONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {reason === 'outros' && (
              <div className="form-group">
                <label htmlFor="notes" className="required">
                  Descreva o Motivo
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  placeholder="Descreva o motivo pelo qual o treino não foi concluído..."
                  rows={4}
                  required
                />
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={submitting || !reason}
              >
                {submitting ? 'A processar...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

