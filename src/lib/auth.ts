"use client";

export type Role = "ADMIN" | "SUPER_ADMIN" | "STAFF";
export type AccountStatus = "ACTIVE" | "INACTIVE";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
};

export type MockAccount = AuthUser & {
  password: string;
};

const SESSION_KEY = "open_mind_admin_session";

/**
 * Demo accounts intentionally keep role and status as explicit data fields.
 * Authentication never derives permissions from the email address.
 */
export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    id: "usr-admin-001",
    name: "Event Admin",
    email: "admin@openmind2026.id",
    password: "password123",
    role: "ADMIN",
    status: "ACTIVE",
  },
  {
    id: "usr-super-admin-001",
    name: "Super Admin",
    email: "superadmin@openmind2026.id",
    password: "password123",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
  },
  {
    id: "usr-inactive-001",
    name: "Inactive Admin",
    email: "inactive@openmind2026.id",
    password: "password123",
    role: "ADMIN",
    status: "INACTIVE",
  },
];

export function authenticate(email: string, password: string): MockAccount | null {
  const normalizedEmail = email.trim().toLowerCase();
  return (
    MOCK_ACCOUNTS.find(
      (account) => account.email.toLowerCase() === normalizedEmail && account.password === password
    ) ?? null
  );
}

export function toAuthUser(account: MockAccount): AuthUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    status: account.status,
  };
}

export function setSession(user: AuthUser): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
}

export function getSession(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const rawSession = localStorage.getItem(SESSION_KEY);
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as AuthUser;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("admin_auth");
    localStorage.removeItem("admin_email");
    localStorage.removeItem("admin_role");
  }
}

export function isRole(user: AuthUser | null, role: Role): boolean {
  return user?.role === role;
}
