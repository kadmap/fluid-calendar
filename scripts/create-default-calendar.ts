import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createDefaultCalendar() {
  try {
    // Get the first user (since we know you have a user account)
    const user = await prisma.user.findFirst();

    if (!user) {
      console.error("No user found in the database");
      return;
    }

    console.log("Found user:", user.id);

    // Create a default calendar feed for the user
    const calendarFeed = await prisma.calendarFeed.create({
      data: {
        name: "My Calendar",
        type: "LOCAL",
        enabled: true,
        userId: user.id,
        color: "#3b82f6", // Default blue color
      },
    });

    console.log("Successfully created default calendar feed:", calendarFeed);
  } catch (error) {
    console.error("Error creating default calendar:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultCalendar();
