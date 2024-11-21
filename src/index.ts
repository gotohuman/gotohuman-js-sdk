// Type for valid JSON values (excluding null/undefined)
export type JsonValue = 
  | string
  | number
  | boolean
  | { [key: string]: JsonValue }
  | JsonValue[];

export type FormFields = {
  [key: string]: JsonValue;
};

// Type for fetch-like function
type FetchLike = typeof fetch;

// SDK Configuration type
type GotoHumanConfig = {
  fetch?: FetchLike;
};

// API Response type
export type ReviewResponse = {
  reviewId: string;
  gthLink?: string;
};

export class Review {
  private fields: FormFields = {};
  private meta: FormFields = {};
  private assignTo?: string[];
  private assignToGroups?: string[];

  constructor(
    private readonly formId: string,
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly fetchImpl: FetchLike
  ) {}

  /**
   * Add a field value to the review
   */
  addFieldData(fieldName: string, value?: JsonValue): Review {
    if (value)
      this.fields[fieldName] = value;
    return this;
  }

  /**
   * Set multiple field values at once
   */
  setFieldsData(fields?: FormFields): Review {
    if (fields)
      this.fields = { ...this.fields, ...fields };
    return this;
  }

  /**
   * Clear all fields in the current review
   */
  clearFieldData(): Review {
    this.fields = {};
    return this;
  }

  /**
   * Add a field to the meta data
   */
  addMetaData(attribute: string, value?: JsonValue): Review {
    if (value)
      this.meta[attribute] = value;
    return this;
  }

  /**
   * Set multiple meta field values at once
   */
  setMetaData(fields?: FormFields): Review {
    if (fields)
      this.meta = { ...this.meta, ...fields };
    return this;
  }

  /**
   * Assign the review request to specific users
   */
  assignToUsers(userEmails: string[]): Review {
    if (userEmails.length > 0)
      this.assignTo = userEmails;
    return this;
  }

  /**
   * Assign the review request to specific user groups
   */
  assignToUserGroups(groupIds: string[]): Review {
    if (groupIds.length > 0)
      this.assignToGroups = groupIds;
    return this;
  }

  /**
   * Send the review request to the API
   */
  async sendRequest(): Promise<ReviewResponse> {
    const packageJson = require('../package.json');
    const version = packageJson.version;
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/requestReview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': `${this.apiKey}`,
        },
        body: JSON.stringify({
          formId: this.formId,
          fields: this.fields,
          meta: this.meta,
          ...(this.assignTo && {assignTo: this.assignTo}),
          ...(this.assignToGroups && {assignToGroups: this.assignToGroups}),
          millis: Date.now(),
          origin: "ts-sdk",
          originV: version,
        }),
      });

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(`${response.status}: ${errorMsg || response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      throw new Error(`gotoHuman API request failed: ${error}`);
    }
  }
}

// Main SDK class
export class GotoHuman {
  private baseUrl: string;
  private apiKey: string;
  private fetchImpl: FetchLike;

  constructor(
    apiKey?: string,
    config: GotoHumanConfig = {}
  ) {
    this.baseUrl = GotoHuman.getBaseUrlFromEnv() || 'https://api.gotohuman.com';
    const resolvedApiKey = apiKey || GotoHuman.getApiKeyFromEnv();
    if (!resolvedApiKey) {
      throw new Error('Please pass an API key either as a parameter or set the GOTOHUMAN_API_KEY environment variable.');
    }
    this.apiKey = resolvedApiKey;
    this.fetchImpl = config.fetch || globalThis.fetch;
  }

  /**
   * Initialize a new review with a form ID
   */
  createReview(formId: string | undefined): Review {
    if (!formId) {
      throw new Error('Please pass a form ID');
    }
    return new Review(formId, this.apiKey, this.baseUrl, this.fetchImpl);
  }

  /**
   * Retrieves the base URL from the environment variable.
   * @returns The base URL if set, otherwise undefined.
   */
  private static getBaseUrlFromEnv(): string | undefined {
    // Ensure this code runs only in Node.js environments
    if (typeof process !== 'undefined' && process.env && process.env.GOTOHUMAN_BASE_URL) {
      return process.env.GOTOHUMAN_BASE_URL;
    }
    return undefined;
  }

  /**
   * Retrieves the API key from the environment variable.
   * @returns The API key if set, otherwise undefined.
   */
  private static getApiKeyFromEnv(): string | undefined {
    // Ensure this code runs only in Node.js environments
    if (typeof process !== 'undefined' && process.env && process.env.GOTOHUMAN_API_KEY) {
      return process.env.GOTOHUMAN_API_KEY;
    }
    return undefined;
  }
}