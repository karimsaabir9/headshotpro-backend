import { IUser, User } from "@/util/User.model";
import { registerInput } from "@/validators/auth.validator";
import { passwordService } from "./password.service";
import { verificationService } from "./verfication.service";
import { ConflictError } from "@/util/errors";

export class AuthService {
  //register user

  async registerUser(input: registerInput): Promise<{ user: IUser }> {
    //TODO: implement user registeration logic

    //normalize email to lowercase
    const normalizedEmail = this.normalizeEmail(input.email);

    //check if user exists
    await this.checkUSerExists(normalizedEmail);

    //hash password
    const hashedPassword = await passwordService.hashPassword(input.password);

    // generate verfication token
    const verificationToken = verificationService.generateToken();
    const verificationTokenExpires =
      verificationService.generateExpirationDate();

    // Create user

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      name: input.name,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationTokenExpires,
      isEmailVerified: false,
    });

    return {
      user,
    };
  }

  private async checkUSerExists(email: string): Promise<void> {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new ConflictError(
        `User already exists with this email address ${email}`,
      );
    }
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
}

export const authService = new AuthService();
