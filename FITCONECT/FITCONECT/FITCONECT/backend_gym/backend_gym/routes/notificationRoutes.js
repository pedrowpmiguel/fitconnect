import express from "express";
import Notification from "../models/Notification.js";
import { validationResult } from "express-validator";

const router = express.Router();

// Obter notificações do trainer
router.get("/", async (req, res) => {
  try {
    const trainerId = req.user._id;
    const { unreadOnly = 'false', limit = 50, page = 1 } = req.query;
    
    const filters = { recipient: trainerId };
    
    if (unreadOnly === 'true') {
      filters.isRead = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filters)
        .populate('relatedData.client', 'firstName lastName username')
        .populate('relatedData.workoutPlan', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Notification.countDocuments(filters),
      Notification.countDocuments({ recipient: trainerId, isRead: false })
    ]);

    res.json({
      success: true,
      message: 'Notificações obtidas com sucesso',
      data: {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalNotifications: total,
          unreadCount,
          hasNext: skip + notifications.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter notificações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obter contagem de notificações não lidas
router.get("/unread-count", async (req, res) => {
  try {
    const trainerId = req.user._id;

    const unreadCount = await Notification.countDocuments({
      recipient: trainerId,
      isRead: false
    });

    res.json({
      success: true,
      message: 'Contagem de notificações não lidas obtida com sucesso',
      data: {
        unreadCount
      }
    });

  } catch (error) {
    console.error('Erro ao obter contagem de notificações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Marcar notificação como lida
router.put("/:id/read", async (req, res) => {
  try {
    const trainerId = req.user._id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      recipient: trainerId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificação não encontrada'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notificação marcada como lida',
      data: { notification }
    });

  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Marcar todas as notificações como lidas
router.put("/read-all", async (req, res) => {
  try {
    const trainerId = req.user._id;

    const result = await Notification.updateMany(
      { recipient: trainerId, isRead: false },
      { 
        $set: { 
          isRead: true, 
          readAt: new Date() 
        } 
      }
    );

    res.json({
      success: true,
      message: 'Todas as notificações foram marcadas como lidas',
      data: {
        updatedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obter notificação específica
router.get("/:id", async (req, res) => {
  try {
    const trainerId = req.user._id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      recipient: trainerId
    })
      .populate('relatedData.client', 'firstName lastName username email')
      .populate('relatedData.workoutPlan', 'name')
      .populate('relatedData.workoutLog', 'isCompleted nonCompletionReason completedAt');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificação não encontrada'
      });
    }

    // Marcar como lida ao abrir
    if (!notification.isRead) {
      await notification.markAsRead();
    }

    res.json({
      success: true,
      message: 'Notificação obtida com sucesso',
      data: { notification }
    });

  } catch (error) {
    console.error('Erro ao obter notificação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Deletar notificação
router.delete("/:id", async (req, res) => {
  try {
    const trainerId = req.user._id;
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: trainerId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificação não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Notificação deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar notificação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

