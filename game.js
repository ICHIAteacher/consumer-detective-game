/* 消費偵探商店街 game.js */

const state = {
  playerName: "",
  position: { ...START_POSITION },
  completedLevels: [],
  activeLevelId: null,
  previewLevelId: null,
  currentQuestionIndex: 0
};

const els = {
  startScreen: document.getElementById("startScreen"),
  mapScreen: document.getElementById("mapScreen"),
  missionScreen: document.getElementById("missionScreen"),
  certificateScreen: document.getElementById("certificateScreen"),

  playerNameInput: document.getElementById("playerNameInput"),
  startGameBtn: document.getElementById("startGameBtn"),
  continueGameBtn: document.getElementById("continueGameBtn"),

  playerStatus: document.getElementById("playerStatus"),
  showBagBtn: document.getElementById("showBagBtn"),
  resetGameBtn: document.getElementById("resetGameBtn"),

  mapGrid: document.getElementById("mapGrid"),
  tileTitle: document.getElementById("tileTitle"),
  tileDescription: document.getElementById("tileDescription"),
  startMissionFromTileBtn: document.getElementById("startMissionFromTileBtn"),

  bagProgress: document.getElementById("bagProgress"),
  bagItems: document.getElementById("bagItems"),

  backToMapBtn: document.getElementById("backToMapBtn"),
  missionLocation: document.getElementById("missionLocation"),
  missionTitle: document.getElementById("missionTitle"),
  missionTaskImage: document.getElementById("missionTaskImage"),
  missionIntro: document.getElementById("missionIntro"),
  missionStory: document.getElementById("missionStory"),
  keywordList: document.getElementById("keywordList"),

  questionProgress: document.getElementById("questionProgress"),
  questionText: document.getElementById("questionText"),
  choicesArea: document.getElementById("choicesArea"),
  feedbackBox: document.getElementById("feedbackBox"),
  feedbackText: document.getElementById("feedbackText"),
  nextQuestionBtn: document.getElementById("nextQuestionBtn"),
  finishMissionBtn: document.getElementById("finishMissionBtn"),

  sceneModal: document.getElementById("sceneModal"),
  closeSceneModalBtn: document.getElementById("closeSceneModalBtn"),
  scenePreviewImage: document.getElementById("scenePreviewImage"),
  scenePreviewLocation: document.getElementById("scenePreviewLocation"),
  scenePreviewTitle: document.getElementById("scenePreviewTitle"),
  scenePreviewText: document.getElementById("scenePreviewText"),
  scenePreviewStartBtn: document.getElementById("scenePreviewStartBtn"),
  readSceneBtn: document.getElementById("readSceneBtn"),
  stopSceneReadingBtn: document.getElementById("stopSceneReadingBtn"),

  readMissionBtn: document.getElementById("readMissionBtn"),
  readQuestionBtn: document.getElementById("readQuestionBtn"),
  stopReadingBtn: document.getElementById("stopReadingBtn"),

  bagModal: document.getElementById("bagModal"),
  closeBagModalBtn: document.getElementById("closeBagModalBtn"),
  bagModalItems: document.getElementById("bagModalItems"),

  backToMapFromCertificateBtn: document.getElementById("backToMapFromCertificateBtn"),
  printCertificateBtn: document.getElementById("printCertificateBtn"),
  certificateName: document.getElementById("certificateName"),
  certificateRewards: document.getElementById("certificateRewards"),
  certificateDate: document.getElementById("certificateDate")
};

/* ---------- 基本工具 ---------- */

function addClickIfExists(element, handler) {
  if (element) {
    element.addEventListener("click", handler);
  }
}

function getLevelById(levelId) {
  return LEVELS.find(level => level.id === levelId);
}

function isCompleted(levelId) {
  return state.completedLevels.includes(levelId);
}

function isFinalLevelLocked(levelId) {
  if (levelId !== GAME_CONFIG.finalLevelId) return false;
  if (isCompleted(levelId)) return false;
  return state.completedLevels.length < GAME_CONFIG.finalRequiredCount;
}

function showScreen(screenName) {
  stopTeacherRead();

  els.startScreen.classList.add("hidden");
  els.mapScreen.classList.add("hidden");
  els.missionScreen.classList.add("hidden");
  els.certificateScreen.classList.add("hidden");

  if (screenName === "start") els.startScreen.classList.remove("hidden");
  if (screenName === "map") els.mapScreen.classList.remove("hidden");
  if (screenName === "mission") els.missionScreen.classList.remove("hidden");
  if (screenName === "certificate") els.certificateScreen.classList.remove("hidden");
}

function saveProgress() {
  const data = {
    playerName: state.playerName,
    position: state.position,
    completedLevels: state.completedLevels
  };

  localStorage.setItem(GAME_CONFIG.storageKey, JSON.stringify(data));
}

function loadProgress() {
  const rawData = localStorage.getItem(GAME_CONFIG.storageKey);

  if (!rawData) {
    return false;
  }

  try {
    const data = JSON.parse(rawData);

    state.playerName = data.playerName || "";
    state.position = data.position || { ...START_POSITION };
    state.completedLevels = Array.isArray(data.completedLevels)
      ? data.completedLevels
      : [];

    return true;
  } catch (error) {
    console.error("讀取進度失敗：", error);
    return false;
  }
}

function clearProgress() {
  localStorage.removeItem(GAME_CONFIG.storageKey);

  state.playerName = "";
  state.position = { ...START_POSITION };
  state.completedLevels = [];
  state.activeLevelId = null;
  state.previewLevelId = null;
  state.currentQuestionIndex = 0;
}

function updateContinueButton() {
  const hasProgress = Boolean(localStorage.getItem(GAME_CONFIG.storageKey));
  els.continueGameBtn.disabled = !hasProgress;

  if (!hasProgress) {
    els.continueGameBtn.style.opacity = "0.55";
    els.continueGameBtn.style.cursor = "not-allowed";
  } else {
    els.continueGameBtn.style.opacity = "1";
    els.continueGameBtn.style.cursor = "pointer";
  }
}

/* ---------- 老師朗讀功能 ---------- */

function canUseSpeech() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function getChineseVoice() {
  if (!canUseSpeech()) return null;

  const voices = window.speechSynthesis.getVoices();

  const taiwanVoice = voices.find(voice =>
    voice.lang === "zh-TW" ||
    voice.lang === "zh_Hant" ||
    voice.name.includes("Taiwan") ||
    voice.name.includes("臺灣") ||
    voice.name.includes("中文")
  );

  if (taiwanVoice) return taiwanVoice;

  const chineseVoice = voices.find(voice =>
    voice.lang.startsWith("zh") ||
    voice.name.includes("Chinese") ||
    voice.name.includes("中文")
  );

  return chineseVoice || voices[0] || null;
}

function cleanReadText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/A\./g, "選項 A，")
    .replace(/B\./g, "選項 B，")
    .replace(/C\./g, "選項 C，")
    .replace(/D\./g, "選項 D，")
    .trim();
}

function teacherRead(text) {
  if (!canUseSpeech()) {
    alert("這個瀏覽器目前不支援語音朗讀。建議改用 Chrome、Edge，或 iPad 的 Safari 測試。");
    return;
  }

  const readableText = cleanReadText(text);

  if (!readableText) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(readableText);
  utterance.lang = "zh-TW";
  utterance.rate = 0.82;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voice = getChineseVoice();

  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}

function stopTeacherRead() {
  if (canUseSpeech()) {
    window.speechSynthesis.cancel();
  }
}

function readScenePreview() {
  const level = getLevelById(state.previewLevelId);

  if (!level) return;

  const text = `
    現在所在關卡是：${level.title}。
    任務地點：${level.location}。
    ${els.scenePreviewText.textContent}
  `;

  teacherRead(text);
}

function readMissionContent() {
  const level = getLevelById(state.activeLevelId);

  if (!level) return;

  const taskText = level.taskReadText
    ? `照片線索：${level.taskReadText}`
    : "請仔細觀察畫面中的任務圖。";

  const text = `
    ${level.title}。
    任務地點：${level.location}。
    任務檔案：${level.intro}
    ${taskText}
    閱讀短文：${level.story}
    關鍵字：${level.keywords.join("、")}。
  `;

  teacherRead(text);
}

function readCurrentQuestion() {
  const level = getLevelById(state.activeLevelId);

  if (!level) return;

  const question = level.questions[state.currentQuestionIndex];

  if (!question) return;

  const choiceLetters = ["A", "B", "C", "D"];

  const choicesText = question.choices
    .map((choice, index) => `選項 ${choiceLetters[index]}：${choice}。`)
    .join(" ");

  const text = `
    第 ${state.currentQuestionIndex + 1} 題。
    ${question.text}
    ${choicesText}
  `;

  teacherRead(text);
}

if (canUseSpeech()) {
  window.speechSynthesis.onvoiceschanged = () => {
    getChineseVoice();
  };
}

/* ---------- 遊戲開始 ---------- */

function startNewGame() {
  const name = els.playerNameInput.value.trim();

  if (!name) {
    alert("請先輸入你的偵探名字！");
    els.playerNameInput.focus();
    return;
  }

  clearProgress();

  state.playerName = name;
  state.position = { ...START_POSITION };
  state.completedLevels = [];

  saveProgress();
  renderMapPage();
  showScreen("map");
}

function continueGame() {
  const loaded = loadProgress();

  if (!loaded) {
    alert("目前沒有上次的遊戲進度，請先輸入名字開始新遊戲。");
    return;
  }

  renderMapPage();
  showScreen("map");
}

function resetGame() {
  const yes = confirm("確定要重新開始嗎？目前的通關進度會被清除。");

  if (!yes) return;

  clearProgress();
  els.playerNameInput.value = "";
  updateContinueButton();
  showScreen("start");
}

/* ---------- 地圖 ---------- */

function renderMapPage() {
  els.playerStatus.textContent = `🕵️ ${state.playerName || "小小"} 偵探`;
  renderMapGrid();
  renderCurrentTileInfo();
  renderBag();
  updateContinueButton();
  saveProgress();
}

function renderMapGrid() {
  els.mapGrid.innerHTML = "";

  MAP_TILES.forEach((row, rowIndex) => {
    row.forEach((tile, colIndex) => {
      const tileDiv = document.createElement("div");
      tileDiv.classList.add("map-tile", tile.type);

      const isPlayerHere =
        state.position.row === rowIndex && state.position.col === colIndex;

      let icon = tile.icon || "⬜";
      let name = tile.name || "商店街道路";
      let status = "";

      if (tile.type === "location") {
        const level = getLevelById(tile.levelId);
        icon = level.icon;
        name = level.title;

        if (isFinalLevelLocked(level.id)) {
          tileDiv.classList.add("locked");
          status = "尚未解鎖";
        } else if (isCompleted(level.id)) {
          tileDiv.classList.add("completed");
          status = "已完成";
        } else {
          status = "可挑戰";
        }
      }

      if (tile.type === "start") {
        status = "起點";
      }

      if (tile.type === "road") {
        status = "道路";
      }

      if (tile.type === "tree") {
        status = "休息點";
      }

      tileDiv.innerHTML = `
        <div class="tile-icon">${icon}</div>
        <div class="tile-name">${name}</div>
        <div class="tile-status">${status}</div>
      `;

      if (isPlayerHere) {
        const player = document.createElement("div");
        player.className = "player-token";
        player.textContent = "🕵️";
        tileDiv.appendChild(player);
      }

      els.mapGrid.appendChild(tileDiv);
    });
  });
}

function renderCurrentTileInfo() {
  const tile = MAP_TILES[state.position.row][state.position.col];

  els.startMissionFromTileBtn.classList.add("hidden");
  els.startMissionFromTileBtn.onclick = null;

  if (tile.type === "location") {
    const level = getLevelById(tile.levelId);

    els.tileTitle.textContent = `${level.icon} ${level.title}`;

    if (isFinalLevelLocked(level.id)) {
      els.tileDescription.textContent =
        `這裡是最後一關「${level.title}」。請先完成前 9 個任務，收集 9 個偵探道具後，才能進入最後挑戰。`;
      els.startMissionFromTileBtn.textContent = "查看場景";
      els.startMissionFromTileBtn.classList.remove("hidden");
      els.startMissionFromTileBtn.onclick = () => openScenePreview(level.id);
      return;
    }

    if (isCompleted(level.id)) {
      els.tileDescription.textContent =
        `你已經完成「${level.title}」，獲得「${level.itemIcon} ${level.itemName}」。你也可以再次進入複習。`;
      els.startMissionFromTileBtn.textContent = "查看場景 / 複習任務";
    } else {
      els.tileDescription.textContent =
        `你來到「${level.location}」。請先查看場景圖，再開始「${level.title}」。`;
      els.startMissionFromTileBtn.textContent = "查看場景";
    }

    els.startMissionFromTileBtn.classList.remove("hidden");
    els.startMissionFromTileBtn.onclick = () => openScenePreview(level.id);
    return;
  }

  if (tile.type === "start") {
    els.tileTitle.textContent = "🕵️ 中央廣場";
    els.tileDescription.textContent =
      "你站在消費偵探商店街的中央廣場。移動小偵探，走到不同地點調查消費案件。";
    return;
  }

  if (tile.type === "tree") {
    els.tileTitle.textContent = "🌳 休息角落";
    els.tileDescription.textContent =
      "這裡是商店街的休息角落。想一想剛剛學到的消費線索，再繼續前往下一個任務地點。";
    return;
  }

  els.tileTitle.textContent = "⬜ 商店街道路";
  els.tileDescription.textContent =
    "這是一條商店街道路。繼續移動小偵探，尋找下一個任務地點。";
}

function movePlayer(direction) {
  let newRow = state.position.row;
  let newCol = state.position.col;

  if (direction === "up") newRow -= 1;
  if (direction === "down") newRow += 1;
  if (direction === "left") newCol -= 1;
  if (direction === "right") newCol += 1;

  if (
    newRow < 0 ||
    newRow >= MAP_TILES.length ||
    newCol < 0 ||
    newCol >= MAP_TILES[0].length
  ) {
    return;
  }

  const targetTile = MAP_TILES[newRow][newCol];

  if (targetTile.type === "tree") {
    els.tileTitle.textContent = "🌳 休息角落";
    els.tileDescription.textContent =
      "這裡有樹木和休息區，不能直接穿過去。請換一條路走。";
    return;
  }

  state.position = {
    row: newRow,
    col: newCol
  };

  saveProgress();
  renderMapPage();

  if (targetTile.type === "location") {
    openScenePreview(targetTile.levelId);
  }
}

/* ---------- 背包 ---------- */

function renderBag() {
  els.bagProgress.textContent = `${state.completedLevels.length} / ${GAME_CONFIG.totalLevels}`;
  els.bagItems.innerHTML = "";

  LEVELS.forEach(level => {
    const collected = isCompleted(level.id);

    const item = document.createElement("div");
    item.className = collected ? "bag-item" : "bag-item locked";

    item.innerHTML = `
      <span class="bag-item-icon">${collected ? level.itemIcon : "❔"}</span>
      <span>${collected ? level.itemName : `第${level.id}關道具`}</span>
    `;

    els.bagItems.appendChild(item);
  });
}

function openBagModal() {
  els.bagModalItems.innerHTML = "";

  LEVELS.forEach(level => {
    const collected = isCompleted(level.id);

    const item = document.createElement("div");
    item.className = collected
      ? "bag-modal-item collected"
      : "bag-modal-item";

    item.innerHTML = `
      <span>${collected ? level.itemIcon : "❔"}</span>
      <strong>${collected ? level.itemName : `第${level.id}關尚未取得`}</strong>
      <p>${collected ? level.itemDescription : "完成這一關任務後，就能取得這個偵探道具。"}</p>
    `;

    els.bagModalItems.appendChild(item);
  });

  els.bagModal.classList.remove("hidden");
}

function closeBagModal() {
  els.bagModal.classList.add("hidden");
}

/* ---------- 關卡場景預覽 ---------- */

function openScenePreview(levelId) {
  const level = getLevelById(levelId);

  if (!level) return;

  state.previewLevelId = level.id;
  stopTeacherRead();

  els.scenePreviewImage.src = level.sceneImage;
  els.scenePreviewImage.alt = `${level.title}場景圖`;
  els.scenePreviewLocation.textContent = `${level.icon} ${level.location}`;
  els.scenePreviewTitle.textContent = level.title;

  if (isFinalLevelLocked(level.id)) {
    els.scenePreviewText.textContent =
      `這裡是最後一關「${level.title}」。請先完成前 9 個任務，收集 9 個偵探道具後，才能進入最後挑戰。`;

    els.scenePreviewStartBtn.textContent = "尚未解鎖";
    els.scenePreviewStartBtn.disabled = true;
    els.scenePreviewStartBtn.style.opacity = "0.55";
    els.scenePreviewStartBtn.style.cursor = "not-allowed";
    els.scenePreviewStartBtn.onclick = null;
  } else if (isCompleted(level.id)) {
    els.scenePreviewText.textContent =
      `你已經完成「${level.title}」，獲得「${level.itemIcon} ${level.itemName}」。你可以再次進入複習任務。`;

    els.scenePreviewStartBtn.textContent = "重新複習任務";
    els.scenePreviewStartBtn.disabled = false;
    els.scenePreviewStartBtn.style.opacity = "1";
    els.scenePreviewStartBtn.style.cursor = "pointer";
    els.scenePreviewStartBtn.onclick = () => {
      closeScenePreview();
      openMission(level.id);
    };
  } else {
    els.scenePreviewText.textContent =
      `你來到「${level.location}」。請先觀察場景圖，再按下開始任務，閱讀線索並完成 3 題偵探任務。`;

    els.scenePreviewStartBtn.textContent = "開始任務";
    els.scenePreviewStartBtn.disabled = false;
    els.scenePreviewStartBtn.style.opacity = "1";
    els.scenePreviewStartBtn.style.cursor = "pointer";
    els.scenePreviewStartBtn.onclick = () => {
      closeScenePreview();
      openMission(level.id);
    };
  }

  els.sceneModal.classList.remove("hidden");
}

function closeScenePreview() {
  stopTeacherRead();
  state.previewLevelId = null;
  els.sceneModal.classList.add("hidden");
}

/* ---------- 任務 ---------- */

function openMission(levelId) {
  const level = getLevelById(levelId);

  if (!level) return;

  if (isFinalLevelLocked(levelId)) {
    alert("最後一關還沒解鎖！請先完成前 9 個任務。");
    return;
  }

  state.activeLevelId = levelId;
  state.currentQuestionIndex = 0;
  stopTeacherRead();

  els.missionLocation.textContent = `${level.icon} ${level.location}`;
  els.missionTitle.textContent = level.title;
  els.missionTaskImage.src = level.taskImage;
  els.missionTaskImage.alt = `${level.title}任務線索圖`;
  els.missionIntro.textContent = level.intro;
  els.missionStory.textContent = level.story;

  els.keywordList.innerHTML = "";
  level.keywords.forEach(keyword => {
    const chip = document.createElement("span");
    chip.className = "keyword-chip";
    chip.textContent = keyword;
    els.keywordList.appendChild(chip);
  });

  renderQuestion();
  showScreen("mission");
}

function renderQuestion() {
  const level = getLevelById(state.activeLevelId);
  const question = level.questions[state.currentQuestionIndex];

  els.questionProgress.textContent =
    `第 ${state.currentQuestionIndex + 1} / ${level.questions.length} 題`;

  els.questionText.textContent = question.text;
  els.choicesArea.innerHTML = "";
  els.feedbackBox.classList.add("hidden");
  els.feedbackText.textContent = "";
  els.nextQuestionBtn.classList.add("hidden");
  els.finishMissionBtn.classList.add("hidden");

  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "choice-btn";
    button.type = "button";
    button.textContent = `${String.fromCharCode(65 + index)}. ${choice}`;
    button.onclick = () => chooseAnswer(index, button);

    els.choicesArea.appendChild(button);
  });
}

function chooseAnswer(choiceIndex, clickedButton) {
  const level = getLevelById(state.activeLevelId);
  const question = level.questions[state.currentQuestionIndex];
  const correctIndex = question.answer;

  if (choiceIndex === correctIndex) {
    clickedButton.classList.add("correct");

    const buttons = els.choicesArea.querySelectorAll(".choice-btn");
    buttons.forEach(button => {
      button.disabled = true;
    });

    const isLastQuestion =
      state.currentQuestionIndex === level.questions.length - 1;

    els.feedbackBox.classList.remove("hidden");

    if (isLastQuestion) {
      els.feedbackText.textContent =
        `答對了！${level.completeText} 你獲得「${level.itemIcon} ${level.itemName}」。`;
      els.finishMissionBtn.classList.remove("hidden");
    } else {
      els.feedbackText.textContent =
        "答對了！你找到了重要線索，按「下一題」繼續挑戰。";
      els.nextQuestionBtn.classList.remove("hidden");
    }

    return;
  }

  clickedButton.classList.add("wrong");
  clickedButton.disabled = true;

  els.feedbackBox.classList.remove("hidden");
  els.feedbackText.textContent =
    `再想想！提示：${question.hint}`;
}

function nextQuestion() {
  const level = getLevelById(state.activeLevelId);

  if (state.currentQuestionIndex < level.questions.length - 1) {
    state.currentQuestionIndex += 1;
    stopTeacherRead();
    renderQuestion();
  }
}

function finishMission() {
  const level = getLevelById(state.activeLevelId);
  stopTeacherRead();

  if (!isCompleted(level.id)) {
    state.completedLevels.push(level.id);
    state.completedLevels.sort((a, b) => a - b);
  }

  saveProgress();

  if (level.isFinal) {
    renderCertificate();
    showScreen("certificate");
    return;
  }

  renderMapPage();
  showScreen("map");
}

function backToMap() {
  stopTeacherRead();
  state.activeLevelId = null;
  state.currentQuestionIndex = 0;
  renderMapPage();
  showScreen("map");
}

/* ---------- 證書 ---------- */

function renderCertificate() {
  const playerName = state.playerName || "小小";
  els.certificateName.textContent = `${playerName} 偵探`;

  els.certificateRewards.innerHTML = "";

  LEVELS.forEach(level => {
    const reward = document.createElement("span");
    reward.className = "certificate-reward";
    reward.textContent = `${level.itemIcon} ${level.itemName}`;
    els.certificateRewards.appendChild(reward);
  });

  const today = new Date();
  const dateText = today.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  els.certificateDate.textContent = `完成日期：${dateText}`;
}

function printCertificate() {
  window.print();
}

/* ---------- 事件綁定 ---------- */

function bindEvents() {
  els.startGameBtn.addEventListener("click", startNewGame);
  els.continueGameBtn.addEventListener("click", continueGame);
  els.resetGameBtn.addEventListener("click", resetGame);

  els.showBagBtn.addEventListener("click", openBagModal);
  els.closeBagModalBtn.addEventListener("click", closeBagModal);

  els.bagModal.addEventListener("click", event => {
    if (event.target === els.bagModal) {
      closeBagModal();
    }
  });

  els.closeSceneModalBtn.addEventListener("click", closeScenePreview);

  els.sceneModal.addEventListener("click", event => {
    if (event.target === els.sceneModal) {
      closeScenePreview();
    }
  });

  addClickIfExists(els.readSceneBtn, readScenePreview);
  addClickIfExists(els.stopSceneReadingBtn, stopTeacherRead);
  addClickIfExists(els.readMissionBtn, readMissionContent);
  addClickIfExists(els.readQuestionBtn, readCurrentQuestion);
  addClickIfExists(els.stopReadingBtn, stopTeacherRead);

  els.backToMapBtn.addEventListener("click", backToMap);
  els.nextQuestionBtn.addEventListener("click", nextQuestion);
  els.finishMissionBtn.addEventListener("click", finishMission);

  els.backToMapFromCertificateBtn.addEventListener("click", () => {
    renderMapPage();
    showScreen("map");
  });

  els.printCertificateBtn.addEventListener("click", printCertificate);

  document.querySelectorAll(".move-btn").forEach(button => {
    button.addEventListener("click", () => {
      movePlayer(button.dataset.direction);
    });
  });

  document.addEventListener("keydown", event => {
    const isMapOpen = !els.mapScreen.classList.contains("hidden");
    const isModalOpen =
      !els.bagModal.classList.contains("hidden") ||
      !els.sceneModal.classList.contains("hidden");

    const isTyping =
      document.activeElement &&
      ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);

    if (!isMapOpen || isModalOpen || isTyping) return;

    const key = event.key.toLowerCase();

    if (key === "arrowup" || key === "w") {
      event.preventDefault();
      movePlayer("up");
    }

    if (key === "arrowdown" || key === "s") {
      event.preventDefault();
      movePlayer("down");
    }

    if (key === "arrowleft" || key === "a") {
      event.preventDefault();
      movePlayer("left");
    }

    if (key === "arrowright" || key === "d") {
      event.preventDefault();
      movePlayer("right");
    }
  });

  els.playerNameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      startNewGame();
    }
  });
}

/* ---------- 初始化 ---------- */

function init() {
  bindEvents();
  updateContinueButton();

  const loaded = loadProgress();

  if (loaded && state.playerName) {
    els.playerNameInput.value = state.playerName;
  }

  showScreen("start");
}

init();