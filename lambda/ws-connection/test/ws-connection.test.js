import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';

const ddbMock = mockClient(DynamoDBClient);
const apiMock = mockClient(ApiGatewayManagementApiClient);

const TABLE = 'test-connections';
const ENDPOINT = 'https://fake.execute-api.eu-west-1.amazonaws.com/prod';
const CONNECTION_ID = 'conn-self';

const loadHandler = async () => {
  vi.resetModules();
  return (await import('../index.js')).handler;
};

const makeEvent = (routeKey, overrides = {}) => ({
  requestContext: {
    connectionId: overrides.connectionId ?? CONNECTION_ID,
    routeKey,
    authorizer: overrides.authorizer,
  },
  queryStringParameters: overrides.queryStringParameters,
});

describe('ws-connection handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    apiMock.reset();
    vi.stubEnv('CONNECTIONS_TABLE', TABLE);
    vi.stubEnv('WEBSOCKET_ENDPOINT', ENDPOINT);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('$connect', () => {
    it('writes a connection row with all fields and returns 200', async () => {
      ddbMock.on(PutItemCommand).resolves({});
      const now = 1_700_000_000_000;
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const handler = await loadHandler();
      const res = await handler(
        makeEvent('$connect', {
          authorizer: { userId: 'user-1', userName: 'alice' },
          queryStringParameters: { documentId: 'doc-42' },
        }),
      );

      expect(res).toEqual({ statusCode: 200 });
      expect(ddbMock).toHaveReceivedCommandWith(PutItemCommand, {
        TableName: TABLE,
        Item: {
          connectionId: { S: CONNECTION_ID },
          userId: { S: 'user-1' },
          userName: { S: 'alice' },
          documentId: { S: 'doc-42' },
          connectedAt: { N: String(now) },
          expiresAt: { N: String(Math.floor(now / 1000) + 3600) },
        },
      });

      vi.useRealTimers();
    });

    it('defaults userId to "anonymous" when authorizer is missing', async () => {
      ddbMock.on(PutItemCommand).resolves({});

      const handler = await loadHandler();
      await handler(makeEvent('$connect'));

      const item = ddbMock.commandCalls(PutItemCommand)[0].args[0].input.Item;
      expect(item.userId).toEqual({ S: 'anonymous' });
      expect(item.userName).toEqual({ S: 'anonymous' });
    });

    it('falls back userName to userId when only userId is provided', async () => {
      ddbMock.on(PutItemCommand).resolves({});

      const handler = await loadHandler();
      await handler(
        makeEvent('$connect', {
          authorizer: { userId: 'user-1' },
        }),
      );

      const item = ddbMock.commandCalls(PutItemCommand)[0].args[0].input.Item;
      expect(item.userId).toEqual({ S: 'user-1' });
      expect(item.userName).toEqual({ S: 'user-1' });
    });

    it('defaults documentId to "default" when queryStringParameters is missing', async () => {
      ddbMock.on(PutItemCommand).resolves({});

      const handler = await loadHandler();
      await handler(
        makeEvent('$connect', {
          authorizer: { userId: 'user-1', userName: 'alice' },
        }),
      );

      const item = ddbMock.commandCalls(PutItemCommand)[0].args[0].input.Item;
      expect(item.documentId).toEqual({ S: 'default' });
    });

    it('defaults documentId to "default" when documentId param is absent', async () => {
      ddbMock.on(PutItemCommand).resolves({});

      const handler = await loadHandler();
      await handler(
        makeEvent('$connect', {
          authorizer: { userId: 'user-1', userName: 'alice' },
          queryStringParameters: { other: 'value' },
        }),
      );

      const item = ddbMock.commandCalls(PutItemCommand)[0].args[0].input.Item;
      expect(item.documentId).toEqual({ S: 'default' });
    });

    it('does not query or post on $connect', async () => {
      ddbMock.on(PutItemCommand).resolves({});

      const handler = await loadHandler();
      await handler(makeEvent('$connect'));

      expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 0);
      expect(ddbMock).toHaveReceivedCommandTimes(DeleteItemCommand, 0);
      expect(apiMock).toHaveReceivedCommandTimes(PostToConnectionCommand, 0);
    });
  });

  describe('$disconnect', () => {
    it('queries peers, broadcasts leave to others, and deletes own row', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          { connectionId: { S: CONNECTION_ID } },
          { connectionId: { S: 'peer-1' } },
          { connectionId: { S: 'peer-2' } },
        ],
      });
      apiMock.on(PostToConnectionCommand).resolves({});
      ddbMock.on(DeleteItemCommand).resolves({});

      const handler = await loadHandler();
      const res = await handler(
        makeEvent('$disconnect', {
          authorizer: { userId: 'user-1', userName: 'alice' },
          queryStringParameters: { documentId: 'doc-42' },
        }),
      );

      expect(res).toEqual({ statusCode: 200 });
      expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, {
        TableName: TABLE,
        IndexName: 'DocumentIdIndex',
        KeyConditionExpression: 'documentId = :docId',
        ExpressionAttributeValues: { ':docId': { S: 'doc-42' } },
      });
      expect(apiMock).toHaveReceivedCommandTimes(PostToConnectionCommand, 2);
      const recipients = apiMock
        .commandCalls(PostToConnectionCommand)
        .map((c) => c.args[0].input.ConnectionId)
        .sort();
      expect(recipients).toEqual(['peer-1', 'peer-2']);

      const sent = JSON.parse(apiMock.commandCalls(PostToConnectionCommand)[0].args[0].input.Data);
      expect(sent).toEqual({ action: 'awareness', type: 'leave', userId: 'user-1' });

      expect(ddbMock).toHaveReceivedCommandWith(DeleteItemCommand, {
        TableName: TABLE,
        Key: { connectionId: { S: CONNECTION_ID } },
      });
    });

    it('uses documentId default "default" when query params are missing', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(DeleteItemCommand).resolves({});

      const handler = await loadHandler();
      await handler(
        makeEvent('$disconnect', {
          authorizer: { userId: 'user-1' },
        }),
      );

      expect(ddbMock).toHaveReceivedCommandWith(QueryCommand, {
        TableName: TABLE,
        IndexName: 'DocumentIdIndex',
        KeyConditionExpression: 'documentId = :docId',
        ExpressionAttributeValues: { ':docId': { S: 'default' } },
      });
    });

    it('broadcasts userId "anonymous" when authorizer is missing', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [{ connectionId: { S: 'peer-1' } }],
      });
      apiMock.on(PostToConnectionCommand).resolves({});
      ddbMock.on(DeleteItemCommand).resolves({});

      const handler = await loadHandler();
      await handler(makeEvent('$disconnect'));

      const sent = JSON.parse(apiMock.commandCalls(PostToConnectionCommand)[0].args[0].input.Data);
      expect(sent).toEqual({ action: 'awareness', type: 'leave', userId: 'anonymous' });
    });

    it('makes no post calls when query returns empty Items', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(DeleteItemCommand).resolves({});

      const handler = await loadHandler();
      const res = await handler(makeEvent('$disconnect'));

      expect(res).toEqual({ statusCode: 200 });
      expect(apiMock).toHaveReceivedCommandTimes(PostToConnectionCommand, 0);
      expect(ddbMock).toHaveReceivedCommandTimes(DeleteItemCommand, 1);
    });

    it('handles missing Items key from query response', async () => {
      ddbMock.on(QueryCommand).resolves({});
      ddbMock.on(DeleteItemCommand).resolves({});

      const handler = await loadHandler();
      const res = await handler(makeEvent('$disconnect'));

      expect(res).toEqual({ statusCode: 200 });
      expect(apiMock).toHaveReceivedCommandTimes(PostToConnectionCommand, 0);
      expect(ddbMock).toHaveReceivedCommandTimes(DeleteItemCommand, 1);
    });

    it('does not broadcast to self when sender is in the peer list', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [{ connectionId: { S: CONNECTION_ID } }],
      });
      apiMock.on(PostToConnectionCommand).resolves({});
      ddbMock.on(DeleteItemCommand).resolves({});

      const handler = await loadHandler();
      await handler(makeEvent('$disconnect'));

      expect(apiMock).toHaveReceivedCommandTimes(PostToConnectionCommand, 0);
      expect(ddbMock).toHaveReceivedCommandTimes(DeleteItemCommand, 1);
    });

    it('swallows query errors and still deletes the sender row', async () => {
      ddbMock.on(QueryCommand).rejects(new Error('DDB timeout'));
      ddbMock.on(DeleteItemCommand).resolves({});

      const handler = await loadHandler();
      const res = await handler(makeEvent('$disconnect'));

      expect(res).toEqual({ statusCode: 200 });
      expect(apiMock).toHaveReceivedCommandTimes(PostToConnectionCommand, 0);
      expect(ddbMock).toHaveReceivedCommandTimes(DeleteItemCommand, 1);
    });

    it('swallows post errors per peer and still deletes the sender row', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [{ connectionId: { S: 'peer-1' } }, { connectionId: { S: 'peer-2' } }],
      });
      apiMock
        .on(PostToConnectionCommand, { ConnectionId: 'peer-1' })
        .rejects(new Error('Gone'))
        .on(PostToConnectionCommand, { ConnectionId: 'peer-2' })
        .resolves({});
      ddbMock.on(DeleteItemCommand).resolves({});

      const handler = await loadHandler();
      const res = await handler(makeEvent('$disconnect'));

      expect(res).toEqual({ statusCode: 200 });
      expect(apiMock).toHaveReceivedCommandTimes(PostToConnectionCommand, 2);
      expect(ddbMock).toHaveReceivedCommandWith(DeleteItemCommand, {
        TableName: TABLE,
        Key: { connectionId: { S: CONNECTION_ID } },
      });
    });
  });

  describe('other route keys', () => {
    it('returns 200 without touching DynamoDB or API Gateway for unknown routes', async () => {
      const handler = await loadHandler();
      const res = await handler(makeEvent('$default'));

      expect(res).toEqual({ statusCode: 200 });
      expect(ddbMock).toHaveReceivedCommandTimes(PutItemCommand, 0);
      expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 0);
      expect(ddbMock).toHaveReceivedCommandTimes(DeleteItemCommand, 0);
      expect(apiMock).toHaveReceivedCommandTimes(PostToConnectionCommand, 0);
    });
  });
});
