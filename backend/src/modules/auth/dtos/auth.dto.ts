import type { UserRole } from "../../../constants/roles";
import type { UserRecord } from "../models/user.model";

export type SafeUserDto = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  authorId: string | null;
};

export type LoginResponseDto = {
  user: SafeUserDto;
  /** Also set as an httpOnly cookie; returned for API clients that prefer Bearer auth. */
  accessToken: string;
};

export function toSafeUserDto(user: UserRecord): SafeUserDto {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    authorId: user.author ? String(user.author) : null,
  };
}
