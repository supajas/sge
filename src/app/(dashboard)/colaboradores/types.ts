import { type AppRole } from "@/lib/roles";

export type MembershipRow = {
  membershipId: string;
  userId: string;
  role: AppRole;
  name: string;
  email: string;
  avatar: string | null;
  lastSignIn: string | null;
  polos: { id: string; name: string }[];
  courses: { id: string; name: string }[];
};