export type UserRole = "EMPLOYEE" | "MANAGER" | "ADMIN";

export interface User {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}
