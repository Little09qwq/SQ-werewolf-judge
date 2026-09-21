(() => {
  "use strict";

  const SETTINGS_KEY = "sique_judge_voice_v3";
  const DB_NAME = "sique_judge_audio";
  const STORE_NAME = "clips";
  const DEFAULT_PHRASE = "狼人阵营确认同伴，商量战术，决定击杀目标。";
  const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

  let settings = { voice: "", natural: true, pitch: 0.98 };
  try {
    settings = { ...settings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {}

  const clips = new Map();
  let database = null;
  let phrase = DEFAULT_PHRASE;
  let activeAudio = null;
  let activeUtterance = null;
  let generation = 0;
  let recorder = null;
  let recordingStream = null;
  let recordingChunks = [];

  const dbReady = new Promise(resolve => {
    if (!window.indexedDB) {
      resolve();
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onerror = () => resolve();
    request.onsuccess = () => {
      database = request.result;
      try {
        const cursor = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).openCursor();
        cursor.onerror = () => resolve();
        cursor.onsuccess = () => {
          const item = cursor.result;
          if (!item) {
            resolve();
            return;
          }
          clips.set(item.key, item.value);
          item.continue();
        };
      } catch {
        resolve();
      }
    };
  });

  function notify(text) {
    const status = document.getElementById("voiceStatus");
    if (status) status.textContent = text;
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = text;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3200);
    }
  }

  function persistSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      notify("语音设置无法写入浏览器存储。");
    }
  }

  function voiceScore(voice) {
    let score = 0;
    if (/Natural|Neural|Premium|Enhanced|自然|神经|高质量|Xiaoxiao|Yunxi|Tingting|Meijia/i.test(voice.name)) score += 30;
    if (/zh-CN/i.test(voice.lang)) score += 8;
    else if (/zh/i.test(voice.lang)) score += 4;
    if (voice.localService) score += 2;
    return score;
  }

  function chineseVoices() {
    return (window.speechSynthesis?.getVoices() || [])
      .filter(voice => /^(zh|cmn)/i.test(voice.lang || ""))
      .sort((a, b) => voiceScore(b) - voiceScore(a));
  }

  function selectedVoice() {
    const voices = chineseVoices();
    return voices.find(voice => voice.voiceURI === settings.voice) || voices[0] || null;
  }

  function isEmbeddedMobileBrowser() {
    const ua = String(window.navigator?.userAgent || "");
    return /MicroMessenger|QQ\/|MQQBrowser|FBAN|FBAV|Instagram|Line\/|GSA\/|GitHub/i.test(ua);
  }

  function mobileSpeechHint() {
    if (isEmbeddedMobileBrowser()) {
      return "检测到应用内置浏览器。若没有声音，请复制当前网址到 Safari（iPhone/iPad）或 Chrome（Android）打开。";
    }
    return "若手机仍然无声，请确认媒体音量已打开；iPhone/iPad 建议使用 Safari，Android 建议使用 Chrome。";
  }

  function naturalize(text) {
    let value = String(text || "").trim();
    if (!value) return value;
    value = value
      .replace(/\s+/g, " ")
      .replace(/([。！？])(?=[^。！？])/g, "$1 ")
      .replace(/，{2,}/g, "，")
      .replace(/。{2,}/g, "。");
    if (!/[。！？]$/.test(value)) value += "。";
    return value;
  }

  function stopRecordingTracks() {
    if (recordingStream) {
      for (const track of recordingStream.getTracks()) track.stop();
      recordingStream = null;
    }
  }

  function stopAudio() {
    if (!activeAudio) return;
    activeAudio.pause();
    try { URL.revokeObjectURL(activeAudio.src); } catch {}
    activeAudio = null;
  }

  function stop() {
    generation += 1;
    const synth = window.speechSynthesis;
    // 只在确实有语音正在播放/排队时 cancel。iOS/WebKit 对空闲状态下的
    // cancel() -> speak() 很敏感，可能直接吞掉下一句。
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
    activeUtterance = null;
    stopAudio();
  }

  function prepareForSpeak() {
    generation += 1;
    const synth = window.speechSynthesis;
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
    activeUtterance = null;
    stopAudio();
    return generation;
  }

  function systemSpeak(text, rate = 0.92, { diagnostic = false } = {}) {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
      notify(`此浏览器不支持系统语音。${mobileSpeechHint()}`);
      return false;
    }
    const utterance = new SpeechSynthesisUtterance(settings.natural ? naturalize(text) : String(text));
    const voice = selectedVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "zh-CN";
    const baseRate = Number(rate || 0.92);
    utterance.rate = Math.min(1.15, Math.max(0.7, settings.natural ? baseRate : Math.max(baseRate, 0.95)));
    utterance.pitch = Math.min(1.2, Math.max(0.75, Number(settings.pitch || 0.98)));
    utterance.volume = 1;

    // Safari/iOS 上必须保留 utterance 的强引用；否则某些版本会在播放前被回收。
    activeUtterance = utterance;
    utterance.onstart = () => {
      if (diagnostic) notify("手机语音已启用。现在可以正常使用播报按钮。");
    };
    utterance.onend = () => {
      if (activeUtterance === utterance) activeUtterance = null;
    };
    utterance.onerror = event => {
      if (activeUtterance === utterance) activeUtterance = null;
      if (!["canceled", "interrupted"].includes(event.error)) {
        notify(`系统语音播放失败。${mobileSpeechHint()}`);
      }
    };
    try {
      // 必须在点击事件的同步调用栈里执行。不要 await / setTimeout，
      // 否则 iOS Safari 和部分移动浏览器会把播报视为非用户触发并静音。
      synth.resume?.();
      synth.speak(utterance);
      return true;
    } catch {
      activeUtterance = null;
      notify(`系统语音启动失败。${mobileSpeechHint()}`);
      return false;
    }
  }

  function unlock() {
    // 这个函数必须由真实点击直接调用，不能包在 Promise / setTimeout 中。
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
      notify(`当前浏览器没有可用的系统语音。${mobileSpeechHint()}`);
      return false;
    }

    try {
      synth.resume?.();
      // 同时触发一次极短的 HTMLAudio 用户激活，给真人录音播放也解锁音频会话。
      // data URI 为极短静音 WAV；失败不影响系统 TTS。
      const silent = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
      silent.volume = 0.01;
      const play = silent.play?.();
      if (play && typeof play.catch === "function") play.catch(() => {});
    } catch {}

    const ok = systemSpeak("语音已启用", 0.92, { diagnostic: true });
    if (ok && isEmbeddedMobileBrowser()) {
      // speak() 可能在 WKWebView 中静默失败，所以把兼容提示保留在状态区。
      setTimeout(() => {
        const status = document.getElementById("voiceStatus");
        if (status && !/已启用/.test(status.textContent || "")) status.textContent = mobileSpeechHint();
      }, 1200);
    }
    return ok;
  }

  function speak(text, rate = 0.92) {
    const token = prepareForSpeak();
    const fixed = String(text || "");
    if (!fixed) return;

    // IndexedDB 在页面加载时就会异步读入 clips。播报点击时不能再 await dbReady，
    // 否则会丢失移动浏览器的用户激活权限。若数据库尚未读完，本次先直接使用 TTS。
    const clip = clips.get(fixed);
    if (!clip) {
      systemSpeak(fixed, rate);
      return;
    }

    const url = URL.createObjectURL(clip);
    const player = new Audio(url);
    activeAudio = player;
    let finished = false;
    const release = () => {
      if (finished) return;
      finished = true;
      try { URL.revokeObjectURL(url); } catch {}
      if (activeAudio === player) activeAudio = null;
    };
    player.onended = release;
    player.onerror = () => {
      release();
      if (token === generation) {
        notify("真人录音播放失败，请点击“音色 / 录音”检查该口令音频。");
      }
    };
    try {
      // play() 同样必须直接发生在用户点击的同步调用栈中。
      const playResult = player.play();
      if (playResult && typeof playResult.catch === "function") {
        playResult.catch(() => {
          release();
          if (token === generation) notify("浏览器阻止了录音播放，请再次点击播报或检查静音设置。");
        });
      }
    } catch {
      release();
      if (token === generation) notify("真人录音无法播放，请检查音频格式。");
    }
  }

  async function saveClip(text, blob) {
    await dbReady;
    if (!database) throw new Error("浏览器没有开放本地音频存储，请退出隐私模式或允许站点存储。");
    await new Promise((resolve, reject) => {
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const objectStore = transaction.objectStore(STORE_NAME);
        if (blob) objectStore.put(blob, text);
        else objectStore.delete(text);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error("保存失败"));
        transaction.onabort = () => reject(transaction.error || new Error("保存已取消"));
      } catch (error) {
        reject(error);
      }
    });
    if (blob) clips.set(text, blob);
    else clips.delete(text);
  }

  function populateVoices() {
    const select = document.getElementById("voiceChoice");
    if (!select) return;
    const current = settings.voice || "";
    select.replaceChildren(new Option("自动优选中文音色", ""));
    for (const voice of chineseVoices()) {
      select.add(new Option(`${voice.name} · ${voice.lang}${voice.localService ? " · 本机" : ""}`, voice.voiceURI));
    }
    select.value = [...select.options].some(option => option.value === current) ? current : "";
  }

  function syncDialog() {
    const phraseEl = document.getElementById("voicePhrase");
    const status = document.getElementById("voiceStatus");
    const natural = document.getElementById("voiceNatural");
    const pitch = document.getElementById("voicePitch");
    if (phraseEl) phraseEl.textContent = phrase;
    if (natural) natural.checked = settings.natural !== false;
    if (pitch) pitch.value = String(settings.pitch || 0.98);
    if (status) status.textContent = clips.has(phrase)
      ? "此口令已绑定真人录音，播报时会优先播放录音。"
      : "此口令尚未绑定真人录音，将使用设备提供的中文系统音色。";
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      notify("当前浏览器不支持网页内录音，请改用“上传音频”。");
      return;
    }
    if (recorder?.state === "recording") return;
    try {
      recordingStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      recordingChunks = [];
      recorder = new MediaRecorder(recordingStream);
      recorder.ondataavailable = event => {
        if (event.data?.size) recordingChunks.push(event.data);
      };
      recorder.onerror = () => notify("录音失败，请检查麦克风权限。");
      recorder.onstop = async () => {
        const mime = recorder?.mimeType || "audio/webm";
        const blob = new Blob(recordingChunks, { type: mime });
        stopRecordingTracks();
        if (!blob.size) {
          notify("没有录到有效音频。");
          return;
        }
        if (blob.size > MAX_AUDIO_BYTES) {
          notify("录音超过 10MB，请缩短后重录。");
          return;
        }
        try {
          await saveClip(phrase, blob);
          notify("真人录音已保存，这条口令今后优先播放真人录音。");
          syncDialog();
        } catch (error) {
          notify(error.message || "录音保存失败。");
        }
      };
      recorder.start();
      const start = document.getElementById("voiceRecord");
      const stopButton = document.getElementById("voiceRecordStop");
      if (start) start.disabled = true;
      if (stopButton) stopButton.disabled = false;
      notify("正在录音……读完当前口令后点击“停止并保存”。");
    } catch (error) {
      stopRecordingTracks();
      notify(error?.name === "NotAllowedError" ? "没有获得麦克风权限。也可以上传手机录好的音频。" : "无法启动录音，请改用上传音频。");
    }
  }

  function stopAndSaveRecording() {
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
    const start = document.getElementById("voiceRecord");
    const stopButton = document.getElementById("voiceRecordStop");
    if (start) start.disabled = false;
    if (stopButton) stopButton.disabled = true;
  }

  async function open(text = null) {
    if (text) phrase = String(text);
    let dialog = document.getElementById("voiceDialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "voiceDialog";
      dialog.className = "voice-dialog";
      dialog.innerHTML = `
        <div class="row between"><h2>音色与真人录音</h2><button class="btn ghost" id="voiceClose" type="button">关闭</button></div>
        <p class="help">系统语音会优先选择设备里的高质量中文音色，并用较慢、较低音调的“自然播报”参数。手机首次使用请先点页面顶部“启用/测试语音”；iPhone/iPad 建议使用 Safari，Android 建议使用 Chrome，不建议在微信、QQ、GitHub App 等内置浏览器中运行。若想完全去掉机器感，最稳妥的方法是给常用固定口令绑定真人录音。</p>
        <label class="field"><span>中文音色</span><select class="select" id="voiceChoice"></select></label>
        <label class="row" style="margin-top:12px"><input id="voiceNatural" type="checkbox"> 自然播报（推荐）</label>
        <label class="field" style="margin-top:12px"><span>系统语音音调</span><input id="voicePitch" type="range" min="0.85" max="1.08" step="0.01"></label>
        <div class="subhead">当前口令</div><p id="voicePhrase"></p>
        <div class="row"><button class="btn primary" id="voiceUnlock" type="button">启用/测试手机语音</button><button class="btn primary" id="voicePreview" type="button">试听</button><button class="btn ghost" id="voiceStop" type="button">停止播报</button></div>
        <hr class="sep">
        <div class="subhead">直接录一条真人口令</div>
        <div class="row"><button class="btn good" id="voiceRecord" type="button">开始录音</button><button class="btn warn" id="voiceRecordStop" type="button" disabled>停止并保存</button></div>
        <p class="help">首次录音会请求麦克风权限。录音只保存在当前浏览器 IndexedDB，不上传服务器。</p>
        <label class="field"><span>或上传已有音频（最大 10MB）</span><input class="input" id="voiceUpload" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm"></label>
        <button class="btn ghost" id="voiceRemove" type="button">移除此口令的真人录音</button>
        <p id="voiceStatus" class="notice" role="status"></p>`;
      document.body.append(dialog);

      document.getElementById("voiceClose").onclick = () => {
        stop();
        if (recorder?.state === "recording") recorder.stop();
        stopRecordingTracks();
        dialog.close();
      };
      dialog.addEventListener("cancel", () => {
        stop();
        stopRecordingTracks();
      });
      document.getElementById("voiceStop").onclick = stop;
      document.getElementById("voiceUnlock").onclick = unlock;
      document.getElementById("voicePreview").onclick = () => {
        const rate = Number(document.getElementById("speechRate")?.value || 0.92);
        speak(phrase, rate);
      };
      document.getElementById("voiceChoice").onchange = event => {
        settings.voice = event.target.value;
        persistSettings();
      };
      document.getElementById("voiceNatural").onchange = event => {
        settings.natural = event.target.checked;
        persistSettings();
      };
      document.getElementById("voicePitch").oninput = event => {
        settings.pitch = Number(event.target.value || 0.98);
        persistSettings();
      };
      document.getElementById("voiceRecord").onclick = startRecording;
      document.getElementById("voiceRecordStop").onclick = stopAndSaveRecording;
      document.getElementById("voiceUpload").onchange = async event => {
        const file = event.target.files?.[0];
        const selectedPhrase = phrase;
        event.target.value = "";
        if (!file) return;
        try {
          const extensionOK = /\.(mp3|wav|m4a|aac|ogg|webm)$/i.test(file.name);
          if (file.size > MAX_AUDIO_BYTES) throw new Error("音频超过 10MB。");
          if (!file.type.startsWith("audio/") && !extensionOK) throw new Error("请选择常见音频文件。");
          await saveClip(selectedPhrase, file);
          notify("真人录音已保存，这条口令今后优先播放录音。");
          syncDialog();
        } catch (error) {
          notify(error.message || "音频保存失败。");
        }
      };
      document.getElementById("voiceRemove").onclick = async () => {
        try {
          stop();
          await saveClip(phrase, null);
          notify("已移除此口令录音，将恢复系统语音。");
          syncDialog();
        } catch (error) {
          notify(error.message || "删除录音失败。");
        }
      };
    }
    populateVoices();
    syncDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    await dbReady;
    syncDialog();
  }

  window.speechSynthesis?.addEventListener?.("voiceschanged", populateVoices);
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-voice-action]");
    if (!button) return;
    const action = button.dataset.voiceAction;
    if (action === "stop") stop();
    else if (action === "unlock") unlock();
    else open(button.dataset.phrase ? decodeURIComponent(button.dataset.phrase) : null);
  });
  window.addEventListener("pagehide", () => {
    stop();
    stopRecordingTracks();
  });

  window.JudgeSpeech = { speak, stop, open, unlock, naturalize };
})();
