import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureSingleCalendar() {
  try {
    // Get the first user
    const user = await prisma.user.findFirst();

    if (!user) {
      console.error("No user found in the database");
      return;
    }

    // Get all calendar feeds for the user
    const feeds = await prisma.calendarFeed.findMany({
      where: { userId: user.id },
    });

    if (feeds.length === 0) {
      // Create a single default calendar if none exists
      const calendarFeed = await prisma.calendarFeed.create({
        data: {
          name: "My Calendar",
          type: "LOCAL",
          enabled: true,
          userId: user.id,
          color: "#3b82f6",
        },
      });
      console.log("Created new default calendar:", calendarFeed);
      return;
    }

    // Keep the first feed and delete others
    const [defaultFeed, ...otherFeeds] = feeds;

    if (otherFeeds.length > 0) {
      // Delete all other feeds
      await prisma.calendarFeed.deleteMany({
        where: {
          id: {
            in: otherFeeds.map((f) => f.id),
          },
        },
      });
      console.log(`Deleted ${otherFeeds.length} additional calendar feeds`);
    }

    // Update the name and type of the remaining feed
    const updatedFeed = await prisma.calendarFeed.update({
      where: { id: defaultFeed.id },
      data: {
        name: "My Calendar",
        type: "LOCAL",
        enabled: true,
      },
    });

    console.log("Using single calendar feed:", updatedFeed);
  } catch (error) {
    console.error("Error ensuring single calendar:", error);
  } finally {
    await prisma.$disconnect();
  }
}

ensureSingleCalendar();
