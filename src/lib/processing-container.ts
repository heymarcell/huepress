import { Container, getContainer } from "@cloudflare/containers";
import { Bindings } from "../api/types";

/**
 * Processing Container class for resource-intensive tasks
 * - OG image generation
 * - PDF generation
 * - Future: AI colorization
 */
export class ProcessingContainer extends Container {
  // Port the container Express server listens on
  defaultPort = 4000;
  
  // Shutdown container after 10 minutes of inactivity
  sleepAfter = "10m";
}

/**
 * Call the processing container
 */
export async function callProcessingContainer(
  env: Bindings,
  path: string,
  body: Record<string, unknown>
): Promise<Response> {
  // Use a singleton container instance (no session routing needed)
  const container = getContainer(env.PROCESSING, "main");
  
  const response = await container.fetch(`http://container${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  
  return response;
}

/**
 * Generate OG image via container
 */
export async function generateOgImageViaContainer(
  env: Bindings,
  title: string,
  thumbnailBase64: string,
  thumbnailMimeType: string
): Promise<{ imageBase64: string; mimeType: string }> {
  const response = await callProcessingContainer(env, "/og-image", {
    title,
    thumbnailBase64,
    thumbnailMimeType,
  });
  
  if (!response.ok) {
    const error = await response.json() as { error: string };
    throw new Error(`Container OG generation failed: ${error.error}`);
  }
  
  return await response.json() as { imageBase64: string; mimeType: string };
}

export interface PdfMetadata {
  title?: string;
  assetId?: string;
  description?: string;
  qrCodeUrl?: string;
}

/**
 * Generate PDF via container
 */
export async function generatePdfViaContainer(
  env: Bindings,
  svgContent: string,
  filename: string,
  metadata?: PdfMetadata,
  asyncOptions?: { uploadUrl: string; uploadToken: string }
): Promise<{ pdfBase64?: string; mimeType: string; filename: string } | void> {
  const body: any = {
    svgContent,
    filename,
    metadata
  };

  if (asyncOptions) {
     body.uploadUrl = asyncOptions.uploadUrl;
     body.uploadToken = asyncOptions.uploadToken;
  }

  const response = await callProcessingContainer(env, "/pdf", body);

  if (response.status === 202) {
      // Async accepted
      return;
  }
  
  if (!response.ok) {
    const error = await response.json() as { error: string };
    throw new Error(`Container PDF generation failed: ${error.error}`);
  }
  
  return await response.json() as { pdfBase64: string; mimeType: string; filename: string };
}

/**
 * Generate WebP Thumbnail via container
 */
export async function generateThumbnailViaContainer(
  env: Bindings,
  svgContent: string,
  width: number = 1024
): Promise<{ imageBase64: string; mimeType: string }> {
  const response = await callProcessingContainer(env, "/thumbnail", {
    svgContent,
    width
  });
  
  if (!response.ok) {
    const error = await response.json() as { error: string };
    throw new Error(`Container Thumbnail generation failed: ${error.error}`);
  }
  
  return await response.json() as { imageBase64: string; mimeType: string };
}
