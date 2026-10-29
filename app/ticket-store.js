'use strict';

const TABLE_SERVICE_VERSION = '2019-02-02';
const PARTITION_KEY = 'tickets';

function createMemoryTicketStore() {
  const tickets = [];

  return {
    async list() {
      return [...tickets];
    },

    async create(ticket) {
      tickets.push(ticket);
    }
  };
}

class AzureTableTicketStore {
  constructor({
    endpoint,
    tableName = 'tickets',
    identityEndpoint = process.env.IDENTITY_ENDPOINT,
    identityHeader = process.env.IDENTITY_HEADER,
    clientId = process.env.AZURE_CLIENT_ID
  }) {
    if (!endpoint || !tableName || !identityEndpoint || !identityHeader) {
      throw new Error('azure_table_configuration_missing');
    }

    if (!/^https:\/\//i.test(endpoint)) {
      throw new Error('azure_table_endpoint_must_use_https');
    }

    if (!/^[A-Za-z][A-Za-z0-9]{2,62}$/.test(tableName)) {
      throw new Error('azure_table_name_invalid');
    }

    this.endpoint = endpoint.replace(/\/+$/, '');
    this.tableName = tableName;
    this.identityEndpoint = identityEndpoint;
    this.identityHeader = identityHeader;
    this.clientId = clientId;
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.tableReady = null;
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 120_000) {
      return this.accessToken;
    }

    const tokenUrl = new URL(this.identityEndpoint);
    tokenUrl.searchParams.set('api-version', '2019-08-01');
    tokenUrl.searchParams.set('resource', 'https://storage.azure.com/');

    if (this.clientId) {
      tokenUrl.searchParams.set('client_id', this.clientId);
    }

    const response = await fetch(tokenUrl, {
      headers: { 'X-IDENTITY-HEADER': this.identityHeader }
    });

    if (!response.ok) {
      throw new Error(`managed_identity_token_failed_${response.status}`);
    }

    const token = await response.json();
    this.accessToken = token.access_token;
    this.tokenExpiresAt =
      Number(token.expires_on) * 1000 || Date.now() + Number(token.expires_in || 3600) * 1000;

    return this.accessToken;
  }

  async request(url, { method = 'GET', body } = {}) {
    const token = await this.getAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json;odata=nometadata',
      'x-ms-version': TABLE_SERVICE_VERSION
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers.DataServiceVersion = '3.0;NetFx';
      headers.MaxDataServiceVersion = '3.0;NetFx';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`azure_table_request_failed_${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async ensureTable() {
    if (!this.tableReady) {
      const createUrl = `${this.endpoint}/Tables`;
      this.tableReady = this.request(createUrl, {
        method: 'POST',
        body: { TableName: this.tableName }
      }).catch(async (error) => {
        // Azure returns 409 when the table already exists. Verify with a query
        // so other errors, including authorization failures, still surface.
        if (!String(error.message).endsWith('_409')) {
          this.tableReady = null;
          throw error;
        }

        const queryUrl = new URL(`${this.endpoint}/${this.tableName}()`);
        queryUrl.searchParams.set('$top', '1');
        await this.request(queryUrl);
      });
    }

    return this.tableReady;
  }

  async list() {
    await this.ensureTable();

    const tickets = [];
    let nextPartitionKey;
    let nextRowKey;

    do {
      const url = new URL(`${this.endpoint}/${this.tableName}()`);
      url.searchParams.set('$filter', `PartitionKey eq '${PARTITION_KEY}'`);

      if (nextPartitionKey) {
        url.searchParams.set('NextPartitionKey', nextPartitionKey);
      }
      if (nextRowKey) {
        url.searchParams.set('NextRowKey', nextRowKey);
      }

      const token = await this.getAccessToken();
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json;odata=nometadata',
          'x-ms-version': TABLE_SERVICE_VERSION
        }
      });

      if (!response.ok) {
        throw new Error(`azure_table_request_failed_${response.status}`);
      }

      const page = await response.json();
      for (const entity of page.value || []) {
        tickets.push(JSON.parse(entity.TicketJson));
      }

      nextPartitionKey = response.headers.get(
        'x-ms-continuation-nextpartitionkey'
      );
      nextRowKey = response.headers.get('x-ms-continuation-nextrowkey');
    } while (nextPartitionKey || nextRowKey);

    return tickets;
  }

  async create(ticket) {
    await this.ensureTable();

    await this.request(`${this.endpoint}/${this.tableName}`, {
      method: 'POST',
      body: {
        PartitionKey: PARTITION_KEY,
        RowKey: ticket.id,
        TicketJson: JSON.stringify(ticket)
      }
    });
  }
}

module.exports = { AzureTableTicketStore, createMemoryTicketStore };
