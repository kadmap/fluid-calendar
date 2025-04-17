// import { prisma } from "@/lib/prisma";
// import { logger } from "@/lib/logger";

// const LOG_SOURCE = "Auth";

// Modified to avoid database queries for offline use
export async function getGoogleCredentials() {
  // Return empty credentials - this will disable Google Calendar integration
  return {
    clientId: "",
    clientSecret: "",
  };
}

// Modified to avoid database queries for offline use
export async function getOutlookCredentials() {
  // Return empty credentials - this will disable Outlook Calendar integration
  return {
    clientId: "",
    clientSecret: "",
    tenantId: "common",
  };
}
