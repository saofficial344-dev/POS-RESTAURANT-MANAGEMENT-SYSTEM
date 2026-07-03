import cron from 'node-cron';
import {
  expireTrials,
  expirePastDue,
  suspendPastDue,
  sendRenewalReminders,
} from '../services/subscriptionService.js';
import logger from '../utils/logger.js';

export const startSubscriptionJobs = () => {
  // Every hour at :00 — expire trials whose trialEnd has passed
  cron.schedule('0 * * * *', async () => {
    try {
      const count = await expireTrials();
      if (count > 0) logger.info(`[Jobs] Expired ${count} overdue trial(s)`);
    } catch (err) {
      logger.error('[Jobs] expireTrials failed', { error: err.message });
    }
  });

  // Every 6 hours — move active subscriptions past their period end to past_due
  cron.schedule('0 */6 * * *', async () => {
    try {
      const count = await expirePastDue();
      if (count > 0) logger.info(`[Jobs] Marked ${count} subscription(s) as past_due`);
    } catch (err) {
      logger.error('[Jobs] expirePastDue failed', { error: err.message });
    }
  });

  // Daily at 02:00 — suspend subscriptions that have been past_due for 30+ days
  cron.schedule('0 2 * * *', async () => {
    try {
      const count = await suspendPastDue();
      if (count > 0) logger.info(`[Jobs] Suspended ${count} long-overdue subscription(s)`);
    } catch (err) {
      logger.error('[Jobs] suspendPastDue failed', { error: err.message });
    }
  });

  // Daily at 09:00 — send renewal reminders for subscriptions expiring within 7 days
  cron.schedule('0 9 * * *', async () => {
    try {
      const count = await sendRenewalReminders();
      if (count > 0) logger.info(`[Jobs] Sent ${count} renewal reminder(s)`);
    } catch (err) {
      logger.error('[Jobs] sendRenewalReminders failed', { error: err.message });
    }
  });

  logger.info('[Jobs] Subscription jobs started — trial expiry: hourly | past-due: every 6h | suspend: daily 02:00 | reminders: daily 09:00');
};
