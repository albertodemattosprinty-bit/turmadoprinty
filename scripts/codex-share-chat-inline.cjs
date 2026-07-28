const fs = require('fs');
const path = require('path');
const jsPath = path.join(process.cwd(), 'public/200/life-capture.js');
let js = fs.readFileSync(jsPath, 'utf8');
function rep(search, replacement, label) {
  if (!js.includes(search)) throw new Error('life-capture trecho nao encontrado: ' + label);
  js = js.replace(search, replacement);
}
rep(`  async function loadShareContacts() {
    const response = await fetch("/api/200/tutors", { credentials: "same-origin", headers: withAuthHeaders() });
    const payload = await readJsonResponse(response, "Nao foi possivel carregar os contatos.");
    const tutors = Array.isArray(payload?.tutors) ? payload.tutors : [];
    const friends = Array.isArray(payload?.friends) ? payload.friends : [];
    const tutorIds = new Set(tutors.map((item) => String(item.contactUserId || item.userId || item.id || "")));
    return {
      tutors,
      friends: friends.filter((friend) => {
        const friendId = String(friend?.userId || friend?.id || "");
        return !tutorIds.has(friendId);
      })
    };
  }
`, `  async function loadShareContacts() {
    const [tutorsResponse, friendsResponse] = await Promise.all([
      fetch("/api/200/tutors", { credentials: "same-origin", headers: withAuthHeaders() }),
      fetch("/api/200/friends?scope=today", { credentials: "same-origin", headers: withAuthHeaders() })
    ]);
    const tutorsPayload = await readJsonResponse(tutorsResponse, "Nao foi possivel carregar os contatos.");
    const friendsPayload = await readJsonResponse(friendsResponse, "Nao foi possivel carregar os amigos.");
    const tutors = Array.isArray(tutorsPayload?.tutors) ? tutorsPayload.tutors : [];
    const mergedFriends = new Map();
    const pushFriend = (friend) => {
      const friendId = String(friend?.userId || friend?.id || "").trim();
      if (!friendId) return;
      if (!mergedFriends.has(friendId)) mergedFriends.set(friendId, friend);
    };
    (Array.isArray(tutorsPayload?.friends) ? tutorsPayload.friends : []).forEach(pushFriend);
    (Array.isArray(friendsPayload?.friends) ? friendsPayload.friends : []).forEach(pushFriend);
    const tutorIds = new Set(tutors.map((item) => String(item.contactUserId || item.userId || item.id || "").trim()));
    return {
      tutors,
      friends: [...mergedFriends.values()].filter((friend) => {
        const friendId = String(friend?.userId || friend?.id || "").trim();
        return friendId && !tutorIds.has(friendId);
      })
    };
  }
`, 'loadShareContacts');
fs.writeFileSync(jsPath, js, 'utf8');

const chatPath = path.join(process.cwd(), 'public/200/chat-links.js');
let chat = fs.readFileSync(chatPath, 'utf8');
function crep(search, replacement, label) {
  if (!chat.includes(search)) throw new Error('chat-links trecho nao encontrado: ' + label);
  chat = chat.replace(search, replacement);
}
crep(`function createMediaCard(payload) {
  const previewUrl = String(payload?.previewUrl || payload?.previewRemoteUrl || payload?.previewDataUrl || "");
  const mediaUrl = String(payload?.mediaUrl || payload?.remoteUrl || "");
  if (!previewUrl && !mediaUrl) return null;

  const card = document.createElement("div");
  card.className = "marin-message-media-card";

  const trigger = document.createElement("button");
  trigger.type = "button";

  if (String(payload?.kind || "") === "video" && mediaUrl) {
    const video = document.createElement("video");
    video.src = mediaUrl;
    video.poster = previewUrl;
    video.playsInline = true;
    video.controls = true;
    video.preload = "metadata";
    trigger.appendChild(video);
  } else {
    const image = document.createElement("img");
    image.src = previewUrl || mediaUrl;
    image.alt = String(payload?.title || "Memoria compartilhada");
    trigger.appendChild(image);
  }

  trigger.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("project200:life-capture-open-shared", { detail: payload }));
  });

  const meta = document.createElement("div");
  meta.className = "marin-message-media-meta";
  const title = document.createElement("strong");
  title.textContent = String(payload?.title || "Memoria compartilhada");
  const date = document.createElement("span");
  date.textContent = String(payload?.dateLabel || "");
  meta.append(title, date);
  if (payload?.noteText) {
    const note = document.createElement("span");
    note.textContent = String(payload.noteText);
    meta.append(note);
  }

  card.append(trigger, meta);
  return card;
}
`, `function createMediaCard(payload) {
  const previewUrl = String(payload?.previewUrl || payload?.previewRemoteUrl || payload?.previewDataUrl || "");
  const mediaUrl = String(payload?.mediaUrl || payload?.remoteUrl || "");
  if (!previewUrl && !mediaUrl) return null;

  const card = document.createElement("div");
  card.className = "marin-message-media-card";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "marin-message-media-trigger";

  if (String(payload?.kind || "") === "video" && mediaUrl) {
    const video = document.createElement("video");
    video.src = mediaUrl;
    video.poster = previewUrl;
    video.playsInline = true;
    video.controls = false;
    video.muted = true;
    video.preload = "metadata";
    trigger.appendChild(video);
  } else {
    const image = document.createElement("img");
    image.src = previewUrl || mediaUrl;
    image.alt = String(payload?.title || "Memoria compartilhada");
    trigger.appendChild(image);
  }

  trigger.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("project200:life-capture-open-shared", { detail: payload }));
  });

  card.appendChild(trigger);

  const captionParts = [String(payload?.title || "").trim(), String(payload?.noteText || "").trim()].filter(Boolean);
  if (captionParts.length) {
    const meta = document.createElement("div");
    meta.className = "marin-message-media-meta";
    const title = document.createElement("strong");
    title.textContent = captionParts[0];
    meta.appendChild(title);
    if (captionParts[1]) {
      const note = document.createElement("span");
      note.textContent = captionParts[1];
      meta.appendChild(note);
    }
    card.appendChild(meta);
  }

  return card;
}
`, 'createMediaCard');
fs.writeFileSync(chatPath, chat, 'utf8');

const cssPath = path.join(process.cwd(), 'public/200/project.css');
let css = fs.readFileSync(cssPath, 'utf8');
const marker = `.marin-message.is-synced {
  animation: none;
}
`;
if (!css.includes('.marin-message-media-card {')) {
  css = css.replace(marker, marker + `
.marin-message-media-card {
  display: grid;
  gap: 8px;
  width: min(100%, 280px);
}

.marin-message-media-trigger {
  border: 0;
  padding: 0;
  background: transparent;
  display: block;
  width: 100%;
  text-align: left;
}

.marin-message-media-card img,
.marin-message-media-card video {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
  border-radius: 18px;
  background: #061334;
}

.marin-message-media-meta {
  display: grid;
  gap: 4px;
}

.marin-message-media-meta strong {
  font-size: 0.96rem;
  line-height: 1.25;
}

.marin-message-media-meta span {
  font-size: 0.84rem;
  line-height: 1.35;
  color: rgba(255,255,255,0.86);
}
`);
}
fs.writeFileSync(cssPath, css, 'utf8');
console.log('patched share + chat media');
