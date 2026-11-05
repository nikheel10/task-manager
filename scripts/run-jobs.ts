import { runAllJobs } from '../src/lib/jobs';

async function main() {
  console.log('🔄 Running all jobs...');
  const result = await runAllJobs();

  console.log('📊 Job Results:');
  console.log(`  Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`  Alerts marked overdue: ${result.stats.alertsMarkedOverdue}`);
  console.log(`  Alert reminders sent: ${result.stats.remindersSent}`);
  console.log(`  Alert escalations sent: ${result.stats.escalationsSent}`);
  console.log(`  Tasks marked overdue: ${result.stats.tasksMarkedOverdue}`);
  console.log(`  Task reminders sent: ${result.stats.taskRemindersSent}`);
  console.log(`  Task escalations sent: ${result.stats.taskEscalationsSent}`);
  console.log(`  Recurrences generated: ${result.stats.recurrencesGenerated}`);

  if (result.error) {
    console.error(`  Error: ${result.error}`);
  }

  console.log('✅ All jobs complete.');
  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
