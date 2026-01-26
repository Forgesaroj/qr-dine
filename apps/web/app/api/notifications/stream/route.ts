import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { notificationEvents } from "@/lib/notification-events";

// SSE endpoint for real-time notifications
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const subscriberId = `${session.userId}-${Date.now()}`;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "CONNECTED", message: "Real-time notifications connected" })}\n\n`
        )
      );

      // Subscribe to notification events
      notificationEvents.subscribe(
        subscriberId,
        session.restaurantId,
        session.role,
        controller
      );

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "HEARTBEAT", timestamp: new Date().toISOString() })}\n\n`
            )
          );
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        notificationEvents.unsubscribe(subscriberId);
      });
    },
    cancel() {
      notificationEvents.unsubscribe(subscriberId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
