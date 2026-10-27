import { IUser, User, UserRole } from "@/models/User.model";
import { registerInput } from "@/validators/auth.validator";
import { passwordService } from "./password.service";
import { verificationService } from "./verification.service";
import {
  ConflictError,
  ExternalServiceError,
  UnAuthorizedError,
  ValidationError,
} from "@/util/errors";
import { emailService } from "../notification/email.service";
import { logger } from "@/util/logger";
import { TokenPayload, tokenService } from "./token.service";

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
      role: UserRole.USER,
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
    // Find user with verification token

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

    // Check if already verified

    if (user.isEmailVerified) {
      throw new ConflictError("Email already verified");
    }

    // Verify email

    user.isEmailVerified = true;
    user.emailVerificationExpires = undefined;
    user.emailVerificationToken = undefined;

    await user.save();
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new ValidationError("User not found");
    }

    if (user.isEmailVerified) {
      throw new ConflictError("Email already verified");
    }

    //generate new verification token
    const verificationToken = verificationService.generateToken();
    const verificationTokenExpires =
      verificationService.generateExpirationDate();

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationTokenExpires;

    await user.save();

    await emailService.sendVerificationEmail(
      normalizedEmail,
      user.name,
      verificationToken,
    );
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    // normalize email to lowercase
    const normalizedEmail = this.normalizeEmail(email);
    //find user by email
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password",
    );

    if (!user) {
      throw new UnAuthorizedError("Invalid email or password");
    }
    // is Active
    if (!user.isActive) {
      throw new UnAuthorizedError(
        "Your account has been deactivated. Please contact support",
      );
    }

    // is Email Verified
    if (!user.isEmailVerified) {
      throw new UnAuthorizedError("Please verify your email to login");
    }

    // compare password

    const isPasswordValid = await passwordService.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnAuthorizedError("Invalid email or password");
    }

    // generate access token
    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: normalizedEmail,
      role: user.role,
    };

    const { accessToken, refreshToken } =
      tokenService.generateTokenPair(tokenPayload);

    user.refreshToken = refreshToken;

    await user.save();

    return {
      user,
      accessToken,
      refreshToken,
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
