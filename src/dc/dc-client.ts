import unfetch from "isomorphic-unfetch";
const fetch = require("fetch-retry")(unfetch, {
  retryOn: [429, 500, 501, 502, 503, 504],
  retries: 3,
  retryDelay: (attempt) => Math.pow(2, attempt) * 1000 * (Math.random() + 0.5),
});

import {
  AxiosHttpClient,
  ContentItem,
  ContentType,
  Folder,
  Oauth2AuthHeaderProvider,
} from "dc-management-sdk-js";
import { AuthHeaderProvider } from "dc-management-sdk-js/build/main/lib/auth/AuthHeaderProvider";

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
}

export interface DCClientCredentials {
  clientId: string;
  clientSecret: string;
}

export interface DCClientOptions {
  authUrl?: string;
}

export class DCClient {
  private clientId: string;
  private clientSecret: string;
  private authHeaderProvider: AuthHeaderProvider;

  constructor(
    { clientId, clientSecret }: DCClientCredentials,
    { authUrl }: DCClientOptions,
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;

    const axiosClient = new AxiosHttpClient({});
    this.authHeaderProvider = new Oauth2AuthHeaderProvider(
      { client_id: this.clientId, client_secret: this.clientSecret },
      { ...(authUrl ? { authUrl } : {}) },
      axiosClient,
    );
  }

  async getEffectiveContentType(contentType: ContentType) {
    const effectiveContentTypeLink = (contentType._links as any)[
      "effective-content-type"
    ];

    if (!effectiveContentTypeLink) {
      throw new Error(
        "Unable to get effective content type - link not available.",
      );
    }

    const response = await this.fetch(
      effectiveContentTypeLink.href,
      HttpMethod.GET,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to get effective content type with status code ${response.status}: ${effectiveContentTypeLink.href}`,
      );
    }

    return response.json();
  }

  async publish(item: ContentItem): Promise<void> {
    const publishLink = (item._links as any)["publish"];

    if (!publishLink) {
      throw new Error("Cannot publish the item - link not available.");
    }

    const response = await this.fetch(publishLink.href, HttpMethod.POST);

    if (!response.ok) {
      throw new Error(
        `Publish failed with status code ${response.status}: ${publishLink.href}`,
      );
    }
  }

  async unpublish(item: ContentItem): Promise<void> {
    const unpublishLink = (item._links as any)["unpublish"];

    if (!unpublishLink) {
      throw new Error("Cannot unpublish the item - link not available.");
    }

    const response = await this.fetch(unpublishLink.href, HttpMethod.POST);

    if (!response.ok) {
      throw new Error(
        `Unpublish failed with status code ${response.status}: ${unpublishLink.href}`,
      );
    }
  }

  async deleteFolder(folder: Folder): Promise<void> {
    const deleteFolderLink = (folder._links as any)["delete-folder"];

    if (!deleteFolderLink) {
      throw new Error("Cannot delete the folder - link not available.");
    }

    const response = await this.fetch(deleteFolderLink.href, HttpMethod.DELETE);

    if (!response.ok) {
      throw new Error(
        `Delete folder failed with status code ${response.status}: ${deleteFolderLink.href}`,
      );
    }
  }

  private async fetch(href: string, method: string): Promise<Response> {
    const authHeader = await this.authHeaderProvider.getAuthHeader();
    return await fetch(href, {
      method: method,
      headers: {
        Authorization: authHeader,
      },
    });
  }
}
