/**
 * 핔잇 - Meta Ad Library 수집 Content Script
 *
 * Meta Ad Library 페이지의 광고 카드를 감지하고,
 * 각 카드에 "핔잇에 수집" 버튼을 삽입합니다.
 */

(function () {
  "use strict";

  const CATEGORIES = [
    "뷰티", "패션", "건강기능식품", "식품", "생활용품",
    "전자기기", "교육", "금융", "앱/서비스", "기타",
  ];

  let settings = {
    serverUrl: "http://localhost:3000",
    userName: "",
    defaultCategory: "",
  };

  // Track collected library IDs
  let collectedIds = new Set();

  // Load settings & collected IDs
  chrome.storage.sync.get(
    ["serverUrl", "userName", "defaultCategory"],
    (data) => {
      if (data.serverUrl) settings.serverUrl = data.serverUrl.replace(/\/+$/, "");
      if (data.userName) settings.userName = data.userName;
      if (data.defaultCategory) settings.defaultCategory = data.defaultCategory;
    }
  );
  chrome.storage.local.get(["collectedIds"], (data) => {
    if (data.collectedIds) collectedIds = new Set(data.collectedIds);
  });

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.serverUrl) settings.serverUrl = changes.serverUrl.newValue.replace(/\/+$/, "");
    if (changes.userName) settings.userName = changes.userName.newValue;
    if (changes.defaultCategory) settings.defaultCategory = changes.defaultCategory.newValue;
  });

  // ─── Ad Data Extraction ───

  function extractAdData(adCard) {
    const data = {
      brand: "",
      title: "",
      body: "",
      media_url: "",
      media_type: "image",
      thumbnail_url: "",
      ad_start_date: null,
      library_id: "",
      platforms: [],
    };

    // Brand name: inside ._8nsi container, the <a> link to the facebook page
    const adContainer = adCard.querySelector("._8nsi");
    if (adContainer) {
      const brandLink = adContainer.querySelector('a[href*="facebook.com/"]');
      if (brandLink) {
        data.brand = brandLink.textContent?.trim() || "";
      }
    }

    // Ad body text: inside ._7jyr container
    const bodyContainer = adCard.querySelector("._7jyr");
    if (bodyContainer) {
      const bodySpan = bodyContainer.querySelector("span");
      if (bodySpan) {
        data.body = bodySpan.textContent?.trim() || "";
        data.title = data.body.slice(0, 80);
      }
    }

    // Media - Videos (check first, higher priority)
    const video = adCard.querySelector("video");
    if (video) {
      const videoSrc = video.src || video.querySelector("source")?.src || "";
      if (videoSrc) {
        data.media_url = videoSrc;
        data.media_type = "video";
        if (video.poster) {
          data.thumbnail_url = video.poster;
        }
      }
    }

    // Media - Images (only if no video found)
    if (!data.media_url) {
      const contentContainer = adCard.querySelector('[data-testid="ad-library-dynamic-content-container"]') || adCard.querySelector("._7jyh");
      if (contentContainer) {
        const imgs = contentContainer.querySelectorAll("img");
        for (const img of imgs) {
          const src = img.src || "";
          // Skip profile pictures (60x60) and icons
          if (src && !src.includes("rsrc.php") && !src.includes("s60x60")) {
            data.media_url = src;
            data.media_type = "image";
            break;
          }
        }
      }
    }

    // If still no media image, get the profile/brand image as fallback
    if (!data.media_url) {
      const imgs = adCard.querySelectorAll("img");
      for (const img of imgs) {
        const src = img.src || "";
        if (src && src.includes("scontent") && !src.includes("rsrc.php")) {
          data.media_url = src;
          data.media_type = "image";
          break;
        }
      }
    }

    // Start date
    const allText = adCard.innerText || "";
    const koDateMatch = allText.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s*에?\s*게재\s*시작/);
    if (koDateMatch) {
      const [, year, month, day] = koDateMatch;
      data.ad_start_date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    if (!data.ad_start_date) {
      const enDateMatch = allText.match(/Started running on\s+(\w+ \d+,\s*\d{4})/i);
      if (enDateMatch) {
        try {
          const parsed = new Date(enDateMatch[1]);
          if (!isNaN(parsed.getTime())) {
            data.ad_start_date = parsed.toISOString().split("T")[0];
          }
        } catch { /* ignore */ }
      }
    }

    // Library ID
    const libIdMatch = allText.match(/라이브러리 ID:\s*(\d+)|Library ID:\s*(\d+)/);
    if (libIdMatch) {
      data.library_id = libIdMatch[1] || libIdMatch[2];
    }

    // Use brand as title fallback
    if (!data.title && data.brand) {
      data.title = `${data.brand} 광고`;
    }

    return data;
  }

  // ─── Side Panel UI ───

  function createPanel() {
    const overlay = document.createElement("div");
    overlay.className = "pickit-overlay";
    overlay.addEventListener("click", () => closePanel());
    document.body.appendChild(overlay);

    const panel = document.createElement("div");
    panel.className = "pickit-panel";
    panel.innerHTML = `
      <div class="pickit-panel-header">
        <h2>핔잇에 수집</h2>
        <button class="pickit-panel-close">&times;</button>
      </div>
      <div class="pickit-panel-body">
        <div class="pickit-panel-preview" id="pickit-preview"></div>
        <div class="pickit-panel-field">
          <label>페이지명</label>
          <input type="text" id="pickit-pagename" class="pickit-readonly" readonly />
        </div>
        <div class="pickit-panel-field">
          <label>브랜드 (실제 광고주)</label>
          <input type="text" id="pickit-brand" placeholder="실제 브랜드명 입력" />
        </div>
        <div class="pickit-panel-field">
          <label>제목</label>
          <input type="text" id="pickit-title" placeholder="이 광고의 제목" />
        </div>
        <div class="pickit-panel-field">
          <label>광고 문구</label>
          <textarea id="pickit-adcopy" class="pickit-readonly" readonly></textarea>
        </div>
        <div class="pickit-panel-row">
          <div class="pickit-panel-field pickit-half">
            <label>게재 시작일</label>
            <input type="text" id="pickit-startdate" class="pickit-readonly" readonly />
          </div>
          <div class="pickit-panel-field pickit-half">
            <label>게재 일수</label>
            <input type="text" id="pickit-activedays" class="pickit-readonly" readonly />
          </div>
        </div>
        <div class="pickit-panel-field">
          <label>카테고리</label>
          <select id="pickit-category">
            <option value="">선택</option>
            ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
          </select>
        </div>
        <div class="pickit-panel-field">
          <label>태그 (쉼표 구분)</label>
          <input type="text" id="pickit-tags" placeholder="예: 할인, 신제품, 여름" />
        </div>
        <div class="pickit-panel-field">
          <label>메모</label>
          <textarea id="pickit-memo" placeholder="이 광고에 대한 내 메모..."></textarea>
        </div>
        <button class="pickit-panel-submit" id="pickit-submit">수집하기</button>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector(".pickit-panel-close").addEventListener("click", closePanel);

    return { panel, overlay };
  }

  let panelElements = null;
  let currentAdData = null;

  function openPanel(adData) {
    if (!panelElements) {
      panelElements = createPanel();
    }

    currentAdData = adData;
    const { panel, overlay } = panelElements;

    document.getElementById("pickit-pagename").value = adData.brand || "";
    document.getElementById("pickit-brand").value = "";
    document.getElementById("pickit-title").value = "";
    document.getElementById("pickit-adcopy").value = adData.body || "";
    document.getElementById("pickit-startdate").value = adData.ad_start_date || "-";

    // Calculate active days
    let activeDays = "-";
    if (adData.ad_start_date) {
      const start = new Date(adData.ad_start_date);
      const today = new Date();
      const diff = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
      activeDays = `${diff}일`;
      currentAdData._activeDays = diff;
    }
    document.getElementById("pickit-activedays").value = activeDays;

    document.getElementById("pickit-category").value = settings.defaultCategory || "";
    document.getElementById("pickit-tags").value = adData.library_id ? `ID:${adData.library_id}` : "";
    document.getElementById("pickit-memo").value = "";

    const preview = document.getElementById("pickit-preview");
    if (adData.media_url) {
      if (adData.media_type === "video") {
        preview.innerHTML = `<video src="${adData.media_url}" controls muted style="width:100%;max-height:200px"></video>`;
      } else {
        preview.innerHTML = `<img src="${adData.media_url}" alt="preview" style="width:100%;max-height:200px;object-fit:cover" />`;
      }
    } else {
      preview.innerHTML = '<div style="padding:40px;text-align:center;color:#999">미디어 없음</div>';
    }

    const submitBtn = document.getElementById("pickit-submit");
    const newSubmit = submitBtn.cloneNode(true);
    newSubmit.textContent = "수집하기";
    newSubmit.disabled = false;
    newSubmit.style.background = "";
    submitBtn.parentNode.replaceChild(newSubmit, submitBtn);
    newSubmit.addEventListener("click", () => submitCollection(newSubmit));

    overlay.classList.add("open");
    panel.classList.add("open");
  }

  function closePanel() {
    if (!panelElements) return;
    panelElements.panel.classList.remove("open");
    panelElements.overlay.classList.remove("open");
    currentAdData = null;
  }

  async function submitCollection(btn) {
    if (!currentAdData) return;

    btn.disabled = true;
    btn.textContent = "수집 중...";

    const pageName = document.getElementById("pickit-pagename").value;
    const adCopy = document.getElementById("pickit-adcopy").value;
    const userMemo = document.getElementById("pickit-memo").value;
    const tags = document.getElementById("pickit-tags").value;

    // Combine: tags + page name
    const allTags = [tags, pageName ? `page:${pageName}` : ""].filter(Boolean).join(", ");

    // Combine: ad copy + user memo
    const fullMemo = [adCopy, userMemo].filter(Boolean).join("\n\n---\n");

    const brandValue = document.getElementById("pickit-brand").value;
    const titleValue = document.getElementById("pickit-title").value || brandValue || pageName || "";

    const payload = {
      title: titleValue,
      brand: brandValue || pageName || "",
      platform: "meta",
      media_type: currentAdData.media_type,
      media_url: currentAdData.media_url,
      thumbnail_url: currentAdData.thumbnail_url || "",
      category: document.getElementById("pickit-category").value,
      tags: allTags,
      memo: fullMemo,
      ad_start_date: currentAdData.ad_start_date,
      active_days: currentAdData._activeDays || null,
      created_by: settings.userName,
    };

    try {
      const response = await chrome.runtime.sendMessage({
        type: "PICKIT_COLLECT",
        payload,
        serverUrl: settings.serverUrl,
      });

      if (!response || !response.success) {
        throw new Error(response?.error || "알 수 없는 오류");
      }

      btn.textContent = "수집 완료!";
      btn.style.background = "#16a34a";

      // Remember this ad as collected
      if (currentAdData.library_id) {
        collectedIds.add(currentAdData.library_id);
        chrome.storage.local.set({ collectedIds: [...collectedIds] });
        markCardAsCollected(currentAdData.library_id);
      }

      setTimeout(() => closePanel(), 1200);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "수집 실패 - 다시 시도";
      btn.style.background = "#dc2626";
      console.error("[핔잇] 수집 실패:", err.message);

      if (err.message.includes("Could not establish connection") || err.message.includes("Failed to fetch")) {
        alert(
          `핔잇 서버(${settings.serverUrl})에 연결할 수 없습니다.\n\n서버가 실행 중인지 확인하고, 확장프로그램 설정에서 서버 주소를 확인하세요.`
        );
      }

      setTimeout(() => {
        btn.textContent = "수집하기";
        btn.style.background = "";
      }, 3000);
    }
  }

  // ─── Button Injection ───

  function createCollectButton(isCollected) {
    const btn = document.createElement("button");
    btn.className = "pickit-collect-btn" + (isCollected ? " pickit-collected" : "");
    if (isCollected) {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>수집됨`;
      btn.disabled = true;
    } else {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>핔잇!`;
    }
    return btn;
  }

  function getLibraryIdFromCard(card) {
    const text = card.innerText || "";
    const match = text.match(/라이브러리 ID:\s*(\d+)|Library ID:\s*(\d+)/);
    return match ? (match[1] || match[2]) : null;
  }

  function markCardAsCollected(libraryId) {
    // Find all cards and update button for the matching one
    const btns = document.querySelectorAll(".pickit-collect-btn");
    for (const btn of btns) {
      const card = btn.closest("[data-pickit-processed]");
      if (card && getLibraryIdFromCard(card) === libraryId) {
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>수집됨`;
        btn.disabled = true;
        btn.classList.add("pickit-collected");
      }
    }
  }

  function findAdCards() {
    const adCards = [];
    const seen = new WeakSet();

    // Find all "라이브러리 ID:" spans — every ad card has exactly one
    const allSpans = document.querySelectorAll("span");
    for (const span of allSpans) {
      const text = span.textContent || "";
      if (!text.includes("라이브러리 ID:") && !text.includes("Library ID:")) continue;

      // Walk up to find the card boundary.
      // The card is the highest ancestor that contains only ONE "라이브러리 ID".
      let card = span;
      while (card.parentElement) {
        const parent = card.parentElement;
        const parentText = parent.innerText || "";
        const idCount = (parentText.match(/라이브러리 ID|Library ID/g) || []).length;
        if (idCount > 1) {
          // Parent contains multiple cards — current level is our card
          break;
        }
        card = parent;
      }

      if (!seen.has(card)) {
        seen.add(card);
        adCards.push(card);
      }
    }

    return adCards;
  }

  function injectButtons() {
    const adCards = findAdCards();

    for (const card of adCards) {
      if (card.querySelector(".pickit-collect-btn")) continue;

      const libraryId = getLibraryIdFromCard(card);
      const isCollected = libraryId && collectedIds.has(libraryId);
      const btn = createCollectButton(isCollected);
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const adData = extractAdData(card);
        openPanel(adData);
      });

      // Find "광고 상세 정보 보기" role="button" and insert after its parent wrapper
      const allBtns = card.querySelectorAll('[role="button"]');
      let inserted = false;
      for (const div of allBtns) {
        const text = div.textContent?.trim();
        if (text === "광고 상세 정보 보기" || text === "See ad details") {
          // div = role="button", parent = the clickable container, grandparent = the row
          const row = div.parentElement;
          if (row) {
            row.insertBefore(btn, div.nextSibling);
            inserted = true;
          }
          break;
        }
      }

      if (!inserted) {
        card.appendChild(btn);
      }

      card.setAttribute("data-pickit-processed", "1");
    }
  }

  // ─── Initialization ───

  let isInjecting = false;
  let pendingInject = false;

  function safeInjectButtons() {
    if (isInjecting) {
      pendingInject = true;
      return;
    }
    isInjecting = true;
    observer.disconnect();

    try {
      injectButtons();
    } catch (e) {
      console.error("[핔잇] inject error:", e);
    }

    setTimeout(() => {
      observer.observe(document.body, { childList: true, subtree: true });
      isInjecting = false;
      if (pendingInject) {
        pendingInject = false;
        setTimeout(safeInjectButtons, 1000);
      }
    }, 500);
  }

  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(safeInjectButtons, 1000);
  });

  // Initial injection after page loads
  setTimeout(safeInjectButtons, 3000);

  observer.observe(document.body, { childList: true, subtree: true });

  console.log("[핔잇] Meta 광고 수집기 활성화됨");
})();
