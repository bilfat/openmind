import { OrderItem, initialOrders } from "@/data/orders";
export type { OrderItem };

const STORAGE_KEY = "open_mind_orders_2026";

export function getStoredOrders(): OrderItem[] {
  if (typeof window === "undefined") return initialOrders;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialOrders));
      return initialOrders;
    }
    return JSON.parse(raw);
  } catch {
    return initialOrders;
  }
}

export function saveNewOrder(order: OrderItem): void {
  if (typeof window === "undefined") return;
  const current = getStoredOrders();
  const existsIndex = current.findIndex((o) => o.orderId === order.orderId);
  let updated: OrderItem[];
  if (existsIndex >= 0) {
    updated = [...current];
    updated[existsIndex] = order;
  } else {
    updated = [order, ...current];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getOrderByOrderId(orderId: string): OrderItem | null {
  const orders = getStoredOrders();
  const cleanId = orderId.trim().toUpperCase();
  return orders.find((o) => o.orderId.toUpperCase() === cleanId) || null;
}

export function updateOrderStatus(
  orderId: string,
  status: "approved" | "rejected" | "pending",
  rejectReason?: string
): boolean {
  if (typeof window === "undefined") return false;
  const current = getStoredOrders();
  const index = current.findIndex(
    (o) => o.orderId.toUpperCase() === orderId.trim().toUpperCase()
  );
  if (index === -1) return false;

  current[index].paymentStatus = status;
  if (status === "rejected" && rejectReason) {
    current[index].rejectReason = rejectReason;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  return true;
}

export function markOrderCheckedIn(orderId: string): boolean {
  if (typeof window === "undefined") return false;
  const current = getStoredOrders();
  const index = current.findIndex(
    (o) => o.orderId.toUpperCase() === orderId.trim().toUpperCase()
  );
  if (index === -1) return false;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")} WIB`;

  current[index].checkedIn = true;
  current[index].checkedInAt = timeStr;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  return true;
}

export function generateNextOrderId(): string {
  const orders = getStoredOrders();
  const count = orders.length + 128;
  return `OM26-${String(count).padStart(5, "0")}`;
}
