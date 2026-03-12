"use strict";
// functions/src/index.ts
// Firebase Cloud Functions エントリポイント
//
// presence.ts: RTDBのpresence変化を処理（Firestore同期 + マスター移譲）
// gameFlow.ts: ゲーム進行を制御（全員回答で結果へ、全員ready で次の問題へ）
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPlayerReadyChanged = exports.onPredictionWritten = exports.onAnswerWritten = exports.syncPresenceToFirestore = void 0;
var presence_1 = require("./presence");
Object.defineProperty(exports, "syncPresenceToFirestore", { enumerable: true, get: function () { return presence_1.syncPresenceToFirestore; } });
var gameFlow_1 = require("./gameFlow");
Object.defineProperty(exports, "onAnswerWritten", { enumerable: true, get: function () { return gameFlow_1.onAnswerWritten; } });
Object.defineProperty(exports, "onPredictionWritten", { enumerable: true, get: function () { return gameFlow_1.onPredictionWritten; } });
Object.defineProperty(exports, "onPlayerReadyChanged", { enumerable: true, get: function () { return gameFlow_1.onPlayerReadyChanged; } });
//# sourceMappingURL=index.js.map