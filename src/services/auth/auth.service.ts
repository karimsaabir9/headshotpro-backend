import { IUser, User } from "@/util/User.model";
import { registerInput } from "@/validators/auth.validator";
import { passwordService } from "./password.service";
import { verificationService } from "./verification.service";
import { ConflictError, ExternalServiceError, ValidationError } from "@/util/errors";
import { emailService } from "../notification/email.service";
import { logger } from "@/util/logger";

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

    // generate verification token
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

    // Send verification email

    try {
      await emailService.sendVerificationEmail(
        normalizedEmail,
        input.name,
        verificationToken,
      );
    } catch (error) {
      logger.error("Error sending verification email", error);
      throw new ExternalServiceError(
        "Email Service",
        "Failed to send verification email",
      );
    }

    return {
      user,
    };
  }

    // verify email

    async verifyEmail(token: string): Promise<void> {
      // Find user with verfictaion token
  
      console.log("verifctaion", token);
  
      const user = await User.findOne({
        emailVerificationToken: token,
      }).select("+emailVerificationToken +emailVerificationExpires");
  
      if (!user) {
        throw new ValidationError("Invalid verification token");
      }
      // Check if the token Expired
  
      if (
        !user.emailVerificationExpires ||
        new Date() > user.emailVerificationExpires
      ) {
        throw new ValidationError("Verification token has expired");
      }
  
      // Check if alredy verified
  
      if (user.isEmailVerified) {
        throw new ConflictError("Email alredy verified");
      }
  
      // Verify email
  
      user.isEmailVerified = true;
      user.emailVerificationExpires = undefined;
      user.emailVerificationToken = undefined;
  
      await user.save();
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
