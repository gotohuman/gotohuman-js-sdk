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
   * Send the review request to the API
   */
  async sendRequest(): Promise<ReviewResponse> {
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
        millis: Date.now()
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`gotoHuman API request failed: ${error.message || response.statusText}`);
    }

    return response.json();
  }
}

// Main SDK class
export class GotoHuman {
  private readonly baseUrl: string = 'https://api.gotohuman.com';
  private apiKey: string;
  private fetchImpl: FetchLike;

  constructor(
    apiKey: string | undefined,
    config: GotoHumanConfig = {}
  ) {
    if (!apiKey) {
      throw new Error('Please pass an API key');
    }
    this.apiKey = apiKey;
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
}