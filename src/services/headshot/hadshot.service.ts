import { config } from "@/config";
import { AppError } from "@/util/errors";
import { logger } from "@/util/logger";
import OpenAI, { toFile } from "openai";

export const HEADSHOT_STYLES = {
  professional: {
    name: "Professional",
    description: "Clean, corporate headshot with neutral background",
    prompt:
      "professional corporate headshot, business attire, neutral background, studio lighting, high quality, sharp focus",
    key: "professional",
  },
  casual: {
    name: "Casual",
    description: "Relaxed, friendly headshot with soft lighting",
    prompt:
      "casual portrait, friendly smile, soft natural lighting, outdoor background, high quality",
    key: "casual",
  },
  creative: {
    name: "Creative",
    description: "Artistic headshot with creative elements",
    prompt:
      "creative artistic portrait, unique styling, colorful background, dramatic lighting, high quality",
    key: "creative",
  },
  executive: {
    name: "Executive",
    description: "High-end executive portrait",
    prompt:
      "executive portrait, formal attire, office background, professional lighting, high quality, confident pose",
    key: "executive",
  },
  linkedin: {
    name: "LinkedIn",
    description: "Perfect for LinkedIn profiles",
    key: "linkedin",
    prompt:
      "linkedin profile photo, professional appearance, clean background, natural smile, business professional",
  },
} as const;

export type HeadshotStyle = keyof typeof HEADSHOT_STYLES;

export interface GenerateHeadshotParams {
  imageUrl: string;
  style: HeadshotStyle;
  prompt?: string; // Optional custom prompt to override default style prompt
}

export interface GenerateHeadshotResult {
  imageUrl: string;
  style: HeadshotStyle;
}

export class HeadshotService {
  // OpenAI client (image generation) — created lazily so a missing API key
  // doesn't crash the app at startup (only when a headshot is generated).

  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      if (!config.openai.apiKey) {
        throw new AppError(
          "OpenAI API key is not configured",
          500,
          "OPENAI_NOT_CONFIGURED"
        );
      }
      this.client = new OpenAI({ apiKey: config.openai.apiKey });
    }
    return this.client;
  }

  getAvailableStyles = (): Array<{
    key: HeadshotStyle;
    name: string;
    description: string;
  }> => {
    return (Object.keys(HEADSHOT_STYLES) as HeadshotStyle[]).map((key) => ({
      key,
      name: HEADSHOT_STYLES[key].name,
      description: HEADSHOT_STYLES[key].description,
    }));
  };

  async generateHeadshot(
    params: GenerateHeadshotParams
  ): Promise<GenerateHeadshotResult> {
    try {
      const { imageUrl, style, prompt } = params;

      const styleConfig = HEADSHOT_STYLES[style];

      // use custom prompt if provided otherwise use style prompt

      const promptToUse = prompt?.trim() || styleConfig.prompt;

      logger.info(
        `Generating headshot for style ${style} with prompt ${prompt}`
      );

      const startTime = Date.now();

      // Fetch the original photo and turn it into a file for the edit request
      const inputResponse = await fetch(imageUrl);
      if (!inputResponse.ok) {
        throw new AppError(
          "Failed to fetch the original photo",
          400,
          "FAILED_TO_FETCH_PHOTO"
        );
      }
      const inputBuffer = Buffer.from(await inputResponse.arrayBuffer());
      const inputFile = await toFile(inputBuffer, "input.png", {
        type: "image/png",
      });

      logger.info(`Calling OpenAI image edit for style ${style}`);

      // call OpenAI image edit
      // Model: gpt-image-2 for higher-quality headshots (costs more than the
      // -mini variant). Drop back to "gpt-image-1-mini" to cut cost.
      const output = await this.getClient().images.edit({
        model: "gpt-image-2",
        image: inputFile,
        prompt: promptToUse,
        size: "1024x1024",
        quality: "low", // keep cost low; raise to "medium"/"high" for better quality
      });

      const generatedTime = Date.now() - startTime;
      logger.info(`OpenAI image generation completed in ${generatedTime}ms`);

      const b64 = output.data?.[0]?.b64_json;

      if (!b64) {
        throw new AppError("Failed to generate headshot", 500, "FAILED_TO_GENERATE_HEADSHOT");
      }

      // Return as a data URL; the storage layer converts it to a Buffer and uploads it.
      const generatedImageUrl = `data:image/png;base64,${b64}`;

      logger.info(`Generated headshot for style ${style}`);

      return {
        imageUrl: generatedImageUrl,
        style,
      };


    } catch (error : any) {
        const errorPrompt = params.prompt?.trim() || HEADSHOT_STYLES[params.style].prompt;
        logger.error('Failed to generate headshot with OpenAI:', {
          error: error?.message || error,
          errorCode: error?.code,
          errorType: error?.type,
          style: params.style,
          imageUrl: params.imageUrl,
          prompt: typeof errorPrompt === 'string' ? errorPrompt.substring(0, 100) : 'N/A',
        });

        throw new Error(`Failed to generate ${params.style} headshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
  }
}

export const headshotService = new HeadshotService();