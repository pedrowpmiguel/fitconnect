import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Destinatário é obrigatório']
  },
  type: {
    type: String,
    required: [true, 'Tipo de notificação é obrigatório'],
    enum: ['workout_missed', 'workout_completed', 'plan_created', 'plan_updated', 'message', 'other'],
    default: 'workout_missed'
  },
  title: {
    type: String,
    required: [true, 'Título é obrigatório'],
    maxlength: [200, 'Título não pode ter mais de 200 caracteres']
  },
  message: {
    type: String,
    required: [true, 'Mensagem é obrigatória'],
    maxlength: [1000, 'Mensagem não pode ter mais de 1000 caracteres']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  // Dados relacionados (opcional)
  relatedData: {
    workoutLog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutLog'
    },
    workoutPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutPlan'
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  // Prioridade da notificação
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Para ações (opcional)
  actionUrl: {
    type: String,
    maxlength: [500, 'URL de ação não pode ter mais de 500 caracteres']
  },
  actionLabel: {
    type: String,
    maxlength: [100, 'Label da ação não pode ter mais de 100 caracteres']
  }
}, {
  timestamps: true
});

// Índices para melhor performance
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

// Método para marcar como lida
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Método estático para criar notificação de treino falhado
notificationSchema.statics.createWorkoutMissedNotification = async function(
  trainerId, 
  clientId, 
  workoutLogId, 
  workoutPlanId,
  clientName,
  reason,
  date
) {
  const reasonMessages = {
    'indisposição': 'indisposição',
    'falta_tempo': 'falta de tempo',
    'lesão': 'lesão',
    'doença': 'doença',
    'outros': 'outro motivo'
  };

  const reasonText = reasonMessages[reason] || 'motivo não especificado';
  const dateStr = new Date(date).toLocaleDateString('pt-PT');

  return this.create({
    recipient: trainerId,
    type: 'workout_missed',
    title: 'Treino não cumprido',
    message: `${clientName} não completou o treino do dia ${dateStr}. Motivo: ${reasonText}.`,
    priority: 'high',
    relatedData: {
      workoutLog: workoutLogId,
      workoutPlan: workoutPlanId,
      client: clientId
    },
    actionUrl: `/dashboard/clients/${clientId}`,
    actionLabel: 'Ver detalhes'
  });
};

export default mongoose.model('Notification', notificationSchema);

