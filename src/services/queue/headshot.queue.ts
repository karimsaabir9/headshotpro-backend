import { logger } from "@/util/logger";
import { HEADSHOT_STYLES, headshotService, HeadshotStyle } from "../headshot/hadshot.service";
import { inngestClient } from "./inngest-clients";
import { Headshot } from "@/models";
import { AppError } from "@/util/errors";
import { s3Service } from "../s3";

export interface GenerateHeadshotEventData {
  headshotId: string;
  userId: string;
  originalPhotoUrl: string;
  styles: HeadshotStyle[];
  prompt?: string;
}

export const createGenerateHeadshotFunction = () => {
  return inngestClient.createFunction(
    {
      id: "generate-headshot",
      name: "Generate Headshot",
      retries: 3,
      triggers: [{ event: "headshot/generate" }],
    },
    async ({ event, step }: { event: any; step: any }) => {
      // log the event data for debugging

      logger.info(
        `Generating headshot for headshot ${event.data.headshotId} with ${
          event.data.styles.length
        } styles and ${
          event.data.prompt ? "custom prompt" : "no custom prompt"
        }`,
        event.data
      );

      const { headshotId, userId, originalPhotoUrl, styles, prompt } =
        event.data as GenerateHeadshotEventData;

        logger.info(`Headshot data: ${JSON.stringify(event.data, null, 2)}`);


      try {
        // step 1 : update the headshot document to processing

        await step.run("update-headshot-processing", async () => {
          await Headshot.findByIdAndUpdate(headshotId, {
            status: "processing",
            processingStartedAt: new Date(),
          });
          logger.info(
            `Updated headshot document to processing for headshot ${headshotId}`
          );
        });

        // step 2: generate the headshot for each style

        const generatedHeadshots = await step.run(
          "generate-headshots",
          async () => {
            // validate the styles

            if (!Array.isArray(styles)) {
              throw new AppError("Styles must be an array", 400);
            }

            const stylesArray = styles as HeadshotStyle[];

        

            if (stylesArray.length === 0 && !prompt?.trim()) {
              throw new AppError(
                "At least one style or custom prompt is required",
                400
              );
            }

            const styleToProcess = stylesArray.length > 0 ? stylesArray : [HEADSHOT_STYLES.professional.key];

            logger.info(
              `Processing ${stylesArray.length} styles and ${
                prompt ? "custom prompt" : "no custom prompt"
              }`
            );

            const results = await Promise.all(
              styleToProcess.map(async (style) => {
                try {
                  logger.info(`Processing style ${style}`);

                  // 1) Generate the headshot (OpenAI returns a base64 data URL)
                  const result = await headshotService.generateHeadshot({
                    imageUrl: originalPhotoUrl,
                    style,
                    prompt,
                  });

                  // 2) Upload to storage right away. The generated image is a
                  //    large base64 data URL; uploading here means only the small
                  //    storage URL travels between Inngest steps (avoids the
                  //    "request entity too large" 413 on the step callback).
                  const imageBuffer = await s3Service.downloadFromUrl(
                    result.imageUrl
                  );
                  const uploadResult = await s3Service.uploadGeneratedHeadshot(
                    userId,
                    imageBuffer,
                    style,
                    "image/png"
                  );

                  logger.info(
                    `Generated and uploaded headshot for style ${style}`,
                    { url: uploadResult.url }
                  );

                  return {
                    style,
                    status: "succeeded",
                    url: uploadResult.url,
                    key: uploadResult.key,
                  };
                } catch (error) {
                  logger.error(
                    `❌ Failed to generate ${style} headshot:`,
                    error
                  );
                  return {
                    style,
                    status: "failed",
                    error:
                      error instanceof Error ? error.message : "Unknown error",
                  };
                }
              })
            );

            logger.info(`Generated ${results.length} headshots`, results);

            return results;
          }
        );

        // step 3: Upload generated headshots to s3 cloud

        // Step 3: collect the uploaded headshots. The upload already happened
        // in step 2 (to keep step outputs small), so here we just gather the
        // successful results into the final shape.
        const uploadedHeadshots = await step.run("upload-to-s3", async () => {
          const successfulHeadshots = generatedHeadshots.filter(
            (h: any) => h.status === "succeeded"
          ) as Array<{
            style: string;
            status: "succeeded";
            url: string;
            key: string;
          }>;

          const uploads = successfulHeadshots.map((headshot) => ({
            style: headshot.style,
            url: headshot.url,
            key: headshot.key,
          }));

          logger.info(`Uploaded ${uploads.length} headshots to storage`);
          return uploads;
        });

        // step 4: update the headshot document with the uploaded headshots

        await step.run("update-status-completed", async () => {


          // generate signed urls for the uploaded headshots
          logger.info(`Generating signed urls for the uploaded headshots`, uploadedHeadshots);

          if (uploadedHeadshots.length === 0) {
            const failedStyles = generatedHeadshots
              .filter((h: any) => h.status === "failed")
              .map((h: any) => {
                const failed = h as {
                  style: string;
                  status: "failed";
                  error: string;
                };
                return {
                  style: failed.style,
                  error: failed.error || "Unknown error",
                };
              });
            
              await Headshot.findByIdAndUpdate(headshotId, {
                status: "failed",
                failureReason: `All headshot generations failed. Errors: ${failedStyles.map((f: any) => `${f.style}: ${f.error}`).join(", ")}`,
                processingCompletedAt: new Date(),
              });
              logger.info(
                `Updated headshot document to failed for headshot ${headshotId} with failure reason: ${`All headshot generations failed. Errors: ${failedStyles.map((f: any) => `${f.style}: ${f.error}`).join(", ")}`}`
              );
              throw new AppError(
                `All headshot generations failed. Errors: ${failedStyles.map((f: any) => `${f.style}: ${f.error}`).join(", ")}`,
                500
              );          
          }

          await Headshot.findByIdAndUpdate(headshotId, {
            status: "completed",
            generatedHeadshots: uploadedHeadshots.map((h: any) => ({
              style: h.style,
              url: h.url,
              key: h.key,
              createdAt: new Date(),
            })),
            processingCompletedAt: new Date(),
          });

          logger.info(
            `Updated headshot document to completed for headshot ${headshotId} with ${uploadedHeadshots.length} generated headshots`
          );
        });

        return {
          success: true,
          headshotId,
          generatedCount: uploadedHeadshots.length,
        };
      } catch (error) {
        logger.error(`Failed to generate headshot ${headshotId}:`, error);

        // Update status to failed
        await step.run("update-status-failed", async () => {
          await Headshot.findByIdAndUpdate(headshotId, {
            status: "failed",
            failureReason:
              error instanceof Error ? error.message : "Unknown error",
            processingCompletedAt: new Date(),
          });
        });

        throw new AppError(
          "Failed to generate headshot",
          500,
          "FAILED_TO_GENERATE_HEADSHOT"
        );
      }
    }
  );
};