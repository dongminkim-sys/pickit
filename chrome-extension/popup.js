const serverUrlInput = document.getElementById("serverUrl");
const userNameInput = document.getElementById("userName");
const defaultCategorySelect = document.getElementById("defaultCategory");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

// Load saved settings
chrome.storage.sync.get(
  ["serverUrl", "userName", "defaultCategory"],
  (data) => {
    serverUrlInput.value = data.serverUrl || "http://localhost:3000";
    userNameInput.value = data.userName || "";
    defaultCategorySelect.value = data.defaultCategory || "";
  }
);

saveBtn.addEventListener("click", () => {
  const serverUrl = serverUrlInput.value.trim().replace(/\/+$/, "");
  const userName = userNameInput.value.trim();
  const defaultCategory = defaultCategorySelect.value;

  if (!serverUrl) {
    statusEl.className = "status error";
    statusEl.textContent = "서버 주소를 입력하세요";
    return;
  }

  chrome.storage.sync.set({ serverUrl, userName, defaultCategory }, () => {
    statusEl.className = "status success";
    statusEl.textContent = "설정이 저장되었습니다!";
    setTimeout(() => {
      statusEl.style.display = "none";
    }, 2000);
  });
});
