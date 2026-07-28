const CHAT_URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/giu;
const TRAILING_URL_PUNCTUATION = /[.,!?;:)\]}]+$/u;

function splitTrailingPunctuation(value) {
  const url = String(value || "");
  const trailing = url.match(TRAILING_URL_PUNCTUATION)?.[0] || "";
  return {
    url: trailing ? url.slice(0, -trailing.length) : url,
    trailing
  };
}

function createChatLink(rawUrl) {
  const parsed = new URL(/^www\./iu.test(rawUrl) ? `https://${rawUrl}` : rawUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) return null;
  const link = document.createElement("a");
  link.className = "marin-message-link";
  link.href = parsed.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `Abrir link ${rawUrl}`);

  const globe = document.createElement("span");
  globe.className = "marin-message-link-globe";
  globe.textContent = "\u{1F310}";
  globe.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "marin-message-link-label";
  label.textContent = rawUrl;
  link.append(globe, label);
  return link;
}

export function renderChatMessageContent(container, content) {
  if (!(container instanceof Element)) return;
  const text = String(content || "");
  container.replaceChildren();
  let cursor = 0;
  for (const match of text.matchAll(CHAT_URL_PATTERN)) {
    const index = Number(match.index || 0);
    if (index > cursor) container.append(document.createTextNode(text.slice(cursor, index)));
    const { url, trailing } = splitTrailingPunctuation(match[0]);
    let link = null;
    try {
      link = createChatLink(url);
    } catch {}
    container.append(link || document.createTextNode(match[0]));
    if (link && trailing) container.append(document.createTextNode(trailing));
    cursor = index + match[0].length;
  }
  if (cursor < text.length) container.append(document.createTextNode(text.slice(cursor)));
}
