// Placeholder notification functions — wired up in Spec 2

/* eslint-disable @typescript-eslint/no-unused-vars */

export function notifyAdmin(event: string, userId: string) {
  console.log(`[NOTIFICATION PLACEHOLDER] Admin notified: ${event} for user ${userId}`);
}

export function notifyBroker(event: string, dealId: string, engagementId?: string) {
  console.log(`[NOTIFICATION PLACEHOLDER] Broker notified: ${event} for deal ${dealId}`);
}

export function notifyBuyer(event: string, dealId: string, buyerUserId: string) {
  console.log(`[NOTIFICATION PLACEHOLDER] Buyer notified: ${event} for deal ${dealId}, buyer ${buyerUserId}`);
}

export function notifyBuyers(event: string, dealId: string) {
  console.log(`[NOTIFICATION PLACEHOLDER] All buyers notified: ${event} for deal ${dealId}`);
}
