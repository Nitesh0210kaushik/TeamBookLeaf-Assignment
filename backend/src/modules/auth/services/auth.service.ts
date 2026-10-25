import bcrypt from "bcryptjs";
import { ERROR_CODES, HTTP_STATUS } from "../../../constants/http";
import { ApiError } from "../../../utils/ApiError";
import { toSafeUserDto, type LoginResponseDto } from "../dtos/auth.dto";
import { userRepository } from "../repositories/user.repository";
import { signAccessToken } from "../utils/token";
import type { LoginInput } from "../validations/auth.validation";

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("timing-safe-dummy-password", 10);

export class AuthService {
  async login(input: LoginInput): Promise<LoginResponseDto> {
    const user = await userRepository.findByEmailWithPassword(input.email);
    const passwordMatches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !passwordMatches) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.INVALID_CREDENTIALS,
        "Incorrect email or password.",
      );
    }

    return {
      user: toSafeUserDto(user),
      accessToken: signAccessToken({ sub: String(user._id), role: user.role }),
    };
  }

  async getCurrentUser(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.unauthenticated("User account no longer exists.");
    }
    return toSafeUserDto(user);
  }
}

export const authService = new AuthService();
