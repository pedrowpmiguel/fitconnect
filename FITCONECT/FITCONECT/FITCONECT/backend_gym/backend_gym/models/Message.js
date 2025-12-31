import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  message: {
    type: String,
    required: [true, 'Mensagem é obrigatória'],
    maxlength: [2000, 'Mensagem não pode ter mais de 2000 caracteres']
  },
  type: {
    type: String,
    enum: ['chat', 'alert', 'system'],
    default: 'chat'
  },
  // Para alertas relacionados a treinos
  alertType: {
    type: String,
    enum: ['workout_missed', 'workout_reminder', 'plan_update', 'other'],
    default: null
  },
  relatedWorkoutLog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutLog'
  },
  relatedWorkoutPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutPlan'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  // Para mensagens importantes/urgentes
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// garantir um único index declarado aqui:
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1, isRead: 1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ type: 1 });
messageSchema.index({ createdAt: -1 });

// Índice composto para conversas
messageSchema.index({ sender: 1, recipient: 1 });

// Método para marcar como lida
messageSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Método estático para obter conversa entre dois usuários
messageSchema.statics.getConversation = async function(userId1, userId2, limit = 50, skip = 0) {
  return this.find({
    $or: [
      { sender: userId1, recipient: userId2 },
      { sender: userId2, recipient: userId1 }
    ]
  })
    .populate('sender', 'firstName lastName username email')
    .populate('recipient', 'firstName lastName username email')
    .populate('relatedWorkoutLog', 'isCompleted nonCompletionReason completedAt')
    .populate('relatedWorkoutPlan', 'name')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip));
};

// Método estático para contar mensagens não lidas
messageSchema.statics.getUnreadCount = async function(userId, senderId = null) {
  const filter = { recipient: userId, isRead: false };
  if (senderId) {
    filter.sender = senderId;
  }
  return this.countDocuments(filter);
};

export default mongoose.model('Message', messageSchema);

