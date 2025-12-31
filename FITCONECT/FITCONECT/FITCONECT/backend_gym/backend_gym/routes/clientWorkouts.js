import express from "express";
import WorkoutPlan from "../models/WorkoutPlan.js";
import WorkoutLog from "../models/WorkoutLog.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { validationResult } from "express-validator";
import { uploadWorkoutProof, handleUploadError } from "../middleware/upload.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// buscar planos de treino do cliente
router.get("/plans", async (req, res) => {
  try {
    const clientId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // construir filtros
    const filters = { client: clientId };
    
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }
    
    if (req.query.frequency) {
      filters.frequency = req.query.frequency;
    }
    
    if (req.query.level) {
      filters.level = req.query.level;
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
      .populate('trainer', 'firstName lastName username email')
      .populate({
        path: 'sessions',
        populate: {
          path: 'exercises.exercise',
          model: 'Exercise'
        }
      })
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

// obter plano de treino especifico do cliente
router.get("/plans/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user._id;

    const plan = await WorkoutPlan.findOne({ _id: id, client: clientId })
      .populate('trainer', 'firstName lastName username email phone')
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

// obter treino do dia
router.get("/today", async (req, res) => {
  try {
    const clientId = req.user._id;
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Encontrar plano ativo do cliente
    const activePlan = await WorkoutPlan.findOne({ 
      client: clientId, 
      isActive: true 
    }).populate({
      path: 'sessions',
      match: { dayOfWeek: dayOfWeek },
      populate: {
        path: 'exercises.exercise',
        model: 'Exercise'
      }
    });

    if (!activePlan || !activePlan.sessions.length) {
      return res.json({
        success: true,
        message: 'Nenhum treino agendado para hoje',
        data: { workout: null }
      });
    }

    const todayWorkout = activePlan.sessions[0];

    res.json({
      success: true,
      message: 'Treino do dia obtido com sucesso',
      data: { 
        workout: todayWorkout,
        plan: {
          id: activePlan._id,
          name: activePlan.name,
          week: activePlan.currentWeek,
          totalWeeks: activePlan.totalWeeks
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter treino do dia:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// obter treinos em calendario
router.get("/calendar", async (req, res) => {
  try {
    const clientId = req.user._id;
    const { startDate, endDate, month, year } = req.query;

    // Se mes e ano forem fornecidos, calcular startDate e endDate
    let start, end;
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      start = new Date(yearNum, monthNum - 1, 1);
      end = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
    } else if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // retorana mes atual por padrão
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // obter plano ativo do cliente
    const activePlan = await WorkoutPlan.findOne({
      client: clientId,
      isActive: true
    }).populate({
      path: 'sessions',
      populate: {
        path: 'exercises.exercise',
        model: 'Exercise'
      }
    });

    if (!activePlan) {
      return res.json({
        success: true,
        message: 'Nenhum plano ativo encontrado',
        data: { calendar: [] }
      });
    }

    // buscar logs de treino no período
    const logs = await WorkoutLog.find({
      client: clientId,
      completedAt: {
        $gte: start,
        $lte: end
      }
    })
      .populate('session', 'dayOfWeek exercises')
      .populate('workoutPlan', 'name')
      .sort({ completedAt: 1 });

    // criar mapa de logs por data
    const logsByDate = {};
    logs.forEach(log => {
      const dateKey = log.completedAt.toISOString().split('T')[0];
      if (!logsByDate[dateKey]) {
        logsByDate[dateKey] = [];
      }
      logsByDate[dateKey].push(log);
    });

    // gerar calendário com todos os dias do periodo
    const calendar = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // encontrar sessão agendada para este dia da semana
      const scheduledSession = activePlan.sessions.find(
        session => session.dayOfWeek === dayOfWeek
      );

      // verificar se há log para este dia
      const dayLogs = logsByDate[dateKey] || [];

      calendar.push({
        date: dateKey,
        dayOfWeek: dayOfWeek,
        scheduled: scheduledSession ? {
          sessionId: scheduledSession._id,
          dayOfWeek: scheduledSession.dayOfWeek,
          exercises: scheduledSession.exercises,
          estimatedDuration: scheduledSession.estimatedDuration,
          difficulty: scheduledSession.difficulty
        } : null,
        logs: dayLogs.map(log => ({
          id: log._id,
          isCompleted: log.isCompleted,
          nonCompletionReason: log.nonCompletionReason,
          nonCompletionNotes: log.nonCompletionNotes,
          proofImage: log.proofImage,
          completedAt: log.completedAt,
          actualDuration: log.actualDuration,
          session: log.session,
          week: log.week
        })),
        status: dayLogs.length > 0 
          ? (dayLogs[0].isCompleted ? 'completed' : 'not_completed')
          : (scheduledSession ? 'pending' : 'no_workout')
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      message: 'Calendário de treinos obtido com sucesso',
      data: {
        calendar,
        plan: {
          id: activePlan._id,
          name: activePlan.name,
          currentWeek: activePlan.currentWeek,
          totalWeeks: activePlan.totalWeeks
        },
        period: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter calendário de treinos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// registrar cumprimento diário (versão simplificada)
router.post("/daily-status", async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const clientId = req.user._id;
    const { date, isCompleted, nonCompletionReason, nonCompletionNotes, proofImage } = req.body;

    // Se não fornecer data, usar hoje
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Buscar plano ativo do cliente
    const activePlan = await WorkoutPlan.findOne({
      client: clientId,
      isActive: true
    }).populate({
      path: 'sessions',
      populate: {
        path: 'exercises.exercise',
        model: 'Exercise'
      }
    });

    if (!activePlan) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum plano ativo encontrado'
      });
    }

    // Encontrar sessão agendada para este dia da semana
    const scheduledSession = activePlan.sessions.find(
      session => session.dayOfWeek === dayOfWeek
    );

    if (!scheduledSession) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum treino agendado para este dia da semana'
      });
    }

    // Verificar se já existe log para esta data
    const dateEnd = new Date(targetDate);
    dateEnd.setHours(23, 59, 59, 999);

    const existingLog = await WorkoutLog.findOne({
      client: clientId,
      workoutPlan: activePlan._id,
      session: scheduledSession._id,
      completedAt: {
        $gte: targetDate,
        $lte: dateEnd
      }
    });

    // calcular semana atual
    const planStartDate = new Date(activePlan.startDate);
    planStartDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((targetDate - planStartDate) / (1000 * 60 * 60 * 24));
    const week = Math.floor(daysDiff / 7) + 1;

    if (existingLog) {
      // Guardar estado anterior antes de atualizar
      const wasCompleted = existingLog.isCompleted;
      
      // atualizar log existente
      existingLog.isCompleted = isCompleted;
      existingLog.nonCompletionReason = !isCompleted ? nonCompletionReason : undefined;
      existingLog.nonCompletionNotes = !isCompleted && nonCompletionReason === 'outros' ? nonCompletionNotes : undefined;
      existingLog.proofImage = proofImage || existingLog.proofImage;
      existingLog.completedAt = targetDate;
      
      await existingLog.save();
    } else {
      // validar se motivo foi fornecido quando não completou
      if (!isCompleted && !nonCompletionReason) {
        return res.status(400).json({
          success: false,
          message: 'Motivo de não cumprimento é obrigatório quando o treino não foi completado'
        });
      }

      // Validar se notas foram fornecidas quando motivo é "outros"
      if (!isCompleted && nonCompletionReason === 'outros' && !nonCompletionNotes) {
        return res.status(400).json({
          success: false,
          message: 'Notas sobre não cumprimento são obrigatórias quando o motivo é "outros"'
        });
      }

      // criar novo log
      const workoutLog = new WorkoutLog({
        client: clientId,
        trainer: activePlan.trainer,
        workoutPlan: activePlan._id,
        session: scheduledSession._id,
        week,
        dayOfWeek,
        completedAt: targetDate,
        isCompleted,
        nonCompletionReason: !isCompleted ? nonCompletionReason : undefined,
        nonCompletionNotes: !isCompleted && nonCompletionReason === 'outros' ? nonCompletionNotes : undefined,
        proofImage
      });

      await workoutLog.save();

      // criar notificação se não completou
      if (!isCompleted && activePlan.trainer) {
        try {
          const client = await User.findById(clientId);
          const clientName = client ? `${client.firstName} ${client.lastName}` : 'Cliente';
          
          const notification = await Notification.createWorkoutMissedNotification(
            activePlan.trainer,
            clientId,
            workoutLog._id,
            activePlan._id,
            clientName,
            nonCompletionReason || 'não especificado',
            targetDate
          );

          // Emitir notificação em tempo real via Socket.IO
          try {
            const io = req.app.get('io');
            io.to(`user:${activePlan.trainer}`).emit('workout_missed', {
              notificationId: notification._id,
              type: 'workout_missed',
              title: 'Treino não cumprido',
              message: notification.message,
              clientId: clientId,
              clientName: clientName,
              date: targetDate,
              reason: nonCompletionReason || 'não especificado',
              createdAt: new Date()
            });
            console.log('📤 Notificação emitida via Socket.IO para trainer:', activePlan.trainer);
          } catch (socketError) {
            console.error('Erro ao emitir notificação via Socket:', socketError);
          }
        } catch (notifError) {
          console.error('Erro ao criar notificação:', notifError);
        }
      }

      // atualizar estatísticas do plano apenas se completou
      if (isCompleted) {
        await activePlan.markSessionCompleted(scheduledSession._id, week);
      }
    }

    res.json({
      success: true,
      message: isCompleted ? 'Treino registrado como cumprido' : 'Treino registrado como não cumprido',
      data: {
        date: targetDate.toISOString().split('T')[0],
        dayOfWeek,
        isCompleted,
        nonCompletionReason: !isCompleted ? nonCompletionReason : undefined,
        proofImage
      }
    });

  } catch (error) {
    console.error('Erro ao registrar status diário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// registrar conclusão de treino
router.post("/logs", async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const clientId = req.user._id;
    const {
      workoutPlanId,
      sessionId,
      week,
      dayOfWeek,
      actualDuration,
      exercises,
      overallNotes,
      difficulty,
      energy,
      mood,
      painLevel,
      isCompleted = true,
      nonCompletionReason,
      nonCompletionNotes,
      proofImage
    } = req.body;

    // verificar se o plano pertence ao cliente
    const plan = await WorkoutPlan.findById(workoutPlanId);
    if (!plan || plan.client.toString() !== clientId.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Plano de treino não encontrado'
      });
    }

    // validar se motivo foi fornecido quando não completou
    if (!isCompleted && !nonCompletionReason) {
      return res.status(400).json({
        success: false,
        message: 'Motivo de não cumprimento é obrigatório quando o treino não foi completado'
      });
    }

    // validar se notas foram fornecidas quando motivo é "outros"
    if (!isCompleted && nonCompletionReason === 'outros' && !nonCompletionNotes) {
      return res.status(400).json({
        success: false,
        message: 'Notas sobre não cumprimento são obrigatórias quando o motivo é "outros"'
      });
    }

    // criar log do treino
    const workoutLog = new WorkoutLog({
      client: clientId,
      trainer: plan.trainer,
      workoutPlan: workoutPlanId,
      session: sessionId,
      week,
      dayOfWeek,
      completedAt: new Date(),
      actualDuration,
      exercises,
      overallNotes,
      difficulty,
      energy,
      mood,
      painLevel,
      isCompleted,
      nonCompletionReason: !isCompleted ? nonCompletionReason : undefined,
      nonCompletionNotes: !isCompleted && nonCompletionReason === 'outros' ? nonCompletionNotes : undefined,
      proofImage
    });

    await workoutLog.save();

    // criar notificação se não completou
    if (!isCompleted && plan.trainer) {
      try {
        const client = await User.findById(clientId);
        const clientName = client ? `${client.firstName} ${client.lastName}` : 'Cliente';
        
        const notification = await Notification.createWorkoutMissedNotification(
          plan.trainer,
          clientId,
          workoutLog._id,
          workoutPlanId,
          clientName,
          nonCompletionReason || 'não especificado',
          workoutLog.completedAt
        );

        // Emitir notificação em tempo real via Socket.IO
        try {
          const io = req.app.get('io');
          io.to(`user:${plan.trainer}`).emit('workout_missed', {
            notificationId: notification._id,
            type: 'workout_missed',
            title: 'Treino não cumprido',
            message: notification.message,
            clientId: clientId,
            clientName: clientName,
            date: workoutLog.completedAt,
            reason: nonCompletionReason || 'não especificado',
            createdAt: new Date()
          });
          console.log('📤 Notificação emitida via Socket.IO para trainer:', plan.trainer);
        } catch (socketError) {
          console.error('Erro ao emitir notificação via Socket:', socketError);
        }
      } catch (notifError) {
        console.error('Erro ao criar notificação:', notifError);
        // não falhar o request se a notificação falhar
      }
    }

    // atualizar estatísticas do plano apenas se completou
    if (isCompleted) {
      await plan.markSessionCompleted(sessionId, week);
    }

    res.status(201).json({
      success: true,
      message: isCompleted ? 'Treino registrado com sucesso' : 'Registro de não cumprimento salvo',
      data: { workoutLog }
    });

  } catch (error) {
    console.error('Erro ao registrar treino:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Upload de imagem de prova de treino
router.post("/logs/:workoutLogId/proof-image", uploadWorkoutProof.single('proofImage'), handleUploadError, async (req, res) => {
  try {
    const clientId = req.user._id;
    const { workoutLogId } = req.params;

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(workoutLogId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do workout log inválido'
      });
    }

    // Verificar se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem foi enviada'
      });
    }

    // Buscar o workout log
    const workoutLog = await WorkoutLog.findById(workoutLogId);

    if (!workoutLog) {
      // Se o log não existir, deletar o arquivo enviado
      const filePath = path.join(__dirname, '..', 'uploads', 'workout-proofs', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(404).json({
        success: false,
        message: 'Workout log não encontrado'
      });
    }

    // Verificar se o workout log pertence ao cliente
    if (workoutLog.client.toString() !== clientId.toString()) {
      // Se não pertencer, deletar o arquivo enviado
      const filePath = path.join(__dirname, '..', 'uploads', 'workout-proofs', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para adicionar imagem a este workout log'
      });
    }

    // Se já existe uma imagem antiga, deletá-la
    if (workoutLog.proofImage) {
      const oldImagePath = workoutLog.proofImage.replace(/^\/uploads\//, '');
      const fullOldPath = path.join(__dirname, '..', 'uploads', oldImagePath);
      if (fs.existsSync(fullOldPath)) {
        try {
          fs.unlinkSync(fullOldPath);
        } catch (err) {
          console.error('Erro ao deletar imagem antiga:', err);
        }
      }
    }

    // Criar URL da imagem
    const imageUrl = `/uploads/workout-proofs/${req.file.filename}`;

    // Atualizar o workout log com a URL da imagem
    workoutLog.proofImage = imageUrl;
    await workoutLog.save();

    res.json({
      success: true,
      message: 'Imagem de prova de treino enviada com sucesso',
      data: {
        workoutLog: {
          _id: workoutLog._id,
          proofImage: workoutLog.proofImage
        },
        imageUrl: imageUrl
      }
    });

  } catch (error) {
    console.error('Erro ao fazer upload de imagem de prova:', error);
    
    // Se houve erro e um arquivo foi enviado, deletá-lo
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', 'workout-proofs', req.file.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Erro ao deletar arquivo após erro:', err);
        }
      }
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// obter histórico de treinos
router.get("/logs", async (req, res) => {
  try {
    const clientId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // construir filtros
    const filters = { client: clientId };
    
    if (req.query.week) {
      filters.week = parseInt(req.query.week);
    }
    
    if (req.query.dayOfWeek) {
      filters.dayOfWeek = req.query.dayOfWeek;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filters.completedAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const query = WorkoutLog.find(filters)
      .populate('trainer', 'firstName lastName username')
      .populate('workoutPlan', 'name')
      .populate('session', 'dayOfWeek')
      .populate('exercises.exercise', 'name')
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit);

    const [logs, total] = await Promise.all([
      query.exec(),
      WorkoutLog.countDocuments(filters)
    ]);

    res.json({
      success: true,
      message: 'Histórico de treinos obtido com sucesso',
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
    console.error('Erro ao obter histórico de treinos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// obter dashboard do cliente com gráficos
router.get("/dashboard", async (req, res) => {
  try {
    const clientId = req.user._id;
    const { period = '6' } = req.query; // número de meses/weeks para retornar

    // Buscar plano ativo
    const activePlan = await WorkoutPlan.findOne({
      client: clientId,
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

    // buscar logs não completados também para estatísticas
    const notCompletedLogs = await WorkoutLog.find({
      client: clientId,
      isCompleted: false,
      completedAt: { $gte: startDate }
    });

    // adicionar não completados aos dados semanais
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

    res.json({
      success: true,
      message: 'Dashboard obtido com sucesso',
      data: {
        plan: activePlan && activePlan.progress ? {
          id: activePlan._id,
          name: activePlan.name,
          currentWeek: activePlan.currentWeek,
          totalWeeks: activePlan.totalWeeks,
          completionRate: activePlan.progress.completionRate
        } : (activePlan ? {
          id: activePlan._id,
          name: activePlan.name,
          currentWeek: activePlan.currentWeek,
          totalWeeks: activePlan.totalWeeks,
          completionRate: 0
        } : null),
        statistics: {
          totalCompleted,
          totalNotCompleted,
          totalWorkouts,
          completionRate,
          avgWeeklyCompleted,
          avgMonthlyCompleted
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
    console.error('Erro ao obter dashboard:', error);
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

// Marcar treino como concluído ou não
router.put("/logs/:logId/status", async (req, res) => {
  try {
    const clientId = req.user._id;
    const { logId } = req.params;
    const { isCompleted, nonCompletionReason, nonCompletionNotes } = req.body;

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(logId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do log de treino inválido'
      });
    }

    // Validar se isCompleted foi fornecido
    if (typeof isCompleted !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Campo isCompleted é obrigatório e deve ser um booleano'
      });
    }

    // Buscar o workout log
    const workoutLog = await WorkoutLog.findById(logId)
      .populate('workoutPlan');

    if (!workoutLog) {
      return res.status(404).json({
        success: false,
        message: 'Log de treino não encontrado'
      });
    }

    // Verificar se o log pertence ao cliente
    if (workoutLog.client.toString() !== clientId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para atualizar este log de treino'
      });
    }

    // Guardar estado anterior
    const wasCompleted = workoutLog.isCompleted;
    const plan = workoutLog.workoutPlan;

    // Validar se motivo foi fornecido quando não completou
    if (!isCompleted && !nonCompletionReason) {
      return res.status(400).json({
        success: false,
        message: 'Motivo de não cumprimento é obrigatório quando o treino não foi completado'
      });
    }

    // Validar se notas foram fornecidas quando motivo é "outros"
    if (!isCompleted && nonCompletionReason === 'outros' && !nonCompletionNotes) {
      return res.status(400).json({
        success: false,
        message: 'Notas sobre não cumprimento são obrigatórias quando o motivo é "outros"'
      });
    }

    // Atualizar o log
    workoutLog.isCompleted = isCompleted;
    workoutLog.nonCompletionReason = !isCompleted ? nonCompletionReason : undefined;
    workoutLog.nonCompletionNotes = !isCompleted && nonCompletionReason === 'outros' ? nonCompletionNotes : undefined;
    
    // Se estava marcado como não completado e agora está completado, atualizar a data
    if (isCompleted && !wasCompleted) {
      workoutLog.completedAt = new Date();
    }

    await workoutLog.save();

    // Atualizar estatísticas do plano se mudou de não completado para completado
    if (isCompleted && !wasCompleted && plan) {
      try {
        await plan.markSessionCompleted(workoutLog.session, workoutLog.week);
      } catch (planError) {
        console.error('Erro ao atualizar estatísticas do plano:', planError);
        // Não falhar o request se a atualização do plano falhar
      }
    }

    // Criar notificação se mudou de completado para não completado
    if (!isCompleted && wasCompleted && plan && plan.trainer) {
      try {
        const client = await User.findById(clientId);
        const clientName = client ? `${client.firstName} ${client.lastName}` : 'Cliente';
        
        await Notification.createWorkoutMissedNotification(
          plan.trainer,
          clientId,
          workoutLog._id,
          plan._id,
          clientName,
          nonCompletionReason || 'não especificado',
          workoutLog.completedAt
        );

        // Emitir notificação em tempo real via Socket.IO
        try {
          const io = req.app.get('io');
          io.to(`user:${plan.trainer}`).emit('workout_missed', {
            type: 'workout_missed',
            title: 'Treino não cumprido',
            message: `${clientName} marcou um treino como não cumprido`,
            clientId: clientId,
            clientName: clientName,
            date: workoutLog.completedAt,
            reason: nonCompletionReason,
            createdAt: new Date()
          });
        } catch (socketError) {
          console.error('Erro ao emitir notificação via Socket:', socketError);
        }
      } catch (notifError) {
        console.error('Erro ao criar notificação:', notifError);
        // Não falhar o request se a notificação falhar
      }
    }

    res.json({
      success: true,
      message: isCompleted ? 'Treino marcado como concluído' : 'Treino marcado como não concluído',
      data: {
        workoutLog: {
          _id: workoutLog._id,
          isCompleted: workoutLog.isCompleted,
          nonCompletionReason: workoutLog.nonCompletionReason,
          nonCompletionNotes: workoutLog.nonCompletionNotes,
          completedAt: workoutLog.completedAt
        }
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar status do treino:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obter estatísticas do cliente
router.get("/stats", async (req, res) => {
  try {
    const clientId = req.user._id;

    const [
      totalPlans,
      activePlans,
      totalWorkouts,
      completedWorkouts,
      avgDuration,
      streak
    ] = await Promise.all([
      WorkoutPlan.countDocuments({ client: clientId }),
      WorkoutPlan.countDocuments({ client: clientId, isActive: true }),
      WorkoutLog.countDocuments({ client: clientId }),
      WorkoutLog.countDocuments({ client: clientId, isCompleted: true }),
      WorkoutLog.aggregate([
        { $match: { client: clientId, actualDuration: { $exists: true } } },
        { $group: { _id: null, avgDuration: { $avg: '$actualDuration' } } }
      ]),
      WorkoutLog.aggregate([
        { $match: { client: clientId, isCompleted: true } },
        { $sort: { completedAt: -1 } },
        { $group: { _id: null, lastWorkout: { $first: '$completedAt' } } }
      ])
    ]);

    res.json({
      success: true,
      message: 'Estatísticas obtidas com sucesso',
      data: {
        totalPlans,
        activePlans,
        totalWorkouts,
        completedWorkouts,
        completionRate: totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0,
        avgDuration: avgDuration[0]?.avgDuration || 0,
        lastWorkout: streak[0]?.lastWorkout || null
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

export default router;
