import { NextRequest, NextResponse } from 'next/server';
import { runAllJobs } from '@/lib/jobs';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const providedSecret = request.headers.get('x-cron-secret');
  if (!providedSecret || providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runAllJobs();
    return NextResponse.json({
      success: result.success,
      stats: result.stats,
      error: result.error,
    });
  } catch (error) {
    console.error('Job execution error:', error);
    return NextResponse.json(
      { error: 'Job execution failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
