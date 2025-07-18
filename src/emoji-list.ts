// Types defined inline for browser compatibility
type EmojiData = Record<string, string>;

interface EmojiStorageData {
  emojiData?: EmojiData;
}

// Global variables
let allEmojis: Array<{ name: string; url: string }> = [];
let filteredEmojis: Array<{ name: string; url: string }> = [];

// DOM elements
const searchInput = document.getElementById("searchInput") as HTMLInputElement;
const emojiGrid = document.getElementById("emojiGrid") as HTMLDivElement;
const emojiCountElement = document.getElementById(
  "emojiCount",
) as HTMLSpanElement;
const filteredCountElement = document.getElementById(
  "filteredCount",
) as HTMLSpanElement;
const filteredCountNumElement = document.getElementById(
  "filteredCountNum",
) as HTMLSpanElement;

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  loadEmojiData();
  setupEventListeners();
});

function setupEventListeners(): void {
  searchInput.addEventListener("input", handleSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      handleSearch();
    }
  });
}

function loadEmojiData(): void {
  chrome.storage.local.get(["emojiData"], (result: EmojiStorageData) => {
    const emojiData = result.emojiData || {};

    if (Object.keys(emojiData).length === 0) {
      displayNoEmojis();
      return;
    }

    // Convert emoji data to array and filter out aliases to standard emojis
    allEmojis = Object.entries(emojiData)
      .filter(([name, url]) => {
        // Filter out aliases that point to standard emojis (starts with alias: but target not found)
        if (typeof url === "string" && url.startsWith("alias:")) {
          const aliasTarget = url.replace("alias:", "");
          return emojiData[aliasTarget] !== undefined;
        }
        // Filter out direct references to other emoji names that don't resolve to URLs
        if (
          typeof url === "string" &&
          !url.startsWith("http") &&
          !url.startsWith("data:")
        ) {
          return (
            emojiData[url] !== undefined &&
            (emojiData[url].startsWith("http") ||
              emojiData[url].startsWith("data:"))
          );
        }
        return url.startsWith("http") || url.startsWith("data:");
      })
      .map(([name, url]) => {
        const resolvedUrl = resolveEmojiUrl(name, emojiData);
        return resolvedUrl ? { name, url: resolvedUrl } : null;
      })
      .filter((emoji): emoji is { name: string; url: string } => emoji !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    filteredEmojis = [...allEmojis];
    updateDisplay();
  });
}

function resolveEmojiUrl(
  emojiName: string,
  emojiData: EmojiData,
): string | null {
  if (!emojiData[emojiName]) {
    return null;
  }

  let resolvedUrl = emojiData[emojiName];
  let currentName = emojiName;
  const visited = new Set<string>();

  // Follow alias chain (max 10 times)
  while (typeof resolvedUrl === "string" && visited.size < 10) {
    if (visited.has(currentName)) {
      return null; // Circular reference
    }

    // If it's already a URL, return it
    if (resolvedUrl.startsWith("http") || resolvedUrl.startsWith("data:")) {
      return resolvedUrl;
    }

    // Handle alias: prefix
    if (resolvedUrl.startsWith("alias:")) {
      visited.add(currentName);
      const aliasTarget = resolvedUrl.replace("alias:", "");

      if (!emojiData[aliasTarget]) {
        return null; // Alias target not found
      }

      currentName = aliasTarget;
      resolvedUrl = emojiData[aliasTarget];
      continue;
    }

    // Handle direct emoji name reference
    if (emojiData[resolvedUrl]) {
      visited.add(currentName);
      currentName = resolvedUrl;
      resolvedUrl = emojiData[resolvedUrl];
      continue;
    }

    break;
  }

  // Final URL check
  if (
    typeof resolvedUrl === "string" &&
    (resolvedUrl.startsWith("http") || resolvedUrl.startsWith("data:"))
  ) {
    return resolvedUrl;
  }

  return null;
}

function handleSearch(): void {
  const searchTerm = searchInput.value.toLowerCase().trim();

  if (searchTerm === "") {
    filteredEmojis = [...allEmojis];
  } else {
    filteredEmojis = allEmojis.filter((emoji) =>
      emoji.name.toLowerCase().includes(searchTerm),
    );
  }

  updateDisplay();
}

function updateDisplay(): void {
  updateStats();
  renderEmojis();
}

function updateStats(): void {
  emojiCountElement.textContent = allEmojis.length.toString();

  if (filteredEmojis.length !== allEmojis.length) {
    filteredCountNumElement.textContent = filteredEmojis.length.toString();
    filteredCountElement.style.display = "inline";
  } else {
    filteredCountElement.style.display = "none";
  }
}

function renderEmojis(): void {
  if (filteredEmojis.length === 0) {
    if (allEmojis.length === 0) {
      displayNoEmojis();
    } else {
      displayNoResults();
    }
    return;
  }

  const gridHTML = filteredEmojis
    .map((emoji) => createEmojiItemHTML(emoji))
    .join("");

  emojiGrid.innerHTML = gridHTML;

  // Add click listeners for copying
  emojiGrid.querySelectorAll(".emoji-item").forEach((item, index) => {
    item.addEventListener("click", () => {
      const emoji = filteredEmojis[index];
      copyToClipboard(`:${emoji.name}:`);
    });
  });
}

function createEmojiItemHTML(emoji: { name: string; url: string }): string {
  return `
    <div class="emoji-item" title="クリックでコピー">
      <img src="${emoji.url}" alt=":${emoji.name}:" class="emoji-image" />
      <div class="emoji-name">${emoji.name}</div>
      <div class="emoji-code">:${emoji.name}:</div>
    </div>
  `;
}

function displayNoEmojis(): void {
  emojiGrid.innerHTML = `
    <div class="no-emojis">
      絵文字データがありません。<br>
      ポップアップから絵文字を取得してください。
    </div>
  `;
  emojiCountElement.textContent = "0";
  filteredCountElement.style.display = "none";
}

function displayNoResults(): void {
  emojiGrid.innerHTML = `
    <div class="no-emojis">
      検索条件に一致する絵文字が見つかりませんでした。
    </div>
  `;
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    showCopyNotification(`"${text}" をコピーしました`);
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    showCopyNotification(`"${text}" をコピーしました`);
  }
}

function showCopyNotification(message: string): void {
  // Remove existing notification
  const existing = document.querySelector(".copy-notification");
  if (existing) {
    existing.remove();
  }

  // Create new notification
  const notification = document.createElement("div");
  notification.className = "copy-notification";
  notification.textContent = message;
  document.body.appendChild(notification);

  // Show notification
  setTimeout(() => {
    notification.classList.add("show");
  }, 100);

  // Hide and remove notification
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 2000);
}
