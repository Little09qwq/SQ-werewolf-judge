const fs = require("fs");
const vm = require("vm");
const path = require("path");

const calls = [];
class SpeechSynthesisUtteranceMock {
  constructor(text) { this.text = text; }
}

const document = {
  getElementById() { return null; },
  addEventListener() {},
  body: { append() {} }
};
const window = {
  indexedDB: null,
  speechSynthesis: {
    speaking: false,
    pending: false,
    getVoices() {
      return [{ name: "中文测试音色", lang: "zh-CN", voiceURI: "zh-test", localService: true }];
    },
    addEventListener() {},
    cancel() { calls.push("cancel"); },
    resume() { calls.push("resume"); },
    speak(utterance) { calls.push(`speak:${utterance.text}`); }
  },
  addEventListener() {}
};
window.window = window;
window.document = document;

const context = {
  window,
  document,
  navigator: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Safari" },
  localStorage: { getItem() { return null; }, setItem() {} },
  SpeechSynthesisUtterance: SpeechSynthesisUtteranceMock,
  Audio: function Audio() {
    this.volume = 1;
    this.play = () => { calls.push("audio-play"); return Promise.resolve(); };
    this.pause = () => {};
  },
  URL: { revokeObjectURL() {}, createObjectURL() { return "blob:test"; } },
  setTimeout,
  clearTimeout,
  console,
  Promise,
  Map,
  JSON,
  String,
  Number,
  Math
};

vm.createContext(context);
const source = fs.readFileSync(path.join(__dirname, "..", "speech.js"), "utf8");
vm.runInContext(source, context);
window.JudgeSpeech.speak("狼人请睁眼", 0.92);

if (!calls.some(x => x.startsWith("speak:"))) {
  throw new Error("speechSynthesis.speak() was not called synchronously");
}
if (calls.includes("cancel")) {
  throw new Error("idle speech synthesis should not be cancelled before a new utterance");
}

calls.length = 0;
window.JudgeSpeech.unlock();
const unlockSpeak = calls.find(x => x.startsWith("speak:"));
if (!unlockSpeak || !unlockSpeak.includes("语音已启用")) {
  throw new Error("mobile unlock must synchronously call speechSynthesis.speak()");
}
if (!calls.includes("audio-play")) {
  throw new Error("mobile unlock must also synchronously prime HTMLAudio");
}
console.log("smoke-speech: PASS", calls.join(" | "));
