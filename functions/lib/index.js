"use strict";
// functions/src/index.ts
// Firebase Cloud Functions エントリポイント
//
// presence.ts: RTDBのpresence変化を処理（Firestore同期 + マスター移譲）
// gameFlow.ts: ゲーム進行を制御（全員回答で結果へ、全員ready で次の問題へ）
Object.defineProperty(exports, "__esModule", { value: true });
exports.runForcedOfflineLeave = exports.onReplayRequestChanged = exports.onRoomCommandCreated = exports.runScheduledRoomCleanup = exports.onRoomCleanupRequested = exports.onPlayerReadyChanged = exports.onGameStateCreated = exports.onGameStateChanged = exports.onPredictionWritten = exports.onAnswerWritten = exports.syncPresenceToFirestore = void 0;
var presence_1 = require("./presence");
Object.defineProperty(exports, "syncPresenceToFirestore", { enumerable: true, get: function () { return presence_1.syncPresenceToFirestore; } });
var gameFlow_1 = require("./gameFlow");
Object.defineProperty(exports, "onAnswerWritten", { enumerable: true, get: function () { return gameFlow_1.onAnswerWritten; } });
Object.defineProperty(exports, "onPredictionWritten", { enumerable: true, get: function () { return gameFlow_1.onPredictionWritten; } });
Object.defineProperty(exports, "onGameStateChanged", { enumerable: true, get: function () { return gameFlow_1.onGameStateChanged; } });
Object.defineProperty(exports, "onGameStateCreated", { enumerable: true, get: function () { return gameFlow_1.onGameStateCreated; } });
Object.defineProperty(exports, "onPlayerReadyChanged", { enumerable: true, get: function () { return gameFlow_1.onPlayerReadyChanged; } });
var roomCleanup_1 = require("./roomCleanup");
Object.defineProperty(exports, "onRoomCleanupRequested", { enumerable: true, get: function () { return roomCleanup_1.onRoomCleanupRequested; } });
Object.defineProperty(exports, "runScheduledRoomCleanup", { enumerable: true, get: function () { return roomCleanup_1.runScheduledRoomCleanup; } });
var roomCommands_1 = require("./roomCommands");
Object.defineProperty(exports, "onRoomCommandCreated", { enumerable: true, get: function () { return roomCommands_1.onRoomCommandCreated; } });
var replayFlow_1 = require("./replayFlow");
Object.defineProperty(exports, "onReplayRequestChanged", { enumerable: true, get: function () { return replayFlow_1.onReplayRequestChanged; } });
var forceLeave_1 = require("./forceLeave");
Object.defineProperty(exports, "runForcedOfflineLeave", { enumerable: true, get: function () { return forceLeave_1.runForcedOfflineLeave; } });
//# sourceMappingURL=index.js.map