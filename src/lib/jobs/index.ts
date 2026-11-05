import { runDailyJob } from './run-reminders';

export async function runAllJobs() {
  const results = await runDailyJob();
  return results;
}
