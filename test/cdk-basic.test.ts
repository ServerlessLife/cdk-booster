import { expect, test, describe } from 'vitest';
import fs from 'fs/promises';
import { callLambda } from './utils/callLambda.js';
import { getTestProjectFolder } from './utils/getTestProjectFolder.js';
import path from 'path';

describe('cdk-basic', async () => {
  const folder = await getTestProjectFolder('cdk-basic');

  test('call Lambda - testTsCommonJs', async () => {
    const lambdaName = await getFunctionName(
      folder,
      'FunctionNameTestTsCommonJs',
    );

    const response = await callLambda(lambdaName);

    expect(response.accountId).toBeDefined();
    expect(response.inputEvent).toMatchInlineSnapshot(`
      {
        "test": "test",
      }
    `);
    expect(response.testExternalLib).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(response.allFiles['test.txt']).toBe('TEST');
    expect(fixPaths(response.allFiles['index.js'])).toMatchInlineSnapshot(`
      ""use strict";
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __export = (target, all) => {
        for (var name in all)
          __defProp(target, name, { get: all[name], enumerable: true });
      };
      var __copyProps = (to, from, except, desc) => {
        if (from && typeof from === "object" || typeof from === "function") {
          for (let key of __getOwnPropNames(from))
            if (!__hasOwnProp.call(to, key) && key !== except)
              __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
        }
        return to;
      };
      var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

      // test/cdk-basic/services/testTsCommonJs/lambda.ts
      var lambda_exports = {};
      __export(lambda_exports, {
        lambdaHandler: () => lambdaHandler
      });
      module.exports = __toCommonJS(lambda_exports);
      var import_client_sts = require("@aws-sdk/client-sts");

      // test/node_modules/uuid/dist/esm/stringify.js
      var byteToHex = [];
      for (let i = 0; i < 256; ++i) {
        byteToHex.push((i + 256).toString(16).slice(1));
      }
      function unsafeStringify(arr, offset = 0) {
        return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
      }

      // test/node_modules/uuid/dist/esm/rng.js
      var import_crypto = require("crypto");
      var rnds8Pool = new Uint8Array(256);
      var poolPtr = rnds8Pool.length;
      function rng() {
        if (poolPtr > rnds8Pool.length - 16) {
          (0, import_crypto.randomFillSync)(rnds8Pool);
          poolPtr = 0;
        }
        return rnds8Pool.slice(poolPtr, poolPtr += 16);
      }

      // test/node_modules/uuid/dist/esm/native.js
      var import_crypto2 = require("crypto");
      var native_default = { randomUUID: import_crypto2.randomUUID };

      // test/node_modules/uuid/dist/esm/v4.js
      function v4(options, buf, offset) {
        if (native_default.randomUUID && !buf && !options) {
          return native_default.randomUUID();
        }
        options = options || {};
        const rnds = options.random ?? options.rng?.() ?? rng();
        if (rnds.length < 16) {
          throw new Error("Random bytes length must be >= 16");
        }
        rnds[6] = rnds[6] & 15 | 64;
        rnds[8] = rnds[8] & 63 | 128;
        if (buf) {
          offset = offset || 0;
          if (offset < 0 || offset + 16 > buf.length) {
            throw new RangeError(\`UUID byte range \${offset}:\${offset + 15} is out of buffer bounds\`);
          }
          for (let i = 0; i < 16; ++i) {
            buf[offset + i] = rnds[i];
          }
          return buf;
        }
        return unsafeStringify(rnds);
      }
      var v4_default = v4;

      // test/cdk-basic/services/testTsCommonJs/lambda.ts
      var stsClient = new import_client_sts.STSClient({});
      var lambdaHandler = async (event, context) => {
        const command = new import_client_sts.GetCallerIdentityCommand({});
        const identity = await stsClient.send(command);
        const uuid = v4_default();
        const fs = require("fs/promises");
        const files = await fs.readdir(".");
        const fileReadPromises = files.map(async (file) => {
          const stats = await fs.stat(file);
          if (stats.isFile()) {
            const content = await fs.readFile(file, "utf8");
            return [file, content];
          }
          return null;
        });
        const fileResults = await Promise.all(fileReadPromises);
        const fileContents = Object.fromEntries(
          fileResults.filter((result) => result !== null)
        );
        const response = {
          inputEvent: event,
          accountId: identity.Account,
          testExternalLib: uuid,
          allFiles: fileContents
        };
        return response;
      };
      // Annotate the CommonJS export names for ESM import in node:
      0 && (module.exports = {
        lambdaHandler
      });
      "
    `);
  });

  test('call Lambda - testTsEsModule', async () => {
    const lambdaName = await getFunctionName(
      folder,
      'FunctionNameTestTsEsModule',
    );

    const response = await callLambda(lambdaName);

    expect(response.accountId).toBeDefined();
    expect(response.inputEvent).toMatchInlineSnapshot(`
      {
        "test": "test",
      }
    `);
    expect(response.testExternalLib).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(response.allFiles['test.txt']).toBe('TEST');
    expect(fixPaths(response.allFiles['index.mjs'])).toMatchInlineSnapshot(
      `
      "// test/cdk-basic/services/testTsEsModule/lambda.ts
      import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

      // test/cdk-basic/services/testTsEsModule/node_modules/uuid/dist/esm/stringify.js
      var byteToHex = [];
      for (let i = 0; i < 256; ++i) {
        byteToHex.push((i + 256).toString(16).slice(1));
      }
      function unsafeStringify(arr, offset = 0) {
        return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
      }

      // test/cdk-basic/services/testTsEsModule/node_modules/uuid/dist/esm/rng.js
      import { randomFillSync } from "crypto";
      var rnds8Pool = new Uint8Array(256);
      var poolPtr = rnds8Pool.length;
      function rng() {
        if (poolPtr > rnds8Pool.length - 16) {
          randomFillSync(rnds8Pool);
          poolPtr = 0;
        }
        return rnds8Pool.slice(poolPtr, poolPtr += 16);
      }

      // test/cdk-basic/services/testTsEsModule/node_modules/uuid/dist/esm/native.js
      import { randomUUID } from "crypto";
      var native_default = { randomUUID };

      // test/cdk-basic/services/testTsEsModule/node_modules/uuid/dist/esm/v4.js
      function v4(options, buf, offset) {
        if (native_default.randomUUID && !buf && !options) {
          return native_default.randomUUID();
        }
        options = options || {};
        const rnds = options.random ?? options.rng?.() ?? rng();
        if (rnds.length < 16) {
          throw new Error("Random bytes length must be >= 16");
        }
        rnds[6] = rnds[6] & 15 | 64;
        rnds[8] = rnds[8] & 63 | 128;
        if (buf) {
          offset = offset || 0;
          if (offset < 0 || offset + 16 > buf.length) {
            throw new RangeError(\`UUID byte range \${offset}:\${offset + 15} is out of buffer bounds\`);
          }
          for (let i = 0; i < 16; ++i) {
            buf[offset + i] = rnds[i];
          }
          return buf;
        }
        return unsafeStringify(rnds);
      }
      var v4_default = v4;

      // test/cdk-basic/services/testTsEsModule/lambda.ts
      import * as fs from "fs/promises";
      var stsClient = new STSClient({});
      var lambdaHandler = async (event, context) => {
        const command = new GetCallerIdentityCommand({});
        const identity = await stsClient.send(command);
        const uuid = v4_default();
        const files = await fs.readdir(".");
        const fileReadPromises = files.map(async (file) => {
          const stats = await fs.stat(file);
          if (stats.isFile()) {
            const content = await fs.readFile(file, "utf8");
            return [file, content];
          }
          return null;
        });
        const fileResults = await Promise.all(fileReadPromises);
        const fileContents = Object.fromEntries(
          fileResults.filter((result) => result !== null)
        );
        const response = {
          inputEvent: event,
          accountId: identity.Account,
          testExternalLib: uuid,
          allFiles: fileContents
        };
        return response;
      };
      export {
        lambdaHandler
      };
      "
    `,
    );
  });

  test('call Lambda - testJsCommonJs', async () => {
    const lambdaName = await getFunctionName(
      folder,
      'FunctionNameTestJsCommonJs',
    );

    const response = await callLambda(lambdaName);

    expect(response.accountId).toBeDefined();
    expect(response.inputEvent).toMatchInlineSnapshot(`
      {
        "test": "test",
      }
    `);
    expect(response.testExternalLib).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(response.allFiles['test.txt']).toBe('TEST');
    expect(fixPaths(response.allFiles['index.js'])).toMatchInlineSnapshot(`
      ""use strict";
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __commonJS = (cb, mod) => function __require() {
        return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
      };

      // test/node_modules/uuid/dist/cjs/max.js
      var require_max = __commonJS({
        "test/node_modules/uuid/dist/cjs/max.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          exports2.default = "ffffffff-ffff-ffff-ffff-ffffffffffff";
        }
      });

      // test/node_modules/uuid/dist/cjs/nil.js
      var require_nil = __commonJS({
        "test/node_modules/uuid/dist/cjs/nil.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          exports2.default = "00000000-0000-0000-0000-000000000000";
        }
      });

      // test/node_modules/uuid/dist/cjs/regex.js
      var require_regex = __commonJS({
        "test/node_modules/uuid/dist/cjs/regex.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          exports2.default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;
        }
      });

      // test/node_modules/uuid/dist/cjs/validate.js
      var require_validate = __commonJS({
        "test/node_modules/uuid/dist/cjs/validate.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          var regex_js_1 = require_regex();
          function validate(uuid) {
            return typeof uuid === "string" && regex_js_1.default.test(uuid);
          }
          exports2.default = validate;
        }
      });

      // test/node_modules/uuid/dist/cjs/parse.js
      var require_parse = __commonJS({
        "test/node_modules/uuid/dist/cjs/parse.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          var validate_js_1 = require_validate();
          function parse(uuid) {
            if (!(0, validate_js_1.default)(uuid)) {
              throw TypeError("Invalid UUID");
            }
            let v;
            return Uint8Array.of((v = parseInt(uuid.slice(0, 8), 16)) >>> 24, v >>> 16 & 255, v >>> 8 & 255, v & 255, (v = parseInt(uuid.slice(9, 13), 16)) >>> 8, v & 255, (v = parseInt(uuid.slice(14, 18), 16)) >>> 8, v & 255, (v = parseInt(uuid.slice(19, 23), 16)) >>> 8, v & 255, (v = parseInt(uuid.slice(24, 36), 16)) / 1099511627776 & 255, v / 4294967296 & 255, v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255);
          }
          exports2.default = parse;
        }
      });

      // test/node_modules/uuid/dist/cjs/stringify.js
      var require_stringify = __commonJS({
        "test/node_modules/uuid/dist/cjs/stringify.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          exports2.unsafeStringify = void 0;
          var validate_js_1 = require_validate();
          var byteToHex = [];
          for (let i = 0; i < 256; ++i) {
            byteToHex.push((i + 256).toString(16).slice(1));
          }
          function unsafeStringify(arr, offset = 0) {
            return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
          }
          exports2.unsafeStringify = unsafeStringify;
          function stringify(arr, offset = 0) {
            const uuid = unsafeStringify(arr, offset);
            if (!(0, validate_js_1.default)(uuid)) {
              throw TypeError("Stringified UUID is invalid");
            }
            return uuid;
          }
          exports2.default = stringify;
        }
      });

      // test/node_modules/uuid/dist/cjs/rng.js
      var require_rng = __commonJS({
        "test/node_modules/uuid/dist/cjs/rng.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          var crypto_1 = require("crypto");
          var rnds8Pool = new Uint8Array(256);
          var poolPtr = rnds8Pool.length;
          function rng() {
            if (poolPtr > rnds8Pool.length - 16) {
              (0, crypto_1.randomFillSync)(rnds8Pool);
              poolPtr = 0;
            }
            return rnds8Pool.slice(poolPtr, poolPtr += 16);
          }
          exports2.default = rng;
        }
      });

      // test/node_modules/uuid/dist/cjs/v1.js
      var require_v1 = __commonJS({
        "test/node_modules/uuid/dist/cjs/v1.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          exports2.updateV1State = void 0;
          var rng_js_1 = require_rng();
          var stringify_js_1 = require_stringify();
          var _state = {};
          function v1(options, buf, offset) {
            let bytes;
            const isV6 = options?._v6 ?? false;
            if (options) {
              const optionsKeys = Object.keys(options);
              if (optionsKeys.length === 1 && optionsKeys[0] === "_v6") {
                options = void 0;
              }
            }
            if (options) {
              bytes = v1Bytes(options.random ?? options.rng?.() ?? (0, rng_js_1.default)(), options.msecs, options.nsecs, options.clockseq, options.node, buf, offset);
            } else {
              const now = Date.now();
              const rnds = (0, rng_js_1.default)();
              updateV1State(_state, now, rnds);
              bytes = v1Bytes(rnds, _state.msecs, _state.nsecs, isV6 ? void 0 : _state.clockseq, isV6 ? void 0 : _state.node, buf, offset);
            }
            return buf ?? (0, stringify_js_1.unsafeStringify)(bytes);
          }
          function updateV1State(state, now, rnds) {
            state.msecs ??= -Infinity;
            state.nsecs ??= 0;
            if (now === state.msecs) {
              state.nsecs++;
              if (state.nsecs >= 1e4) {
                state.node = void 0;
                state.nsecs = 0;
              }
            } else if (now > state.msecs) {
              state.nsecs = 0;
            } else if (now < state.msecs) {
              state.node = void 0;
            }
            if (!state.node) {
              state.node = rnds.slice(10, 16);
              state.node[0] |= 1;
              state.clockseq = (rnds[8] << 8 | rnds[9]) & 16383;
            }
            state.msecs = now;
            return state;
          }
          exports2.updateV1State = updateV1State;
          function v1Bytes(rnds, msecs, nsecs, clockseq, node, buf, offset = 0) {
            if (rnds.length < 16) {
              throw new Error("Random bytes length must be >= 16");
            }
            if (!buf) {
              buf = new Uint8Array(16);
              offset = 0;
            } else {
              if (offset < 0 || offset + 16 > buf.length) {
                throw new RangeError(\`UUID byte range \${offset}:\${offset + 15} is out of buffer bounds\`);
              }
            }
            msecs ??= Date.now();
            nsecs ??= 0;
            clockseq ??= (rnds[8] << 8 | rnds[9]) & 16383;
            node ??= rnds.slice(10, 16);
            msecs += 122192928e5;
            const tl = ((msecs & 268435455) * 1e4 + nsecs) % 4294967296;
            buf[offset++] = tl >>> 24 & 255;
            buf[offset++] = tl >>> 16 & 255;
            buf[offset++] = tl >>> 8 & 255;
            buf[offset++] = tl & 255;
            const tmh = msecs / 4294967296 * 1e4 & 268435455;
            buf[offset++] = tmh >>> 8 & 255;
            buf[offset++] = tmh & 255;
            buf[offset++] = tmh >>> 24 & 15 | 16;
            buf[offset++] = tmh >>> 16 & 255;
            buf[offset++] = clockseq >>> 8 | 128;
            buf[offset++] = clockseq & 255;
            for (let n = 0; n < 6; ++n) {
              buf[offset++] = node[n];
            }
            return buf;
          }
          exports2.default = v1;
        }
      });

      // test/node_modules/uuid/dist/cjs/v1ToV6.js
      var require_v1ToV6 = __commonJS({
        "test/node_modules/uuid/dist/cjs/v1ToV6.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          var parse_js_1 = require_parse();
          var stringify_js_1 = require_stringify();
          function v1ToV6(uuid) {
            const v1Bytes = typeof uuid === "string" ? (0, parse_js_1.default)(uuid) : uuid;
            const v6Bytes = _v1ToV6(v1Bytes);
            return typeof uuid === "string" ? (0, stringify_js_1.unsafeStringify)(v6Bytes) : v6Bytes;
          }
          exports2.default = v1ToV6;
          function _v1ToV6(v1Bytes) {
            return Uint8Array.of((v1Bytes[6] & 15) << 4 | v1Bytes[7] >> 4 & 15, (v1Bytes[7] & 15) << 4 | (v1Bytes[4] & 240) >> 4, (v1Bytes[4] & 15) << 4 | (v1Bytes[5] & 240) >> 4, (v1Bytes[5] & 15) << 4 | (v1Bytes[0] & 240) >> 4, (v1Bytes[0] & 15) << 4 | (v1Bytes[1] & 240) >> 4, (v1Bytes[1] & 15) << 4 | (v1Bytes[2] & 240) >> 4, 96 | v1Bytes[2] & 15, v1Bytes[3], v1Bytes[8], v1Bytes[9], v1Bytes[10], v1Bytes[11], v1Bytes[12], v1Bytes[13], v1Bytes[14], v1Bytes[15]);
          }
        }
      });

      // test/node_modules/uuid/dist/cjs/md5.js
      var require_md5 = __commonJS({
        "test/node_modules/uuid/dist/cjs/md5.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          var crypto_1 = require("crypto");
          function md5(bytes) {
            if (Array.isArray(bytes)) {
              bytes = Buffer.from(bytes);
            } else if (typeof bytes === "string") {
              bytes = Buffer.from(bytes, "utf8");
            }
            return (0, crypto_1.createHash)("md5").update(bytes).digest();
          }
          exports2.default = md5;
        }
      });

      // test/node_modules/uuid/dist/cjs/v35.js
      var require_v35 = __commonJS({
        "test/node_modules/uuid/dist/cjs/v35.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          exports2.URL = exports2.DNS = exports2.stringToBytes = void 0;
          var parse_js_1 = require_parse();
          var stringify_js_1 = require_stringify();
          function stringToBytes(str) {
            str = unescape(encodeURIComponent(str));
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; ++i) {
              bytes[i] = str.charCodeAt(i);
            }
            return bytes;
          }
          exports2.stringToBytes = stringToBytes;
          exports2.DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
          exports2.URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
          function v35(version, hash, value, namespace, buf, offset) {
            const valueBytes = typeof value === "string" ? stringToBytes(value) : value;
            const namespaceBytes = typeof namespace === "string" ? (0, parse_js_1.default)(namespace) : namespace;
            if (typeof namespace === "string") {
              namespace = (0, parse_js_1.default)(namespace);
            }
            if (namespace?.length !== 16) {
              throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
            }
            let bytes = new Uint8Array(16 + valueBytes.length);
            bytes.set(namespaceBytes);
            bytes.set(valueBytes, namespaceBytes.length);
            bytes = hash(bytes);
            bytes[6] = bytes[6] & 15 | version;
            bytes[8] = bytes[8] & 63 | 128;
            if (buf) {
              offset = offset || 0;
              for (let i = 0; i < 16; ++i) {
                buf[offset + i] = bytes[i];
              }
              return buf;
            }
            return (0, stringify_js_1.unsafeStringify)(bytes);
          }
          exports2.default = v35;
        }
      });

      // test/node_modules/uuid/dist/cjs/v3.js
      var require_v3 = __commonJS({
        "test/node_modules/uuid/dist/cjs/v3.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          exports2.URL = exports2.DNS = void 0;
          var md5_js_1 = require_md5();
          var v35_js_1 = require_v35();
          var v35_js_2 = require_v35();
          Object.defineProperty(exports2, "DNS", { enumerable: true, get: function() {
            return v35_js_2.DNS;
          } });
          Object.defineProperty(exports2, "URL", { enumerable: true, get: function() {
            return v35_js_2.URL;
          } });
          function v3(value, namespace, buf, offset) {
            return (0, v35_js_1.default)(48, md5_js_1.default, value, namespace, buf, offset);
          }
          v3.DNS = v35_js_1.DNS;
          v3.URL = v35_js_1.URL;
          exports2.default = v3;
        }
      });

      // test/node_modules/uuid/dist/cjs/native.js
      var require_native = __commonJS({
        "test/node_modules/uuid/dist/cjs/native.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          var crypto_1 = require("crypto");
          exports2.default = { randomUUID: crypto_1.randomUUID };
        }
      });

      // test/node_modules/uuid/dist/cjs/v4.js
      var require_v4 = __commonJS({
        "test/node_modules/uuid/dist/cjs/v4.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          var native_js_1 = require_native();
          var rng_js_1 = require_rng();
          var stringify_js_1 = require_stringify();
          function v4(options, buf, offset) {
            if (native_js_1.default.randomUUID && !buf && !options) {
              return native_js_1.default.randomUUID();
            }
            options = options || {};
            const rnds = options.random ?? options.rng?.() ?? (0, rng_js_1.default)();
            if (rnds.length < 16) {
              throw new Error("Random bytes length must be >= 16");
            }
            rnds[6] = rnds[6] & 15 | 64;
            rnds[8] = rnds[8] & 63 | 128;
            if (buf) {
              offset = offset || 0;
              if (offset < 0 || offset + 16 > buf.length) {
                throw new RangeError(\`UUID byte range \${offset}:\${offset + 15} is out of buffer bounds\`);
              }
              for (let i = 0; i < 16; ++i) {
                buf[offset + i] = rnds[i];
              }
              return buf;
            }
            return (0, stringify_js_1.unsafeStringify)(rnds);
          }
          exports2.default = v4;
        }
      });

      // test/node_modules/uuid/dist/cjs/sha1.js
      var require_sha1 = __commonJS({
        "test/node_modules/uuid/dist/cjs/sha1.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          var crypto_1 = require("crypto");
          function sha1(bytes) {
            if (Array.isArray(bytes)) {
              bytes = Buffer.from(bytes);
            } else if (typeof bytes === "string") {
              bytes = Buffer.from(bytes, "utf8");
            }
            return (0, crypto_1.createHash)("sha1").update(bytes).digest();
          }
          exports2.default = sha1;
        }
      });

      // test/node_modules/uuid/dist/cjs/v5.js
      var require_v5 = __commonJS({
        "test/node_modules/uuid/dist/cjs/v5.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          exports2.URL = exports2.DNS = void 0;
          var sha1_js_1 = require_sha1();
          var v35_js_1 = require_v35();
          var v35_js_2 = require_v35();
          Object.defineProperty(exports2, "DNS", { enumerable: true, get: function() {
            return v35_js_2.DNS;
          } });
          Object.defineProperty(exports2, "URL", { enumerable: true, get: function() {
            return v35_js_2.URL;
          } });
          function v5(value, namespace, buf, offset) {
            return (0, v35_js_1.default)(80, sha1_js_1.default, value, namespace, buf, offset);
          }
          v5.DNS = v35_js_1.DNS;
          v5.URL = v35_js_1.URL;
          exports2.default = v5;
        }
      });

      // test/node_modules/uuid/dist/cjs/v6.js
      var require_v6 = __commonJS({
        "test/node_modules/uuid/dist/cjs/v6.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          var stringify_js_1 = require_stringify();
          var v1_js_1 = require_v1();
          var v1ToV6_js_1 = require_v1ToV6();
          function v6(options, buf, offset) {
            options ??= {};
            offset ??= 0;
            let bytes = (0, v1_js_1.default)({ ...options, _v6: true }, new Uint8Array(16));
            bytes = (0, v1ToV6_js_1.default)(bytes);
            if (buf) {
              for (let i = 0; i < 16; i++) {
                buf[offset + i] = bytes[i];
              }
              return buf;
            }
            return (0, stringify_js_1.unsafeStringify)(bytes);
          }
          exports2.default = v6;
        }
      });

      // test/node_modules/uuid/dist/cjs/v6ToV1.js
      var require_v6ToV1 = __commonJS({
        "test/node_modules/uuid/dist/cjs/v6ToV1.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          var parse_js_1 = require_parse();
          var stringify_js_1 = require_stringify();
          function v6ToV1(uuid) {
            const v6Bytes = typeof uuid === "string" ? (0, parse_js_1.default)(uuid) : uuid;
            const v1Bytes = _v6ToV1(v6Bytes);
            return typeof uuid === "string" ? (0, stringify_js_1.unsafeStringify)(v1Bytes) : v1Bytes;
          }
          exports2.default = v6ToV1;
          function _v6ToV1(v6Bytes) {
            return Uint8Array.of((v6Bytes[3] & 15) << 4 | v6Bytes[4] >> 4 & 15, (v6Bytes[4] & 15) << 4 | (v6Bytes[5] & 240) >> 4, (v6Bytes[5] & 15) << 4 | v6Bytes[6] & 15, v6Bytes[7], (v6Bytes[1] & 15) << 4 | (v6Bytes[2] & 240) >> 4, (v6Bytes[2] & 15) << 4 | (v6Bytes[3] & 240) >> 4, 16 | (v6Bytes[0] & 240) >> 4, (v6Bytes[0] & 15) << 4 | (v6Bytes[1] & 240) >> 4, v6Bytes[8], v6Bytes[9], v6Bytes[10], v6Bytes[11], v6Bytes[12], v6Bytes[13], v6Bytes[14], v6Bytes[15]);
          }
        }
      });

      // test/node_modules/uuid/dist/cjs/v7.js
      var require_v7 = __commonJS({
        "test/node_modules/uuid/dist/cjs/v7.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          exports2.updateV7State = void 0;
          var rng_js_1 = require_rng();
          var stringify_js_1 = require_stringify();
          var _state = {};
          function v7(options, buf, offset) {
            let bytes;
            if (options) {
              bytes = v7Bytes(options.random ?? options.rng?.() ?? (0, rng_js_1.default)(), options.msecs, options.seq, buf, offset);
            } else {
              const now = Date.now();
              const rnds = (0, rng_js_1.default)();
              updateV7State(_state, now, rnds);
              bytes = v7Bytes(rnds, _state.msecs, _state.seq, buf, offset);
            }
            return buf ?? (0, stringify_js_1.unsafeStringify)(bytes);
          }
          function updateV7State(state, now, rnds) {
            state.msecs ??= -Infinity;
            state.seq ??= 0;
            if (now > state.msecs) {
              state.seq = rnds[6] << 23 | rnds[7] << 16 | rnds[8] << 8 | rnds[9];
              state.msecs = now;
            } else {
              state.seq = state.seq + 1 | 0;
              if (state.seq === 0) {
                state.msecs++;
              }
            }
            return state;
          }
          exports2.updateV7State = updateV7State;
          function v7Bytes(rnds, msecs, seq, buf, offset = 0) {
            if (rnds.length < 16) {
              throw new Error("Random bytes length must be >= 16");
            }
            if (!buf) {
              buf = new Uint8Array(16);
              offset = 0;
            } else {
              if (offset < 0 || offset + 16 > buf.length) {
                throw new RangeError(\`UUID byte range \${offset}:\${offset + 15} is out of buffer bounds\`);
              }
            }
            msecs ??= Date.now();
            seq ??= rnds[6] * 127 << 24 | rnds[7] << 16 | rnds[8] << 8 | rnds[9];
            buf[offset++] = msecs / 1099511627776 & 255;
            buf[offset++] = msecs / 4294967296 & 255;
            buf[offset++] = msecs / 16777216 & 255;
            buf[offset++] = msecs / 65536 & 255;
            buf[offset++] = msecs / 256 & 255;
            buf[offset++] = msecs & 255;
            buf[offset++] = 112 | seq >>> 28 & 15;
            buf[offset++] = seq >>> 20 & 255;
            buf[offset++] = 128 | seq >>> 14 & 63;
            buf[offset++] = seq >>> 6 & 255;
            buf[offset++] = seq << 2 & 255 | rnds[10] & 3;
            buf[offset++] = rnds[11];
            buf[offset++] = rnds[12];
            buf[offset++] = rnds[13];
            buf[offset++] = rnds[14];
            buf[offset++] = rnds[15];
            return buf;
          }
          exports2.default = v7;
        }
      });

      // test/node_modules/uuid/dist/cjs/version.js
      var require_version = __commonJS({
        "test/node_modules/uuid/dist/cjs/version.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          var validate_js_1 = require_validate();
          function version(uuid) {
            if (!(0, validate_js_1.default)(uuid)) {
              throw TypeError("Invalid UUID");
            }
            return parseInt(uuid.slice(14, 15), 16);
          }
          exports2.default = version;
        }
      });

      // test/node_modules/uuid/dist/cjs/index.js
      var require_cjs = __commonJS({
        "test/node_modules/uuid/dist/cjs/index.js"(exports2) {
          "use strict";
          Object.defineProperty(exports2, "__esModule", { value: true });
          exports2.version = exports2.validate = exports2.v7 = exports2.v6ToV1 = exports2.v6 = exports2.v5 = exports2.v4 = exports2.v3 = exports2.v1ToV6 = exports2.v1 = exports2.stringify = exports2.parse = exports2.NIL = exports2.MAX = void 0;
          var max_js_1 = require_max();
          Object.defineProperty(exports2, "MAX", { enumerable: true, get: function() {
            return max_js_1.default;
          } });
          var nil_js_1 = require_nil();
          Object.defineProperty(exports2, "NIL", { enumerable: true, get: function() {
            return nil_js_1.default;
          } });
          var parse_js_1 = require_parse();
          Object.defineProperty(exports2, "parse", { enumerable: true, get: function() {
            return parse_js_1.default;
          } });
          var stringify_js_1 = require_stringify();
          Object.defineProperty(exports2, "stringify", { enumerable: true, get: function() {
            return stringify_js_1.default;
          } });
          var v1_js_1 = require_v1();
          Object.defineProperty(exports2, "v1", { enumerable: true, get: function() {
            return v1_js_1.default;
          } });
          var v1ToV6_js_1 = require_v1ToV6();
          Object.defineProperty(exports2, "v1ToV6", { enumerable: true, get: function() {
            return v1ToV6_js_1.default;
          } });
          var v3_js_1 = require_v3();
          Object.defineProperty(exports2, "v3", { enumerable: true, get: function() {
            return v3_js_1.default;
          } });
          var v4_js_1 = require_v4();
          Object.defineProperty(exports2, "v4", { enumerable: true, get: function() {
            return v4_js_1.default;
          } });
          var v5_js_1 = require_v5();
          Object.defineProperty(exports2, "v5", { enumerable: true, get: function() {
            return v5_js_1.default;
          } });
          var v6_js_1 = require_v6();
          Object.defineProperty(exports2, "v6", { enumerable: true, get: function() {
            return v6_js_1.default;
          } });
          var v6ToV1_js_1 = require_v6ToV1();
          Object.defineProperty(exports2, "v6ToV1", { enumerable: true, get: function() {
            return v6ToV1_js_1.default;
          } });
          var v7_js_1 = require_v7();
          Object.defineProperty(exports2, "v7", { enumerable: true, get: function() {
            return v7_js_1.default;
          } });
          var validate_js_1 = require_validate();
          Object.defineProperty(exports2, "validate", { enumerable: true, get: function() {
            return validate_js_1.default;
          } });
          var version_js_1 = require_version();
          Object.defineProperty(exports2, "version", { enumerable: true, get: function() {
            return version_js_1.default;
          } });
        }
      });

      // test/cdk-basic/services/testJsCommonJs/lambda.js
      var { STSClient, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");
      var { v4: uuidv4 } = require_cjs();
      var fs = require("fs/promises");
      var stsClient = new STSClient({});
      exports.lambdaHandler = async (event, context) => {
        const command = new GetCallerIdentityCommand({});
        const identity = await stsClient.send(command);
        const uuid = uuidv4();
        const files = await fs.readdir(".");
        const fileReadPromises = files.map(async (file) => {
          const stats = await fs.stat(file);
          if (stats.isFile()) {
            const content = await fs.readFile(file, "utf8");
            return [file, content];
          }
          return null;
        });
        const fileResults = await Promise.all(fileReadPromises);
        const fileContents = Object.fromEntries(
          fileResults.filter((result) => result !== null)
        );
        const response = {
          inputEvent: event,
          accountId: identity.Account,
          testExternalLib: uuid,
          allFiles: fileContents
        };
        return response;
      };
      "
    `);
  });

  test('call Lambda - testJsEsModule', async () => {
    const lambdaName = await getFunctionName(
      folder,
      'FunctionNameTestJsEsModule',
    );
    const response = await callLambda(lambdaName);

    expect(response.accountId).toBeDefined();
    expect(response.inputEvent).toMatchInlineSnapshot(`
      {
        "test": "test",
      }
    `);
    expect(response.testExternalLib).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(response.allFiles['test.txt']).toBe('TEST');
    expect(fixPaths(response.allFiles['index.mjs'])).toMatchInlineSnapshot(`
      "// test/cdk-basic/services/testJsEsModule/lambda.js
      import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

      // test/node_modules/uuid/dist/esm/stringify.js
      var byteToHex = [];
      for (let i = 0; i < 256; ++i) {
        byteToHex.push((i + 256).toString(16).slice(1));
      }
      function unsafeStringify(arr, offset = 0) {
        return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
      }

      // test/node_modules/uuid/dist/esm/rng.js
      import { randomFillSync } from "crypto";
      var rnds8Pool = new Uint8Array(256);
      var poolPtr = rnds8Pool.length;
      function rng() {
        if (poolPtr > rnds8Pool.length - 16) {
          randomFillSync(rnds8Pool);
          poolPtr = 0;
        }
        return rnds8Pool.slice(poolPtr, poolPtr += 16);
      }

      // test/node_modules/uuid/dist/esm/native.js
      import { randomUUID } from "crypto";
      var native_default = { randomUUID };

      // test/node_modules/uuid/dist/esm/v4.js
      function v4(options, buf, offset) {
        if (native_default.randomUUID && !buf && !options) {
          return native_default.randomUUID();
        }
        options = options || {};
        const rnds = options.random ?? options.rng?.() ?? rng();
        if (rnds.length < 16) {
          throw new Error("Random bytes length must be >= 16");
        }
        rnds[6] = rnds[6] & 15 | 64;
        rnds[8] = rnds[8] & 63 | 128;
        if (buf) {
          offset = offset || 0;
          if (offset < 0 || offset + 16 > buf.length) {
            throw new RangeError(\`UUID byte range \${offset}:\${offset + 15} is out of buffer bounds\`);
          }
          for (let i = 0; i < 16; ++i) {
            buf[offset + i] = rnds[i];
          }
          return buf;
        }
        return unsafeStringify(rnds);
      }
      var v4_default = v4;

      // test/cdk-basic/services/testJsEsModule/lambda.js
      import * as fs from "fs/promises";
      var stsClient = new STSClient({});
      var lambdaHandler = async (event, context) => {
        const command = new GetCallerIdentityCommand({});
        const identity = await stsClient.send(command);
        const uuid = v4_default();
        const files = await fs.readdir(".");
        const fileReadPromises = files.map(async (file) => {
          const stats = await fs.stat(file);
          if (stats.isFile()) {
            const content = await fs.readFile(file, "utf8");
            return [file, content];
          }
          return null;
        });
        const fileResults = await Promise.all(fileReadPromises);
        const fileContents = Object.fromEntries(
          fileResults.filter((result) => result !== null)
        );
        const response = {
          inputEvent: event,
          accountId: identity.Account,
          testExternalLib: uuid,
          allFiles: fileContents
        };
        return response;
      };
      export {
        lambdaHandler
      };
      "
    `);
  });
});

async function getFunctionName(folder: string, functionName: string) {
  const cdkOutputs = JSON.parse(
    await fs.readFile(path.join(folder, 'cdk-outputs.json'), 'utf-8'),
  );
  let lambdaName = cdkOutputs['test-cdkbooster-cdk-basic'][functionName];

  if (!lambdaName) {
    lambdaName = cdkOutputs['test-cdkbooster-cdk-basic2'][functionName];
  }

  if (!lambdaName) {
    throw new Error(
      `Lambda name not found for ${functionName} in cdk-outputs.json`,
    );
  }

  return lambdaName;
}

function fixPaths(code: any): any {
  // Fix relative paths in the code
  //return code;

  return code
    .replace(/ services\//g, ' test/cdk-basic/services/')
    .replace(/\.\.\/test\/node_modules\//g, 'test/node_modules/')
    .replace(/\.\.\/node_modules\//g, 'test/node_modules/');
}
