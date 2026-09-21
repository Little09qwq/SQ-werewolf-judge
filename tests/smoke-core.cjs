"use strict";
require("../app.js");
const C = globalThis.__JudgeCore;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(C, "Judge core not exported");
assert(Object.keys(C.VARIANTS).length === 7, "Expected 7 variants");

for (const [id, variant] of Object.entries(C.VARIANTS)) {
  const room = C.createRoom(`test-${id}`, id, { nightmareStrength: id === "nightmare12" ? "weak" : "strong" });
  assert(Object.keys(room.players).length === variant.playerCount, `${id}: player count`);
  assert(C.getNightStages(room).length > 0, `${id}: night stages`);
}

{
  const room = C.createRoom("order", "classic12");
  room.players["5"].alive = false;
  room.players["6"].alive = false;
  const odd = C.buildRandomOrder(room, 5, { includeDeadAnchor: false, aliveOnly: true });
  assert(odd.direction === "forward", "Odd anchor must be forward");
  assert(odd.effectiveAnchor === 7, "5/6 dead: forward should continue at 7");
  const even = C.buildRandomOrder(room, 6, { includeDeadAnchor: false, aliveOnly: true });
  assert(even.direction === "reverse", "Even anchor must be reverse");
  assert(even.effectiveAnchor === 4, "6/5 dead: reverse should continue at 4");
}

{
  const room = C.createRoom("hybrid", "mix13");
  C.setIdentity(room, "hybrid", 1);
  room.identities.idol = 2;
  room.identities.wolfPack = [2, 3, 4, 5];
  assert(C.isWolfCamp(room, 1), "Hybrid may follow a wolf idol for camp logic");
  assert(C.seerResult(room, 1) === "好人", "Hybrid must always verify as good");
}

{
  const room = C.createRoom("nightmare", "nightmare12", { nightmareStrength: "strong" });
  C.setIdentity(room, "nightmare", 1);
  room.identities.wolfPack = [1, 2, 3, 4];
  C.currentNight(room).fearTarget = 2;
  assert(!C.nightmareBlocksWolf(room), "Strong nightmare must not block wolf kill");
  room.settings.nightmareStrength = "weak";
  assert(C.nightmareBlocksWolf(room), "Weak nightmare must block wolf kill when a wolf is feared");
}

{
  const room = C.createRoom("guard-save", "wolfKingGuard12");
  room.identities.wolfPack = [1, 2, 3, 4];
  room.identities.wolfKing = 1;
  C.setIdentity(room, "guard", 5);
  C.setIdentity(room, "witch", 6);
  C.setIdentity(room, "hunter", 7);
  C.setIdentity(room, "seer", 8);
  const night = C.currentNight(room);
  night.guardTarget = 9;
  night.wolfKill = 9;
  night.witchSave = true;
  const outcome = C.computeNightOutcome(room);
  assert(outcome.deaths.some(item => item.number === 9 && item.reasons.includes("同守同救")), "Same guard + save must kill");
}

{
  const legacy = C.createRoom("legacy", "classic12");
  legacy.variantId = "wolfGuard12";
  legacy.rules = { nightmareMode: "weak" };
  legacy.sheriff = { holder: 3, destroyed: false };
  const migrated = C.normalizeRoom(legacy);
  assert(migrated.variantId === "wolfKingGuard12", "Legacy variant id migration");
  assert(migrated.sheriff.holder === 3 && migrated.sheriff.lost === false, "Legacy sheriff migration");
}


{
  const room = C.createRoom("death-speech", "classic12");
  room.period = "day";
  room.days["1"].nightDeaths = [];
  assert(C.deathSpeech(room) === "昨夜平安夜。", "Peaceful-night wording");
  room.days["1"].nightDeaths = [9];
  assert(C.deathSpeech(room) === "昨夜，9号玩家单死。", "Single-death wording");
  room.days["1"].nightDeaths = [9, 3];
  assert(C.deathSpeech(room) === "昨夜双死，死亡顺序不分先后，3号，9号。", "Double-death wording and sorting");
  room.days["1"].nightDeaths = [12, 2, 8, 5];
  assert(C.deathSpeech(room) === "昨夜多死，死亡顺序不分先后，2号，5号，8号，12号。", "Multi-death wording and sorting");
}

{
  const room = C.createRoom("police-order", "classic12");
  assert(C.policeCandidatesSpeech([9, 2, 8]) === "本局游戏上警玩家为2号，8号，9号。", "Police candidate announcement is sorted and exact");

  // 固定点数来自全桌：5 号可以在警下。5 为奇数，所以沿正序跳过 5/6/7 警下位，从 8 号警上开始。
  const odd = C.buildPoliceOrder(room, [8, 9], 5);
  assert(odd.rawAnchor === 5, "Police raw anchor must preserve a non-candidate table number");
  assert(odd.direction === "forward", "Police odd anchor uses forward order");
  assert(odd.effectiveAnchor === 8, "Police forward order skips police-down players to 8");
  assert(odd.order.join(",") === "8,9", "Police forward order only includes candidates");
  assert(C.policeSpeech(room, odd) === "8号玩家开始正序发言，9号玩家做发言准备。", "Police speech uses actual first/second speakers");
  assert(!/随机点数|奇数|偶数/.test(C.policeSpeech(room, odd)), "Police speech must not announce random/odd/even logic");

  const even = C.buildPoliceOrder(room, [2, 5, 9], 6);
  assert(even.rawAnchor === 6, "Even raw anchor may also be police-down");
  assert(even.direction === "reverse", "Police even anchor uses reverse order");
  assert(even.effectiveAnchor === 5, "Police reverse order skips to 5");
  assert(even.order.join(",") === "5,2,9", "Police reverse order follows the fixed table direction");
  assert(C.policeSpeech(room, even) === "5号玩家开始逆序发言，2号玩家做发言准备。", "Reverse police speech exact wording");

  room.period = "day";
  room.days["1"].policeStartAnnounced = true;
  room.days["1"].policeCandidates = [8, 9];
  let panel = C.renderPolicePanel(room, room.days["1"]);
  assert(panel.includes('data-action="finalize-police-registration"'), "Police panel must finalize registration instead of exposing a random button");
  assert(!panel.includes('data-action="random-police-order"'), "Judge must not have a police random-number button");
  room.days["1"].policeRegistrationFinalized = true;
  room.days["1"].policeOrder = odd;
  panel = C.renderPolicePanel(room, room.days["1"]);
  assert(panel.includes("系统固定点数：5 号"), "Fixed table-wide random number is persisted in the judge UI");
  assert(panel.includes("8号玩家开始正序发言，9号玩家做发言准备。"), "Police panel shows actual effective start");
}


{
  const room = C.createRoom("sheriff-single", "classic12");
  room.period = "day";
  room.sheriff.holder = 4;
  room.days["1"].deathAnnounced = true;
  room.days["1"].nightDeaths = [7];
  room.players["7"].alive = false;
  const left = C.buildSheriffSpeechOrder(room, "left");
  assert(left.sheriffChoice === "death-left", "Single death uses death-left/right mode");
  assert(left.order[0] === 8 && left.order[1] === 9, "Death-left starts with next living player on left");
  assert(left.order[left.order.length - 1] === 4, "Sheriff must speak last after death-left choice");
  assert(C.daySpeechSentence(room, left, true) === "8号玩家请发言，9号玩家做发言准备。", "Sheriff speech exact ready wording");
  const right = C.buildSheriffSpeechOrder(room, "right");
  assert(right.order[0] === 6 && right.order[1] === 5, "Death-right starts with next living player on right");
}

{
  const room = C.createRoom("sheriff-multi", "classic12");
  room.period = "day";
  room.sheriff.holder = 4;
  room.days["1"].deathAnnounced = true;
  room.days["1"].nightDeaths = [7, 2];
  room.players["7"].alive = false;
  room.players["2"].alive = false;
  const left = C.buildSheriffSpeechOrder(room, "left");
  assert(left.sheriffChoice === "sheriff-left", "Multi death uses sheriff-left/right mode");
  assert(left.order[0] === 5 && left.order[1] === 6, "Sheriff-left starts beside sheriff");
  assert(left.order[left.order.length - 1] === 4, "Sheriff must speak last after sheriff-left choice");
}

{
  const room = C.createRoom("nightmare-status", "nightmare12", { nightmareStrength: "weak" });
  C.setIdentity(room, "nightmare", 1);
  room.identities.wolfPack = [1, 2, 3, 4];
  C.currentNight(room).fearTarget = 5;
  C.setIdentity(room, "guard", 5);
  const blockedGuard = C.stageScripts(room, "guard");
  assert(blockedGuard[0] === "守卫请睁眼。" && blockedGuard[1] === "你的技能状态为。", "Nightmare guard status immediately follows open");
  assert(blockedGuard.some(x => x.includes("选择你要守护")), "Blocked guard keeps the normal skill-use announcement");
  assert(blockedGuard.includes("法官收到号码为。"), "Blocked guard keeps the normal received-number announcement");
  const wolf = C.stageScripts(room, "wolf");
  assert(wolf[0] === "狼人请睁眼。" && wolf[1] === "你的技能状态为。", "Nightmare wolf status immediately follows open");
}

{
  const room = C.createRoom("nightmare-witch-announcement", "nightmare12", { nightmareStrength: "strong" });
  C.setIdentity(room, "nightmare", 1);
  room.identities.wolfPack = [1, 2, 3, 4];
  C.setIdentity(room, "witch", 5);
  C.setIdentity(room, "guard", 6);
  C.setIdentity(room, "hunter", 7);
  C.setIdentity(room, "seer", 8);
  const night = C.currentNight(room);
  night.fearTarget = 5;
  night.wolfKill = 9;
  const scripts = C.stageScripts(room, "witch");
  assert(scripts[0] === "女巫请睁眼。" && scripts[1] === "你的技能状态为。", "Feared witch still gets status immediately after opening");
  assert(scripts.includes("今夜死亡玩家为。"), "Feared witch still gets the death-player announcement");
  assert(scripts.includes("救给手势，毒给号码。"), "Feared witch still gets the normal potion-use announcement");
  assert(!scripts.some(x => x.includes("希望玩家")), "Legacy witch wording must be removed");
  const html = C.renderStage(room, "witch", 3, C.getNightStages(room));
  assert(html.includes("今夜死亡玩家（仅法官可见）"), "Feared witch keeps the death-player judge box");
  assert(html.includes("9 号"), "Feared witch death-player box shows the wolf-kill target");
  assert(html.includes("仍按正常流程播报死亡玩家和用药口令"), "Feared witch UI explains normal announcement / invalid skill behavior");
  assert(!html.includes('data-action="witch-save"'), "Feared witch cannot submit an effective antidote action");
}

{
  const room = C.createRoom("nightmare-seer-announcement", "nightmare12", { nightmareStrength: "strong" });
  C.setIdentity(room, "nightmare", 1);
  room.identities.wolfPack = [1, 2, 3, 4];
  C.setIdentity(room, "seer", 8);
  C.currentNight(room).fearTarget = 8;
  const scripts = C.stageScripts(room, "seer");
  assert(scripts[0] === "预言家请睁眼。" && scripts[1] === "你的技能状态为。", "Feared seer still gets status immediately after opening");
  assert(scripts.includes("请选择你要查验的玩家。"), "Feared seer keeps the normal check announcement");
  assert(scripts.includes("法官收到号码为。"), "Feared seer keeps the normal received-number announcement");
}

{
  const room = C.createRoom("witch-wording", "classic12");
  const scripts = C.stageScripts(room, "witch");
  assert(scripts.includes("今夜死亡玩家为。"), "All witch variants use death-player wording");
  assert(!scripts.some(x => x.includes("希望玩家")), "Old witch wording is removed globally");
}

{
  const room = C.createRoom("dead-sheriff-election", "classic12");
  room.period = "day";
  room.days["1"].policeCandidates = [3, 6, 9];
  room.days["1"].policeRegistrationFinalized = true;
  room.days["1"].policeOrder = C.buildPoliceOrder(room, room.days["1"].policeCandidates, 5);
  room.days["1"].nightDeaths = [6];
  room.players["6"].alive = false;
  const beforeDeath = C.sheriffAssignmentCheck(room, 6);
  assert(beforeDeath.ok && beforeDeath.nightDeadCandidate, "Night-dead police candidate may be elected before death announcement");
  room.days["1"].deathAnnounced = true;
  const afterDeath = C.sheriffAssignmentCheck(room, 6);
  assert(!afterDeath.ok, "Dead player cannot receive sheriff badge after death announcement");
  assert(C.sheriffAssignmentCheck(room, 3).ok, "Living player may receive transferred sheriff badge");
}

{
  const room = C.createRoom("night2-no-registration", "classic12");
  room.identities.wolfPack = [1, 2, 3, 4];
  C.setIdentity(room, "witch", 5);
  C.setIdentity(room, "hunter", 6);
  C.setIdentity(room, "idiot", 7);
  C.setIdentity(room, "seer", 8);
  assert(C.identityRegistrationOpen(room), "Identity registration is open on the first night");
  room.day = 2;
  room.period = "night";
  room.nights["2"] = {};
  assert(!C.identityRegistrationOpen(room), "Identity registration closes from the second night onward");
  const seerHtml = C.renderStage(room, "seer", 0, ["seer"]);
  const wolfHtml = C.renderStage(room, "wolf", 0, ["wolf"]);
  assert(!seerHtml.includes("登记预言家身份"), "Second night must not show seer identity registration");
  assert(!wolfHtml.includes("登记狼人阵营"), "Second night must not show wolf identity registration");
}


{
  const room = C.createRoom("seer-prompt", "classic12");
  const scripts = C.stageScripts(room, "seer");
  assert(scripts.join("|") === "预言家请睁眼。|请选择你要查验的玩家。|法官收到号码为。|上好爪狼，他的身份为。|预言家确认，请闭眼。", "Classic seer gets the new result prompt in the correct position");
  assert(!scripts.includes("你的技能状态为。"), "Classic seer must not show skill-status prompt without Nightmare");
}

{
  const room = C.createRoom("psychic-prompt", "mechanical12");
  const scripts = C.stageScripts(room, "psychic");
  assert(scripts.join("|") === "通灵师请睁眼。|请选择你要查验的玩家。|法官收到号码为。|他的具体身份为。|通灵师确认，请闭眼。", "Psychic gets the concrete-identity result prompt in the correct position");
  assert(!scripts.includes("你的技能状态为。"), "Psychic must not show skill-status prompt without Nightmare");
}

{
  const room = C.createRoom("nightmare-seer-prompt", "nightmare12", { nightmareStrength: "strong" });
  const scripts = C.stageScripts(room, "seer");
  assert(scripts[0] === "预言家请睁眼。" && scripts[1] === "你的技能状态为。", "Nightmare seer keeps skill status immediately after opening");
  assert(scripts.indexOf("上好爪狼，他的身份为。") === scripts.indexOf("法官收到号码为。") + 1, "Nightmare seer result prompt follows received-number prompt");
}

{
  for (const id of Object.keys(C.VARIANTS).filter(id => id !== "nightmare12")) {
    const room = C.createRoom(`no-status-${id}`, id);
    for (const stage of C.getNightStages(room)) {
      const scripts = C.stageScripts(room, stage);
      assert(!scripts.includes("你的技能状态为。"), `${id}/${stage}: non-Nightmare game must not expose the generic skill-status prompt`);
    }
  }
}


{
  const room = C.createRoom("witch-hidden-knife", "classic12");
  room.identities.wolfPack = [1, 2, 3, 4];
  C.setIdentity(room, "witch", 5);
  C.setIdentity(room, "hunter", 6);
  C.setIdentity(room, "idiot", 7);
  C.setIdentity(room, "seer", 8);
  room.day = 2;
  room.period = "night";
  room.nights["2"] = {};
  room.resources.antidote = false;
  room.resources.poison = true;
  C.currentNight(room).wolfKill = 9;
  const html = C.renderStage(room, "witch", 0, ["witch"]);
  assert(html.includes('<div class="value">狼刀未知</div>'), "After antidote is spent, witch UI must hide the wolf-kill target");
  assert(html.includes("解药已经使用"), "Witch UI explains why the knife is hidden");
}

{
  const room = C.createRoom("mechanical-order", "mechanical12");
  room.identities.wolfPack = [1, 2, 3];
  C.setIdentity(room, "mechanical", 4);
  C.setIdentity(room, "guard", 5);
  C.setIdentity(room, "witch", 6);
  C.setIdentity(room, "hunter", 7);
  C.setIdentity(room, "psychic", 8);
  C.currentNight(room).mechanicalLearnTarget = 9; // once all identities are known this is a villager
  room.day = 2;
  room.period = "night";
  room.nights["2"] = {};
  const stages = C.getNightStages(room);
  assert(stages[0] === "mechanicalKnifeStatus", "From night 2, mechanical knife-status confirmation must be the first stage");
  assert(stages.indexOf("witch") < stages.indexOf("mechanicalSkill"), "Mechanical skill stage must be after witch");
  assert(stages.indexOf("mechanicalSkill") < stages.indexOf("hunter"), "Mechanical skill stage must be before hunter");
  assert(!stages.includes("mechanical"), "Learning stage must not repeat after night 1");
  assert(C.stageScripts(room, "mechanicalKnifeStatus").join("|") === "机械狼请睁眼。|你的带刀状态为。|机械狼确认，请闭眼。", "Mechanical knife-status script must be fixed");
  const generic = C.stageScripts(room, "mechanicalSkill").join("|");
  assert(generic.includes("机械狼请睁眼。") && generic.includes("你的技能结果为。"), "Mechanical skill uses a generic fixed script");
  assert(!/机械守卫|机械女巫|机械通灵师|机械平民|双刀/.test(generic), "Mechanical skill audio must not reveal the learned type");
}

{
  const room = C.createRoom("mechanical-carry", "mechanical12");
  room.identities.wolfPack = [1, 2, 3];
  C.setIdentity(room, "mechanical", 4);
  C.setIdentity(room, "guard", 5);
  C.setIdentity(room, "witch", 6);
  C.setIdentity(room, "hunter", 7);
  C.setIdentity(room, "psychic", 8);
  C.currentNight(room).mechanicalLearnTarget = 1; // learns wolf -> one-time extra pierce knife
  room.day = 2;
  room.period = "night";
  room.nights["2"] = {};
  assert(!C.mechanicalCarriesKnife(room), "Mechanical wolf must not carry the normal knife while any small wolf is alive");
  room.players["1"].alive = false;
  room.players["2"].alive = false;
  room.players["3"].alive = false;
  assert(C.mechanicalCarriesKnife(room), "Mechanical wolf must carry the normal knife after all small wolves are dead");
  assert(C.getNightStages(room).includes("wolf"), "A knife-carrying mechanical wolf must still wake in the wolf phase");
  const statusHtml = C.renderStage(room, "mechanicalKnifeStatus", 0, C.getNightStages(room));
  assert(statusHtml.includes('<div class="value">带刀</div>'), "Judge UI must show the carried-knife state");
}

{
  const room = C.createRoom("mechanical-double-knife", "mechanical12");
  room.identities.wolfPack = [1, 2, 3];
  C.setIdentity(room, "mechanical", 4);
  C.setIdentity(room, "guard", 5);
  C.setIdentity(room, "witch", 6);
  C.setIdentity(room, "hunter", 7);
  C.setIdentity(room, "psychic", 8);
  C.currentNight(room).mechanicalLearnTarget = 1;
  room.players["1"].alive = false;
  room.players["2"].alive = false;
  room.players["3"].alive = false;
  room.day = 2;
  room.period = "night";
  room.nights["2"] = {};
  const night = C.currentNight(room);
  night.guardTarget = 9;
  night.wolfKill = 9;
  night.mechanicalPierceKill = 10;
  const outcome = C.computeNightOutcome(room);
  assert(!outcome.deaths.some(x => x.number === 9), "The normal wolf-phase knife must remain a normal knife and be stopped by guard");
  assert(outcome.deaths.some(x => x.number === 10 && x.reasons.includes("机械狼破盾刀")), "The learned-wolf extra pierce knife must resolve separately");
  assert(outcome.mechanicalPierceKill === 10, "Outcome exposes the separate mechanical pierce target to the judge");
  C.finalizeNight(room);
  assert(room.resources.mechanicalPierce === false, "Using the separate pierce knife consumes its one-time resource");
}

{
  const room = C.createRoom("mechanical-pierce-save", "mechanical12");
  room.identities.wolfPack = [1, 2, 3];
  C.setIdentity(room, "mechanical", 4);
  C.setIdentity(room, "guard", 5);
  C.setIdentity(room, "witch", 6);
  C.setIdentity(room, "hunter", 7);
  C.setIdentity(room, "psychic", 8);
  C.currentNight(room).mechanicalLearnTarget = 1;
  room.players["1"].alive = false;
  room.players["2"].alive = false;
  room.players["3"].alive = false;
  room.day = 2;
  room.period = "night";
  room.nights["2"] = {};
  const night = C.currentNight(room);
  night.wolfPass = true;
  night.mechanicalPiercePass = true;
  night.mechanicalSkillConfirmed = true;
  C.finalizeNight(room);
  assert(room.resources.mechanicalPierce === true, "Skipping the pierce knife must preserve it for a later night");
}

{
  const room = C.createRoom("mechanical-guard-repeat", "mechanical12");
  room.identities.wolfPack = [1, 2, 3];
  C.setIdentity(room, "mechanical", 4);
  C.setIdentity(room, "guard", 5);
  C.setIdentity(room, "witch", 6);
  C.setIdentity(room, "hunter", 7);
  C.setIdentity(room, "psychic", 8);
  C.currentNight(room).mechanicalLearnTarget = 5; // learns guard
  room.day = 2;
  room.period = "night";
  room.nights["2"] = {};
  C.currentNight(room).mechanicalGuard = 9;
  room.day = 3;
  room.nights["3"] = {};
  const html = C.renderStage(room, "mechanicalSkill", 0, ["mechanicalSkill"]);
  assert(html.includes("上一夜机械狼守护：9 号"), "Mechanical guard UI must remember the previous shield target");
  assert(html.includes('<button type="button" class="player-btn" disabled><span>9</span>'), "Mechanical guard cannot guard the same player on consecutive nights");
}

{
  const room = C.createRoom("mechanical-type-secrecy", "mechanical12");
  const baseline = C.stageScripts(room, "mechanicalSkill").join("|");
  for (const target of [1, 5, 6, 8, 9]) {
    C.currentNight(room).mechanicalLearnTarget = target;
    assert(C.stageScripts(room, "mechanicalSkill").join("|") === baseline, "Mechanical skill audio must be identical for every learned type");
  }
}


{
  const room = C.createRoom("mechanical-poison-resource", "mechanical12");
  room.identities.wolfPack = [1, 2, 3];
  C.setIdentity(room, "mechanical", 4);
  C.setIdentity(room, "guard", 5);
  C.setIdentity(room, "witch", 6);
  C.setIdentity(room, "hunter", 7);
  C.setIdentity(room, "psychic", 8);
  C.currentNight(room).mechanicalLearnTarget = 6; // learns witch
  room.day = 2;
  room.period = "night";
  room.nights["2"] = {};
  C.currentNight(room).mechanicalPoison = 10;
  let outcome = C.computeNightOutcome(room);
  assert(outcome.deaths.some(x => x.number === 10 && x.reasons.includes("机械狼毒药")), "Mechanical witch poison resolves in the independent skill phase");
  C.finalizeNight(room);
  assert(room.resources.mechanicalPoison === false, "Using mechanical poison consumes its one-time resource");

  const saved = C.createRoom("mechanical-poison-save", "mechanical12");
  saved.identities.wolfPack = [1, 2, 3];
  C.setIdentity(saved, "mechanical", 4);
  C.setIdentity(saved, "guard", 5);
  C.setIdentity(saved, "witch", 6);
  C.setIdentity(saved, "hunter", 7);
  C.setIdentity(saved, "psychic", 8);
  C.currentNight(saved).mechanicalLearnTarget = 6;
  saved.day = 2;
  saved.period = "night";
  saved.nights["2"] = {};
  C.currentNight(saved).mechanicalSkillConfirmed = true;
  C.finalizeNight(saved);
  assert(saved.resources.mechanicalPoison === true, "Not using mechanical poison preserves it");
}

{
  const room = C.createRoom("mechanical-psychic", "mechanical12");
  room.identities.wolfPack = [1, 2, 3];
  C.setIdentity(room, "mechanical", 4);
  C.setIdentity(room, "guard", 5);
  C.setIdentity(room, "witch", 6);
  C.setIdentity(room, "hunter", 7);
  C.setIdentity(room, "psychic", 8);
  C.currentNight(room).mechanicalLearnTarget = 8; // learns psychic
  room.day = 2;
  room.period = "night";
  room.nights["2"] = {};
  C.currentNight(room).mechanicalCheck = 6;
  const html = C.renderStage(room, "mechanicalSkill", 0, ["mechanicalSkill"]);
  assert(html.includes("机械狼查验 6 号"), "Mechanical psychic can record a check in the independent skill phase");
  assert(html.includes("女巫"), "Mechanical psychic receives the concrete identity result in judge UI");
}

{
  const legacy = C.createRoom("mechanical-flow-migration", "mechanical12");
  legacy.schema = 2;
  legacy.day = 2;
  legacy.period = "night";
  legacy.nightStageIndex = 4;
  legacy.nights["2"] = { wolfKill: 9, pierce: true };
  const migrated = C.normalizeRoom(legacy);
  assert(migrated.schema === 3 && migrated.nightStageIndex === 0, "Old mechanical rooms restart the changed night flow safely");
  assert(!C.currentNight(migrated).mechanicalPierceKill, "Old attached pierce choice is not silently converted into the new extra knife");
}

console.log("smoke-core: PASS");
