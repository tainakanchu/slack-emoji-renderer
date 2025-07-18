// Types defined inline for browser compatibility
interface EditModeConfig {
  editButtonSelectors?: string[];
  contentSelectors?: string[];
  editAreaSelectors?: string[];
  editButtonTexts?: string[];
}

// Default configuration
const defaultEditModeConfig: Required<EditModeConfig> = {
  editButtonSelectors: ["button", "a", "[role='button']"],
  contentSelectors: [
    // GitHub
    ".comment-body",
    ".js-comment-body",
    ".markdown-body",
    // Discord
    ".messageContent",
    ".markup",
    // Reddit
    ".md",
    ".usertext-body",
    // Slack
    ".c-message__body",
    ".p-rich_text_section",
    // Twitter/X
    ".tweet-text",
    ".css-901oao",
    // 一般的
    ".content",
    ".message",
    ".post-content",
    ".comment-content",
    "[class*='content']",
    "[class*='message']",
    "[class*='comment']",
    "[class*='post']",
  ],
  editAreaSelectors: [
    "textarea",
    "input[type='text']",
    "[contenteditable='true']",
    // リッチテキストエディター
    ".ql-editor",
    ".tox-edit-area",
    ".CodeMirror",
    // 一般的な編集エリア
    "[class*='editor']",
    "[class*='input']",
    "[role='textbox']",
  ],
  editButtonTexts: ["edit", "編集", "修改"],
};

// Configuration merger
function getConfig(
  customConfig: EditModeConfig = {},
): Required<EditModeConfig> {
  return {
    editButtonSelectors:
      customConfig.editButtonSelectors ||
      defaultEditModeConfig.editButtonSelectors,
    contentSelectors:
      customConfig.contentSelectors || defaultEditModeConfig.contentSelectors,
    editAreaSelectors:
      customConfig.editAreaSelectors || defaultEditModeConfig.editAreaSelectors,
    editButtonTexts:
      customConfig.editButtonTexts || defaultEditModeConfig.editButtonTexts,
  };
}

/**
 * 要素が編集ボタンかどうかを判定
 */
function isEditButton(
  element: HTMLElement,
  config: EditModeConfig = {},
): boolean {
  if (!element) return false;

  const mergedConfig = getConfig(config);
  const button = element.closest(mergedConfig.editButtonSelectors.join(", "));
  if (!button) return false;

  return checkEditButtonPatterns(button as HTMLElement, mergedConfig);
}

/**
 * 編集ボタンのパターンをチェック
 */
function checkEditButtonPatterns(
  button: HTMLElement,
  config: Required<EditModeConfig>,
): boolean {
  const buttonText = button.textContent?.toLowerCase() || "";
  const buttonTitle = button.title?.toLowerCase() || "";
  const buttonAriaLabel =
    button.getAttribute("aria-label")?.toLowerCase() || "";

  // テキストベースの検出
  const textMatch = config.editButtonTexts.some(
    (text) =>
      buttonText.includes(text.toLowerCase()) ||
      buttonTitle.includes(text.toLowerCase()) ||
      buttonAriaLabel.includes(text.toLowerCase()),
  );

  if (textMatch) return true;

  // サイト固有のクラス・アイコン検出
  return checkSiteSpecificEditButtons(button);
}

/**
 * サイト固有の編集ボタンパターンをチェック
 */
function checkSiteSpecificEditButtons(button: HTMLElement): boolean {
  // GitHub固有
  if (
    button.classList.contains("js-comment-edit-button") ||
    button.querySelector('[data-octicon="pencil"]') !== null
  ) {
    return true;
  }

  // 一般的なアイコンクラス
  if (
    button.querySelector(
      '.edit-icon, .fa-edit, .fa-pencil, [class*="edit"], [class*="pencil"]',
    ) !== null
  ) {
    return true;
  }

  // Discord, Slack等のtooltip
  const ariaLabel = button.getAttribute("aria-label") || "";
  const dataTooltip = button.getAttribute("data-tooltip") || "";
  if (ariaLabel.includes("Edit") || dataTooltip.includes("Edit")) {
    return true;
  }

  return false;
}

/**
 * 編集ボタンから編集対象のコンテンツ要素を探す
 */
function findEditableContent(
  button: HTMLElement,
  config: EditModeConfig = {},
): HTMLElement | null {
  const mergedConfig = getConfig(config);
  let current = button.parentElement;

  while (current && current !== document.body) {
    const content = current.querySelector(
      mergedConfig.contentSelectors.join(", "),
    );
    if (content) {
      return content as HTMLElement;
    }
    current = current.parentElement;
  }

  // フォールバック: 最も近い編集可能な要素を探す
  return findNearestEditableParent(button);
}

/**
 * 最も近い編集可能な要素を含む親要素を探す
 */
function findNearestEditableParent(element: HTMLElement): HTMLElement | null {
  let current = element.parentElement;

  while (current && current !== document.body) {
    if (hasEditableDescendants(current)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

/**
 * 要素が編集可能な子要素を持つかチェック
 */
function hasEditableDescendants(element: HTMLElement): boolean {
  return (
    element.querySelector(
      "textarea, input[type='text'], [contenteditable='true']",
    ) !== null
  );
}

/**
 * 編集エリア（テキストエリア等）を探す
 */
function findActiveEditArea(
  parentElement: HTMLElement,
  config: EditModeConfig = {},
): HTMLElement | null {
  const mergedConfig = getConfig(config);
  const editArea = parentElement.querySelector(
    mergedConfig.editAreaSelectors.join(", "),
  );
  return editArea as HTMLElement;
}

/**
 * 要素が編集可能かどうかを判定
 */
function isEditableElement(element: HTMLElement): boolean {
  if (!element) return false;

  return (
    element.tagName === "TEXTAREA" ||
    (element.tagName === "INPUT" &&
      (element as HTMLInputElement).type === "text") ||
    element.contentEditable === "true" ||
    element.hasAttribute("contenteditable")
  );
}

// Global assignment for Chrome extension compatibility
(window as any).EditModeUtils = {
  isEditButton,
  findEditableContent,
  findActiveEditArea,
  isEditableElement,
  hasEditableDescendants,
  findNearestEditableParent,
};
