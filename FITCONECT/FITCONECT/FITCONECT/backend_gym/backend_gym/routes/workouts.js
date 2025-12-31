import express from "express";
import WorkoutPlan from "../models/WorkoutPlan.js";
import WorkoutSession from "../models/WorkoutSession.js";
import Exercise from "../models/Exercise.js";
import WorkoutLog from "../models/WorkoutLog.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { validationResult } from "express-validator";
import { authenticateToken } from "../middleware/auth.js";
import { validateExerciseUpdate } from "../middleware/workoutValidation.js";
import mongoose from 'mongoose';

const router = express.Router();

// Criar novo plano de treino
router.post("/plans", async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const trainerId = req.user._id;
    const { 
      name, 
      description, 
      clientId, 
      frequency, 
      sessions, 
      startDate, 
      endDate, 
      goals, 
      level, 
      notes, 
      totalWeeks,
      isTemplate,
      templateName 
    } = req.body;

    // Verificar se o cliente existe e está atribuído ao trainer
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }

    if (client.assignedTrainer?.toString() !== trainerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cliente não está atribuído a este personal trainer'
      });
    }

    // Criar sessões de treino
    const createdSessions = [];
    for (const sessionData of sessions) {
      const session = new WorkoutSession(sessionData);
      await session.save();
      createdSessions.push(session._id);
    }

    // Criar plano de treino
    const workoutPlan = new WorkoutPlan({
      name,
      description,
      client: clientId,
      trainer: trainerId,
      frequency,
      sessions: createdSessions,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      goals,
      level,
      notes,
      totalWeeks: totalWeeks || 4,
      isTemplate: isTemplate || false,
      templateName
    });

    await workoutPlan.save();

    // Popular dados para resposta
    await workoutPlan.populate([
      { path: 'client', select: 'firstName lastName username email' },
      { path: 'trainer', select: 'firstName lastName username email' },
      { path: 'sessions', populate: { path: 'exercises.exercise', model: 'Exercise' } }
    ]);

    res.status(201).json({
      success: true,
      message: 'Plano de treino criado com sucesso',
      data: { workoutPlan }
    });

  } catch (error) {
    console.error('Erro ao criar plano de treino:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obter planos de treino do trainer
router.get("/plans", async (req, res) => {
  try {
    const trainerId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Construir filtros
    const filters = { trainer: trainerId };
    
    if (req.query.clientId) {
      filters.client = req.query.clientId;
    }
    
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }
    
    if (req.query.frequency) {
      filters.frequency = req.query.frequency;
    }
    
    if (req.query.level) {
      filters.level = req.query.level;
    }
    
    if (req.query.goals) {
      filters.goals = { $in: req.query.goals.split(',') };
    }
    
    if (req.query.search) {
      filters.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // ordenação
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const query = WorkoutPlan.find(filters)
      .populate('client', 'firstName lastName username email')
      .populate('trainer', 'firstName lastName username email')
      .populate('sessions')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const [plans, total] = await Promise.all([
      query.exec(),
      WorkoutPlan.countDocuments(filters)
    ]);

    res.json({
      success: true,
      message: 'Planos de treino obtidos com sucesso',
      data: {
        plans,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalPlans: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter planos de treino:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obter plano de treino específico
router.get("/plans/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const trainerId = req.user._id;

    const plan = await WorkoutPlan.findOne({ _id: id, trainer: trainerId })
      .populate('client', 'firstName lastName username email phone')
      .populate('trainer', 'firstName lastName username email')
      .populate({
        path: 'sessions',
        populate: {
          path: 'exercises.exercise',
          model: 'Exercise'
        }
      });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plano de treino não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Plano de treino obtido com sucesso',
      data: { plan }
    });

  } catch (error) {
    console.error('Erro ao obter plano de treino:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Atualizar plano de treino
router.put("/plans/:id", async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const trainerId = req.user._id;
    const updateData = req.body;

    const plan = await WorkoutPlan.findOne({ _id: id, trainer: trainerId });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plano de treino não encontrado'
      });
    }

    // Se estão sendo atualizadas as sessões, criar novas sessões
    if (updateData.sessions) {
      // Deletar sessões antigas
      await WorkoutSession.deleteMany({ _id: { $in: plan.sessions } });
      
      // Criar novas sessões
      const createdSessions = [];
      for (const sessionData of updateData.sessions) {
        const session = new WorkoutSession(sessionData);
        await session.save();
        createdSessions.push(session._id);
      }
      updateData.sessions = createdSessions;
    }

    // Atualizar plano
    Object.assign(plan, updateData);
    await plan.save();

    // Popular dados para resposta
    await plan.populate([
      { path: 'client', select: 'firstName lastName username email' },
      { path: 'trainer', select: 'firstName lastName username email' },
      { path: 'sessions', populate: { path: 'exercises.exercise', model: 'Exercise' } }
    ]);

    res.json({
      success: true,
      message: 'Plano de treino atualizado com sucesso',
      data: { plan }
    });

  } catch (error) {
    console.error('Erro ao atualizar plano de treino:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Ativar/desativar plano de treino
router.put("/plans/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const trainerId = req.user._id;
    const { isActive } = req.body;

    const plan = await WorkoutPlan.findOne({ _id: id, trainer: trainerId });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plano de treino não encontrado'
      });
    }

    plan.isActive = isActive;
    await plan.save();

    res.json({
      success: true,
      message: `Plano de treino ${isActive ? 'ativado' : 'desativado'} com sucesso`,
      data: { plan }
    });

  } catch (error) {
    console.error('Erro ao alterar status do plano:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Eliminar plano de treino
router.delete("/plans/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const trainerId = req.user._id;

    const plan = await WorkoutPlan.findOne({ _id: id, trainer: trainerId });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plano de treino não encontrado ou não tem permissão para eliminar'
      });
    }

    // Eliminar todas as sessões associadas ao plano
    if (plan.sessions && plan.sessions.length > 0) {
      await WorkoutSession.deleteMany({ _id: { $in: plan.sessions } });
    }

    // Eliminar todos os logs de treino associados ao plano
    if (plan._id) {
      await WorkoutLog.deleteMany({ plan: plan._id });
    }

    // Eliminar o plano
    await WorkoutPlan.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Plano de treino eliminado com sucesso',
      data: { planId: id }
    });

  } catch (error) {
    console.error('Erro ao eliminar plano de treino:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Trainer envia alerta ao cliente quando não cumpriu o treino
router.post('/plans/:id/alert-client-missed', authenticateToken, async (req, res) => {
  try {
    const trainerId = req.user._id;
    const { id: planId } = req.params;
    const { clientId, workoutLogId, date, reason, message, priority } = req.body;

    // Verificar plano e permissões
    const plan = await WorkoutPlan.findOne({ _id: planId, trainer: trainerId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plano não encontrado ou não pertence a este trainer' });
    }

    // Verificar cliente
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    }

    // Montar título e mensagem padrão
    const trainerName = req.user.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : 'Seu personal';
    const dateStr = date ? new Date(date).toLocaleDateString('pt-PT') : 'data não especificada';
    const notifTitle = 'Alerta do seu personal: treino não cumprido';
    const notifMessage = message || `${trainerName} informou que não cumpriu o treino marcado para ${dateStr}. Por favor, retome o treino ou contacte o seu personal.`;

    const notification = await Notification.create({
      recipient: clientId,
      type: 'workout_missed',
      title: notifTitle,
      message: notifMessage,
      priority: priority || 'high',
      relatedData: {
        workoutLog: workoutLogId || undefined,
        workoutPlan: planId,
        client: clientId
      },
      actionUrl: `/client/workouts`,
      actionLabel: 'Ver treino'
    });

    // Emitir via Socket.IO para o cliente se estiver disponível
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${clientId}`).emit('trainer_alert', {
          notificationId: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          trainerId,
          createdAt: new Date()
        });
      }
    } catch (err) {
      console.error('Erro ao emitir notificação via socket:', err);
    }

    res.status(201).json({ success: true, message: 'Alerta enviado ao cliente', data: { notification } });
  } catch (error) {
    console.error('Erro ao enviar alerta ao cliente:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao enviar alerta' });
  }
});

// Obter exercícios disponíveis
router.get("/exercises", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Construir filtros
    const filters = { isActive: true };
    
    if (req.query.muscleGroups) {
      filters.muscleGroups = { $in: req.query.muscleGroups.split(',') };
    }
    
    if (req.query.equipment) {
      filters.equipment = { $in: req.query.equipment.split(',') };
    }
    
    if (req.query.difficulty) {
      filters.difficulty = req.query.difficulty;
    }
    
    if (req.query.search) {
      filters.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const query = Exercise.find(filters)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const [exercises, total] = await Promise.all([
      query.exec(),
      Exercise.countDocuments(filters)
    ]);

    res.json({
      success: true,
      message: 'Exercícios obtidos com sucesso',
      data: {
        exercises,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalExercises: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter exercícios:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obter treinos faltados de um cliente específico (para trainer)
router.get('/client/:clientId/missed-workouts', authenticateToken, async (req, res) => {
  try {
    const trainerId = req.user._id;
    const { clientId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verificar se o cliente está atribuído ao trainer
    const client = await User.findOne({ _id: clientId, assignedTrainer: trainerId });
    if (!client || client.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Cliente não está atribuído a este trainer'
      });
    }

    // Buscar treinos faltados (isCompleted = false)
    const query = WorkoutLog.find({
      client: clientId,
      isCompleted: false
    })
      .populate('trainer', 'firstName lastName username')
      .populate('workoutPlan', 'name')
      .populate('session', 'dayOfWeek')
      .populate('exercises.exercise', 'name')
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit);

    const [logs, total] = await Promise.all([
      query.exec(),
      WorkoutLog.countDocuments({ client: clientId, isCompleted: false })
    ]);

    res.json({
      success: true,
      message: 'Treinos faltados obtidos com sucesso',
      data: {
        logs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalLogs: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Erro ao obter treinos faltados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// Criar novo exercício
router.post("/exercises", authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const trainerId = req.user._id;
    
    // Verificar se é trainer ou admin
    if (req.user.role !== 'trainer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas personal trainers e admins podem criar exercícios'
      });
    }

    const exerciseData = {
      ...req.body,
      createdBy: trainerId
    };

    const exercise = new Exercise(exerciseData);
    await exercise.save();

    res.status(201).json({
      success: true,
      message: 'Exercício criado com sucesso',
      data: { exercise }
    });

  } catch (error) {
    console.error('Erro ao criar exercício:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obter exercício específico por ID
router.get("/exercises/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID do exercício inválido'
      });
    }

    const exercise = await Exercise.findById(id)
      .populate('createdBy', 'firstName lastName username');

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercício não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Exercício obtido com sucesso',
      data: { exercise }
    });

  } catch (error) {
    console.error('Erro ao obter exercício:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Listar exercícios criados pelo trainer
router.get("/exercises/my-exercises", authenticateToken, async (req, res) => {
  try {
    const trainerId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Construir filtros
    const filters = { createdBy: trainerId };
    
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }
    
    if (req.query.muscleGroups) {
      filters.muscleGroups = { $in: req.query.muscleGroups.split(',') };
    }
    
    if (req.query.equipment) {
      filters.equipment = { $in: req.query.equipment.split(',') };
    }
    
    if (req.query.difficulty) {
      filters.difficulty = req.query.difficulty;
    }
    
    if (req.query.search) {
      filters.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const query = Exercise.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const [exercises, total] = await Promise.all([
      query.exec(),
      Exercise.countDocuments(filters)
    ]);

    res.json({
      success: true,
      message: 'Exercícios obtidos com sucesso',
      data: {
        exercises,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalExercises: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter exercícios do trainer:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Atualizar exercício (apenas o criador ou admin)
router.put("/exercises/:id", authenticateToken, validateExerciseUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID do exercício inválido'
      });
    }

    // Buscar exercício
    const exercise = await Exercise.findById(id);

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercício não encontrado'
      });
    }

    // Verificar permissões (apenas o criador ou admin pode atualizar)
    if (exercise.createdBy.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para atualizar este exercício'
      });
    }

    // Campos permitidos para atualização
    const allowedFields = [
      'name', 'description', 'muscleGroups', 'equipment', 'difficulty',
      'instructions', 'videoUrl', 'imageUrl', 'isActive'
    ];
    
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Validar videoUrl se fornecido
    if (updateData.videoUrl && !updateData.videoUrl.match(/^https?:\/\/.+/)) {
      return res.status(400).json({
        success: false,
        message: 'URL do vídeo deve ser válida (começar com http:// ou https://)'
      });
    }

    // Validar imageUrl se fornecido
    if (updateData.imageUrl && !updateData.imageUrl.match(/^https?:\/\/.+/)) {
      return res.status(400).json({
        success: false,
        message: 'URL da imagem deve ser válida (começar com http:// ou https://)'
      });
    }

    // Validar instruções se fornecidas
    if (updateData.instructions && updateData.instructions.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Instruções não podem ter mais de 1000 caracteres'
      });
    }

    // Atualizar exercício
    Object.assign(exercise, updateData);
    await exercise.save();

    res.json({
      success: true,
      message: 'Exercício atualizado com sucesso',
      data: { exercise }
    });

  } catch (error) {
    console.error('Erro ao atualizar exercício:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obter dashboard de um cliente (para trainer)
router.get("/clients/:clientId/dashboard", async (req, res) => {
  try {
    const trainerId = req.user._id;
    const { clientId } = req.params;
    const { period = '6' } = req.query;

    // Verificar se o cliente está atribuído a este trainer
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }

    if (client.assignedTrainer?.toString() !== trainerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Este cliente não está atribuído a si.'
      });
    }

    // Buscar plano ativo do cliente
    const activePlan = await WorkoutPlan.findOne({
      client: clientId,
      trainer: trainerId,
      isActive: true
    });

    // Calcular datas de início
    const now = new Date();
    const monthsAgo = parseInt(period);
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    startDate.setHours(0, 0, 0, 0);

    // Buscar todos os logs completados no período
    const logs = await WorkoutLog.find({
      client: clientId,
      trainer: trainerId,
      isCompleted: true,
      completedAt: { $gte: startDate }
    }).sort({ completedAt: 1 });

    // Agregar por semana
    const weeklyData = {};
    logs.forEach(log => {
      const logDate = new Date(log.completedAt);
      const year = logDate.getFullYear();
      const weekNum = getWeekNumber(logDate);
      const key = `${year}-W${weekNum.toString().padStart(2, '0')}`;
      
      if (!weeklyData[key]) {
        weeklyData[key] = {
          period: key,
          week: weekNum,
          year: year,
          completed: 0,
          notCompleted: 0
        };
      }
      
      if (log.isCompleted) {
        weeklyData[key].completed++;
      } else {
        weeklyData[key].notCompleted++;
      }
    });

    // Agregar por mês
    const monthlyData = {};
    logs.forEach(log => {
      const logDate = new Date(log.completedAt);
      const year = logDate.getFullYear();
      const month = logDate.getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, '0')}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = {
          period: key,
          month: month,
          year: year,
          monthName: logDate.toLocaleDateString('pt-PT', { month: 'long' }),
          completed: 0,
          notCompleted: 0
        };
      }
      
      if (log.isCompleted) {
        monthlyData[key].completed++;
      } else {
        monthlyData[key].notCompleted++;
      }
    });

    // Buscar logs não completados também
    const notCompletedLogs = await WorkoutLog.find({
      client: clientId,
      trainer: trainerId,
      isCompleted: false,
      completedAt: { $gte: startDate }
    });

    // Adicionar não completados aos dados semanais
    notCompletedLogs.forEach(log => {
      const logDate = new Date(log.completedAt);
      const year = logDate.getFullYear();
      const weekNum = getWeekNumber(logDate);
      const key = `${year}-W${weekNum.toString().padStart(2, '0')}`;
      
      if (!weeklyData[key]) {
        weeklyData[key] = {
          period: key,
          week: weekNum,
          year: year,
          completed: 0,
          notCompleted: 0
        };
      }
      weeklyData[key].notCompleted++;
    });

    // Adicionar não completados aos dados mensais
    notCompletedLogs.forEach(log => {
      const logDate = new Date(log.completedAt);
      const year = logDate.getFullYear();
      const month = logDate.getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, '0')}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = {
          period: key,
          month: month,
          year: year,
          monthName: logDate.toLocaleDateString('pt-PT', { month: 'long' }),
          completed: 0,
          notCompleted: 0
        };
      }
      monthlyData[key].notCompleted++;
    });

    // Converter para arrays e ordenar
    const weeklyChart = Object.values(weeklyData).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.week - b.week;
    });

    const monthlyChart = Object.values(monthlyData).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    // Estatísticas gerais
    const totalCompleted = logs.length;
    const totalNotCompleted = notCompletedLogs.length;
    const totalWorkouts = totalCompleted + totalNotCompleted;
    const completionRate = totalWorkouts > 0 
      ? Math.round((totalCompleted / totalWorkouts) * 100) 
      : 0;

    // Calcular média de treinos por semana e mês
    const avgWeeklyCompleted = weeklyChart.length > 0
      ? Math.round(weeklyChart.reduce((sum, week) => sum + week.completed, 0) / weeklyChart.length)
      : 0;
    
    const avgMonthlyCompleted = monthlyChart.length > 0
      ? Math.round(monthlyChart.reduce((sum, month) => sum + month.completed, 0) / monthlyChart.length)
      : 0;

    // Buscar motivo mais comum de não cumprimento
    const nonCompletionReasons = {};
    notCompletedLogs.forEach(log => {
      if (log.nonCompletionReason) {
        nonCompletionReasons[log.nonCompletionReason] = 
          (nonCompletionReasons[log.nonCompletionReason] || 0) + 1;
      }
    });

    const mostCommonReason = Object.keys(nonCompletionReasons).length > 0
      ? Object.entries(nonCompletionReasons).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    res.json({
      success: true,
      message: 'Dashboard do cliente obtido com sucesso',
      data: {
        client: {
          id: client._id,
          firstName: client.firstName,
          lastName: client.lastName,
          username: client.username,
          email: client.email
        },
        plan: activePlan ? {
          id: activePlan._id,
          name: activePlan.name,
          currentWeek: activePlan.currentWeek,
          totalWeeks: activePlan.totalWeeks,
          completionRate: activePlan.progress.completionRate
        } : null,
        statistics: {
          totalCompleted,
          totalNotCompleted,
          totalWorkouts,
          completionRate,
          avgWeeklyCompleted,
          avgMonthlyCompleted,
          mostCommonNonCompletionReason: mostCommonReason
        },
        charts: {
          weekly: weeklyChart,
          monthly: monthlyChart
        },
        period: {
          start: startDate.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
          months: monthsAgo
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter dashboard do cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Função auxiliar para calcular número da semana
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Obter estatísticas dos planos de treino
router.get("/stats", async (req, res) => {
  try {
    const trainerId = req.user._id;

    const [
      totalPlans,
      activePlans,
      completedPlans,
      totalClients,
      avgCompletionRate
    ] = await Promise.all([
      WorkoutPlan.countDocuments({ trainer: trainerId }),
      WorkoutPlan.countDocuments({ trainer: trainerId, isActive: true }),
      WorkoutPlan.countDocuments({ trainer: trainerId, 'progress.completionRate': 100 }),
      WorkoutPlan.distinct('client', { trainer: trainerId }),
      WorkoutPlan.aggregate([
        { $match: { trainer: trainerId } },
        { $group: { _id: null, avgRate: { $avg: '$progress.completionRate' } } }
      ])
    ]);

    res.json({
      success: true,
      message: 'Estatísticas obtidas com sucesso',
      data: {
        totalPlans,
        activePlans,
        completedPlans,
        totalClients: totalClients.length,
        avgCompletionRate: avgCompletionRate[0]?.avgRate || 0
      }
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rota para trainer ver workout logs dos seus clientes (com proof images)
router.get('/client/:clientId/logs', authenticateToken, async (req, res) => {
  try {
    const trainerId = req.user._id;
    const { clientId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Verificar se o cliente está atribuído ao trainer
    const client = await User.findOne({ _id: clientId, assignedTrainer: trainerId });
    if (!client || client.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Cliente não está atribuído a este trainer'
      });
    }

    // Construir filtros
    const filters = { 
      client: clientId,
      trainer: trainerId 
    };
    
    if (req.query.isCompleted !== undefined) {
      filters.isCompleted = req.query.isCompleted === 'true';
    }

    if (req.query.week) {
      filters.week = parseInt(req.query.week);
    }

    if (req.query.startDate && req.query.endDate) {
      filters.completedAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    // Buscar logs com proof images
    const query = WorkoutLog.find(filters)
      .populate('client', 'firstName lastName username email')
      .populate('trainer', 'firstName lastName username')
      .populate('workoutPlan', 'name description')
      .populate('session', 'dayOfWeek exercises')
      .populate('exercises.exercise', 'name muscleGroups difficulty')
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit);

    const [logs, total] = await Promise.all([
      query.exec(),
      WorkoutLog.countDocuments(filters)
    ]);

    res.json({
      success: true,
      message: 'Logs de treino dos clientes obtidos com sucesso',
      data: {
        logs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalLogs: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Erro ao obter logs de treino do cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rota para trainer ver imagens de prova de um workout log específico
router.get('/client/:clientId/logs/:workoutLogId', authenticateToken, async (req, res) => {
  try {
    const trainerId = req.user._id;
    const { clientId, workoutLogId } = req.params;

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(workoutLogId) || !mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: 'IDs inválidos'
      });
    }

    // Verificar se o cliente está atribuído ao trainer
    const client = await User.findOne({ _id: clientId, assignedTrainer: trainerId });
    if (!client || client.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Cliente não está atribuído a este trainer'
      });
    }

    // Buscar o workout log específico
    const log = await WorkoutLog.findOne({
      _id: workoutLogId,
      client: clientId,
      trainer: trainerId
    })
      .populate('client', 'firstName lastName username email')
      .populate('trainer', 'firstName lastName username')
      .populate('workoutPlan', 'name description')
      .populate('session', 'dayOfWeek')
      .populate('exercises.exercise', 'name muscleGroups difficulty');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Workout log não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Detalhes do workout log obtidos com sucesso',
      data: {
        log,
        hasProofImage: !!log.proofImage
      }
    });
  } catch (error) {
    console.error('Erro ao obter workout log:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
