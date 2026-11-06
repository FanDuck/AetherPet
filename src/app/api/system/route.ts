import { NextResponse } from 'next/server';
import os from 'os';

export const runtime = 'nodejs';

function getCpuAverage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }
  return { idle: totalIdle / cpus.length, total: totalTick / cpus.length };
}

export async function GET() {
  const start = getCpuAverage();
  await new Promise((r) => setTimeout(r, 120));
  const end = getCpuAverage();

  const idleDiff = end.idle - start.idle;
  const totalDiff = end.total - start.total;
  const cpuUsage =
    totalDiff > 0 ? Math.min(100, Math.max(1, Math.round((1 - idleDiff / totalDiff) * 100))) : 12;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = Math.round((usedMem / totalMem) * 100);
  const memUsedGB = Number((usedMem / 1024 / 1024 / 1024).toFixed(1));
  const memTotalGB = Number((totalMem / 1024 / 1024 / 1024).toFixed(1));
  const uptimeHours = Number((os.uptime() / 3600).toFixed(1));

  return NextResponse.json({
    cpuUsage,
    memUsagePercent,
    memUsedGB,
    memTotalGB,
    uptimeHours,
  });
}
