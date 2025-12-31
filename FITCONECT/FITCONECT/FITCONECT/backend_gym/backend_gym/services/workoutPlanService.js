import WorkoutPlan from '../models/WorkoutPlan.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const MAX_SESSIONS_BY_FREQ = { '3x': 3, '4x': 4, '5x': 5 };

export async function createWorkoutPlan(data, creatorId) {
	// data should contain: name, client, trainer, frequency, sessions[], startDate, totalWeeks, ...
	if (!data.trainer || !data.client) throw new Error('Trainer and client são obrigatórios');

	const [trainer, client] = await Promise.all([
		User.findById(data.trainer),
		User.findById(data.client)
	]);

	if (!trainer || trainer.role !== 'trainer' || !trainer.isApproved) {
		throw new Error('Personal trainer deve estar aprovado para criar planos');
	}
	if (!client || client.role !== 'client') {
		throw new Error('Cliente inválido');
	}
	if (!client.assignedTrainer || client.assignedTrainer.toString() !== data.trainer.toString()) {
		throw new Error('Cliente não está atribuído a este personal trainer');
	}

	// validar máximo de sessões baseado na frequência
	const freq = data.frequency || '3x';
	const max = MAX_SESSIONS_BY_FREQ[freq] || 5;
	if (Array.isArray(data.sessions) && data.sessions.length > max) {
		throw new Error(`Máximo ${max} sessões para frequência ${freq}`);
	}

	// calcular totalSessionsPlanned
	const totalWeeks = data.totalWeeks || 4;
	const totalPlanned = (Array.isArray(data.sessions) ? data.sessions.length : 0) * totalWeeks;
	data.progress = data.progress || {};
	data.progress.totalSessionsPlanned = totalPlanned;
	data.progress.totalSessionsCompleted = 0;
	data.progress.completionRate = 0;

	const plan = new WorkoutPlan(data);
	await plan.save();
	return plan;
}

export async function markSessionCompleted(planId, sessionId, week) {
	if (!mongoose.Types.ObjectId.isValid(planId) || !mongoose.Types.ObjectId.isValid(sessionId)) {
		throw new Error('IDs inválidos');
	}
	const plan = await WorkoutPlan.findById(planId);
	if (!plan) throw new Error('Plano não encontrado');

	plan.progress.totalSessionsCompleted = (plan.progress.totalSessionsCompleted || 0) + 1;
	plan.lastCompletedSession = {
		session: sessionId,
		completedAt: new Date(),
		week: typeof week === 'number' ? week : plan.currentWeek
	};

	plan.calculateCompletionRate();
	await plan.save();
	return plan;
}

export async function getPlanStats(planId) {
	if (!mongoose.Types.ObjectId.isValid(planId)) throw new Error('ID inválido');
	const plan = await WorkoutPlan.findById(planId);
	if (!plan) throw new Error('Plano não encontrado');
	return {
		totalSessions: plan.progress.totalSessionsPlanned,
		completedSessions: plan.progress.totalSessionsCompleted,
		completionRate: plan.progress.completionRate,
		currentWeek: plan.currentWeek,
		totalWeeks: plan.totalWeeks,
		frequency: plan.frequency,
		isActive: plan.isActive
	};
}
