import { PAT, ORG_URL } from "../config/env.js";

/**
 * Helper function to make authenticated REST API calls to Azure DevOps
 */
export async function makeAzureDevOpsRequest(
  url: string,
  method = "GET",
  body?: any,
  extraHeaders?: Record<string, string>
) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(`PAT:${PAT}`).toString("base64")}`,
    ...extraHeaders,
  };

  try {
    console.error(`[API] Making request to: ${url}`);
    console.error(`[API] Method: ${method}`);
    if (body) console.error(`[API] Body:`, JSON.stringify(body, null, 2));
    if (extraHeaders) console.error(`[API] Extra headers:`, extraHeaders);

    const requestBody = body ? JSON.stringify(body) : undefined;
    console.error(`[API] Request body:`, requestBody);

    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });

    console.error(`[API] Response status:`, response.status);
    console.error(
      `[API] Response headers:`,
      Object.fromEntries(response.headers.entries())
    );

    const responseText = await response.text();
    console.error(`[API] Response body:`, responseText);

    if (!response.ok) {
      throw new Error(
        `API request failed (${response.status}): ${responseText}`
      );
    }

    if (responseText) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          // If content type is JSON, parse it
          return JSON.parse(responseText);
        } catch (parseError) {
          console.error(`[API] Failed to parse JSON response despite content-type:`, parseError);
          throw new Error(`API response indicated JSON but failed to parse: ${responseText.substring(0, 100)}...`);
        }
      } else {
        // Otherwise, return the raw text content
        return responseText;
      }
    }
    // Return null if response body is empty
    return null;
  } catch (error) {
    console.error(`[API] Request failed:`, error);
    throw error;
  }
}
