// Types defined inline for browser compatibility
type ContentEmojiData = Record<string, string>;

/**
 * エイリアス対応のヘルパー関数
 * エイリアスチェーンを辿って最終的な絵文字URLを解決する
 */
export function resolveEmojiAlias(
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

/**
 * 絵文字データから全ての絵文字名を取得
 */
export function getAllEmojiNames(emojiData: ContentEmojiData): string[] {
  return Object.keys(emojiData);
}

/**
 * エイリアス解決を含む統一的な絵文字URL取得関数
 */
export function getEmojiUrl(
  emojiName: string,
  emojiData: ContentEmojiData,
): string | null {
  const resolvedUrl = resolveEmojiAlias(emojiName, emojiData);
  return resolvedUrl;
}
