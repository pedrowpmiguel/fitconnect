// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username é obrigatório'],
    unique: true,
    trim: true,
    minlength: [3, 'Username deve ter pelo menos 3 caracteres'],
    maxlength: [30, 'Username não pode ter mais de 30 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'Password é obrigatória'],
    minlength: [6, 'Password deve ter pelo menos 6 caracteres']
  },
  firstName: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    maxlength: [50, 'Nome não pode ter mais de 50 caracteres']
  },
  lastName: {
    type: String,
    required: [true, 'Apelido é obrigatório'],
    trim: true,
    maxlength: [50, 'Apelido não pode ter mais de 50 caracteres']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{9}$/, 'Número de telefone deve ter 9 dígitos']
  },
  dateOfBirth: { type: Date },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  assignedTrainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Pedido de mudança de trainer (subdocumento)
  trainerChangeRequest: {
    requestedTrainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    requestedAt: { type: Date },
    processedAt: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminReason: { type: String }
  },
  role: {
    type: String,
    enum: ['client', 'trainer', 'admin'],
    required: true
  },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  profileImage: { type: String },
  qrCode: { type: String },
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  // Campos específicos de trainer
  specialization: { type: [String], default: [] },
  experience: { type: Number, default: 0 },
  certification: { type: [String], default: [] },
  bio: { type: String },
  hourlyRate: { type: Number },
  isApproved: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date }
}, {
  timestamps: true,
  discriminatorKey: 'role'
});

// Índices
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

// Hash da senha antes de salvar
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Verificar senha
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Verificar se conta está bloqueada
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Incrementar tentativas de login
userSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

// Reset tentativas de login
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Nome completo
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Dados públicos
userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpire;
  return userObject;
};

// Gerar token de reset de senha
userSchema.methods.getResetPasswordToken = function () {
  // Gerar token aleatório
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash do token e salvar no banco
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Expirar em 10 minutos
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

export default mongoose.model('User', userSchema);