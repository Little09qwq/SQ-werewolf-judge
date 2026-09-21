(() => {
  "use strict";

  const STORAGE_KEY = "sique_werewolf_judge_v1";
  const APP_VERSION = "2026.09.21-fix9-mobile";
  const MAX_UNDO = 30;

  const ROLE_META = {
    hybrid: { name: "混血儿", camp: "special" },
    guard: { name: "守卫", camp: "good" },
    wolf: { name: "狼人", camp: "wolf" },
    wolfKing: { name: "狼王", camp: "wolf" },
    beauty: { name: "狼美人", camp: "wolf" },
    mechanical: { name: "机械狼", camp: "wolf" },
    nightmare: { name: "梦魇", camp: "wolf" },
    witch: { name: "女巫", camp: "good" },
    hunter: { name: "猎人", camp: "good" },
    idiot: { name: "白痴", camp: "good" },
    seer: { name: "预言家", camp: "good" },
    knight: { name: "骑士", camp: "good" },
    psychic: { name: "通灵师", camp: "good" },
    dreamer: { name: "摄梦人", camp: "good" },
    villager: { name: "平民", camp: "good" }
  };

  const VARIANTS = {
    mix13: {
      id: "mix13",
      name: "13 人预女猎白混",
      playerCount: 13,
      wolfPackSize: 4,
      villagerCount: 4,
      roles: ["hybrid", "witch", "hunter", "idiot", "seer"],
      nightOrder: ["hybrid", "wolf", "witch", "hunter", "idiot", "seer"],
      summary: "4 狼 + 4 民 + 预言家 + 女巫 + 猎人 + 白痴 + 混血儿"
    },
    wolfKingGuard12: {
      id: "wolfKingGuard12",
      name: "12 人狼王守卫",
      playerCount: 12,
      wolfPackSize: 4,
      villagerCount: 4,
      packRole: "wolfKing",
      roles: ["guard", "witch", "hunter", "seer"],
      nightOrder: ["guard", "wolf", "witch", "hunter", "seer"],
      summary: "3 狼 + 狼王 + 4 民 + 预言家 + 女巫 + 猎人 + 守卫"
    },
    classic12: {
      id: "classic12",
      name: "12 人预女猎白",
      playerCount: 12,
      wolfPackSize: 4,
      villagerCount: 4,
      roles: ["witch", "hunter", "idiot", "seer"],
      nightOrder: ["wolf", "witch", "hunter", "idiot", "seer"],
      summary: "4 狼 + 4 民 + 预言家 + 女巫 + 猎人 + 白痴"
    },
    beautyKnight12: {
      id: "beautyKnight12",
      name: "12 人狼美人骑士",
      playerCount: 12,
      wolfPackSize: 4,
      villagerCount: 4,
      packRole: "beauty",
      roles: ["guard", "witch", "knight", "seer"],
      nightOrder: ["guard", "wolf", "beauty", "witch", "knight", "seer"],
      summary: "3 狼 + 狼美人 + 4 民 + 预言家 + 女巫 + 守卫 + 骑士"
    },
    mechanical12: {
      id: "mechanical12",
      name: "12 人机械狼通灵师",
      playerCount: 12,
      wolfPackSize: 3,
      villagerCount: 4,
      separateWolf: "mechanical",
      roles: ["mechanical", "guard", "witch", "hunter", "psychic"],
      nightOrder: ["mechanicalKnifeStatus", "mechanical", "guard", "wolf", "witch", "mechanicalSkill", "hunter", "psychic", "mechanicalFeedback"],
      summary: "3 狼 + 机械狼 + 4 民 + 通灵师 + 女巫 + 猎人 + 守卫"
    },
    nightmare12: {
      id: "nightmare12",
      name: "12 人梦魇守卫",
      playerCount: 12,
      wolfPackSize: 4,
      villagerCount: 4,
      packRole: "nightmare",
      roles: ["guard", "witch", "hunter", "seer"],
      nightOrder: ["nightmare", "guard", "wolf", "witch", "hunter", "seer"],
      summary: "3 狼 + 梦魇 + 4 民 + 预言家 + 女巫 + 猎人 + 守卫"
    },
    dreamWolfKing12: {
      id: "dreamWolfKing12",
      name: "12 人狼王摄梦",
      playerCount: 12,
      wolfPackSize: 4,
      villagerCount: 4,
      packRole: "wolfKing",
      roles: ["dreamer", "witch", "hunter", "seer"],
      nightOrder: ["dreamer", "wolf", "witch", "hunter", "seer"],
      summary: "3 狼 + 狼王 + 4 民 + 预言家 + 女巫 + 猎人 + 摄梦人"
    }
  };

  const VARIANT_ALIASES = {
    wolfGuard12: "wolfKingGuard12",
    nightmareGuard12: "nightmare12",
    wolfDream12: "dreamWolfKing12"
  };

  const STAGE_META = {
    hybrid: { name: "混血儿" },
    guard: { name: "守卫" },
    wolf: { name: "狼人阵营" },
    beauty: { name: "狼美人" },
    mechanical: { name: "机械狼学习" },
    mechanicalKnifeStatus: { name: "机械狼带刀状态" },
    mechanicalSkill: { name: "机械狼技能" },
    mechanicalFeedback: { name: "机械狼学习反馈" },
    nightmare: { name: "梦魇" },
    witch: { name: "女巫" },
    hunter: { name: "猎人" },
    idiot: { name: "白痴" },
    seer: { name: "预言家" },
    knight: { name: "骑士" },
    psychic: { name: "通灵师" },
    dreamer: { name: "摄梦人" }
  };

  let store = null;
  let toastTimer = null;

  const $ = selector => document.querySelector(selector);
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => Date.now();

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fmtTime(ts) {
    try {
      return new Date(ts).toLocaleString("zh-CN", { hour12: false });
    } catch {
      return "";
    }
  }

  function uid() {
    return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function emptyStore() {
    return { version: 2, rooms: {}, settings: { speechRate: 0.92 } };
  }

  function newPlayer(number) {
    return {
      number,
      alive: true,
      canVote: true,
      idiotRevealed: false,
      shotUsed: false,
      deathDay: null,
      deathReason: []
    };
  }

  function newNightRecord() {
    return {
      fearTarget: null,
      fearConfirmed: false,
      guardTarget: null,
      guardPass: false,
      dreamTarget: null,
      dreamConfirmed: false,
      wolfKill: null,
      wolfPass: false,
      wolfConfirmed: false,
      pierce: false,
      charmTarget: null,
      charmPass: false,
      charmConfirmed: false,
      witchSave: false,
      witchPoison: null,
      witchConfirmed: false,
      seerTarget: null,
      seerConfirmed: false,
      psychicTarget: null,
      psychicConfirmed: false,
      mechanicalLearnTarget: null,
      mechanicalConfirmed: false,
      learningFeedback: false,
      mechanicalKnifeConfirmed: false,
      mechanicalGuard: null,
      mechanicalGuardPass: false,
      mechanicalPoison: null,
      mechanicalCheck: null,
      mechanicalPierceKill: null,
      mechanicalPiercePass: false,
      mechanicalSkillConfirmed: false,
      hunterConfirmed: false,
      finalized: false,
      deaths: [],
      notes: []
    };
  }

  function newDayRecord() {
    return {
      policeStartAnnounced: false,
      policeCandidates: [],
      policeRegistrationFinalized: false,
      policeOrder: null,
      speechOrder: null,
      nightDeaths: [],
      deathAnnounced: false,
      events: []
    };
  }

  function createRoom(name, variantId, options = {}) {
    const variant = VARIANTS[variantId];
    if (!variant) throw new Error("未找到所选板型。");
    const id = uid();
    const players = {};
    for (let i = 1; i <= variant.playerCount; i += 1) players[String(i)] = newPlayer(i);
    const room = {
      schema: 3,
      mechanicalFlowVersion: 2,
      id,
      name: String(name || "未命名房间").trim() || "未命名房间",
      variantId,
      createdAt: now(),
      updatedAt: now(),
      day: 1,
      period: "night",
      nightStageIndex: 0,
      players,
      identities: {
        wolfPack: [],
        hybrid: null,
        idol: null,
        guard: null,
        witch: null,
        hunter: null,
        idiot: null,
        seer: null,
        wolfKing: null,
        beauty: null,
        mechanical: null,
        knight: null,
        psychic: null,
        nightmare: null,
        dreamer: null
      },
      resources: {
        antidote: true,
        poison: true,
        knightDuel: true,
        mechanicalPoison: true,
        mechanicalPierce: true
      },
      settings: {
        nightmareStrength: options.nightmareStrength === "weak" ? "weak" : "strong"
      },
      sheriff: { holder: null, lost: false },
      nights: { "1": newNightRecord() },
      days: { "1": newDayRecord() },
      history: [],
      undo: []
    };
    pushHistory(room, `创建房间：${variant.name}`);
    return room;
  }

  function normalizeRoom(input) {
    if (!input || typeof input !== "object") throw new Error("房间数据格式无效。");
    const requestedVariantId = VARIANT_ALIASES[input.variantId] || input.variantId;
    const variantId = VARIANTS[requestedVariantId] ? requestedVariantId : "mix13";
    const variant = VARIANTS[variantId];
    const room = clone(input);
    const previousSchema = Number(input.schema || 0);
    room.schema = 3;
    room.id ||= uid();
    room.name ||= "导入房间";
    room.variantId = variantId;
    room.createdAt ||= now();
    room.updatedAt ||= now();
    room.day = Math.max(1, Number(room.day || 1));
    room.period = room.period === "day" ? "day" : "night";
    room.nightStageIndex = Math.max(0, Number(room.nightStageIndex || 0));
    // fix8 changes the mechanical-wolf night-stage order. When an older mechanical room
    // is opened mid-night, restart that night's stage navigator once so it cannot land
    // on the wrong identity after the upgrade.
    if (variantId === "mechanical12" && previousSchema < 3 && room.period === "night" && room.day > 1) {
      room.nightStageIndex = 0;
    }
    room.mechanicalFlowVersion = 2;
    room.players ||= {};
    for (let i = 1; i <= variant.playerCount; i += 1) {
      const key = String(i);
      room.players[key] = { ...newPlayer(i), ...(room.players[key] || {}) };
      room.players[key].number = i;
      room.players[key].deathReason = Array.isArray(room.players[key].deathReason) ? room.players[key].deathReason : [];
    }
    for (const key of Object.keys(room.players)) {
      if (Number(key) > variant.playerCount) delete room.players[key];
    }
    room.identities = {
      wolfPack: [], hybrid: null, idol: null, guard: null, witch: null, hunter: null,
      idiot: null, seer: null, wolfKing: null, beauty: null, mechanical: null,
      knight: null, psychic: null, nightmare: null, dreamer: null,
      ...(room.identities || {})
    };
    room.identities.wolfPack = Array.isArray(room.identities.wolfPack)
      ? [...new Set(room.identities.wolfPack.map(Number).filter(n => n >= 1 && n <= variant.playerCount))].sort((a, b) => a - b)
      : [];
    room.resources = {
      antidote: true, poison: true, knightDuel: true, mechanicalPoison: true, mechanicalPierce: true,
      ...(room.resources || {})
    };
    room.settings = { nightmareStrength: "strong", ...(room.settings || {}) };
    if (room.rules?.nightmareMode && !input.settings?.nightmareStrength) room.settings.nightmareStrength = room.rules.nightmareMode;
    if (!room.settings.nightmareStrength) room.settings.nightmareStrength = "strong";
    const oldSheriff = room.sheriff || {};
    room.sheriff = { holder: oldSheriff.holder || null, lost: Boolean(oldSheriff.lost ?? oldSheriff.destroyed ?? false) };
    room.nights ||= {};
    room.days ||= {};
    for (const [nightKey, rawNight] of Object.entries(room.nights)) {
      const normalizedNight = { ...newNightRecord(), ...(rawNight || {}) };
      // Old versions attached "pierce" to the normal wolf knife. fix8 intentionally does
      // not carry that choice forward because the new rule makes it a later, separate knife.
      // Mid-night mechanical rooms are restarted at stage 0 above so the judge can re-enter it.
      if (previousSchema < 3) normalizedNight.pierce = false;
      room.nights[nightKey] = normalizedNight;
    }
    room.nights[String(room.day)] = { ...newNightRecord(), ...(room.nights[String(room.day)] || {}) };
    room.nights["1"] = { ...newNightRecord(), ...(room.nights["1"] || {}) };
    if (!room.nights["1"].mechanicalLearnTarget && room.identities.learnedTarget) room.nights["1"].mechanicalLearnTarget = Number(room.identities.learnedTarget);
    room.days[String(room.day)] = { ...newDayRecord(), ...(room.days[String(room.day)] || {}) };
    if (room.days[String(room.day)].policeOrder && !room.days[String(room.day)].policeRegistrationFinalized) {
      room.days[String(room.day)].policeRegistrationFinalized = true;
    }
    room.history = Array.isArray(room.history) ? room.history.slice(-300) : [];
    room.undo = Array.isArray(room.undo) ? room.undo.slice(-MAX_UNDO) : [];
    return room;
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyStore();
      const parsed = JSON.parse(raw);
      const next = emptyStore();
      next.settings = { ...next.settings, ...(parsed.settings || {}) };
      const rooms = parsed.rooms && typeof parsed.rooms === "object" ? parsed.rooms : {};
      for (const [id, value] of Object.entries(rooms)) {
        try {
          const room = normalizeRoom(value);
          room.id = id;
          next.rooms[id] = room;
        } catch {
          // 单个旧房间损坏时不阻塞整个应用。
        }
      }
      return next;
    } catch {
      return emptyStore();
    }
  }

  function saveStore() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function roomSnapshot(room) {
    const copy = clone(room);
    copy.undo = [];
    return copy;
  }

  function commitRoom(roomId, mutator, options = {}) {
    const room = store.rooms[roomId];
    if (!room) return;
    const before = roomSnapshot(room);
    try {
      mutator(room);
      room.updatedAt = now();
      if (options.undo !== false) {
        room.undo ||= [];
        room.undo.push(before);
        if (room.undo.length > MAX_UNDO) room.undo.splice(0, room.undo.length - MAX_UNDO);
      }
      saveStore();
      render();
    } catch (error) {
      Object.assign(room, before);
      toast(error?.message || "操作失败。");
    }
  }

  function undoRoom(roomId) {
    const room = store.rooms[roomId];
    if (!room?.undo?.length) {
      toast("没有可以撤销的操作。");
      return;
    }
    const undoStack = room.undo;
    const previous = undoStack.pop();
    const restored = normalizeRoom(previous);
    restored.id = room.id;
    restored.undo = undoStack;
    store.rooms[roomId] = restored;
    saveStore();
    render();
    toast("已撤销上一步。");
  }

  function pushHistory(room, text, type = "记录") {
    room.history ||= [];
    room.history.push({ time: now(), day: room.day, period: room.period, type, text });
    if (room.history.length > 300) room.history.splice(0, room.history.length - 300);
  }

  function currentRoomId() {
    return new URLSearchParams(location.search).get("room");
  }

  function currentRoom() {
    const id = currentRoomId();
    return id ? store.rooms[id] : null;
  }

  function goHome() {
    history.pushState({}, "", location.pathname);
    render();
  }

  function openRoom(id, newTab = false) {
    const url = `${location.pathname}?room=${encodeURIComponent(id)}`;
    if (newTab) window.open(url, "_blank", "noopener");
    else {
      history.pushState({}, "", url);
      render();
    }
  }

  function toast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = String(message || "");
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  function speak(text) {
    if (!text) return;
    if (!window.JudgeSpeech) {
      toast("语音模块尚未加载，请刷新页面。");
      return;
    }
    window.JudgeSpeech.speak(text, Number(store.settings.speechRate || 0.92));
  }

  function variantOf(room) {
    return VARIANTS[room.variantId] || VARIANTS.mix13;
  }

  function currentNight(room) {
    const key = String(room.day);
    room.nights[key] ||= newNightRecord();
    return room.nights[key];
  }

  function previousNight(room) {
    if (room.day <= 1) return null;
    return room.nights[String(room.day - 1)] || null;
  }

  function currentDay(room) {
    const key = String(room.day);
    room.days[key] ||= newDayRecord();
    return room.days[key];
  }

  function isAlive(room, number) {
    return Boolean(number && room.players[String(number)]?.alive);
  }

  function assignedIdentityEntries(room) {
    const result = [];
    for (const key of ["hybrid", "guard", "witch", "hunter", "idiot", "seer", "wolfKing", "beauty", "mechanical", "knight", "psychic", "nightmare", "dreamer"]) {
      const number = Number(room.identities[key] || 0);
      if (number) result.push([key, number]);
    }
    return result;
  }

  function assignedDirectRole(room, number) {
    for (const [role, n] of assignedIdentityEntries(room)) {
      if (n === number) return role;
    }
    return null;
  }

  function isAssignedElsewhere(room, number, exceptRole = null) {
    if (!number) return false;
    for (const [role, n] of assignedIdentityEntries(room)) {
      if (role !== exceptRole && n === number) return true;
    }
    if (room.identities.wolfPack.includes(number)) {
      const packRole = variantOf(room).packRole;
      if (exceptRole !== "wolfPack" && exceptRole !== packRole) return true;
    }
    return false;
  }

  function setIdentity(room, role, number) {
    number = Number(number || 0);
    if (!number || !room.players[String(number)]) throw new Error("请选择有效号码。");
    const variant = variantOf(room);
    if (role === "wolfKing" || role === "beauty" || role === "nightmare") {
      const old = Number(room.identities[role] || 0);
      if (old && old !== number) {
        room.identities.wolfPack = room.identities.wolfPack.filter(n => n !== old);
      }
      if (isAssignedElsewhere(room, number, "wolfPack") && room.identities[role] !== number) {
        throw new Error(`${number} 号已登记为其他身份。`);
      }
      if (!room.identities.wolfPack.includes(number)) {
        if (room.identities.wolfPack.length >= variant.wolfPackSize) throw new Error("狼人登记数量已满。");
        room.identities.wolfPack.push(number);
        room.identities.wolfPack.sort((a, b) => a - b);
      }
      room.identities[role] = number;
      return;
    }
    if (isAssignedElsewhere(room, number, role)) throw new Error(`${number} 号已登记为其他身份。`);
    room.identities[role] = number;
    if (role === "witch" && room.day === 1 && room.period === "night") {
      const night = currentNight(room);
      const kill = nightmareBlocksWolf(room) ? null : Number(night.wolfKill || 0);
      if (kill && room.resources.antidote && kill !== number && !isBlocked(room, "witch")) {
        night.witchSave = true;
        night.witchPoison = null;
        night.witchConfirmed = true;
      }
    }
  }

  function roleNameForPlayer(room, number) {
    number = Number(number || 0);
    if (!number) return "未登记";
    const direct = assignedDirectRole(room, number);
    if (direct) return ROLE_META[direct]?.name || direct;
    if (room.identities.wolfPack.includes(number)) return "狼人";
    if (allRequiredIdentitiesRegistered(room)) return "平民";
    return "未登记";
  }

  function allRequiredIdentitiesRegistered(room) {
    const v = variantOf(room);
    if (room.identities.wolfPack.length !== v.wolfPackSize) return false;
    if (v.packRole && !room.identities[v.packRole]) return false;
    if (v.separateWolf && !room.identities[v.separateWolf]) return false;
    for (const role of v.roles) {
      if (role === "mechanical") continue;
      if (!room.identities[role]) return false;
    }
    if (v.id === "mix13" && (!room.identities.hybrid || !room.identities.idol)) return false;
    return true;
  }

  function isWolfCamp(room, number) {
    number = Number(number || 0);
    if (!number) return false;
    if (room.identities.wolfPack.includes(number)) return true;
    if (number === Number(room.identities.mechanical || 0)) return true;
    if (number === Number(room.identities.hybrid || 0)) {
      const idol = Number(room.identities.idol || 0);
      return idol ? isWolfCampIgnoringHybrid(room, idol) : false;
    }
    return false;
  }

  function isWolfCampIgnoringHybrid(room, number) {
    return room.identities.wolfPack.includes(Number(number)) || Number(room.identities.mechanical || 0) === Number(number);
  }

  // 规则要求：混血儿无论榜样是谁，预言家始终验为好人。
  function seerResult(room, number) {
    if (Number(number) === Number(room.identities.hybrid || 0)) return "好人";
    return isWolfCampIgnoringHybrid(room, number) ? "狼人" : "好人";
  }

  function learnedRoleKey(room) {
    const target = Number(currentNightForLearning(room)?.mechanicalLearnTarget || room.mechanicalLearnTarget || 0);
    if (!target) return null;
    const role = assignedDirectRole(room, target);
    if (role === "mechanical") return "mechanical";
    if (role) return role;
    if (room.identities.wolfPack.includes(target)) return "wolf";
    return allRequiredIdentitiesRegistered(room) ? "villager" : null;
  }

  function currentNightForLearning(room) {
    return room.nights["1"] || null;
  }

  function psychicResult(room, target) {
    target = Number(target || 0);
    if (target === Number(room.identities.mechanical || 0)) {
      const learned = learnedRoleKey(room);
      return learned ? (ROLE_META[learned]?.name || learned) : "机械狼（尚未完成学习反馈）";
    }
    return roleNameForPlayer(room, target);
  }

  function nightmareBlocksWolf(room) {
    if (room.variantId !== "nightmare12") return false;
    const night = currentNight(room);
    if (room.settings.nightmareStrength !== "weak") return false;
    return room.identities.wolfPack.includes(Number(night.fearTarget || 0));
  }

  function isBlocked(room, role) {
    if (room.variantId !== "nightmare12") return false;
    const target = Number(currentNight(room).fearTarget || 0);
    if (!target) return false;
    if (role === "wolf") return nightmareBlocksWolf(room);
    const actor = Number(room.identities[role] || 0);
    return Boolean(actor && actor === target);
  }

  function mechanicalCarriesKnife(room) {
    if (room.variantId !== "mechanical12") return false;
    const mechanical = Number(room.identities.mechanical || 0);
    if (!mechanical || !isAlive(room, mechanical)) return false;
    return room.identities.wolfPack.every(n => !isAlive(room, n));
  }

  function actorNumberForStage(room, stage) {
    const map = {
      hybrid: "hybrid", guard: "guard", beauty: "beauty", mechanical: "mechanical",
      mechanicalKnifeStatus: "mechanical", mechanicalSkill: "mechanical",
      nightmare: "nightmare", witch: "witch", hunter: "hunter", idiot: "idiot",
      seer: "seer", knight: "knight", psychic: "psychic", dreamer: "dreamer"
    };
    const key = map[stage];
    return key ? Number(room.identities[key] || 0) : null;
  }

  function stageHasActor(room, stage) {
    if (stage === "wolf") {
      if (room.identities.wolfPack.some(n => isAlive(room, n))) return true;
      return mechanicalCarriesKnife(room);
    }
    if (stage === "mechanicalFeedback") return room.day === 1 && Boolean(room.identities.mechanical);
    const actor = actorNumberForStage(room, stage);
    return actor ? isAlive(room, actor) : false;
  }

  function getNightStages(room) {
    const v = variantOf(room);
    return v.nightOrder.filter(stage => {
      if (stage === "mechanicalKnifeStatus") return room.day > 1 && stageHasActor(room, stage);
      if (stage === "mechanical") return room.day === 1;
      if (stage === "mechanicalSkill") return room.day > 1 && stageHasActor(room, stage);
      if (stage === "mechanicalFeedback") return room.day === 1;
      if (["hybrid", "idiot", "knight"].includes(stage)) return room.day === 1;
      if (room.day === 1) return true;
      if (stage === "witch" && stageHasActor(room, stage)) {
        return Boolean(room.resources.antidote || room.resources.poison);
      }
      return stageHasActor(room, stage);
    });
  }

  function stageScripts(room, stage) {
    const roleName = STAGE_META[stage]?.name || stage;
    const open = `${roleName}请睁眼。`;
    const close = `${roleName}确认，请闭眼。`;
    const received = "法官收到号码为。";
    const status = "你的技能状态为。";
    const nightmareGame = room.variantId === "nightmare12";

    if (stage === "hybrid") return ["混血儿请睁眼，请选择你的榜样。", received, "混血儿确认，请闭眼。"];

    if (stage === "guard") {
      if (nightmareGame) {
        return [open, status, "请选择你要守护的玩家。", received, close];
      }
      return [open, "请选择你要守护的玩家。", received, close];
    }

    if (stage === "wolf") {
      const list = ["狼人请睁眼。"];
      if (nightmareGame) list.push(status);
      list.push("狼人阵营确认同伴，商量战术，决定击杀目标。");
      if (variantOf(room).packRole === "wolfKing") list.push("狼王请举手。");
      if (variantOf(room).packRole === "beauty") list.push("狼美人请举手。");
      if (variantOf(room).packRole === "nightmare") list.push("梦魇请举手。");
      if (!nightmareBlocksWolf(room)) list.push(received);
      list.push("狼人确认，请闭眼。");
      return list;
    }

    if (stage === "beauty") return [open, "请选择你要魅惑的玩家。", received, close];
    if (stage === "mechanicalKnifeStatus") return ["机械狼请睁眼。", "你的带刀状态为。", "机械狼确认，请闭眼。"];
    if (stage === "mechanical") return ["机械狼请睁眼。", "请选择你要学习的玩家。", received, "机械狼确认，请闭眼。"];
    // All learned mechanical-wolf types use exactly the same audible script here.
    // The judge-only controls/results may differ, but closed-eye players cannot infer the learned type from audio.
    if (stage === "mechanicalSkill") return [
      "机械狼请睁眼。",
      "请确认是否发动技能，需要目标请给出号码。",
      received,
      "你的技能结果为。",
      "机械狼确认，请闭眼。"
    ];
    if (stage === "mechanicalFeedback") return ["机械狼请睁眼。", "你学习到的身份为。", "机械狼确认，请闭眼。"];
    if (stage === "nightmare") return [open, "请选择你要恐惧的玩家。", received, close];

    if (stage === "witch") {
      if (nightmareGame) {
        return [open, status, "今夜死亡玩家为。", "救给手势，毒给号码。", received, close];
      }
      return [open, "今夜死亡玩家为。", "救给手势，毒给号码。", received, close];
    }

    if (stage === "hunter") return [open, "你的开枪状态为。", received, close];
    if (stage === "idiot") return [open, received, close];

    if (stage === "seer") {
      if (nightmareGame) {
        return [open, status, "请选择你要查验的玩家。", received, "上好爪狼，他的身份为。", "预言家确认，请闭眼。"];
      }
      return [open, "请选择你要查验的玩家。", received, "上好爪狼，他的身份为。", "预言家确认，请闭眼。"];
    }

    if (stage === "knight") return [open, received, close];
    if (stage === "psychic") return [open, "请选择你要查验的玩家。", received, "他的具体身份为。", close];
    if (stage === "dreamer") return [open, "请选择今夜梦游的玩家。", received, close];
    return [open, received, close];
  }

  function speechButton(text, label = text) {
    const encoded = encodeURIComponent(text);
    return `<div class="speech-control">
      <button class="speech-btn" type="button" data-action="speak" data-speech="${encoded}"><span>点击播报</span>${esc(label)}</button>
      <button class="clip-btn" type="button" data-voice-action="clip" data-phrase="${encoded}">音色 / 录音</button>
    </div>`;
  }

  function playerGrid(room, options = {}) {
    const selected = new Set((options.selected || []).map(Number));
    const disabled = new Set((options.disabled || []).map(Number));
    const role = options.role || "";
    const action = options.action || "";
    const aliveOnly = Boolean(options.aliveOnly);
    const allowDead = Boolean(options.allowDead);
    const packSelected = Boolean(options.packSelected);
    let html = `<div class="player-grid">`;
    for (let n = 1; n <= variantOf(room).playerCount; n += 1) {
      const player = room.players[String(n)];
      const isDead = !player.alive;
      const isDisabled = disabled.has(n) || (aliveOnly && isDead && !allowDead);
      const cls = ["player-btn"];
      if (selected.has(n)) cls.push(packSelected ? "wolf-selected" : "selected");
      if (isDead) cls.push("dead");
      const attrs = isDisabled ? "disabled" : `data-action="${esc(action)}" data-player="${n}"${role ? ` data-role="${esc(role)}"` : ""}`;
      html += `<button type="button" class="${cls.join(" ")}" ${attrs}><span>${n}</span><small>${isDead ? "已出局" : esc(roleNameForPlayer(room, n))}</small></button>`;
    }
    html += `</div>`;
    return html;
  }

  function identityRegistrationOpen(room) {
    return room.day === 1 && room.period === "night";
  }

  function identityRegister(room, role, label = ROLE_META[role]?.name || role, options = {}) {
    const current = Number(room.identities[role] || 0);
    const allowedPackOnly = Boolean(options.packOnly);
    let body = `<div class="subhead">登记${esc(label)}身份</div>`;
    if (current) body += `<div class="notice">已登记：<strong>${current} 号</strong>${isAlive(room, current) ? "" : "（已出局）"}</div>`;
    const disabled = [];
    for (let n = 1; n <= variantOf(room).playerCount; n += 1) {
      if (allowedPackOnly && !room.identities.wolfPack.includes(n)) disabled.push(n);
      else if (isAssignedElsewhere(room, n, role) && !(role === variantOf(room).packRole && room.identities.wolfPack.includes(n))) disabled.push(n);
    }
    body += playerGrid(room, { selected: current ? [current] : [], disabled, action: "set-identity", role });
    return body;
  }

  function targetControl(room, field, label, options = {}) {
    const night = currentNight(room);
    const target = Number(night[field] || 0);
    const disabled = new Set(options.disabled || []);
    if (options.excludeSelf) {
      const actor = Number(room.identities[options.actorRole] || 0);
      if (actor) disabled.add(actor);
    }
    if (options.noRepeat) {
      const previous = previousNight(room)?.[field];
      if (previous) disabled.add(Number(previous));
    }
    return `<div class="subhead">${esc(label)}</div>
      ${playerGrid(room, { selected: target ? [target] : [], disabled: [...disabled], aliveOnly: options.aliveOnly !== false, action: "set-night-target", role: field })}
      ${options.allowPass ? `<button class="btn ghost small" type="button" data-action="pass-night-target" data-role="${esc(field)}">${esc(options.passLabel || "本夜不用 / 空过")}</button>` : ""}`;
  }

  function renderWolfRegistration(room) {
    const v = variantOf(room);
    const selected = room.identities.wolfPack;
    const disabled = [];
    for (let n = 1; n <= v.playerCount; n += 1) {
      const direct = assignedDirectRole(room, n);
      if (direct && direct !== v.packRole) disabled.push(n);
      if (v.separateWolf && n === Number(room.identities[v.separateWolf] || 0)) disabled.push(n);
    }
    let html = `<div class="subhead">登记狼人阵营（${selected.length}/${v.wolfPackSize}）</div>`;
    html += playerGrid(room, { selected, disabled, action: "toggle-wolf", packSelected: true });
    if (v.packRole && v.packRole !== "nightmare") {
      html += identityRegister(room, v.packRole, ROLE_META[v.packRole].name, { packOnly: true });
    }
    if (v.packRole === "nightmare" && room.identities.nightmare) {
      html += `<div class="notice">梦魇：<strong>${room.identities.nightmare} 号</strong>（已计入狼队）</div>`;
    }
    return html;
  }

  function renderStage(room, stage, index, stages) {
    const night = currentNight(room);
    const v = variantOf(room);
    const title = STAGE_META[stage]?.name || stage;
    const scripts = stageScripts(room, stage).map(text => speechButton(text)).join("");
    let controls = "";
    let result = "";

    if (stage === "hybrid") {
      if (identityRegistrationOpen(room)) controls += identityRegister(room, "hybrid");
      if (room.identities.hybrid) {
        controls += `<div class="subhead">选择榜样</div>${playerGrid(room, {
          selected: room.identities.idol ? [room.identities.idol] : [],
          disabled: [room.identities.hybrid],
          action: "set-idol"
        })}<p class="help">混血儿阵营可随榜样变化，但<strong>预言家查验混血儿始终显示为好人</strong>。</p>`;
      }
    }

    if (stage === "nightmare") {
      if (identityRegistrationOpen(room)) controls += identityRegister(room, "nightmare");
      if (room.identities.nightmare) {
        controls += `<div class="notice ${room.settings.nightmareStrength === "weak" ? "warn" : ""}">${room.settings.nightmareStrength === "weak" ? "弱梦魇：恐惧狼人时，本夜狼队不能带刀。" : "强梦魇：恐惧狼人时无事发生，狼队仍可正常带刀。"}</div>`;
        controls += targetControl(room, "fearTarget", "选择本夜恐惧目标", { allowPass: false, excludeSelf: true, actorRole: "nightmare", noRepeat: true });
      }
    }

    if (stage === "guard") {
      if (identityRegistrationOpen(room)) controls += identityRegister(room, "guard");
      if (room.identities.guard) {
        if (isBlocked(room, "guard")) {
          controls += `<div class="notice danger">守卫被梦魇恐惧：本夜技能无效。法官只做状态手势，不播报结果。</div>`;
        } else {
          controls += targetControl(room, "guardTarget", "选择守护目标", { allowPass: true, noRepeat: true, passLabel: "空守" });
        }
      }
    }

    if (stage === "dreamer") {
      if (identityRegistrationOpen(room)) controls += identityRegister(room, "dreamer");
      if (room.identities.dreamer) {
        controls += targetControl(room, "dreamTarget", "选择本夜梦游玩家", { allowPass: false, excludeSelf: true, actorRole: "dreamer" });
        const prev = previousNight(room)?.dreamTarget;
        if (prev) controls += `<p class="help">上一夜摄梦：${prev} 号。连续两夜摄梦同一人会使其死亡。</p>`;
      }
    }

    if (stage === "wolf") {
      if (identityRegistrationOpen(room)) controls += renderWolfRegistration(room);
      const registered = room.identities.wolfPack.length === v.wolfPackSize && (!v.packRole || room.identities[v.packRole]);
      if (registered) {
        if (nightmareBlocksWolf(room)) {
          controls += `<div class="notice danger">弱梦魇恐惧到了狼人：本夜狼队不带刀。仍可使用口令完成同伴确认和战术交流。</div>`;
        } else {
          const disallowed = [];
          if (room.day === 1 && !mechanicalCarriesKnife(room)) disallowed.push(...room.identities.wolfPack);
          if (room.identities.beauty) disallowed.push(Number(room.identities.beauty));
          if (mechanicalCarriesKnife(room) && room.identities.mechanical) disallowed.push(Number(room.identities.mechanical));
          controls += `<div class="subhead">${mechanicalCarriesKnife(room) ? "机械狼已接刀：选择普通狼刀目标" : "选择狼刀目标"}</div>`;
          controls += playerGrid(room, { selected: night.wolfKill ? [night.wolfKill] : [], disabled: disallowed, aliveOnly: true, action: "set-wolf-kill" });
          controls += `<button class="btn ghost small" type="button" data-action="wolf-pass">空刀</button>`;
          if (mechanicalCarriesKnife(room)) {
            controls += `<p class="help">机械狼接刀后会在狼人夜使用普通刀；若学习的是狼人，一次性破盾刀留到女巫之后的“机械狼技能”阶段单独决定是否发动。</p>`;
          }
        }
      }
    }

    if (stage === "beauty") {
      if (identityRegistrationOpen(room)) controls += identityRegister(room, "beauty", "狼美人", { packOnly: true });
      if (room.identities.beauty) {
        controls += targetControl(room, "charmTarget", "选择魅惑目标", { allowPass: true, excludeSelf: true, actorRole: "beauty", noRepeat: true, passLabel: "本夜不魅惑" });
      }
    }

    if (stage === "mechanicalKnifeStatus") {
      if (room.identities.mechanical) {
        const carries = mechanicalCarriesKnife(room);
        controls += `<div class="big-result ${carries ? "wolf" : "good"}"><div>机械狼带刀状态（仅法官手势）</div><div class="value">${carries ? "带刀" : "不带刀"}</div><p class="help">${carries ? "本夜机械狼需要在狼人阶段睁眼并使用普通狼刀。" : "本夜机械狼不参加狼人阶段；普通小狼照常行动。"}</p></div>`;
        controls += `<button class="btn good" type="button" data-action="confirm-mechanical-knife">已用手势确认带刀状态</button>`;
      }
    }

    if (stage === "mechanical") {
      if (identityRegistrationOpen(room)) controls += identityRegister(room, "mechanical");
      if (room.identities.mechanical) {
        controls += targetControl(room, "mechanicalLearnTarget", "选择首夜学习目标", { allowPass: false, excludeSelf: true, actorRole: "mechanical" });
        controls += `<p class="help">首夜只学习，不在当夜使用学习到的主动技能；全部身份登记完成后，天亮前会再次唤醒机械狼确认学习结果。</p>`;
      }
    }

    if (stage === "mechanicalSkill") {
      if (room.identities.mechanical) {
        const learned = learnedRoleKey(room);
        const learnedName = ROLE_META[learned]?.name || "未知";
        controls += `<div class="notice"><strong>仅法官可见：</strong>机械狼学习身份为 ${esc(learnedName)}。本阶段所有机械狼品种使用完全相同的语音口令，避免场外玩家通过播报判断品种。</div>`;
        if (!learned) {
          controls += `<div class="notice danger">机械狼学习结果尚未确定，请检查首夜学习目标和身份登记。</div>`;
        } else if (learned === "guard") {
          controls += targetControl(room, "mechanicalGuard", "机械狼强化守护目标", { allowPass: true, noRepeat: true, passLabel: "本夜不用守护" });
          const prev = Number(previousNight(room)?.mechanicalGuard || 0);
          if (prev) controls += `<p class="help">上一夜机械狼守护：${prev} 号；本夜不能连续守护同一名玩家。</p>`;
        } else if (learned === "witch") {
          if (room.resources.mechanicalPoison) {
            controls += targetControl(room, "mechanicalPoison", "机械狼毒药目标", { allowPass: true, passLabel: "本夜不用毒（保留毒药）" });
          } else {
            controls += `<div class="notice">机械狼毒药已经使用，本夜没有可发动的主动技能。</div><button class="btn good" type="button" data-action="confirm-mechanical-skill-skip">确认本夜机械狼技能状态</button>`;
          }
        } else if (learned === "psychic") {
          controls += targetControl(room, "mechanicalCheck", "机械狼查验目标", { allowPass: false, excludeSelf: true, actorRole: "mechanical" });
          if (night.mechanicalCheck) {
            const exact = psychicResult(room, night.mechanicalCheck);
            result += `<div class="big-result"><div>机械狼查验 ${night.mechanicalCheck} 号（仅法官可见）</div><div class="value">${esc(exact)}</div><p class="help">请仅用手势反馈；语音始终使用统一的“你的技能结果为”，不会读出具体品种或具体身份。</p></div>`;
          }
        } else if (learned === "wolf") {
          if (!mechanicalCarriesKnife(room)) {
            controls += `<div class="notice">机械狼尚未接刀：本夜不能发动破盾刀；一次性破盾刀继续保留。</div><button class="btn good" type="button" data-action="confirm-mechanical-skill-skip">确认本夜不发动破盾刀</button>`;
          } else if (!room.resources.mechanicalPierce) {
            controls += `<div class="notice">机械狼的一次性破盾刀已经使用。</div><button class="btn good" type="button" data-action="confirm-mechanical-skill-skip">确认本夜机械狼技能状态</button>`;
          } else {
            controls += targetControl(room, "mechanicalPierceKill", "一次性破盾刀目标", { allowPass: true, excludeSelf: true, actorRole: "mechanical", passLabel: "本夜不开破盾刀（保留）" });
            controls += `<p class="help">狼人阶段的刀永远是普通刀。这里的破盾刀是接刀后的额外一刀，可突破守卫类守护；本夜不开则资源保留。</p>`;
          }
        } else {
          controls += `<div class="notice">该学习身份没有需要在本阶段录入的主动夜间技能，但机械狼仍按统一口令睁眼。</div><button class="btn good" type="button" data-action="confirm-mechanical-skill-skip">确认本夜机械狼技能状态</button>`;
        }
      }
    }

    if (stage === "mechanicalFeedback") {
      const learned = learnedRoleKey(room);
      const target = Number(room.nights["1"]?.mechanicalLearnTarget || 0);
      if (!target) controls += `<div class="notice danger">尚未记录机械狼学习目标，请返回机械狼阶段补录。</div>`;
      else if (!learned) controls += `<div class="notice warn">目标身份尚未完整登记，暂时无法确认学习结果。</div>`;
      else controls += `<div class="big-result"><div>机械狼学习 ${target} 号</div><div class="value">${esc(ROLE_META[learned]?.name || learned)}</div></div>
        <button class="btn good" type="button" data-action="confirm-learning">已用手势确认学习结果</button>`;
    }

    if (stage === "witch") {
      if (identityRegistrationOpen(room)) controls += identityRegister(room, "witch");
      if (room.identities.witch) {
        const kill = nightmareBlocksWolf(room) ? null : Number(night.wolfKill || 0);
        const witchSeesKnife = Boolean(room.resources.antidote);
        controls += `<div class="big-result"><div>今夜死亡玩家（仅法官可见）</div><div class="value">${witchSeesKnife ? (kill ? `${kill} 号` : "无") : "狼刀未知"}</div>${witchSeesKnife ? "" : `<p class="help">解药已经使用，按本桌规则女巫此后不再获知狼刀目标。</p>`}</div>`;
        if (isBlocked(room, "witch")) {
          controls += `<div class="notice danger">女巫被梦魇恐惧：仍按正常流程播报死亡玩家和用药口令，但本夜技能无效，不消耗药物。</div>`;
        } else {
          controls += `<div class="row" style="margin-top:10px">
            <button class="btn good" type="button" data-action="witch-save" ${(!room.resources.antidote || !kill || kill === Number(room.identities.witch)) ? "disabled" : ""}>${night.witchSave ? "已选择：救" : "使用解药"}</button>
            <button class="btn ghost" type="button" data-action="witch-no-save">不救</button>
          </div>`;
          controls += `<div class="subhead">毒药目标</div>`;
          if (room.resources.poison) {
            controls += playerGrid(room, { selected: night.witchPoison ? [night.witchPoison] : [], aliveOnly: true, action: "witch-poison" });
            controls += `<button class="btn ghost small" type="button" data-action="witch-no-poison">不用毒</button>`;
          } else {
            controls += `<div class="notice">毒药已经使用。</div>`;
          }
          if (night.witchSave && night.witchPoison) controls += `<div class="notice danger">同夜不能同时使用解药和毒药，请保留其中一个。</div>`;
          if (room.day === 1 && kill && kill !== Number(room.identities.witch) && room.resources.antidote) {
            controls += `<p class="help">思潜规则：第一夜女巫本人未吃刀且有有效刀口时，默认必须使用解药。</p>`;
          }
        }
      }
    }

    if (stage === "hunter") {
      if (identityRegistrationOpen(room)) controls += identityRegister(room, "hunter");
      if (room.identities.hunter) {
        const status = hunterGunStatus(room);
        controls += `<div class="big-result ${status.ok ? "good" : "wolf"}"><div>猎人枪口状态（仅法官手势）</div><div class="value">${status.ok ? "可开枪 ↑" : "不可开枪 ↓"}</div><p class="help">${esc(status.reason)}</p></div>`;
        controls += `<button class="btn good" type="button" data-action="confirm-hunter">已确认枪口状态</button>`;
      }
    }

    if (stage === "idiot" && identityRegistrationOpen(room)) controls += identityRegister(room, "idiot");
    if (stage === "knight" && identityRegistrationOpen(room)) controls += identityRegister(room, "knight");

    if (stage === "seer") {
      if (identityRegistrationOpen(room)) controls += identityRegister(room, "seer");
      if (room.identities.seer) {
        if (isBlocked(room, "seer")) {
          controls += `<div class="notice danger">预言家被梦魇恐惧：本夜查验无效。</div>`;
        } else {
          controls += targetControl(room, "seerTarget", "选择查验目标", { allowPass: false, excludeSelf: true, actorRole: "seer" });
          if (night.seerTarget) {
            const check = seerResult(room, night.seerTarget);
            result += `<div class="big-result ${check === "狼人" ? "wolf" : "good"}"><div>${night.seerTarget} 号查验结果</div><div class="value">${check}</div><p class="help">结果只显示给法官；会播报结果提示语，但不会读出具体结果，请由法官用手势反馈。</p></div>`;
          }
        }
      }
    }

    if (stage === "psychic") {
      if (identityRegistrationOpen(room)) controls += identityRegister(room, "psychic");
      if (room.identities.psychic) {
        controls += targetControl(room, "psychicTarget", "选择查验目标", { allowPass: false, excludeSelf: true, actorRole: "psychic" });
        if (night.psychicTarget) {
          result += `<div class="big-result"><div>${night.psychicTarget} 号具体身份</div><div class="value">${esc(psychicResult(room, night.psychicTarget))}</div><p class="help">结果只显示给法官；会播报结果提示语，但不会读出具体身份，请由法官用手势反馈。</p></div>`;
        }
      }
    }

    return `<div class="stage-layout">
      <section class="panel">
        <div class="stage-title"><h2>${esc(title)}</h2><div class="stage-progress">夜 ${room.day} · ${index + 1}/${stages.length}</div></div>
        <div class="speech-grid">${scripts}</div>
        ${controls}
        ${result}
        <div class="footer-actions">
          <button class="btn ghost" type="button" data-action="prev-stage" ${index <= 0 ? "disabled" : ""}>上一身份</button>
          <button class="btn primary" type="button" data-action="next-stage">继续 →</button>
        </div>
      </section>
      ${renderJudgeSidebar(room)}
    </div>`;
  }

  function validateStage(room, stage) {
    const night = currentNight(room);
    const v = variantOf(room);
    const need = role => {
      if (!room.identities[role]) throw new Error(`请先登记${ROLE_META[role]?.name || role}身份。`);
    };
    if (stage === "hybrid") {
      need("hybrid");
      if (!room.identities.idol) throw new Error("请选择混血儿的榜样。");
    }
    if (stage === "nightmare") {
      need("nightmare");
      if (!night.fearTarget) throw new Error("请选择梦魇恐惧目标。");
    }
    if (stage === "guard") {
      need("guard");
      if (!isBlocked(room, "guard") && !night.guardTarget && !night.guardPass) throw new Error("请选择守护目标或空守。");
    }
    if (stage === "dreamer") {
      need("dreamer");
      if (!night.dreamTarget) throw new Error("请选择摄梦目标。");
    }
    if (stage === "wolf") {
      if (room.identities.wolfPack.length !== v.wolfPackSize) throw new Error(`请登记完整的 ${v.wolfPackSize} 名狼队成员。`);
      if (v.packRole && !room.identities[v.packRole]) throw new Error(`请标记${ROLE_META[v.packRole].name}。`);
      if (!nightmareBlocksWolf(room) && !night.wolfKill && !night.wolfPass) throw new Error("请选择狼刀目标或空刀。");
    }
    if (stage === "beauty") {
      need("beauty");
      if (!night.charmTarget && !night.charmPass) throw new Error("请选择魅惑目标或本夜不魅惑。");
    }
    if (stage === "mechanicalKnifeStatus") {
      need("mechanical");
      if (!night.mechanicalKnifeConfirmed) throw new Error("请先用手势向机械狼确认本夜带刀状态。");
    }
    if (stage === "mechanical") {
      need("mechanical");
      if (!night.mechanicalLearnTarget) throw new Error("请选择机械狼学习目标。");
    }
    if (stage === "mechanicalSkill") {
      need("mechanical");
      const learned = learnedRoleKey(room);
      if (!learned) throw new Error("机械狼学习结果尚未确定，请先检查首夜身份登记。");
      if (learned === "guard" && !night.mechanicalGuard && !night.mechanicalGuardPass) throw new Error("请选择机械狼守护目标或确认本夜不用守护。");
      if (learned === "witch" && room.resources.mechanicalPoison && !night.mechanicalPoison && !night.mechanicalSkillConfirmed) throw new Error("请选择机械狼毒药目标或确认本夜不用毒。");
      if (learned === "psychic" && !night.mechanicalCheck) throw new Error("请选择机械狼查验目标。");
      if (learned === "wolf" && mechanicalCarriesKnife(room) && room.resources.mechanicalPierce && !night.mechanicalPierceKill && !night.mechanicalPiercePass) throw new Error("请选择破盾刀目标或确认本夜不开破盾刀。");
      if (!["guard", "witch", "psychic", "wolf"].includes(learned) && !night.mechanicalSkillConfirmed) throw new Error("请确认机械狼本夜技能状态。");
      if (learned === "wolf" && (!mechanicalCarriesKnife(room) || !room.resources.mechanicalPierce) && !night.mechanicalSkillConfirmed) throw new Error("请确认机械狼本夜技能状态。");
      if (learned === "witch" && !room.resources.mechanicalPoison && !night.mechanicalSkillConfirmed) throw new Error("请确认机械狼本夜技能状态。");
    }
    if (stage === "mechanicalFeedback") {
      if (!night.learningFeedback) throw new Error("请确认机械狼学习结果后再继续。");
    }
    if (stage === "witch") {
      need("witch");
      if (isBlocked(room, "witch")) return;
      if (night.witchSave && night.witchPoison) throw new Error("女巫同夜不能同时使用解药和毒药。");
      const kill = nightmareBlocksWolf(room) ? null : Number(night.wolfKill || 0);
      if (room.day === 1 && room.resources.antidote && kill && kill !== Number(room.identities.witch) && !night.witchSave) {
        throw new Error("首夜女巫本人未吃刀时，按思潜规则需要使用解药。");
      }
      if (!night.witchConfirmed) throw new Error("请确认女巫本夜操作。");
    }
    if (stage === "hunter") {
      need("hunter");
      if (!night.hunterConfirmed) throw new Error("请确认猎人枪口状态。");
    }
    if (stage === "idiot") need("idiot");
    if (stage === "knight") need("knight");
    if (stage === "seer") {
      need("seer");
      if (!isBlocked(room, "seer") && !night.seerTarget) throw new Error("请选择预言家查验目标。");
    }
    if (stage === "psychic") {
      need("psychic");
      if (!night.psychicTarget) throw new Error("请选择通灵师查验目标。");
    }
  }

  function computeNightOutcome(room) {
    const night = currentNight(room);
    const deaths = new Map();
    const notes = [];
    const addDeath = (number, reason) => {
      number = Number(number || 0);
      if (!number || !isAlive(room, number)) return;
      if (!deaths.has(number)) deaths.set(number, []);
      const list = deaths.get(number);
      if (!list.includes(reason)) list.push(reason);
    };

    const weakBlocked = nightmareBlocksWolf(room);
    const kill = weakBlocked ? null : Number(night.wolfKill || 0);
    const dreamTarget = Number(night.dreamTarget || 0);
    const guardTarget = isBlocked(room, "guard") ? null : Number(night.guardTarget || 0);
    const mechanicalGuard = Number(night.mechanicalGuard || 0);
    const witchActive = !isBlocked(room, "witch");
    const save = Boolean(witchActive && room.resources.antidote && night.witchSave && kill);
    const poison = witchActive && room.resources.poison ? Number(night.witchPoison || 0) : 0;
    const mechanicalPierceKill = (room.resources.mechanicalPierce && mechanicalCarriesKnife(room) && learnedRoleKey(room) === "wolf")
      ? Number(night.mechanicalPierceKill || 0)
      : 0;

    if (kill) {
      const dreamProtected = dreamTarget === kill;
      const normalGuard = guardTarget === kill;
      const mechGuarded = mechanicalGuard === kill;
      const sameGuardSave = normalGuard && save;
      if (dreamProtected) notes.push(`${kill} 号受摄梦保护，免疫狼刀。`);
      else if (sameGuardSave) addDeath(kill, "同守同救");
      else {
        const guardStops = normalGuard || mechGuarded;
        if (guardStops) notes.push(`${kill} 号被守护，普通狼刀无效。`);
        else if (save) notes.push(`${kill} 号被女巫解药救下。`);
        else addDeath(kill, "狼刀");
      }
    }

    if (mechanicalPierceKill) {
      if (dreamTarget === mechanicalPierceKill) {
        notes.push(`${mechanicalPierceKill} 号受摄梦保护，免疫机械狼破盾刀。`);
      } else {
        // The learned-wolf extra knife is resolved after the witch phase and ignores guard-type shields.
        addDeath(mechanicalPierceKill, "机械狼破盾刀");
      }
    }

    if (poison) {
      if (dreamTarget === poison) {
        notes.push(`${poison} 号受摄梦保护，免疫女巫毒药。`);
      } else if (mechanicalGuard && mechanicalGuard === poison && Number(room.identities.witch || 0)) {
        addDeath(room.identities.witch, "机械狼弹毒");
        notes.push(`${poison} 号受机械狼守护，女巫毒药反弹。`);
      } else {
        addDeath(poison, "女巫毒药");
      }
    }

    const mechanicalPoison = room.resources.mechanicalPoison ? Number(night.mechanicalPoison || 0) : 0;
    if (mechanicalPoison) {
      if (dreamTarget === mechanicalPoison) notes.push(`${mechanicalPoison} 号受摄梦保护，免疫机械狼毒药。`);
      else addDeath(mechanicalPoison, "机械狼毒药");
    }

    const prevDream = Number(previousNight(room)?.dreamTarget || 0);
    if (dreamTarget && prevDream === dreamTarget) addDeath(dreamTarget, "连续两夜被摄梦");

    const dreamer = Number(room.identities.dreamer || 0);
    if (dreamer && deaths.has(dreamer) && dreamTarget) addDeath(dreamTarget, "摄梦人夜间死亡连带");

    return {
      deaths: [...deaths.entries()].sort((a, b) => a[0] - b[0]).map(([number, reasons]) => ({ number, reasons })),
      notes,
      weakBlocked,
      kill,
      save,
      poison,
      pierce: Boolean(mechanicalPierceKill),
      mechanicalPierceKill,
      mechanicalPoison
    };
  }

  function hunterGunStatus(room) {
    const hunter = Number(room.identities.hunter || 0);
    if (!hunter) return { ok: false, reason: "尚未登记猎人。" };
    if (isBlocked(room, "hunter")) return { ok: false, reason: "猎人被梦魇恐惧，本夜技能无效。" };
    const night = currentNight(room);
    if (Number(night.witchPoison || 0) === hunter) return { ok: false, reason: "猎人本夜被女巫毒杀时不可开枪。" };
    if (Number(night.mechanicalPoison || 0) === hunter) return { ok: false, reason: "猎人本夜被机械狼毒药带走时按当前规则封枪。" };
    const outcome = computeNightOutcome(room);
    const death = outcome.deaths.find(item => item.number === hunter);
    if (death && death.reasons.some(reason => /摄梦|毒药|弹毒/.test(reason))) return { ok: false, reason: "当前夜间死因会封锁猎人开枪。" };
    return { ok: true, reason: "当前状态允许猎人在符合条件的死亡后开枪。" };
  }

  function finalizeNight(room) {
    const night = currentNight(room);
    if (night.finalized) throw new Error("本夜已经结算。");
    const outcome = computeNightOutcome(room);
    if (night.witchSave && room.resources.antidote && !isBlocked(room, "witch") && outcome.kill) room.resources.antidote = false;
    if (night.witchPoison && room.resources.poison && !isBlocked(room, "witch")) room.resources.poison = false;
    if (night.mechanicalPoison && room.resources.mechanicalPoison) room.resources.mechanicalPoison = false;
    if (outcome.mechanicalPierceKill) room.resources.mechanicalPierce = false;
    night.deaths = outcome.deaths;
    night.notes = outcome.notes;
    night.finalized = true;
    const day = currentDay(room);
    day.nightDeaths = outcome.deaths.map(item => item.number).sort((a, b) => a - b);
    for (const item of outcome.deaths) {
      recordDeath(room, item.number, item.reasons.join(" / "), { chainBeauty: false, dayLabel: room.day });
    }
    room.period = "day";
    room.nightStageIndex = 0;
    pushHistory(room, outcome.deaths.length ? `第 ${room.day} 夜结算：${outcome.deaths.map(item => `${item.number}号`).join("、")} 出局。` : `第 ${room.day} 夜结算：平安夜。`, "夜间结算");
  }

  const POLICE_START_SPEECH = "准备天亮，所有玩家闭眼举手上警，请警下玩家放倒号码牌。";

  function sortedNightDeaths(room) {
    return [...new Set((currentDay(room).nightDeaths || []).map(Number).filter(Boolean))].sort((a, b) => a - b);
  }

  function deathSpeech(room) {
    const deaths = sortedNightDeaths(room);
    if (!deaths.length) return "昨夜平安夜。";
    if (deaths.length === 1) return `昨夜，${deaths[0]}号玩家单死。`;
    if (deaths.length === 2) return `昨夜双死，死亡顺序不分先后，${deaths.map(n => `${n}号`).join("，")}。`;
    return `昨夜多死，死亡顺序不分先后，${deaths.map(n => `${n}号`).join("，")}。`;
  }

  function recordDeath(room, number, reason, options = {}, visited = new Set()) {
    number = Number(number || 0);
    if (!number || visited.has(number)) return;
    const player = room.players[String(number)];
    if (!player || !player.alive) return;
    visited.add(number);
    player.alive = false;
    player.deathDay = options.dayLabel ?? room.day;
    player.deathReason ||= [];
    player.deathReason.push(String(reason || "其他出局"));

    const beauty = Number(room.identities.beauty || 0);
    if (options.chainBeauty !== false && number === beauty && room.period === "day" && !String(reason).includes("骑士决斗")) {
      const charm = Number(currentNight(room)?.charmTarget || previousNight(room)?.charmTarget || 0);
      if (charm && isAlive(room, charm)) recordDeath(room, charm, "狼美人殉情", { chainBeauty: false }, visited);
    }
  }

  function canShootAfterDeath(room, role, actor) {
    const player = room.players[String(actor)];
    if (!player || player.alive || player.shotUsed) return false;
    const reasons = player.deathReason.join(" / ");
    if (/毒药|弹毒|骑士决斗|摄梦|殉情|自爆/.test(reasons)) return false;
    if (role === "wolfKing" && /狼人自爆/.test(reasons)) return false;
    return true;
  }

  function activeSheriff(room) {
    const holder = !room.sheriff.lost ? Number(room.sheriff.holder || 0) : 0;
    return holder && isAlive(room, holder) ? holder : 0;
  }

  function directionForAnchor(anchor) {
    return Number(anchor) % 2 === 1 ? "forward" : "reverse";
  }

  function directionText(direction) {
    return direction === "reverse" ? "逆序" : "顺序";
  }

  function firstAliveFrom(room, anchor, direction) {
    const count = variantOf(room).playerCount;
    const step = direction === "reverse" ? -1 : 1;
    let n = Number(anchor);
    for (let i = 0; i < count; i += 1) {
      if (isAlive(room, n)) return n;
      n += step;
      if (n < 1) n = count;
      if (n > count) n = 1;
    }
    return null;
  }

  function nextAliveBeside(room, reference, direction) {
    const count = variantOf(room).playerCount;
    const step = direction === "reverse" ? -1 : 1;
    let n = Number(reference);
    for (let i = 0; i < count; i += 1) {
      n += step;
      if (n < 1) n = count;
      if (n > count) n = 1;
      if (isAlive(room, n)) return n;
    }
    return null;
  }

  function circularOrder(room, anchor, direction, options = {}) {
    const count = variantOf(room).playerCount;
    const step = direction === "reverse" ? -1 : 1;
    const allowed = options.allowed ? new Set(options.allowed.map(Number)) : null;
    const aliveOnly = Boolean(options.aliveOnly);
    const result = [];
    let n = Number(anchor);
    for (let i = 0; i < count; i += 1) {
      if ((!aliveOnly || isAlive(room, n)) && (!allowed || allowed.has(n))) result.push(n);
      n += step;
      if (n < 1) n = count;
      if (n > count) n = 1;
    }
    return result;
  }

  function buildRandomOrder(room, rawAnchor = null, options = {}) {
    const count = variantOf(room).playerCount;
    const anchor = Number(rawAnchor || (Math.floor(Math.random() * count) + 1));
    const direction = directionForAnchor(anchor);
    const effectiveAnchor = options.includeDeadAnchor ? anchor : firstAliveFrom(room, anchor, direction);
    const allowed = options.allowed || null;
    const order = circularOrder(room, effectiveAnchor || anchor, direction, { allowed, aliveOnly: Boolean(options.aliveOnly) });
    return { rawAnchor: anchor, effectiveAnchor, direction, order };
  }

  function buildPoliceOrder(room, candidates, rawAnchor = null) {
    const count = variantOf(room).playerCount;
    const pool = [...new Set((candidates || []).map(Number).filter(n => n >= 1 && n <= count))].sort((a, b) => a - b);
    if (!pool.length) throw new Error("请先登记至少一名上警玩家。");
    const requested = Number(rawAnchor || 0);
    // 随机点数来自全桌号码，而不是只从警上玩家中抽取。
    const anchor = requested >= 1 && requested <= count ? requested : (Math.floor(Math.random() * count) + 1);
    const direction = directionForAnchor(anchor);
    // 从随机点数沿既定方向寻找第一名警上玩家；警下玩家自动跳过。
    const order = circularOrder(room, anchor, direction, { allowed: pool, aliveOnly: false });
    const effectiveAnchor = Number(order[0] || 0);
    return { rawAnchor: anchor, effectiveAnchor, direction, order };
  }

  function policeCandidatesSpeech(candidates) {
    const list = [...new Set((candidates || []).map(Number).filter(Boolean))].sort((a, b) => a - b);
    if (!list.length) return "本局游戏没有上警玩家。";
    return `本局游戏上警玩家为${list.map(n => `${n}号`).join("，")}。`;
  }

  function buildSheriffSpeechOrder(room, side) {
    const day = currentDay(room);
    const deaths = sortedNightDeaths(room);
    const sheriff = activeSheriff(room);
    if (!sheriff) throw new Error("当前没有存活警长，无法由警长选择发言顺序。");
    const normalizedSide = side === "right" ? "right" : "left";
    // 号码按顺时针递增：左手边对应号码递增方向，右手边对应号码递减方向。
    const direction = normalizedSide === "left" ? "forward" : "reverse";
    const mode = deaths.length === 1 ? "death" : "sheriff";
    const reference = mode === "death" ? deaths[0] : sheriff;
    const anchor = nextAliveBeside(room, reference, direction);
    if (!anchor) throw new Error("没有可发言的存活玩家。");
    const order = circularOrder(room, anchor, direction, { aliveOnly: true }).filter(n => n !== sheriff);
    order.push(sheriff);
    return {
      rawAnchor: reference,
      effectiveAnchor: anchor,
      direction,
      order,
      bySheriff: true,
      sheriffChoice: `${mode}-${normalizedSide}`,
      reference
    };
  }

  function policeSpeech(room, data) {
    const first = Number(data?.order?.[0] || data?.effectiveAnchor || 0);
    const second = Number(data?.order?.[1] || 0);
    const direction = data?.direction === "reverse" ? "逆序" : "正序";
    if (!first) return "";
    if (!second) return `${first}号玩家开始${direction}发言。`;
    return `${first}号玩家开始${direction}发言，${second}号玩家做发言准备。`;
  }

  function speakerReadySentence(data) {
    const first = Number(data?.order?.[0] || data?.effectiveAnchor || 0);
    const second = Number(data?.order?.[1] || 0);
    if (!first) return "";
    if (!second) return `${first}号玩家请发言。`;
    return `${first}号玩家请发言，${second}号玩家做发言准备。`;
  }

  function daySpeechSentence(room, data, bySheriff = false) {
    const ready = speakerReadySentence(data);
    if (bySheriff) return ready;
    const shifted = data.effectiveAnchor && data.effectiveAnchor !== data.rawAnchor
      ? `随机点数${data.rawAnchor}，${directionText(data.direction)}发言，${data.rawAnchor}号玩家已出局，顺延至${data.effectiveAnchor}号玩家。`
      : `随机点数${data.rawAnchor}，${directionText(data.direction)}发言。`;
    return `${shifted}${ready}`;
  }

  function sheriffAssignmentCheck(room, player) {
    player = Number(player || 0);
    const day = currentDay(room);
    if (!player || !room.players[String(player)]) return { ok: false, reason: "请选择有效号码。" };
    if (room.sheriff.lost) return { ok: false, reason: "警徽已经流失，不能重新产生警长。" };
    const initialDayOneElection = room.day === 1 && !day.deathAnnounced;
    if (initialDayOneElection && !day.policeRegistrationFinalized) {
      return { ok: false, reason: "请先完成并确认警上玩家登记。" };
    }
    if (initialDayOneElection && !day.policeCandidates.includes(player)) {
      return { ok: false, reason: "第一天警长只能从已登记的警上玩家中产生。" };
    }
    // 第一轮竞选发生在公布死讯之前：已登记的警上玩家即使昨夜已经实际死亡，
    // 仍然允许先获得警徽；公布死讯后再按“警长死亡”处理移交或撕毁。
    if (initialDayOneElection) {
      return { ok: true, initialDayOneElection, nightDeadCandidate: !isAlive(room, player) };
    }
    if (isAlive(room, player)) return { ok: true, initialDayOneElection };
    return { ok: false, reason: "不能把警徽交给已出局玩家。" };
  }

  function renderIdentitySummary(room) {
    const v = variantOf(room);
    const items = [];
    const add = (label, value) => items.push(`<div class="summary-line"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`);
    add("狼队", room.identities.wolfPack.length ? room.identities.wolfPack.map(n => `${n}号`).join("、") : `未登记（${room.identities.wolfPack.length}/${v.wolfPackSize}）`);
    if (v.separateWolf === "mechanical") add("机械狼", room.identities.mechanical ? `${room.identities.mechanical}号` : "未登记");
    for (const role of ["wolfKing", "beauty", "nightmare", "hybrid", "guard", "witch", "hunter", "idiot", "seer", "knight", "psychic", "dreamer"]) {
      if (!v.roles.includes(role) && v.packRole !== role) continue;
      add(ROLE_META[role].name, room.identities[role] ? `${room.identities[role]}号` : "未登记");
    }
    if (v.id === "mix13") add("混血儿榜样", room.identities.idol ? `${room.identities.idol}号（查验混血儿仍为好人）` : "未选择");
    if (v.id === "mechanical12") {
      const target = room.nights["1"]?.mechanicalLearnTarget;
      add("机械狼学习", target ? `${target}号 → ${ROLE_META[learnedRoleKey(room)]?.name || "待确认"}` : "未选择");
    }
    if (v.id === "nightmare12") add("梦魇规则", room.settings.nightmareStrength === "weak" ? "弱梦魇" : "强梦魇");
    return `<div class="action-summary">${items.join("")}</div>`;
  }

  function renderHistory(room) {
    if (!room.history.length) return `<div class="empty">暂无记录</div>`;
    return `<div class="log">${[...room.history].reverse().slice(0, 80).map(item => `<div class="log-item"><div class="meta">${esc(item.type)} · 第 ${item.day} 天 · ${esc(fmtTime(item.time))}</div><div class="text">${esc(item.text)}</div></div>`).join("")}</div>`;
  }

  function renderJudgeSidebar(room) {
    return `<aside>
      <section class="panel"><h3>法官信息板</h3>${renderIdentitySummary(room)}</section>
      <section class="panel"><h3>操作记录</h3>${renderHistory(room)}</section>
    </aside>`;
  }

  function renderNightSummary(room, stages) {
    const outcome = computeNightOutcome(room);
    const night = currentNight(room);
    return `<div class="stage-layout">
      <section class="panel">
        <div class="stage-title"><h2>夜间结算预览</h2><div class="stage-progress">第 ${room.day} 夜</div></div>
        <div class="notice">确认无误后再正式结算。正式结算会消耗药物、破盾刀，并写入死亡状态；误操作仍可撤销。</div>
        <div class="subhead">预计死讯</div>
        ${outcome.deaths.length ? `<div class="death-list">${outcome.deaths.map(item => `<span class="death-chip">${item.number} 号 · ${esc(item.reasons.join(" / "))}</span>`).join("")}</div>` : `<div class="big-result good"><div class="value">平安夜</div></div>`}
        ${outcome.notes.length ? `<div class="subhead">结算提示</div>${outcome.notes.map(note => `<div class="notice">${esc(note)}</div>`).join("")}` : ""}
        <div class="action-summary" style="margin-top:16px">
          <div class="summary-line"><span>狼刀</span><strong>${outcome.kill ? `${outcome.kill}号` : "无"}</strong></div>
          <div class="summary-line"><span>女巫解药</span><strong>${night.witchSave ? "使用" : "未使用"}</strong></div>
          <div class="summary-line"><span>女巫毒药</span><strong>${night.witchPoison ? `${night.witchPoison}号` : "未使用"}</strong></div>
          <div class="summary-line"><span>守护</span><strong>${night.guardTarget ? `${night.guardTarget}号` : "无"}</strong></div>
          ${night.dreamTarget ? `<div class="summary-line"><span>摄梦</span><strong>${night.dreamTarget}号</strong></div>` : ""}
          ${night.fearTarget ? `<div class="summary-line"><span>恐惧</span><strong>${night.fearTarget}号</strong></div>` : ""}
          ${night.mechanicalGuard ? `<div class="summary-line"><span>机械狼守护</span><strong>${night.mechanicalGuard}号</strong></div>` : ""}
          ${night.mechanicalPoison ? `<div class="summary-line"><span>机械狼毒药</span><strong>${night.mechanicalPoison}号</strong></div>` : ""}
          ${night.mechanicalPierceKill ? `<div class="summary-line"><span>机械狼破盾刀</span><strong>${night.mechanicalPierceKill}号</strong></div>` : ""}
          ${night.mechanicalCheck ? `<div class="summary-line"><span>机械狼查验</span><strong>${night.mechanicalCheck}号</strong></div>` : ""}
        </div>
        <div class="footer-actions">
          <button class="btn ghost" type="button" data-action="prev-stage">← 返回上一身份</button>
          <button class="btn primary" type="button" data-action="finalize-night">确认结算，准备天亮</button>
        </div>
      </section>
      ${renderJudgeSidebar(room)}
    </div>`;
  }

  function renderPlayerStrip(room) {
    const sheriff = activeSheriff(room);
    return `<div class="player-strip">${Object.values(room.players).map(player => {
      const cls = ["player-mini"];
      if (!player.alive) cls.push("dead");
      if (sheriff === player.number) cls.push("sheriff");
      return `<div class="${cls.join(" ")}"><div class="num">${player.number}</div><div class="role">${esc(roleNameForPlayer(room, player.number))}${sheriff === player.number ? " · 警长" : ""}</div></div>`;
    }).join("")}</div>`;
  }

  function renderNight(room) {
    const stages = getNightStages(room);
    room.nightStageIndex = Math.min(room.nightStageIndex, stages.length);
    if (room.nightStageIndex >= stages.length) return renderNightSummary(room, stages);
    return renderStage(room, stages[room.nightStageIndex], room.nightStageIndex, stages);
  }

  function renderPolicePanel(room, day) {
    const count = variantOf(room).playerCount;
    const candidateSet = new Set((day.policeCandidates || []).map(Number));
    const locked = Boolean(day.policeRegistrationFinalized);
    const candidateButtons = Array.from({ length: count }, (_, i) => i + 1).map(n => `<button class="player-btn ${candidateSet.has(n) ? "selected" : ""}" type="button" data-action="toggle-police" data-player="${n}" ${day.policeStartAnnounced && !locked ? "" : "disabled"}><span>${n}</span><small>${candidateSet.has(n) ? "警上" : "警下"}</small></button>`).join("");
    const order = day.policeOrder;
    const candidatesSpeech = policeCandidatesSpeech(day.policeCandidates);
    const orderSpeech = order ? policeSpeech(room, order) : "";
    const eligible = [...day.policeCandidates].map(Number).sort((a, b) => a - b);
    const sheriffButtons = eligible.map(n => `<button class="btn ${Number(room.sheriff.holder) === n ? "good" : "ghost"} small" type="button" data-action="set-sheriff" data-player="${n}" ${locked ? "" : "disabled"}>${n}号</button>`).join("");

    return `<section class="panel">
      <h3>第一天上警</h3>
      <div class="subhead">1. 先播报上警准备</div>
      ${day.policeStartAnnounced
        ? `<div class="speech-grid">${speechButton(POLICE_START_SPEECH, "重新播报上警准备")}</div><div class="notice">上警准备已播报，可以登记警上玩家。</div>`
        : `<button class="btn primary" type="button" data-action="announce-police-start">播报上警准备并开始登记</button>`}

      <div class="subhead">2. 登记并确认警上玩家</div>
      <p class="help">播报完上警准备后，点击号码登记警上玩家。死讯尚未公布，因此昨夜已经实际死亡的玩家也可以正常登记上警并参加第一轮警长竞选。</p>
      <div class="player-grid">${candidateButtons}</div>
      ${!locked
        ? `<button class="btn primary" type="button" data-action="finalize-police-registration" ${day.policeStartAnnounced && eligible.length ? "" : "disabled"}>确认警上名单并播报</button>`
        : `<div class="speech-grid">${speechButton(candidatesSpeech, "重新播报上警玩家")}</div><div class="notice"><strong>警上名单已固定：</strong>${eligible.map(n => `${n}号`).join("、")}</div>`}

      <div class="subhead">3. 警上发言顺序</div>
      <p class="help">确认警上名单时，系统会自动从 1～${count} 号全桌范围生成一次随机点数并立即固定。点数不要求是警上玩家；奇数对应正序、偶数对应逆序，若点到警下玩家则沿该方向自动顺延到第一名警上玩家。法官无需、也不能再次点击随机点数。</p>
      ${order ? `<div class="notice"><strong>系统固定点数：${order.rawAnchor} 号 · ${directionText(order.direction)}（仅法官可见）</strong><br>${esc(orderSpeech)}<br>警上完整顺序：${order.order.map(n => `${n}号`).join(" → ")}</div>
        <button class="btn ghost" type="button" data-action="speak" data-speech="${encodeURIComponent(orderSpeech)}">播报警上发言顺序</button>`
        : `<div class="notice">确认警上名单后，系统会自动生成并固定本轮点数与发言方向。</div>`}

      <div class="subhead">4. 记录警长结果</div>
      <p class="help">第一天先产生警长、后公布昨夜死讯。因此已登记的警上玩家即使实际在昨夜死亡，也可以先当选警长；公布死讯后系统会把该玩家判定为警长死亡，再要求移交或撕毁警徽。</p>
      <div class="row">${sheriffButtons || `<span class="help">请先登记并确认警上玩家；若最终没有产生警长，可记录警徽流失。</span>`}<button class="btn warn small" type="button" data-action="lose-sheriff" ${locked ? "" : "disabled"}>警徽流失</button></div>
    </section>`;
  }

  function renderDaySpeechOrder(room, day) {
    const sheriff = activeSheriff(room);
    const rawSheriff = !room.sheriff.lost ? Number(room.sheriff.holder || 0) : 0;
    const order = day.speechOrder;
    let controls = "";
    let allowOrderDisplay = Boolean(order);

    if (!day.deathAnnounced) {
      controls = `<div class="notice warn">请先公布昨夜死讯，再确定白天发言顺序。</div>`;
      allowOrderDisplay = false;
    } else if (rawSheriff && !isAlive(room, rawSheriff)) {
      controls = `<div class="notice warn">${rawSheriff} 号警长已在昨夜死亡，请先在“警徽管理”中移交或撕毁警徽，再决定发言顺序。</div>`;
      allowOrderDisplay = false;
    } else if (sheriff) {
      const deaths = sortedNightDeaths(room);
      const singleDeath = deaths.length === 1;
      const prefix = singleDeath ? "死" : "警";
      const referenceText = singleDeath
        ? `昨夜单死 ${deaths[0]} 号：由警长选择死左或死右发言。`
        : `${deaths.length === 0 ? "昨夜平安夜" : `昨夜${deaths.length}人死亡`}：由警长选择警左或警右发言。`;
      controls = `<p class="help">当前警长：${sheriff} 号。${referenceText} 警长固定最后发言归票。</p>
        <div class="row" style="margin-top:10px">
          <button class="btn ghost" type="button" data-action="set-sheriff-speech" data-side="left">${prefix}左发言</button>
          <button class="btn ghost" type="button" data-action="set-sheriff-speech" data-side="right">${prefix}右发言</button>
        </div>`;
    } else {
      controls = `<p class="help">无有效警长：随机号码决定方向；奇数按顺序、偶数按逆序。若随机到已出局玩家，按既定方向顺延至第一位存活玩家。播报不会读出奇数/偶数判断。</p>
        <button class="btn primary" type="button" data-action="random-day-order">随机点数并生成发言顺序</button>`;
    }

    return `<section class="panel">
      <h3>白天发言顺序</h3>
      ${controls}
      ${allowOrderDisplay ? `<div class="notice"><strong>${esc(daySpeechSentence(room, order, Boolean(order.bySheriff)))}</strong><br>${order.order.map(n => `${n}号`).join(" → ")}</div>
        <button class="btn ghost small" type="button" data-action="speak" data-speech="${encodeURIComponent(daySpeechSentence(room, order, Boolean(order.bySheriff)))}">播报发言顺序</button>` : ""}
    </section>`;
  }

  function selectOptions(room, options = {}) {
    const list = [`<option value="">请选择</option>`];
    for (let n = 1; n <= variantOf(room).playerCount; n += 1) {
      if (options.aliveOnly && !isAlive(room, n)) continue;
      list.push(`<option value="${n}">${n} 号${isAlive(room, n) ? "" : "（已出局）"} · ${esc(roleNameForPlayer(room, n))}</option>`);
    }
    return list.join("");
  }

  function renderDayEvents(room, day) {
    const hunter = Number(room.identities.hunter || 0);
    const wolfKing = Number(room.identities.wolfKing || 0);
    const knight = Number(room.identities.knight || 0);
    return `<section class="panel">
      <h3>白天事件</h3>
      <div class="form-grid">
        <label class="field"><span>放逐玩家</span><select class="select" id="exileTarget">${selectOptions(room, { aliveOnly: true })}</select><button class="btn danger" type="button" data-action="day-form" data-kind="exile">记录放逐</button></label>
        <label class="field"><span>狼人自爆</span><select class="select" id="explodeActor">${selectOptions(room, { aliveOnly: true })}</select><button class="btn wolf" type="button" data-action="day-form" data-kind="explode">记录自爆</button></label>
        ${hunter ? `<label class="field"><span>猎人开枪（猎人 ${hunter} 号）</span><select class="select" id="hunterShotTarget">${selectOptions(room, { aliveOnly: true })}</select><button class="btn warn" type="button" data-action="day-form" data-kind="huntershot">记录开枪</button></label>` : ""}
        ${wolfKing ? `<label class="field"><span>狼王开枪（狼王 ${wolfKing} 号）</span><select class="select" id="wolfKingShotTarget">${selectOptions(room, { aliveOnly: true })}</select><button class="btn wolf" type="button" data-action="day-form" data-kind="wolfkingshot">记录开枪</button></label>` : ""}
        ${knight ? `<label class="field"><span>骑士决斗（骑士 ${knight} 号）</span><select class="select" id="knightTarget">${selectOptions(room, { aliveOnly: true })}</select><button class="btn good" type="button" data-action="day-form" data-kind="knightduel">记录决斗</button></label>` : ""}
        <label class="field"><span>其他出局</span><select class="select" id="otherDeathTarget">${selectOptions(room, { aliveOnly: true })}</select><input class="input" id="otherDeathReason" placeholder="原因（可选）"><button class="btn ghost" type="button" data-action="day-form" data-kind="otherdeath">记录出局</button></label>
      </div>
      ${day.events.length ? `<div class="subhead">今日事件</div><div class="action-summary">${day.events.map(event => `<div class="summary-line"><span>${esc(event.type)}</span><strong>${esc(event.text)}</strong></div>`).join("")}</div>` : ""}
    </section>`;
  }

  function renderSheriffPanel(room) {
    const holder = !room.sheriff.lost ? Number(room.sheriff.holder || 0) : 0;
    const deadHolder = holder && !isAlive(room, holder);
    let actions = "";
    if (room.sheriff.lost) {
      actions = `<span class="help">警徽已经流失或被撕毁，本局不能重新产生警长。</span>`;
    } else if (deadHolder) {
      actions = `${Array.from({ length: variantOf(room).playerCount }, (_, i) => i + 1).filter(n => isAlive(room, n)).map(n => `<button class="btn small ghost" type="button" data-action="set-sheriff" data-player="${n}">移交给 ${n}号</button>`).join("")}<button class="btn warn small" type="button" data-action="lose-sheriff">撕毁警徽</button>`;
    } else if (holder) {
      actions = `<span class="help">警长存活，无需处理警徽。</span>`;
    } else {
      actions = `<span class="help">当前尚无警长。</span>`;
    }
    return `<section class="panel"><h3>警徽管理</h3>
      <div class="notice ${room.sheriff.lost || deadHolder ? "warn" : ""}">${room.sheriff.lost ? "警徽已流失 / 撕毁。" : holder ? `当前警长：${holder} 号${deadHolder ? "（已死亡，请移交或撕毁警徽）" : ""}` : "当前尚无警长。"}</div>
      <div class="row">${actions}</div>
    </section>`;
  }

  function renderDeathPanel(room, day) {
    const deathText = deathSpeech(room);
    const firstDayElectionPending = room.day === 1 && !room.sheriff.holder && !room.sheriff.lost;
    const details = day.nightDeaths.length ? `<br>死因仅法官可见：${[...day.nightDeaths].sort((a, b) => a - b).map(n => `${n}号（${esc(room.players[String(n)].deathReason.slice(-1)[0] || "夜间出局")}）`).join("；")}` : "";
    if (!day.deathAnnounced) {
      return `<section class="panel"><h3>天亮与死讯</h3>
        ${firstDayElectionPending ? `<div class="notice warn">第一天必须先完成警长竞选并记录警长结果，再宣布昨夜死讯。</div>` : ""}
        <div class="row"><button class="btn primary" type="button" data-action="announce-deaths" ${firstDayElectionPending ? "disabled" : ""}>播报昨夜死讯并确认公布</button></div>
        <div class="notice">待播报：${esc(deathText)}${details}</div>
      </section>`;
    }
    return `<section class="panel"><h3>天亮与死讯</h3>
      <div class="row">${speechButton(deathText, "重新播报昨夜死讯")}</div>
      <div class="notice"><strong>死讯已公布：</strong>${esc(deathText)}${details}</div>
    </section>`;
  }

  function renderDay(room) {
    const day = currentDay(room);
    const afterDeath = day.deathAnnounced;
    return `<div class="stage-layout">
      <div>
        ${room.day === 1 ? renderPolicePanel(room, day) : ""}
        ${renderDeathPanel(room, day)}
        ${afterDeath ? renderSheriffPanel(room) : ""}
        ${renderDaySpeechOrder(room, day)}
        ${afterDeath ? renderDayEvents(room, day) : `<section class="panel"><h3>白天事件</h3><div class="notice">公布昨夜死讯后开放放逐、自爆、开枪等白天事件记录。</div></section>`}
        <section class="panel">
          <h3>结束白天</h3>
          <p class="help">确认放逐、技能与警徽信息都已记录后进入下一夜。工具不会自动判断胜负。</p>
          <button class="btn primary" type="button" data-action="next-night" ${afterDeath ? "" : "disabled"}>结束白天，进入第 ${room.day + 1} 夜</button>
        </section>
      </div>
      ${renderJudgeSidebar(room)}
    </div>`;
  }

  function phaseTabs(room) {
    return `<div class="phase-tabs"><span class="phase-pill ${room.period === "night" ? "active" : ""}">第 ${room.day} 夜</span><span class="phase-pill ${room.period === "day" ? "active" : ""}">第 ${room.day} 天</span><span class="phase-pill">${esc(APP_VERSION)}</span></div>`;
  }

  function renderRoom(room) {
    const v = variantOf(room);
    const nightmareText = room.variantId === "nightmare12" ? ` · ${room.settings.nightmareStrength === "weak" ? "弱梦魇" : "强梦魇"}` : "";
    $("#app").innerHTML = `<div class="room-head">
      <div><div class="kicker">${esc(v.name)}</div><h2>${esc(room.name)}</h2><p>${esc(v.summary)}${nightmareText}</p></div>
      <div class="room-meta"><span class="badge gold">第 ${room.day} 天</span><span class="badge ${room.period === "night" ? "wolf" : "good"}">${room.period === "night" ? "夜间" : "白天"}</span></div>
    </div>
    ${phaseTabs(room)}
    <section class="panel"><h3>玩家状态</h3>${renderPlayerStrip(room)}</section>
    ${room.period === "night" ? renderNight(room) : renderDay(room)}`;
  }

  function renderHome() {
    const rooms = Object.values(store.rooms).sort((a, b) => b.updatedAt - a.updatedAt);
    const variantOptions = Object.values(VARIANTS).map(v => `<option value="${v.id}">${esc(v.name)} · ${v.playerCount}人</option>`).join("");
    $("#app").innerHTML = `<section class="hero">
      <div class="card hero-copy"><div class="kicker">GitHub Pages · 纯前端</div><h2>思潜狼人杀法官工具</h2><p>本版已重建主脚本，修复乱码与卡死，并保留多房间、夜间口令、身份登记、自动结算、警徽、发言顺序、撤销和 JSON 导入导出。手机端按钮会自动重排，固定口令可用真人录音替换系统语音。</p></div>
      <div class="card hero-aside"><strong>当前版本 ${esc(APP_VERSION)}</strong><p class="help">所有房间只保存在当前浏览器。正式开局前建议导出房间 JSON 备份。</p><div class="row"><button class="btn good" type="button" data-voice-action="unlock">启用/测试语音</button><button class="btn ghost" type="button" data-action="import-room">导入房间 JSON</button><button class="btn ghost" type="button" data-voice-action="open">音色 / 真人录音</button></div></div>
    </section>
    <div class="section-title"><div><h2>新建房间</h2><p>法官线下发牌，网页只记录与辅助播报。</p></div></div>
    <section class="panel">
      <div class="form-grid">
        <label class="field"><span>房间名称</span><input class="input" id="newRoomName" maxlength="40" placeholder="例如：周五第一桌"></label>
        <label class="field"><span>版型</span><select class="select" id="newVariant">${variantOptions}</select></label>
      </div>
      <div id="nightmareOption" class="field" hidden style="margin-top:12px"><span>梦魇规则</span><select class="select" id="nightmareStrength"><option value="strong">强梦魇：恐惧狼人无事发生</option><option value="weak">弱梦魇：恐惧狼人则狼队不带刀</option></select></div>
      <div class="footer-actions"><span class="help">发言方向规则：随机号码为奇数 → 顺序；偶数 → 逆序。</span><button class="btn primary" type="button" data-action="create-room">创建房间</button></div>
    </section>
    <div class="section-title"><div><h2>已有房间</h2><p>${rooms.length} 个本地房间</p></div>${rooms.length ? `<button class="btn danger small" type="button" data-action="delete-all-rooms">删除全部房间</button>` : ""}</div>
    <div class="grid room-grid">${rooms.length ? rooms.map(room => {
      const v = variantOf(room);
      return `<article class="card room-card"><div class="kicker">${esc(v.name)}</div><h3>${esc(room.name)}</h3><p>第 ${room.day} 天 · ${room.period === "night" ? "夜间" : "白天"} · 更新 ${esc(fmtTime(room.updatedAt))}</p><div class="room-meta"><span class="badge">${v.playerCount} 人</span><span class="badge ${room.period === "night" ? "wolf" : "good"}">${room.period === "night" ? "夜间进行中" : "白天进行中"}</span></div><div class="row"><button class="btn primary" type="button" data-action="open-room" data-room="${room.id}">进入</button><button class="btn ghost small" type="button" data-action="open-room-tab" data-room="${room.id}">新标签</button><button class="btn ghost small" type="button" data-action="export-room" data-room="${room.id}">导出</button><button class="btn danger small" type="button" data-action="delete-room" data-room="${room.id}">删除</button></div></article>`;
    }).join("") : `<div class="empty">还没有房间。创建第一桌后即可开始夜间流程。</div>`}</div>`;
    updateNightmareCreateVisibility();
  }

  function renderTopActions(room) {
    const container = $("#topActions");
    if (!container) return;
    if (!room) {
      container.innerHTML = `<button class="btn good small" type="button" data-voice-action="unlock">启用/测试语音</button><button class="btn ghost small" type="button" data-voice-action="open">音色 / 真人录音</button><button class="btn ghost small" type="button" data-action="import-room">导入房间</button>`;
      return;
    }
    container.innerHTML = `<button class="btn ghost small" type="button" data-action="home">房间列表</button>
      <button class="btn ghost small" type="button" data-action="undo" ${room.undo?.length ? "" : "disabled"}>撤销</button>
      <button class="btn ghost small" type="button" data-action="export-room" data-room="${room.id}">导出</button>
      <select class="select" id="speechRate" aria-label="播报语速" style="width:auto;min-height:36px;padding:6px 9px"><option value="0.84">慢速</option><option value="0.92">自然</option><option value="1">正常</option></select>
      <button class="btn good small" type="button" data-voice-action="unlock">启用/测试语音</button>
      <button class="btn ghost small" type="button" data-voice-action="open">音色 / 真人录音</button>`;
    const rate = $("#speechRate");
    if (rate) rate.value = String(store.settings.speechRate || 0.92);
  }

  function render() {
    const room = currentRoom();
    renderTopActions(room);
    if (room) renderRoom(room);
    else renderHome();
  }

  function updateNightmareCreateVisibility() {
    const variant = $("#newVariant");
    const option = $("#nightmareOption");
    if (variant && option) option.hidden = variant.value !== "nightmare12";
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function recordDayEvent(room, type, text) {
    currentDay(room).events.push({ time: now(), type, text });
    pushHistory(room, text, "白天事件");
  }

  function handleDayEvent(room, kind) {
    if (kind === "exile") {
      const target = Number($("#exileTarget")?.value || 0);
      if (!target || !isAlive(room, target)) throw new Error("请选择仍在场的放逐目标。");
      const idiot = Number(room.identities.idiot || 0);
      if (target === idiot && !room.players[String(target)].idiotRevealed) {
        const player = room.players[String(target)];
        player.idiotRevealed = true;
        player.canVote = false;
        recordDayEvent(room, "放逐", `${target}号白痴翻牌免疫放逐，继续存活但失去投票权。`);
      } else {
        recordDeath(room, target, "白天放逐");
        recordDayEvent(room, "放逐", `${target}号被放逐出局。`);
      }
      return;
    }
    if (kind === "explode") {
      const actor = Number($("#explodeActor")?.value || 0);
      if (!actor || !isAlive(room, actor) || !isWolfCampIgnoringHybrid(room, actor)) throw new Error("请选择仍在场的狼人阵营玩家自爆。");
      if (actor === Number(room.identities.beauty || 0)) throw new Error("当前规则中狼美人不能自爆。");
      if (actor === Number(room.identities.mechanical || 0)) throw new Error("当前规则中机械狼不能自爆。");
      recordDeath(room, actor, "狼人自爆");
      if (actor === Number(room.identities.wolfKing || 0)) room.players[String(actor)].shotUsed = true;
      recordDayEvent(room, "自爆", `${actor}号狼人自爆出局。`);
      return;
    }
    if (kind === "huntershot") {
      const actor = Number(room.identities.hunter || 0);
      const target = Number($("#hunterShotTarget")?.value || 0);
      if (!actor || !canShootAfterDeath(room, "hunter", actor)) throw new Error("当前猎人不能开枪，或已经使用过技能。");
      if (!target || !isAlive(room, target)) throw new Error("请选择仍在场的开枪目标。");
      room.players[String(actor)].shotUsed = true;
      recordDeath(room, target, `猎人 ${actor} 号开枪`);
      recordDayEvent(room, "猎人开枪", `${actor}号猎人开枪带走${target}号。`);
      return;
    }
    if (kind === "wolfkingshot") {
      const actor = Number(room.identities.wolfKing || 0);
      const target = Number($("#wolfKingShotTarget")?.value || 0);
      if (!actor || !canShootAfterDeath(room, "wolfKing", actor)) throw new Error("当前狼王不能开枪，或已经使用过技能。");
      if (!target || !isAlive(room, target)) throw new Error("请选择仍在场的开枪目标。");
      room.players[String(actor)].shotUsed = true;
      recordDeath(room, target, `狼王 ${actor} 号开枪`);
      recordDayEvent(room, "狼王开枪", `${actor}号狼王开枪带走${target}号。`);
      return;
    }
    if (kind === "knightduel") {
      const actor = Number(room.identities.knight || 0);
      const target = Number($("#knightTarget")?.value || 0);
      if (!actor || !isAlive(room, actor) || !room.resources.knightDuel) throw new Error("骑士当前不能发动决斗。");
      if (!target || !isAlive(room, target) || target === actor) throw new Error("请选择有效的决斗目标。");
      room.resources.knightDuel = false;
      if (isWolfCampIgnoringHybrid(room, target)) {
        recordDeath(room, target, "骑士决斗", { chainBeauty: false });
        recordDayEvent(room, "骑士决斗", `${actor}号骑士决斗${target}号，目标为狼人阵营，${target}号出局。`);
      } else {
        recordDeath(room, actor, "骑士决斗失败", { chainBeauty: false });
        recordDayEvent(room, "骑士决斗", `${actor}号骑士决斗${target}号，目标非狼人阵营，骑士出局。`);
      }
      return;
    }
    if (kind === "otherdeath") {
      const target = Number($("#otherDeathTarget")?.value || 0);
      const reason = String($("#otherDeathReason")?.value || "其他出局").trim() || "其他出局";
      if (!target || !isAlive(room, target)) throw new Error("请选择仍在场的玩家。");
      recordDeath(room, target, reason);
      recordDayEvent(room, "其他出局", `${target}号出局：${reason}。`);
    }
  }

  function clearAfterFearChange(room) {
    const night = currentNight(room);
    night.guardTarget = null;
    night.guardPass = false;
    night.wolfKill = null;
    night.wolfPass = false;
    night.wolfConfirmed = false;
    night.witchSave = false;
    night.witchPoison = null;
    night.witchConfirmed = false;
    night.hunterConfirmed = false;
    night.seerTarget = null;
    night.seerConfirmed = false;
  }

  function nextNight(room) {
    room.day += 1;
    room.period = "night";
    room.nightStageIndex = 0;
    room.nights[String(room.day)] = newNightRecord();
    room.days[String(room.day)] = newDayRecord();
    pushHistory(room, `进入第 ${room.day} 夜。`, "流程");
  }

  function handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const room = currentRoom();

    if (action === "speak") {
      speak(decodeURIComponent(button.dataset.speech || ""));
      return;
    }
    if (action === "home") {
      goHome();
      return;
    }
    if (action === "open-room") {
      openRoom(button.dataset.room);
      return;
    }
    if (action === "open-room-tab") {
      openRoom(button.dataset.room, true);
      return;
    }
    if (action === "import-room") {
      $("#importRoomFile")?.click();
      return;
    }
    if (action === "export-room") {
      const target = store.rooms[button.dataset.room || room?.id];
      if (target) downloadJson(`${target.name.replace(/[\\/:*?"<>|]/g, "_")}.json`, target);
      return;
    }
    if (action === "create-room") {
      try {
        const name = $("#newRoomName")?.value || "未命名房间";
        const variantId = $("#newVariant")?.value || "mix13";
        const nightmareStrength = $("#nightmareStrength")?.value || "strong";
        const created = createRoom(name, variantId, { nightmareStrength });
        store.rooms[created.id] = created;
        saveStore();
        openRoom(created.id);
      } catch (error) {
        toast(error.message);
      }
      return;
    }
    if (action === "delete-room" || action === "delete-all-rooms") {
      const all = action === "delete-all-rooms";
      const target = store.rooms[button.dataset.room || room?.id];
      const text = all ? "确定删除当前浏览器里的全部房间吗？此操作不可撤销。" : `确定删除房间“${target?.name || ""}”吗？`;
      if (!confirm(text)) return;
      if (all) store.rooms = {};
      else if (target) delete store.rooms[target.id];
      saveStore();
      if (all || target?.id === currentRoomId()) goHome(); else render();
      toast(all ? "已删除全部房间。" : "房间已删除。");
      return;
    }
    if (action === "undo") {
      if (room) undoRoom(room.id);
      return;
    }
    if (!room) return;

    const player = Number(button.dataset.player || 0);
    const role = button.dataset.role || "";

    if (action === "set-identity") {
      commitRoom(room.id, r => {
        if (!identityRegistrationOpen(r)) throw new Error("身份仅在第一夜登记；第二夜起不再修改身份登记。");
        setIdentity(r, role, player);
        pushHistory(r, `登记${ROLE_META[role]?.name || role}：${player}号。`);
      });
      return;
    }

    if (action === "set-idol") {
      commitRoom(room.id, r => {
        if (!identityRegistrationOpen(r)) throw new Error("混血儿榜样仅在第一夜登记。");
        if (!r.identities.hybrid) throw new Error("请先登记混血儿身份。");
        if (player === Number(r.identities.hybrid)) throw new Error("混血儿不能选择自己为榜样。");
        r.identities.idol = player;
        pushHistory(r, `混血儿榜样：${player}号。预言家查验混血儿仍显示好人。`);
      });
      return;
    }

    if (action === "toggle-wolf") {
      commitRoom(room.id, r => {
        if (!identityRegistrationOpen(r)) throw new Error("狼人身份仅在第一夜登记；第二夜起不再显示或修改身份登记。");
        const v = variantOf(r);
        const pack = r.identities.wolfPack;
        if (pack.includes(player)) {
          if (v.packRole && Number(r.identities[v.packRole]) === player && v.packRole === "nightmare") throw new Error("梦魇已在前一阶段登记，不能从狼队中移除；如需修改，请返回梦魇阶段重选身份。");
          r.identities.wolfPack = pack.filter(n => n !== player);
          if (v.packRole && Number(r.identities[v.packRole]) === player) r.identities[v.packRole] = null;
        } else {
          if (isAssignedElsewhere(r, player, "wolfPack")) throw new Error(`${player}号已登记为其他身份。`);
          if (pack.length >= v.wolfPackSize) throw new Error(`本板型狼窝最多登记 ${v.wolfPackSize} 人。`);
          pack.push(player);
          pack.sort((a, b) => a - b);
        }
      });
      return;
    }

    if (action === "set-night-target") {
      commitRoom(room.id, r => {
        const night = currentNight(r);
        const field = role;
        if (!isAlive(r, player)) throw new Error("目标玩家已出局。");
        const actorByField = { fearTarget: "nightmare", dreamTarget: "dreamer", mechanicalLearnTarget: "mechanical", seerTarget: "seer", psychicTarget: "psychic", charmTarget: "beauty", mechanicalCheck: "mechanical", mechanicalPierceKill: "mechanical" };
        const actorRole = actorByField[field];
        if (actorRole && Number(r.identities[actorRole] || 0) === player) throw new Error("该身份不能选择自己作为目标。");
        if (["guardTarget", "fearTarget", "charmTarget", "mechanicalGuard"].includes(field) && Number(previousNight(r)?.[field] || 0) === player) throw new Error("按当前规则不能连续两夜选择同一目标。");
        if (field === "fearTarget") clearAfterFearChange(r);
        night[field] = player;
        if (field === "guardTarget") night.guardPass = false;
        if (field === "dreamTarget") night.dreamConfirmed = true;
        if (field === "fearTarget") night.fearConfirmed = true;
        if (field === "charmTarget") { night.charmPass = false; night.charmConfirmed = true; }
        if (field === "psychicTarget") night.psychicConfirmed = true;
        if (field === "seerTarget") night.seerConfirmed = true;
        if (field === "mechanicalLearnTarget") night.mechanicalConfirmed = true;
        if (field === "mechanicalGuard") { night.mechanicalGuardPass = false; night.mechanicalSkillConfirmed = true; }
        if (field === "mechanicalPoison") night.mechanicalSkillConfirmed = true;
        if (field === "mechanicalCheck") night.mechanicalSkillConfirmed = true;
        if (field === "mechanicalPierceKill") { night.mechanicalPiercePass = false; night.mechanicalSkillConfirmed = true; }
      });
      return;
    }

    if (action === "pass-night-target") {
      commitRoom(room.id, r => {
        const night = currentNight(r);
        const field = role;
        night[field] = null;
        if (field === "guardTarget") night.guardPass = true;
        if (field === "charmTarget") { night.charmPass = true; night.charmConfirmed = true; }
        if (field === "mechanicalGuard") { night.mechanicalGuardPass = true; night.mechanicalSkillConfirmed = true; }
        if (field === "mechanicalPoison") night.mechanicalSkillConfirmed = true;
        if (field === "mechanicalPierceKill") { night.mechanicalPiercePass = true; night.mechanicalSkillConfirmed = true; }
      });
      return;
    }

    if (action === "set-wolf-kill") {
      commitRoom(room.id, r => {
        if (nightmareBlocksWolf(r)) throw new Error("弱梦魇恐惧狼人，本夜狼队不能带刀。");
        const night = currentNight(r);
        if (!isAlive(r, player)) throw new Error("目标玩家已出局。");
        if (r.day === 1 && !mechanicalCarriesKnife(r) && r.identities.wolfPack.includes(player)) throw new Error("思潜规则：首夜禁止狼人自刀。");
        if (player === Number(r.identities.beauty || 0)) throw new Error("狼美人不能被狼队自刀。");
        if (mechanicalCarriesKnife(r) && player === Number(r.identities.mechanical || 0)) throw new Error("机械狼接刀时不能刀自己。");
        night.wolfKill = player;
        night.wolfPass = false;
        night.wolfConfirmed = true;
        night.witchPoison = null;
        night.witchConfirmed = false;
        if (r.day === 1 && r.resources.antidote && r.identities.witch && Number(r.identities.witch) !== player && !isBlocked(r, "witch")) {
          night.witchSave = true;
          night.witchConfirmed = true;
        } else {
          night.witchSave = false;
        }
      });
      return;
    }

    if (action === "wolf-pass") {
      commitRoom(room.id, r => {
        const night = currentNight(r);
        night.wolfKill = null;
        night.wolfPass = true;
        night.wolfConfirmed = true;
        night.witchSave = false;
        night.witchPoison = null;
        night.witchConfirmed = false;
      });
      return;
    }

    if (action === "confirm-mechanical-knife") {
      commitRoom(room.id, r => { currentNight(r).mechanicalKnifeConfirmed = true; }, { undo: false });
      return;
    }

    if (action === "confirm-mechanical-skill-skip") {
      commitRoom(room.id, r => {
        const night = currentNight(r);
        night.mechanicalSkillConfirmed = true;
        const learned = learnedRoleKey(r);
        if (learned === "wolf") {
          night.mechanicalPierceKill = null;
          night.mechanicalPiercePass = true;
        }
      }, { undo: false });
      return;
    }

    if (action === "witch-save") {
      commitRoom(room.id, r => {
        const night = currentNight(r);
        if (!r.resources.antidote || !night.wolfKill || nightmareBlocksWolf(r)) throw new Error("当前没有可使用解药的有效刀口。");
        if (Number(r.identities.witch) === Number(night.wolfKill)) throw new Error("女巫不能自救。");
        night.witchSave = true;
        night.witchPoison = null;
        night.witchConfirmed = true;
      });
      return;
    }

    if (action === "witch-no-save") {
      commitRoom(room.id, r => {
        const night = currentNight(r);
        night.witchSave = false;
        night.witchConfirmed = true;
      });
      return;
    }

    if (action === "witch-poison") {
      commitRoom(room.id, r => {
        const night = currentNight(r);
        if (!r.resources.poison) throw new Error("女巫毒药已经使用。");
        if (!isAlive(r, player)) throw new Error("目标玩家已出局。");
        night.witchPoison = player;
        night.witchSave = false;
        night.witchConfirmed = true;
      });
      return;
    }

    if (action === "witch-no-poison") {
      commitRoom(room.id, r => {
        currentNight(r).witchPoison = null;
        currentNight(r).witchConfirmed = true;
      });
      return;
    }

    if (action === "confirm-hunter") {
      commitRoom(room.id, r => { currentNight(r).hunterConfirmed = true; }, { undo: false });
      return;
    }

    if (action === "confirm-learning") {
      commitRoom(room.id, r => { currentNight(r).learningFeedback = true; }, { undo: false });
      return;
    }

    if (action === "prev-stage") {
      commitRoom(room.id, r => { r.nightStageIndex = Math.max(0, r.nightStageIndex - 1); }, { undo: false });
      return;
    }

    if (action === "next-stage") {
      commitRoom(room.id, r => {
        const stages = getNightStages(r);
        const stage = stages[r.nightStageIndex];
        validateStage(r, stage);
        r.nightStageIndex += 1;
      }, { undo: false });
      return;
    }

    if (action === "finalize-night") {
      commitRoom(room.id, r => finalizeNight(r));
      return;
    }

    if (action === "announce-police-start") {
      if (room.day !== 1) return;
      speak(POLICE_START_SPEECH);
      commitRoom(room.id, r => {
        currentDay(r).policeStartAnnounced = true;
        pushHistory(r, "已播报上警准备，开始登记警上玩家。", "警长竞选");
      }, { undo: false });
      return;
    }

    if (action === "toggle-police") {
      commitRoom(room.id, r => {
        const day = currentDay(r);
        if (!day.policeStartAnnounced) throw new Error("请先播报上警准备。");
        if (day.policeRegistrationFinalized) throw new Error("警上名单已经确认。如需修改，请撤销上一步后重新登记。");
        const set = new Set(day.policeCandidates.map(Number));
        if (set.has(player)) set.delete(player); else set.add(player);
        day.policeCandidates = [...set].sort((a, b) => a - b);
        day.policeOrder = null;
      });
      return;
    }

    if (action === "finalize-police-registration") {
      const candidatesSentence = policeCandidatesSpeech(currentDay(room).policeCandidates);
      let finalized = false;
      commitRoom(room.id, r => {
        const day = currentDay(r);
        if (!day.policeStartAnnounced) throw new Error("请先播报上警准备。");
        if (!day.policeCandidates.length) throw new Error("请先登记至少一名上警玩家。");
        if (day.policeRegistrationFinalized) throw new Error("警上名单与随机点数已经固定。");
        day.policeOrder = buildPoliceOrder(r, day.policeCandidates);
        day.policeRegistrationFinalized = true;
        finalized = true;
        pushHistory(r, `${policeCandidatesSpeech(day.policeCandidates)} 系统固定点数 ${day.policeOrder.rawAnchor}，${directionText(day.policeOrder.direction)}，实际从 ${day.policeOrder.effectiveAnchor} 号警上玩家开始。`, "警长竞选");
      });
      // 保持在用户点击的同步调用栈内播报，兼容 iOS Safari。
      if (finalized) speak(candidatesSentence);
      return;
    }

    if (action === "set-sheriff") {
      commitRoom(room.id, r => {
        const day = currentDay(r);
        const check = sheriffAssignmentCheck(r, player);
        if (!check.ok) throw new Error(check.reason);
        const wasDeadHolder = day.deathAnnounced && Number(r.sheriff.holder || 0) && !isAlive(r, Number(r.sheriff.holder));
        r.sheriff.holder = player;
        r.sheriff.lost = false;
        day.speechOrder = null;
        pushHistory(r, wasDeadHolder ? `警徽移交给 ${player}号。` : `${player}号成为警长。`, "警徽");
      });
      return;
    }

    if (action === "lose-sheriff") {
      commitRoom(room.id, r => {
        r.sheriff.holder = null;
        r.sheriff.lost = true;
        currentDay(r).speechOrder = null;
        pushHistory(r, "警徽流失 / 撕毁。", "警徽");
      });
      return;
    }

    if (action === "announce-deaths") {
      const day = currentDay(room);
      if (room.day === 1 && !room.sheriff.holder && !room.sheriff.lost) {
        toast("请先完成警长竞选并记录警长结果。");
        return;
      }
      const sentence = deathSpeech(room);
      speak(sentence);
      commitRoom(room.id, r => {
        const d = currentDay(r);
        d.deathAnnounced = true;
        d.speechOrder = null;
        pushHistory(r, `公布死讯：${deathSpeech(r)}`, "死讯");
      }, { undo: false });
      return;
    }

    if (action === "random-day-order") {
      commitRoom(room.id, r => {
        const day = currentDay(r);
        if (!day.deathAnnounced) throw new Error("请先公布昨夜死讯。");
        day.speechOrder = buildRandomOrder(r, null, { includeDeadAnchor: false, aliveOnly: true });
        day.speechOrder.bySheriff = false;
        pushHistory(r, `随机点数 ${day.speechOrder.rawAnchor}，${directionText(day.speechOrder.direction)}，实际从 ${day.speechOrder.effectiveAnchor} 号开始。`, "发言顺序");
      });
      return;
    }

    if (action === "set-sheriff-speech") {
      commitRoom(room.id, r => {
        const day = currentDay(r);
        if (!day.deathAnnounced) throw new Error("请先公布昨夜死讯。");
        day.speechOrder = buildSheriffSpeechOrder(r, button.dataset.side);
        pushHistory(r, `${day.speechOrder.sheriffChoice.startsWith("death") ? "死" : "警"}${button.dataset.side === "right" ? "右" : "左"}发言：${speakerReadySentence(day.speechOrder)}`, "发言顺序");
      });
      return;
    }

    if (action === "day-form") {
      const kind = button.dataset.kind;
      commitRoom(room.id, r => handleDayEvent(r, kind));
      return;
    }

    if (action === "next-night") {
      commitRoom(room.id, r => nextNight(r));
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 3 * 1024 * 1024) throw new Error("房间 JSON 过大，请确认文件是否正确。");
      const parsed = JSON.parse(await file.text());
      const candidate = parsed.variantId ? parsed : parsed.room;
      if (!candidate) throw new Error("JSON 中没有找到房间数据。");
      const room = normalizeRoom(candidate);
      if (store.rooms[room.id]) room.id = uid();
      room.name = `${room.name}（导入）`;
      room.undo = [];
      store.rooms[room.id] = room;
      saveStore();
      openRoom(room.id);
      toast("房间已导入。");
    } catch (error) {
      toast(error.message || "导入失败。");
    } finally {
      event.target.value = "";
    }
  }

  function handleChange(event) {
    if (event.target.id === "newVariant") {
      updateNightmareCreateVisibility();
      return;
    }
    if (event.target.id === "speechRate") {
      store.settings.speechRate = Number(event.target.value || 0.92);
      saveStore();
      toast("播报语速已更新。");
    }
  }

  function installErrorBoundary() {
    window.addEventListener("error", event => {
      const app = $("#app");
      if (!app) return;
      if (!app.innerHTML.trim()) {
        app.innerHTML = `<section class="panel"><h2>页面脚本发生错误</h2><p>请刷新页面；如果仍然出现，请确认 GitHub Pages 上的 app.js、speech.js、index.html 是同一版本。</p><pre class="mono">${esc(event.message || "未知错误")}</pre></section>`;
      }
    });
  }

  function boot() {
    installErrorBoundary();
    store = loadStore();
    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);
    $("#importRoomFile")?.addEventListener("change", handleImport);
    window.addEventListener("popstate", render);
    window.addEventListener("storage", event => {
      if (event.key === STORAGE_KEY) {
        store = loadStore();
        render();
        toast("检测到另一个标签页更新了房间数据。");
      }
    });
    render();
  }

  const CORE = {
    VARIANTS,
    ROLE_META,
    createRoom,
    normalizeRoom,
    seerResult,
    directionForAnchor,
    firstAliveFrom,
    circularOrder,
    buildRandomOrder,
    buildPoliceOrder,
    policeCandidatesSpeech,
    renderPolicePanel,
    buildSheriffSpeechOrder,
    deathSpeech,
    policeSpeech,
    daySpeechSentence,
    sheriffAssignmentCheck,
    stageScripts,
    renderStage,
    getNightStages,
    validateStage,
    finalizeNight,
    nightmareBlocksWolf,
    mechanicalCarriesKnife,
    computeNightOutcome,
    learnedRoleKey,
    psychicResult,
    setIdentity,
    identityRegistrationOpen,
    currentNight,
    previousNight,
    isWolfCamp,
    isWolfCampIgnoringHybrid,
    APP_VERSION
  };

  if (typeof globalThis !== "undefined") globalThis.__JudgeCore = CORE;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
    else boot();
  }
})();
