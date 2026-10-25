import type { Types } from "mongoose";
import type { UserRole } from "../../../constants/roles";
import { UserModel, type UserRecord } from "../models/user.model";

export class UserRepository {
  async findById(userId: string | Types.ObjectId) {
    return UserModel.findById(userId).lean<UserRecord>();
  }

  async findByEmailWithPassword(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() })
      .select("+passwordHash")
      .lean<UserRecord>();
  }

  async findByRole(role: UserRole) {
    return UserModel.find({ role }).sort({ name: 1 }).lean<UserRecord[]>();
  }

  async findByAuthorIds(authorIds: Types.ObjectId[]) {
    return UserModel.find({ author: { $in: authorIds } }).lean<UserRecord[]>();
  }

  async findByIds(userIds: Types.ObjectId[]) {
    return UserModel.find({ _id: { $in: userIds } }).lean<UserRecord[]>();
  }
}

export const userRepository = new UserRepository();
