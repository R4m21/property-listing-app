export type Role = "agent" | "seeker";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
