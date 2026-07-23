import mongoose from 'mongoose';

const db = mongoose.connection;

export const users                = db.collection('users');
export const otps                 = db.collection('otps');
export const admins               = db.collection('admins');
export const loans                = db.collection('loans');
export const donations            = db.collection('donations');
export const attendance           = db.collection('attendance');
export const verifications        = db.collection('verifications');
export const pendingRegistrations = db.collection('pending_registrations');
export const announcements        = db.collection('announcements');
export const savingsGoals         = db.collection('savings_goals');
export const savingsTransactions = db.collection('savings_transactions');
export const loanPayments         = db.collection('loan_payments');
export const attendanceSessions   = db.collection('attendance_sessions');
export const prayers              = db.collection('prayers');
