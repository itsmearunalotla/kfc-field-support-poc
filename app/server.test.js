const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { createMemoryTicketStore } = require("./ticket-store");
const { createServer } = require("./server");

let server;
let baseUrl;
let ticketStore;

beforeEach(async () => {
  ticketStore = createMemoryTicketStore();
  server = createServer({ ticketStore });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

afterEach(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("health endpoint returns OK", async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("info endpoint returns the app details and commit", async () => {
  const response = await fetch(`${baseUrl}/api/info`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    name: "ekfc-field-support-api",
    version: "1.0.0",
    commit: "unknown",
    environment: "dev",
  });
});

test("creates and returns a support ticket", async () => {
  const response = await fetch(`${baseUrl}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Printer is offline",
      description: "The warehouse printer is not responding.",
      priority: "high",
    }),
  });

  assert.equal(response.status, 201);

  const ticket = await response.json();

  assert.equal(ticket.title, "Printer is offline");
  assert.equal(ticket.description, "The warehouse printer is not responding.");
  assert.equal(ticket.priority, "high");
  assert.equal(ticket.status, "open");
  assert.ok(ticket.id);
});

test("rejects a ticket without a title", async () => {
  const response = await fetch(`${baseUrl}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: "The warehouse printer is not responding.",
    }),
  });

  assert.equal(response.status, 400);
});

test("lists tickets after one is created", async () => {
  await fetch(`${baseUrl}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Printer is offline",
      description: "The warehouse printer is not responding.",
    }),
  });

  const response = await fetch(`${baseUrl}/api/tickets`);
  assert.equal(response.status, 200);

  const { tickets } = await response.json();

  assert.equal(tickets.length, 1);
  assert.equal(tickets[0].title, "Printer is offline");
});

test("rejects a null ticket body", async () => {
  const response = await fetch(`${baseUrl}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "null",
  });

  assert.equal(response.status, 400);
});

test("returns 503 when ticket storage is unavailable", async () => {
  ticketStore.list = async () => {
    throw new Error("storage_unavailable");
  };

  const response = await fetch(`${baseUrl}/api/tickets`);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "ticket_store_unavailable",
  });
});
