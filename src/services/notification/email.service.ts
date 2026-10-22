import { config } from "@/config";
import { ExternalServiceError } from "@/util/errors";
import { logger } from "@/util/logger";
import nodemailer, { type Transporter } from "nodemailer";
import path from "path";
import fs from "fs/promises";



export class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initializeTransport();
  }
  private initializeTransport(): void {
    if (config.email.user && config.email.password) {
      try {
        this.transporter = nodemailer.createTransport({
          host: config.email.host,
          port: config.email.port,
          secure: config.email.secure,
          auth: {
            user: config.email.user,
            pass: config.email.password,
          },
          debug: config.env === "development",
          logger: config.env === "development",
        });

        // verify connection

        this.transporter.verify((error, success) => {
          if (error) {
            logger.error("SMTP connection failed", {
              error: error.message,
              code: (error as any).code,
            });
          } else {
            logger.info("SMTP connection established");
          }
        });
      } catch (error) {
        logger.error("Error initializing SMTP transport", error);
      }
    } else {
      logger.warn("SMTP credentials are not configured", {
        hasUser: !!config.email.user,
        hasPassword: !!config.email.password,
      });
    }
  }

  //   Ensure transport is configured

  private ensureTransporter(): void {
    if (!this.transporter) {
      logger.warn(
        "Email transport not initialized, please check SMTP credentials",
      );
      throw new ExternalServiceError(
        "Email Service",
        "SMTP transport is not initialized",
      );
    }
  }

   //   Wrap email content in base layout

   private async wrapInLayout(content: string): Promise<string> {
    const layoutPath = path.join(
      process.cwd(),
      "src/templates/emails/layout/base.html"
    );
    const layout = await fs.readFile(layoutPath, "utf-8");
    return layout.replace("{{content}}", content);
  }


}
