import { NextResponse, NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "task-schedule-route";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    logger.info("Scheduling all tasks for user", { userId }, LOG_SOURCE);

    // Create or get auto-schedule settings
    await prisma.autoScheduleSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        workDays: JSON.stringify([1, 2, 3, 4, 5]), // Monday to Friday
        workHourStart: 9, // 9 AM
        workHourEnd: 17, // 5 PM
      },
    });

    // Use the common function to schedule all tasks
    const tasksWithRelations = await scheduleAllTasksForUser(userId);

    return NextResponse.json(tasksWithRelations);
  } catch (error) {
    logger.error(
      "Error scheduling tasks:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to schedule tasks" },
      { status: 500 }
    );
  }
}
