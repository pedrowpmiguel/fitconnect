import User from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/passwordUtils.js';

/**
 * Find a user by name + validate password or QR password
 */
export async function findUser({ name, password, isQrCode }) {
	const user = await User.findOne({ name });
	if (!user) throw new Error("This data is wrong");

	// Login via QR code (password direto)
	if (isQrCode) {
		if (user.password !== password) throw new Error("User not valid");
		return user;
	}

	// Login normal com hashing
	const match = await comparePassword(password, user.password);
	if (!match) throw new Error("User not valid");

	return user;
}

/**
 * Request a trainer change for a client
 */
export async function requestTrainerChange(clientId, requestedTrainerId, reason) {
	const client = await User.findById(clientId);
	if (!client) throw new Error('Client not found');
	if (client.role !== 'client') throw new Error('User is not a client');

	client.trainerChangeRequest = {
		requestedTrainer: requestedTrainerId,
		reason: reason || '',
		status: 'pending',
		requestedAt: Date.now()
	};

	await client.save();
	return client;
}

/**
 * Process (approve/reject) a trainer change request
 */
export async function processTrainerChangeRequest(clientId, action, processorId) {
	const client = await User.findById(clientId);
	if (!client) throw new Error('Client not found');

	const req = client.trainerChangeRequest;
	if (!req || req.status !== 'pending') throw new Error('No pending request');

	if (action === 'approve') {
		client.assignedTrainer = req.requestedTrainer;
		req.status = 'approved';
	} else {
		req.status = 'rejected';
	}

	req.processedAt = Date.now();
	req.processedBy = processorId;

	await client.save();
	return client;
}

/**
 * Directly assign a trainer to a client (admin action)
 */
export async function assignTrainerToClient(clientId, trainerId, adminId) {
	const client = await User.findById(clientId);
	if (!client) throw new Error('Client not found');
	if (client.role !== 'client') throw new Error('User is not a client');

	client.assignedTrainer = trainerId;

	client.trainerChangeRequest = {
		status: 'approved',
		requestedTrainer: trainerId,
		requestedAt: client.trainerChangeRequest?.requestedAt || Date.now(),
		processedAt: Date.now(),
		processedBy: adminId
	};

	await client.save();
	return client;
}

/**
 * Approve a trainer account (admin action)
 */
export async function approveTrainer(trainerId, adminId) {
	const trainer = await User.findById(trainerId);
	if (!trainer) throw new Error('Trainer not found');
	if (trainer.role !== 'trainer') throw new Error('User is not a trainer');

	trainer.isApproved = true;
	trainer.approvedBy = adminId;
	trainer.approvedAt = Date.now();
	await trainer.save();
	return trainer;
}

