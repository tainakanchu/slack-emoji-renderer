// Types defined inline for browser compatibility
type PopupEmojiData = Record<string, string>;

interface PopupStorageData {
  slackToken?: string;
  isEnabled?: boolean;
}

interface PopupEmojiStorageData {
  emojiData?: PopupEmojiData;
}

interface PopupSlackEmojiResponse {
  ok: boolean;
  emoji: PopupEmojiData;
  error?: string;
}

interface PopupStatusMessage {
  message: string;
  type: "success" | "error";
}

class PopupManager {
  private slackTokenInput!: HTMLInputElement;
  private saveSettingsBtn!: HTMLButtonElement;
  private fetchEmojisBtn!: HTMLButtonElement;
  private statusDiv!: HTMLDivElement;
  private emojiCountDiv!: HTMLDivElement;
  private extensionToggle!: HTMLDivElement;

  constructor() {
    this.initializeElements();
    this.loadSettings();
    this.loadEmojiCount();
    this.attachEventListeners();
  }

  private initializeElements(): void {
    this.slackTokenInput = document.getElementById(
      "slackToken",
    ) as HTMLInputElement;
    this.saveSettingsBtn = document.getElementById(
      "saveSettings",
    ) as HTMLButtonElement;
    this.fetchEmojisBtn = document.getElementById(
      "fetchEmojis",
    ) as HTMLButtonElement;
    this.statusDiv = document.getElementById("status") as HTMLDivElement;
    this.emojiCountDiv = document.getElementById(
      "emojiCount",
    ) as HTMLDivElement;
    this.extensionToggle = document.getElementById(
      "extensionToggle",
    ) as HTMLDivElement;
  }

  private loadSettings(): void {
    chrome.storage.sync.get(
      ["slackToken", "isEnabled"],
      (result: PopupStorageData) => {
        if (result.slackToken) {
          this.slackTokenInput.value = result.slackToken;
          this.fetchEmojisBtn.disabled = false;
        } else {
          this.fetchEmojisBtn.disabled = true;
        }
        if (result.isEnabled !== undefined) {
          this.extensionToggle.classList.toggle("active", result.isEnabled);
        } else {
          this.extensionToggle.classList.add("active");
        }
      },
    );
  }

  private loadEmojiCount(): void {
    chrome.storage.local.get(["emojiData"], (result: PopupEmojiStorageData) => {
      if (result.emojiData) {
        const count = Object.keys(result.emojiData).length;
        this.emojiCountDiv.textContent = `取得済み絵文字: ${count}個`;
      }
    });
  }

  private attachEventListeners(): void {
    this.extensionToggle.addEventListener("click", () =>
      this.toggleExtension(),
    );
    this.saveSettingsBtn.addEventListener("click", () => this.saveSettings());
    this.fetchEmojisBtn.addEventListener("click", () => this.fetchEmojis());
  }

  private toggleExtension(): void {
    const isEnabled = !this.extensionToggle.classList.contains("active");
    this.extensionToggle.classList.toggle("active", isEnabled);

    chrome.storage.sync.set({ isEnabled }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "toggleExtension",
            enabled: isEnabled,
          });
        }
      });
    });
  }

  private saveSettings(): void {
    const token = this.slackTokenInput.value.trim();
    if (!token) {
      this.showStatus("トークンを入力してください", "error");
      return;
    }

    // 保存中の状態を表示
    this.saveSettingsBtn.disabled = true;
    this.saveSettingsBtn.textContent = "保存中...";
    this.showStatus("設定を保存しています...", "success");

    chrome.storage.sync.set({ slackToken: token }, () => {
      this.showStatus("✅ 設定を保存しました", "success");
      this.saveSettingsBtn.disabled = false;
      this.saveSettingsBtn.textContent = "設定を保存";

      // 保存後に「絵文字を取得」ボタンを有効化
      this.fetchEmojisBtn.disabled = false;
    });
  }

  private async fetchEmojis(): Promise<void> {
    try {
      const result = await new Promise<PopupStorageData>((resolve) => {
        chrome.storage.sync.get(["slackToken"], resolve);
      });

      if (!result.slackToken) {
        this.showStatus("先にSlack APIトークンを設定してください", "error");
        return;
      }

      this.showStatus("絵文字を取得中...", "success");
      this.fetchEmojisBtn.disabled = true;

      const response = await fetch("https://slack.com/api/emoji.list", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${result.slackToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const data: PopupSlackEmojiResponse = await response.json();

      if (data.ok) {
        await new Promise<void>((resolve) => {
          chrome.storage.local.set({ emojiData: data.emoji }, resolve);
        });

        const count = Object.keys(data.emoji).length;
        this.showStatus(`${count}個の絵文字を取得しました`, "success");
        this.emojiCountDiv.textContent = `取得済み絵文字: ${count}個`;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "updateEmojiData",
              emojiData: data.emoji,
            });
          }
        });
      } else {
        this.showStatus(`エラー: ${data.error}`, "error");
      }
    } catch (error) {
      this.showStatus(
        `エラー: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    } finally {
      this.fetchEmojisBtn.disabled = false;
    }
  }

  private showStatus(message: string, type: "success" | "error"): void {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `status ${type}`;
    setTimeout(() => {
      this.statusDiv.textContent = "";
      this.statusDiv.className = "";
    }, 3000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PopupManager();
});
