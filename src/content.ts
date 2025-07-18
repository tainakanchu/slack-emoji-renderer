// Types defined inline for browser compatibility
type ContentEmojiData = Record<string, string>;

interface ContentStorageData {
  slackToken?: string;
  isEnabled?: boolean;
}

interface ContentEmojiStorageData {
  emojiData?: ContentEmojiData;
}

interface ContentChromeMessage {
  action: "updateEmojiData" | "toggleExtension" | "fetchEmojis";
  emojiData?: ContentEmojiData;
  enabled?: boolean;
}

// ファジーマッチング用の型定義
interface MatchResult {
  name: string;
  score: number;
}

// ファジーマッチング関数
function fuzzySearch(
  searchTerm: string,
  candidates: string[],
  maxResults: number = 10,
): MatchResult[] {
  const searchLower = searchTerm.toLowerCase();

  // 各候補に対してスコアを計算
  const scoredResults = candidates
    .map((name) => {
      const nameLower = name.toLowerCase();
      let score = 0;

      // 1. 完全一致（最高スコア）
      if (nameLower === searchLower) {
        score = 1000;
      }
      // 2. 前方一致（高スコア）
      else if (nameLower.startsWith(searchLower)) {
        score = 900 - searchLower.length;
      }
      // 3. 部分一致（中スコア）
      else if (nameLower.includes(searchLower)) {
        score = 800 - nameLower.indexOf(searchLower) * 10;
      }
      // 4. ファジーマッチング（低〜中スコア）
      else {
        const fuzzyScore = calculateFuzzyScore(searchLower, nameLower);
        if (fuzzyScore > 0.3) {
          score = Math.floor(fuzzyScore * 700);
        }
      }

      return { name, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scoredResults;
}

function calculateFuzzyScore(search: string, target: string): number {
  if (search.length === 0) return 0;
  if (search.length > target.length) return 0;

  let searchIndex = 0;
  let targetIndex = 0;
  let matches = 0;
  let consecutiveMatches = 0;
  let maxConsecutive = 0;

  while (searchIndex < search.length && targetIndex < target.length) {
    if (search[searchIndex] === target[targetIndex]) {
      matches++;
      consecutiveMatches++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
      searchIndex++;
    } else {
      consecutiveMatches = 0;
    }
    targetIndex++;
  }

  if (searchIndex < search.length) {
    return 0;
  }

  const matchRatio = matches / search.length;
  const consecutiveBonus = (maxConsecutive / search.length) * 0.3;
  const lengthPenalty = ((target.length - search.length) / target.length) * 0.2;

  return Math.max(0, matchRatio + consecutiveBonus - lengthPenalty);
}

// エイリアス対応のヘルパー関数
function resolveEmojiAlias(
  emojiName: string,
  emojiData: ContentEmojiData,
): string | null {
  if (!emojiData[emojiName]) {
    return null;
  }

  let resolvedUrl = emojiData[emojiName];
  let currentName = emojiName;
  const visited = new Set<string>(); // 循環参照を防ぐ

  // エイリアスチェーンを辿る（最大10回まで）
  while (typeof resolvedUrl === "string" && visited.size < 10) {
    if (visited.has(currentName)) {
      console.warn(`Circular alias detected for emoji: ${emojiName}`);
      return null;
    }

    // 既にURLの場合は終了
    if (resolvedUrl.startsWith("http") || resolvedUrl.startsWith("data:")) {
      return resolvedUrl;
    }

    // alias: プレフィックスがある場合
    if (resolvedUrl.startsWith("alias:")) {
      visited.add(currentName);
      const aliasTarget = resolvedUrl.replace("alias:", "");

      if (!emojiData[aliasTarget]) {
        console.warn(
          `Alias target not found: ${aliasTarget} for emoji: ${emojiName}`,
        );
        return null;
      }

      currentName = aliasTarget;
      resolvedUrl = emojiData[aliasTarget];
      continue;
    }

    // 直接絵文字名を参照している場合（Slackでよくあるパターン）
    if (emojiData[resolvedUrl]) {
      visited.add(currentName);
      currentName = resolvedUrl;
      resolvedUrl = emojiData[resolvedUrl];
      continue;
    }

    // どちらでもない場合は終了
    break;
  }

  // 最終的にURLが得られたかチェック
  if (
    typeof resolvedUrl === "string" &&
    (resolvedUrl.startsWith("http") || resolvedUrl.startsWith("data:"))
  ) {
    return resolvedUrl;
  }

  return null;
}

function getAllEmojiNames(emojiData: ContentEmojiData): string[] {
  return Object.keys(emojiData);
}

function getEmojiUrl(
  emojiName: string,
  emojiData: ContentEmojiData,
): string | null {
  const resolvedUrl = resolveEmojiAlias(emojiName, emojiData);
  return resolvedUrl;
}

// Edit mode utilities (will be loaded from separate file)

class SlackEmojiRenderer {
  private emojiData: ContentEmojiData = {};
  private isEnabled: boolean = true;
  private observer: MutationObserver | null = null;
  private processedNodes: WeakSet<Node> = new WeakSet();
  private suggestionBox: HTMLDivElement | null = null;
  private currentInput: HTMLInputElement | HTMLTextAreaElement | null = null;
  private currentCaretPosition: number = 0;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    console.log("SlackEmojiRenderer initializing...");
    await this.loadSettings();
    await this.loadEmojiData();
    console.log(
      "Loaded emoji data:",
      Object.keys(this.emojiData).length,
      "emojis",
    );
    console.log("Extension enabled:", this.isEnabled);

    if (this.isEnabled) {
      this.startObserving();
      this.setupInputListeners();
    }
    console.log("SlackEmojiRenderer initialization complete");
  }

  private async loadSettings(): Promise<void> {
    return new Promise<void>((resolve) => {
      chrome.storage.sync.get(["isEnabled"], (result: ContentStorageData) => {
        this.isEnabled =
          result.isEnabled !== undefined ? result.isEnabled : true;
        resolve();
      });
    });
  }

  private async loadEmojiData(): Promise<void> {
    return new Promise<void>((resolve) => {
      chrome.storage.local.get(
        ["emojiData"],
        (result: ContentEmojiStorageData) => {
          this.emojiData = result.emojiData || {};
          resolve();
        },
      );
    });
  }

  private startObserving(): void {
    this.processExistingNodes();

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processNode(node);
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private stopObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private processExistingNodes(): void {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );

    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    textNodes.forEach((textNode) => {
      this.processTextNode(textNode);
    });
  }

  private processNode(node: Node): void {
    if (this.processedNodes.has(node)) {
      return;
    }

    // サジェストボックス内の要素は処理しない
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (
        element.closest(".slack-emoji-suggestions") ||
        element.hasAttribute("data-emoji-exclude")
      ) {
        return;
      }
    }

    this.processedNodes.add(node);

    if (node.nodeType === Node.TEXT_NODE) {
      this.processTextNode(node as Text);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);

      const textNodes: Text[] = [];
      let textNode: Node | null;
      while ((textNode = walker.nextNode())) {
        textNodes.push(textNode as Text);
      }

      textNodes.forEach((textNode) => {
        this.processTextNode(textNode);
      });
    }
  }

  private processTextNode(textNode: Text): void {
    if (!this.isEnabled || !textNode.textContent) {
      return;
    }

    // サジェストボックス内のテキストは置換しない
    let parent = textNode.parentElement;
    while (parent) {
      if (parent.classList.contains("slack-emoji-suggestions")) {
        return;
      }
      parent = parent.parentElement;
    }

    const text = textNode.textContent;
    const emojiPattern = /:([a-zA-Z0-9_+-]+):/g;
    const matches = text.match(emojiPattern);

    if (matches) {
      let newHtml = text;

      // 重複を除去してユニークな絵文字のみ処理
      const uniqueMatches = [...new Set(matches)];

      uniqueMatches.forEach((match) => {
        const emojiName = match.slice(1, -1);
        const emojiUrl = getEmojiUrl(emojiName, this.emojiData);
        if (emojiUrl) {
          const imgTag = `<img src="${emojiUrl}" alt="${match}" title="${match}" class="slack-emoji-renderer" style="width: 1.2em; height: 1.2em; vertical-align: middle; margin: 0 0.1em;">`;
          // split/joinを使用して全ての出現を置換
          newHtml = newHtml.split(match).join(imgTag);
        }
      });

      if (newHtml !== text) {
        const parent = textNode.parentNode;
        if (parent) {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = newHtml;

          while (tempDiv.firstChild) {
            parent.insertBefore(tempDiv.firstChild, textNode);
          }

          parent.removeChild(textNode);
        }
      }
    }
  }

  public updateEmojiData(newEmojiData: ContentEmojiData): void {
    this.emojiData = newEmojiData;
    this.processedNodes = new WeakSet();

    if (this.isEnabled) {
      this.processExistingNodes();
    }
  }

  public toggleExtension(enabled: boolean): void {
    this.isEnabled = enabled;

    if (enabled) {
      this.startObserving();
      this.setupInputListeners();
    } else {
      this.stopObserving();
      this.removeAllEmojis();
      this.removeSuggestionBox();
    }
  }

  private setupInputListeners(): void {
    console.log("Setting up input listeners");
    document.addEventListener("input", this.handleInput.bind(this));
    // キーボードイベントをキャプチャフェーズで処理して優先度を上げる
    document.addEventListener("keydown", this.handleKeydown.bind(this), true);
    document.addEventListener("click", this.handleClick.bind(this));
    // フォーカスイベントで編集モード対応
    document.addEventListener("focusin", this.handleFocusIn.bind(this));
    document.addEventListener("focusout", this.handleFocusOut.bind(this));
    // 編集ボタンクリック時の処理
    document.addEventListener(
      "click",
      this.handleEditButtonClick.bind(this),
      true,
    );
    console.log("Input listeners setup complete");
  }

  private handleInput(event: Event): void {
    console.log("Input event received:", event.target);
    if (!this.isEnabled) {
      console.log("Extension disabled, skipping");
      return;
    }

    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (
      !target ||
      (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA")
    ) {
      return;
    }

    this.currentInput = target;

    // キャレット位置を更新する際にtimeoutを使用
    setTimeout(() => {
      this.currentCaretPosition = target.selectionStart || 0;

      const value = target.value;
      const beforeCaret = value.substring(0, this.currentCaretPosition);

      console.log(
        "Input event - value:",
        value,
        "caret:",
        this.currentCaretPosition,
      );

      // :で始まる未完成の絵文字パターンを検索
      const emojiMatch = beforeCaret.match(/:([a-zA-Z0-9_+-]*)$/);

      if (emojiMatch) {
        const searchTerm = emojiMatch[1];
        console.log(
          "Found emoji pattern:",
          emojiMatch[0],
          "search term:",
          searchTerm,
        );
        this.showSuggestions(searchTerm, target);
      } else {
        this.removeSuggestionBox();
      }

      // 完成した絵文字パターンを置換
      this.replaceEmojisInInput(target);
    }, 0);
  }

  private handleKeydown(event: KeyboardEvent): void {
    // サジェストボックスが表示されていない場合は早期リターン
    if (!this.suggestionBox || !this.suggestionBox.parentNode) {
      return;
    }

    console.log("Keydown event:", event.key, "Suggestion box visible");

    const suggestions = this.suggestionBox.querySelectorAll(
      ".emoji-suggestion-item",
    );

    if (suggestions.length === 0) {
      return;
    }

    let selectedIndex = Array.from(suggestions).findIndex((item) =>
      item.classList.contains("selected"),
    );

    console.log(
      "Current selected index:",
      selectedIndex,
      "Total suggestions:",
      suggestions.length,
    );

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        event.stopPropagation();
        selectedIndex =
          selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0; // ループする
        this.updateSelectedSuggestion(selectedIndex);
        console.log("Moving down to index:", selectedIndex);
        break;
      case "ArrowUp":
        event.preventDefault();
        event.stopPropagation();
        selectedIndex =
          selectedIndex > 0 ? selectedIndex - 1 : suggestions.length - 1; // ループする
        this.updateSelectedSuggestion(selectedIndex);
        console.log("Moving up to index:", selectedIndex);
        break;
      case "Enter":
      case "Tab":
        event.preventDefault();
        event.stopPropagation();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          console.log("Selecting suggestion at index:", selectedIndex);
          this.selectSuggestion(suggestions[selectedIndex] as HTMLDivElement);
        }
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        this.removeSuggestionBox();
        console.log("Closing suggestion box");
        break;
    }
  }

  private handleClick(event: Event): void {
    const target = event.target as HTMLElement;

    // サジェストアイテムがクリックされた場合
    if (this.suggestionBox && this.suggestionBox.contains(target)) {
      event.preventDefault();
      event.stopPropagation();

      // クリックされた要素またはその親要素のサジェストアイテムを探す
      let suggestionItem = target;
      while (
        suggestionItem &&
        !suggestionItem.classList.contains("emoji-suggestion-item")
      ) {
        suggestionItem = suggestionItem.parentElement as HTMLElement;
      }

      if (
        suggestionItem &&
        suggestionItem.classList.contains("emoji-suggestion-item")
      ) {
        this.selectSuggestion(suggestionItem as HTMLDivElement);
      }
      return;
    }

    // サジェストボックス外がクリックされた場合は閉じる
    if (this.suggestionBox) {
      this.removeSuggestionBox();
    }
  }

  private handleFocusIn(event: Event): void {
    const target = event.target as HTMLElement;

    // 編集可能な要素にフォーカスが入った場合
    if ((window as any).EditModeUtils.isEditableElement(target)) {
      console.log("Focus in editable element:", target);
      this.revertEmojisInElement(target);
    }
  }

  private handleFocusOut(event: Event): void {
    const target = event.target as HTMLElement;

    // 編集可能な要素からフォーカスが外れた場合
    if ((window as any).EditModeUtils.isEditableElement(target)) {
      console.log("Focus out editable element:", target);
      // 少し遅延させてから絵文字化を実行（他の処理を待つため）
      setTimeout(() => {
        this.processNode(target);
      }, 100);
    }
  }

  private revertEmojisInElement(element: HTMLElement): void {
    // 要素内の絵文字画像を元のテキストに戻す
    const emojiImages = element.querySelectorAll(".slack-emoji-renderer");

    emojiImages.forEach((img) => {
      const altText = img.getAttribute("alt");
      if (altText && img.parentNode) {
        const textNode = document.createTextNode(altText);
        img.parentNode.replaceChild(textNode, img);
      }
    });

    console.log("Reverted", emojiImages.length, "emoji images to text");
  }

  private handleEditButtonClick(event: Event): void {
    const target = event.target as HTMLElement;

    // GitHub等の編集ボタンを検出
    if ((window as any).EditModeUtils.isEditButton(target)) {
      console.log("Edit button clicked:", target);

      // 編集対象のコンテンツ要素を探す
      const contentElement = (window as any).EditModeUtils.findEditableContent(
        target,
      );
      if (contentElement) {
        console.log("Found editable content:", contentElement);
        // 即座に絵文字を元のテキストに戻す
        this.revertEmojisInElement(contentElement);

        // 編集モードが表示されるまで少し待ってから再度処理
        setTimeout(() => {
          const editArea = (window as any).EditModeUtils.findActiveEditArea(
            contentElement,
          );
          if (editArea) {
            this.revertEmojisInElement(editArea);
          }
        }, 200);
      }
    }
  }

  private showSuggestions(
    searchTerm: string,
    inputElement: HTMLInputElement | HTMLTextAreaElement,
  ): void {
    const allEmojis = Object.keys(this.emojiData);
    // エイリアスも含めて有効な絵文字のみをフィルタ
    const validEmojis = allEmojis.filter((emojiName) => {
      const url = getEmojiUrl(emojiName, this.emojiData);
      return url !== null;
    });

    console.log(
      `Searching for: "${searchTerm}" (${validEmojis.length} valid emojis out of ${allEmojis.length} total)`,
    );

    const scoredEmojis = fuzzySearch(searchTerm, validEmojis, 10);

    if (scoredEmojis.length === 0) {
      this.removeSuggestionBox();
      return;
    }

    const matchingEmojis = scoredEmojis.map((item) => item.name);
    console.log(
      "Top suggestions:",
      scoredEmojis.slice(0, 5).map((item) => `${item.name}(${item.score})`),
    );
    this.createSuggestionBox(matchingEmojis, inputElement);
  }

  private createSuggestionBox(
    emojis: string[],
    inputElement: HTMLInputElement | HTMLTextAreaElement,
  ): void {
    this.removeSuggestionBox();

    this.suggestionBox = document.createElement("div");
    this.suggestionBox.className = "slack-emoji-suggestions";
    this.suggestionBox.setAttribute("data-emoji-exclude", "true");

    emojis.forEach((emojiName, index) => {
      const item = document.createElement("div");
      item.className = "emoji-suggestion-item";
      if (index === 0) item.classList.add("selected");

      const img = document.createElement("img");
      const emojiUrl = getEmojiUrl(emojiName, this.emojiData);
      if (emojiUrl) {
        img.src = emojiUrl;
      }
      img.alt = `:${emojiName}:`;
      img.className = "emoji-suggestion-icon";

      const name = document.createElement("span");
      name.textContent = `:${emojiName}:`;
      name.className = "emoji-suggestion-name";

      item.appendChild(img);
      item.appendChild(name);

      // マウスオーバーで選択状態を更新
      item.addEventListener("mouseenter", () => {
        this.updateSelectedSuggestion(index);
      });

      // マウスダウンイベントでも処理（クリックより確実）
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectSuggestion(item);
      });

      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectSuggestion(item);
      });

      this.suggestionBox!.appendChild(item);
    });

    this.positionSuggestionBox(inputElement);
    document.body.appendChild(this.suggestionBox);

    console.log("Suggestion box created with", emojis.length, "items");
  }

  private positionSuggestionBox(
    inputElement: HTMLInputElement | HTMLTextAreaElement,
  ): void {
    if (!this.suggestionBox) return;

    const rect = inputElement.getBoundingClientRect();
    const caretPosition = this.getCaretPosition(inputElement);

    this.suggestionBox.style.position = "fixed";
    this.suggestionBox.style.left = `${rect.left + caretPosition.left}px`;
    this.suggestionBox.style.top = `${rect.top + caretPosition.top + 20}px`;
    this.suggestionBox.style.zIndex = "10000";
  }

  private getCaretPosition(
    inputElement: HTMLInputElement | HTMLTextAreaElement,
  ): { left: number; top: number } {
    const value = inputElement.value;
    const caretIndex = inputElement.selectionStart || 0;

    // 簡易的なキャレット位置計算（フォントサイズに基づく）
    const style = window.getComputedStyle(inputElement);
    const fontSize = parseInt(style.fontSize) || 14;
    const lineHeight = parseInt(style.lineHeight) || fontSize * 1.2;

    const beforeCaret = value.substring(0, caretIndex);
    const lines = beforeCaret.split("\n");
    const currentLine = lines[lines.length - 1];

    return {
      left: currentLine.length * (fontSize * 0.6), // 概算
      top: (lines.length - 1) * lineHeight,
    };
  }

  private updateSelectedSuggestion(index: number): void {
    if (!this.suggestionBox) return;

    const suggestions = this.suggestionBox.querySelectorAll(
      ".emoji-suggestion-item",
    );
    suggestions.forEach((item, i) => {
      item.classList.toggle("selected", i === index);
    });
  }

  private selectSuggestion(item: HTMLDivElement): void {
    console.log("selectSuggestion called", item);

    if (!this.currentInput) {
      console.log("No current input");
      return;
    }

    const emojiName = item.querySelector(".emoji-suggestion-name")?.textContent;
    console.log("Found emoji name:", emojiName);

    if (!emojiName) {
      console.log("No emoji name found");
      return;
    }

    const value = this.currentInput.value;
    const beforeCaret = value.substring(0, this.currentCaretPosition);
    const afterCaret = value.substring(this.currentCaretPosition);

    console.log("Current value:", value);
    console.log("Before caret:", beforeCaret);
    console.log("Caret position:", this.currentCaretPosition);

    // :で始まる未完成部分を削除
    const emojiMatch = beforeCaret.match(/:([a-zA-Z0-9_+-]*)$/);
    console.log("Emoji match:", emojiMatch);

    if (emojiMatch) {
      const newBeforeCaret = beforeCaret.substring(
        0,
        beforeCaret.length - emojiMatch[0].length,
      );
      const newValue = newBeforeCaret + emojiName + " " + afterCaret;

      console.log("New value:", newValue);

      this.currentInput.value = newValue;
      this.currentInput.focus();

      const newCaretPosition = newBeforeCaret.length + emojiName.length + 1;
      this.currentInput.setSelectionRange(newCaretPosition, newCaretPosition);

      // inputイベントを発火させて他のリスナーに通知
      this.currentInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    this.removeSuggestionBox();
  }

  private replaceEmojisInInput(
    inputElement: HTMLInputElement | HTMLTextAreaElement,
  ): void {
    // テキスト入力フィールドでは絵文字置換を行わない
    // サジェスト機能で選択されたもののみ処理する
    return;
  }

  private removeSuggestionBox(): void {
    if (this.suggestionBox && this.suggestionBox.parentNode) {
      this.suggestionBox.parentNode.removeChild(this.suggestionBox);
    }
    this.suggestionBox = null;
  }

  private removeAllEmojis(): void {
    const emojiElements = document.querySelectorAll(".slack-emoji-renderer");
    emojiElements.forEach((img) => {
      const parent = img.parentNode;
      if (parent) {
        const altText = img.getAttribute("alt") || "";
        parent.replaceChild(document.createTextNode(altText), img);
      }
    });
  }
}

const slackEmojiRenderer = new SlackEmojiRenderer();

chrome.runtime.onMessage.addListener(
  (request: ContentChromeMessage, sender, sendResponse) => {
    if (request.action === "updateEmojiData" && request.emojiData) {
      slackEmojiRenderer.updateEmojiData(request.emojiData);
      sendResponse({ success: true });
    } else if (
      request.action === "toggleExtension" &&
      request.enabled !== undefined
    ) {
      slackEmojiRenderer.toggleExtension(request.enabled);
      sendResponse({ success: true });
    }
  },
);

console.log("Slack Emoji Renderer loaded");
