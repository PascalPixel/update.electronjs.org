#!/usr/bin/env node

"use strict";

require("dotenv-safe").config();

process.title = "update-server";

const Updates = require("../src/updates");
const ms = require("ms");
const assert = require("assert");

//
// Args
//

const {
  GH_TOKEN: token,
  PORT: port = 3000,
  CACHE_TTL: cacheTTL = "15m",
} = process.env;
assert(token, "GH_TOKEN required");

//
// In-Memory Cache with Expiration
//
function getCache() {
  let inMemoryCache = {};

  const cache = {
    get(key) {
      const now = Date.now();
      const item = inMemoryCache[key];

      if (item && now < item.expiry) {
        return Promise.resolve(JSON.parse(item.value));
      } else {
        // Optionally, you could delete the expired item here
        delete inMemoryCache[key];
        return Promise.resolve(null); // Return null if the item is not found or is expired
      }
    },
    set(key, value) {
      const expiry = Date.now() + ms(cacheTTL);
      inMemoryCache[key] = { value: JSON.stringify(value), expiry };
      return Promise.resolve();
    },
    lock(resource) {
      // Lock implementation remains the same as previous example
      if (!inMemoryCache[`lock:${resource}`]) {
        inMemoryCache[`lock:${resource}`] = {
          locked: true,
          expiry: Date.now() + ms(cacheTTL),
        };
        return Promise.resolve({
          unlock() {
            delete inMemoryCache[`lock:${resource}`];
            return Promise.resolve();
          },
        });
      }
      return Promise.reject(new Error("Resource is locked"));
    },
    unlock(resource) {
      delete inMemoryCache[`lock:${resource}`];
      return Promise.resolve();
    },
  };

  return Promise.resolve(cache);
}

//
// Go!
//
async function main() {
  const cache = await getCache();
  const updates = new Updates({ token, cache });
  updates.listen(port, () => {
    console.log(`http://localhost:${port}`);
  });
}

main();
