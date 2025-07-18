// Types defined inline for Service Worker compatibility
type BackgroundEmojiData = Record<string, string>;

interface BackgroundStorageData {
  slackToken?: string;
  isEnabled?: boolean;
}

interface BackgroundEmojiStorageData {
  emojiData?: BackgroundEmojiData;
}

interface BackgroundSlackEmojiResponse {
  ok: boolean;
  emoji: BackgroundEmojiData;
  error?: string;
}

interface BackgroundChromeMessage {
  action: "updateEmojiData" | "toggleExtension" | "fetchEmojis";
  emojiData?: BackgroundEmojiData;
  enabled?: boolean;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Slack Emoji Renderer installed");

  chrome.storage.sync.set({
    isEnabled: true,
  });
});

chrome.runtime.onMessage.addListener(
  (request: BackgroundChromeMessage, sender, sendResponse) => {
    if (request.action === "fetchEmojis") {
      chrome.storage.sync.get(
        ["slackToken"],
        (result: BackgroundStorageData) => {
          if (!result.slackToken) {
            sendResponse({ error: "No Slack token found" });
            return;
          }

          fetch("https://slack.com/api/emoji.list", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${result.slackToken}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          })
            .then((response) => response.json())
            .then((data: BackgroundSlackEmojiResponse) => {
              if (data.ok) {
                chrome.storage.local.set({ emojiData: data.emoji }, () => {
                  sendResponse({
                    success: true,
                    count: Object.keys(data.emoji).length,
                  });
                });
              } else {
                sendResponse({ error: data.error });
              }
            })
            .catch((error) => {
              sendResponse({ error: error.message });
            });
        },
      );

      return true; // Will respond asynchronously
    }
  },
);

chrome.tabs.onUpdated.addListener(
  (
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab,
  ) => {
    if (changeInfo.status === "complete" && tab.url) {
      chrome.storage.sync.get(
        ["isEnabled"],
        (result: BackgroundStorageData) => {
          if (result.isEnabled) {
            chrome.storage.local.get(
              ["emojiData"],
              (emojiResult: BackgroundEmojiStorageData) => {
                if (emojiResult.emojiData) {
                  chrome.tabs
                    .sendMessage(tabId, {
                      action: "updateEmojiData",
                      emojiData: emojiResult.emojiData,
                    })
                    .catch(() => {
                      // コンテンツスクリプトがロードされていない場合のエラーを無視
                    });
                }
              },
            );
          }
        },
      );
    }
  },
);
