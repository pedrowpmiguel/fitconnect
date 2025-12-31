import * as workoutPlanService from '../services/workoutPlanService.js';
import { getIo } from '../socket.js';


export async function createPlan(req, res, next) {
	try {
		// req.body contém os dados do plano; req.user.id é o criador (trainer)
		const plan = await workoutPlanService.createWorkoutPlan(req.body, req.user?.id);
		return res.status(201).json({ success: true, plan });
	} catch (err) {
		return next(err);
	}
}

export async function completeSession(req, res, next) {
  try {
    const plan = await workoutPlanService.markSessionCompleted(
      req.params.planId,
      req.body.sessionId,
      req.body.week
    );

    // Supondo que o service retorna se a sessão foi completada ou não
    const sessionCompleted = plan.sessions.find(s => s._id.toString() === req.body.sessionId).completed;

    if (!sessionCompleted) {
      // Emite evento para o trainer
      const trainerId = plan.trainer.toString(); // ou plan.createdBy
      const client = plan.client; // supõe que o plan tem o client populado

      const io = getIo();
      io.to(trainerId).emit('workout_missed', {
        clientId: client._id,
        clientName: `${client.firstName} ${client.lastName}`,
        reason: 'Não realizou o treino programado'
      });
    }

    return res.status(200).json({ success: true, plan });
  } catch (err) {
    return next(err);
  }
}

export async function getStats(req, res, next) {
	try {
		const stats = await workoutPlanService.getPlanStats(req.params.planId);
		return res.status(200).json({ success: true, stats });
	} catch (err) {
		return next(err);
	}
}
