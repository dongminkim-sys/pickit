/**
 * 핔잇 - Naver GFA 광고 수집 Content Script
 *
 * 네이버 페이지에서 GFA 광고를 감지하고,
 * 각 광고에 "핔잇" 버튼을 삽입합니다.
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

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.serverUrl) settings.serverUrl = changes.serverUrl.newValue.replace(/\/+$/, "");
    if (changes.userName) settings.userName = changes.userName.newValue;
    if (changes.defaultCategory) settings.defaultCategory = changes.defaultCategory.newValue;
  });

  // ─── GFA Ad Detection (iframe 기반) ───
  // 네이버 GFA 광고는 각각 개별 iframe 안에 렌더링됨
  // iframe.contentDocument로 접근하여 .icon_nad 배지를 찾음

  function findGfaAds() {
    const ads = [];
    const iframes = document.querySelectorAll("iframe");

    for (const iframe of iframes) {
      if (iframe.hasAttribute("data-pickit-naver")) continue;
      try {
        const doc = iframe.contentDocument;
        if (!doc || !doc.body) continue;
        const badge = doc.querySelector('.icon_nad, [aria-label="AD"]');
        if (!badge) continue;
        ads.push({ iframe, iframeDoc: doc, badge });
      } catch (e) {
        // cross-origin iframe — 접근 불가
      }
    }

    console.log(`[핔잇] GFA 광고 ${ads.length}개 감지됨`);
    return ads;
  }

  // ─── Ad Data Extraction (iframe 내부에서) ───

  function extractAdData(iframeDoc, badge) {
    const data = {
      brand: "",
      title: "",
      body: "",
      media_url: "",
      media_type: "image",
      thumbnail_url: "",
      ad_url: "",
      is_video_ad: false,
    };

    // 브랜드명: .item_name (네이버 GFA 표준 클래스)
    const nameEl = iframeDoc.querySelector(".item_name");
    if (nameEl) {
      data.brand = nameEl.textContent?.trim() || "";
    }

    // 브랜드명 fallback: badge 형제에서
    if (!data.brand && badge) {
      const parent = badge.parentElement;
      if (parent) {
        for (const child of parent.children) {
          if (child === badge) continue;
          const text = child.textContent?.trim();
          if (text && text.length >= 2 && text.length <= 40) {
            data.brand = text;
            break;
          }
        }
      }
    }

    // 광고 문구: 여러 셀렉터 시도
    const titleEl = iframeDoc.querySelector(
      '.item_title, [data-gfp-role="descLink"], .item_desc, .text_area'
    );
    if (titleEl) {
      data.body = titleEl.textContent?.trim() || "";
      data.title = data.body.slice(0, 80);
    }

    // 제목 fallback: iframe 내 텍스트 중 가장 긴 것
    if (!data.body) {
      const textEls = iframeDoc.querySelectorAll("a, p, span, div");
      for (const el of textEls) {
        if (el.children.length > 3) continue;
        const text = el.textContent?.trim();
        if (!text || text.length < 10 || text === data.brand) continue;
        if (/더 알아보기|자세히 보기|바로가기|지금 구매하기/.test(text)) continue;
        if (text.length > data.body.length) {
          data.body = text;
          data.title = text.slice(0, 80);
        }
      }
    }

    // 미디어 - 비디오: src가 http URL인 경우만 (blob: 제외)
    const video = iframeDoc.querySelector("video");
    if (video) {
      data.is_video_ad = true;
      const videoSrc = video.src || video.querySelector("source")?.src || "";
      if (videoSrc && videoSrc.startsWith("http")) {
        data.media_url = videoSrc;
        data.media_type = "video";
      }
      if (video.poster && video.poster.startsWith("http")) {
        data.thumbnail_url = video.poster;
      }
    }

    // 미디어 - 이미지 (.item_view_image 또는 가장 큰 이미지)
    if (!data.media_url) {
      const mainImg = iframeDoc.querySelector(".item_view_image");
      if (mainImg && mainImg.src) {
        data.media_url = mainImg.src;
        data.media_type = "image";
      } else {
        const imgs = iframeDoc.querySelectorAll("img");
        let bestImg = null;
        let bestSize = 0;
        for (const img of imgs) {
          const w = img.naturalWidth || img.width || 0;
          const h = img.naturalHeight || img.height || 0;
          const size = w * h;
          if (size > bestSize && w > 50 && h > 50) {
            bestSize = size;
            bestImg = img;
          }
        }
        if (bestImg) {
          data.media_url = bestImg.src;
          data.media_type = "image";
        }
      }
    }

    // 비디오인데 URL이 blob이면 → 스틸컷 이미지로 대체
    if (!data.media_url && video) {
      // 1순위: .item_still img (네이버 GFA 비디오 스틸컷)
      const stillImg = iframeDoc.querySelector(".item_still img");
      if (stillImg && stillImg.src && stillImg.src.startsWith("http")) {
        data.media_url = stillImg.src;
        data.media_type = "image";
      }
      // 2순위: 비디오 포스터
      else if (data.thumbnail_url) {
        data.media_url = data.thumbnail_url;
        data.media_type = "image";
      }
      // 3순위: iframe 내 가장 큰 이미지
      else {
        const imgs = iframeDoc.querySelectorAll("img");
        let bestImg = null;
        let bestSize = 0;
        for (const img of imgs) {
          const w = img.naturalWidth || img.width || 0;
          const h = img.naturalHeight || img.height || 0;
          if (w * h > bestSize && w > 50 && h > 50) {
            bestSize = w * h;
            bestImg = img;
          }
        }
        if (bestImg) {
          data.media_url = bestImg.src;
          data.media_type = "image";
        }
      }
    }

    // 광고 링크 URL (.item_link 또는 첫 번째 링크)
    const linkEl = iframeDoc.querySelector("a.item_link, a[data-gfp-role='link'], a[data-gfp-role='descLink']");
    if (linkEl) {
      data.ad_url = linkEl.href || "";
    }

    if (!data.title && data.brand) {
      data.title = `${data.brand} 광고`;
    }

    return data;
  }

  // ─── Unique ID for deduplication ───

  function generateAdId(iframeDoc, badge) {
    const data = extractAdData(iframeDoc, badge);
    const key = `naver_${data.brand}_${data.media_url}`.replace(/[^a-zA-Z0-9가-힣]/g, "_").slice(0, 100);
    return key;
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
          <label>브랜드</label>
          <input type="text" id="pickit-brand" placeholder="브랜드명 입력" />
        </div>
        <div class="pickit-panel-field">
          <label>제목</label>
          <input type="text" id="pickit-title" placeholder="이 광고의 제목" />
        </div>
        <div class="pickit-panel-field">
          <label>광고 문구</label>
          <textarea id="pickit-adcopy" rows="3"></textarea>
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
          <input type="text" id="pickit-tags" placeholder="예: 할인, 신제품, 건강" />
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
  let currentAdId = null;

  function openPanel(adData, adId) {
    if (!panelElements) {
      panelElements = createPanel();
    }

    currentAdData = adData;
    currentAdId = adId;
    const { panel, overlay } = panelElements;

    document.getElementById("pickit-brand").value = adData.brand || "";
    document.getElementById("pickit-title").value = adData.title || "";
    document.getElementById("pickit-adcopy").value = adData.body || "";
    document.getElementById("pickit-category").value = settings.defaultCategory || "";
    document.getElementById("pickit-tags").value = "";
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

    // 영상 광고 안내
    let notice = document.getElementById("pickit-video-notice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "pickit-video-notice";
      notice.style.cssText = "padding:10px 14px;background:#fef3c7;color:#92400e;border-radius:8px;font-size:13px;line-height:1.5;margin-bottom:16px;display:none;";
      preview.after(notice);
    }
    if (adData.is_video_ad) {
      notice.textContent = "영상 광고는 스틸컷 이미지로 수집됩니다.";
      notice.style.display = "block";
    } else {
      notice.style.display = "none";
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
    currentAdId = null;
  }

  async function submitCollection(btn) {
    if (!currentAdData) return;

    btn.disabled = true;
    btn.textContent = "수집 중...";

    const adCopy = document.getElementById("pickit-adcopy").value;
    const userMemo = document.getElementById("pickit-memo").value;
    const tags = document.getElementById("pickit-tags").value;
    const brandValue = document.getElementById("pickit-brand").value;
    const titleValue = document.getElementById("pickit-title").value || brandValue || "";

    const memoParts = [adCopy, userMemo];
    const fullMemo = memoParts.filter(Boolean).join("\n\n---\n");

    const payload = {
      title: titleValue,
      brand: brandValue,
      platform: "gfa",
      media_type: currentAdData.media_type,
      media_url: currentAdData.media_url,
      thumbnail_url: currentAdData.thumbnail_url || "",
      category: document.getElementById("pickit-category").value,
      tags: tags,
      memo: fullMemo,
      ad_start_date: null,
      active_days: null,
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
      if (currentAdId) {
        collectedIds.add(currentAdId);
        chrome.storage.local.set({ collectedIds: [...collectedIds] });
        markCardAsCollected(currentAdId);
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

  // ─── Button Injection (Overlay 방식) ───

  const buttonEntries = []; // { btn, iframe, iframeDoc, badge, adId }

  const BTN_STYLE = "position:fixed;display:flex;align-items:center;gap:4px;padding:6px 14px;border:none;border-radius:6px;font-size:13px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,Pretendard,sans-serif;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);pointer-events:auto;z-index:2147483647;color:#fff;line-height:1.4;";

  function createCollectButton(isCollected) {
    const btn = document.createElement("button");
    btn.setAttribute("data-pickit-btn", "1");
    if (isCollected) {
      btn.style.cssText = BTN_STYLE + "background:#9ca3af;cursor:default;";
      btn.textContent = "✓ 수집됨";
      btn.disabled = true;
    } else {
      btn.style.cssText = BTN_STYLE + "background:#e60023;";
      btn.textContent = "📌 핔잇!";
    }
    return btn;
  }

  function markCardAsCollected(adId) {
    for (const entry of buttonEntries) {
      if (entry.adId === adId) {
        entry.btn.textContent = "✓ 수집됨";
        entry.btn.style.background = "#9ca3af";
        entry.btn.style.cursor = "default";
        entry.btn.disabled = true;
      }
    }
  }

  function updateButtonPositions() {
    for (let i = buttonEntries.length - 1; i >= 0; i--) {
      const { btn, iframe } = buttonEntries[i];
      if (!document.body.contains(iframe)) {
        btn.remove();
        buttonEntries.splice(i, 1);
        continue;
      }
      const rect = iframe.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        btn.style.display = "none";
        continue;
      }
      btn.style.display = "flex";
      btn.style.top = (rect.top + 8) + "px";
      btn.style.right = (window.innerWidth - rect.right + 8) + "px";
    }
  }

  function injectButtons() {
    const gfaAds = findGfaAds();

    for (const { iframe, iframeDoc, badge } of gfaAds) {
      const adId = generateAdId(iframeDoc, badge);
      const isCollected = collectedIds.has(adId);
      const btn = createCollectButton(isCollected);

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const adData = extractAdData(iframeDoc, badge);

        openPanel(adData, adId);
      });

      document.body.appendChild(btn);
      iframe.setAttribute("data-pickit-naver", adId);
      buttonEntries.push({ btn, iframe, iframeDoc, badge, adId });

      console.log("[핔잇] 버튼 삽입:", adId);
    }

    updateButtonPositions();
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
      console.error("[핔잇] Naver inject error:", e);
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

  // 스크롤/리사이즈 시 버튼 위치 업데이트
  let rafId = null;
  function onScrollOrResize() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      updateButtonPositions();
      rafId = null;
    });
  }
  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize, { passive: true });

  // Initial injection after page loads
  setTimeout(safeInjectButtons, 2000);

  observer.observe(document.body, { childList: true, subtree: true });

  console.log("[핔잇] Naver GFA 광고 수집기 활성화됨");
})();
