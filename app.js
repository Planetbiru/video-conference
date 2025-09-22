const peers = {};
let peerDetails = {};
const localVideo = document.createElement("video");
localVideo.autoplay = true;
localVideo.muted = true;
localVideo.playsInline = true;
localVideo.id = "video-local";
let reconnectInterval = 5000;

let localStream;
let clientId;
const remoteVideos = {};
const mainScreen = document.getElementById("main-screen");
const promoteBtn = document.getElementById("promoteBtn");

const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
const wsHost = window.location.hostname;
const wsPort = 3000;

let currentRoomId = "default";
let socketUrl = `${wsProtocol}://${wsHost}:${wsPort}?roomId=${encodeURIComponent(
  currentRoomId
)}`;
let socket;


const CHUNK_SIZE = 16 * 1024; // 16KB per chunk
const incomingFiles = {};

const CLASS_MUTED = "muted";
const CLASS_SHARING = "status-sharing";
const SELECTOR_PROMOTE_STREAM = ".btn-promote-stream";
const SELECTOR_SHARE_CAMERA = ".btn-share-camera";
const SELECTOR_SHARE_SCREEN = ".btn-share-screen";
const SELECTOR_SHARE_MICROPHONE = ".btn-share-microphone";

const MESSAGE_TYPE_STREAM_UPDATE = "streamUpdate";
const MESSAGE_TYPE_OFFER = "offer";
const MESSAGE_TYPE_CANDIDATE = "candidate";
const MESSAGE_TYPE_DEMOTE_STREAM = "demoteStream";
const MESSAGE_TYPE_PROMOTE_STREAM = "promoteStream";
const MESSAGE_TYPE_PEERS = "peers";
const MESSAGE_TYPE_PEAR_LEAVE = "pearLeave";
const MESSAGE_TYPE_STOP_SHARING = "stopSharing";
const MESSAGE_TYPE_CHAT = "chat";
const MESSAGE_TYPE_ANSWER = "answer";
const MESSAGE_TYPE_REQUEST_CHAT_HISTORY = "requestChatHistory";
const MESSAGE_TYPE_FILE_META = "fileMeta";
const MESSAGE_TYPE_FILE_CHUNK = "fileChunk";
const MESSAGE_TYPE_FILE_COMPLETE = "fileComplete";
const MESSAGE_TYPE_FILE_REQUEST = "fileRequest";
const MESSAGE_TYPE_FILE_UPDATE = "fileUpdate";
const MESSAGE_TYPE_NEW_PEAR = "newPeer";

let controlIcons = [
  SELECTOR_SHARE_CAMERA,
  SELECTOR_SHARE_SCREEN,
  SELECTOR_PROMOTE_STREAM,
];

function markShareCameraActive() {
  let btns = document.querySelectorAll(SELECTOR_SHARE_CAMERA);
  if (btns?.length) {
    btns.forEach((btn) => {
      btn.classList.add(CLASS_SHARING);
    });
  }
}

function markShareCameraInactive() {
  let btns = document.querySelectorAll(SELECTOR_SHARE_CAMERA);
  if (btns?.length) {
    btns.forEach((btn) => {
      btn.classList.remove(CLASS_SHARING);
    });
  }
}

function isShareCameraActive() {
  let btns = document.querySelectorAll(SELECTOR_SHARE_CAMERA);
  return Array.from(btns).some((btn) => btn.classList.contains(CLASS_SHARING));
}

function markShareScreenActive() {
  let btns = document.querySelectorAll(SELECTOR_SHARE_SCREEN);
  if (btns?.length) {
    btns.forEach((btn) => {
      btn.classList.add(CLASS_SHARING);
    });
  }
}

function markShareScreenInactive() {
  let btns = document.querySelectorAll(SELECTOR_SHARE_SCREEN);
  return Array.from(btns).some((btn) => btn.classList.contains(CLASS_SHARING));
}

function isShareScreenActive() {
  let btns = document.querySelectorAll(SELECTOR_SHARE_SCREEN);
  let active = false;
  if (btns?.length) {
    btns.forEach((btn) => {
      active = btn.classList.contains(CLASS_SHARING);
      if (active) {
        return true;
      }
    });
  }
  return false;
}

function markPromoteStreamActive() {
  let btns = document.querySelectorAll(SELECTOR_PROMOTE_STREAM);
  if (btns?.length) {
    btns.forEach((btn) => {
      btn.classList.add(CLASS_SHARING);
    });
  }
}

function markPromoteStramInavtive() {
  let btns = document.querySelectorAll(SELECTOR_PROMOTE_STREAM);
  return Array.from(btns).some((btn) => btn.classList.contains(CLASS_SHARING));
}

function isPromoteStreamActive() {
  let btns = document.querySelectorAll(SELECTOR_PROMOTE_STREAM);
  return Array.from(btns).some((btn) => btn.classList.contains(CLASS_SHARING));
}

function isMicrophoneMuted() {
  let btns = document.querySelectorAll(SELECTOR_SHARE_MICROPHONE);
  return Array.from(btns).some((btn) => btn.classList.contains(CLASS_MUTED));
}

/**
 * Returns true if localStream currently has at least one enabled audio track.
 */
function isMicrophoneActive() {
  if (!localStream) return false;
  const audioTracks = localStream.getAudioTracks();
  if (!audioTracks || audioTracks.length === 0) return false;
  return audioTracks.some((t) => t.enabled && !t.muted);
}

function toggleMute(buttonElement) {
  if (!localStream) {
    return;
  }

  const audioTracks = localStream.getAudioTracks();
  if (!audioTracks.length) {
    return;
  }

  let enabled = !isMicrophoneMuted();
  if (enabled) {
    // sekarang muted
    console.log("Microphone muted");
    if (buttonElement) {
      buttonElement.classList.add(CLASS_MUTED);
    }
    if (isShareCameraActive()) {
      buttonElement.classList.remove(CLASS_SHARING);
    }
  } else {
    // sekarang unmuted
    console.log("Microphone unmuted");
    if (buttonElement) {
      buttonElement.classList.remove(CLASS_MUTED);
    }
    if (isShareCameraActive()) {
      buttonElement.classList.add(CLASS_SHARING);
    }
  }
}

/**
 * Start microphone (or stop if already active).
 * Adds audio track(s) to localStream (or creates localStream if none),
 * updates UI class on buttonElement, notifies peers and renegotiates.
 *
 * @param {HTMLElement} buttonElement - the button DOM element that triggered this (can be null)
 */
async function startMicrophone(buttonElement) {
  // If mic already active -> stop it

  if (isShareCameraActive()) {
    toggleMute(buttonElement);
    return;
  } else {
    console.log("not sahre");
  }
  if (isMicrophoneActive()) {
    await stopMicrophone();
    if (buttonElement) {
      buttonElement.classList.remove(CLASS_SHARING);
      buttonElement.classList.add(CLASS_MUTED);
    }
    return;
  }

  try {
    // Request microphone (audio only)
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    // If we already have a localStream (e.g. camera or screen), add audio tracks to it
    if (localStream) {
      // add audio tracks from audioStream to existing localStream
      audioStream.getAudioTracks().forEach((track) => {
        // avoid duplicate audio tracks of same id
        localStream.addTrack(track);
      });

      // update localVideo srcObject if exists (localVideo may be video-only; but srcObject can be combined)
      localVideo.srcObject = localStream;
    } else {
      // audio-only session: use audioStream as localStream
      localStream = audioStream;
      localVideo.srcObject = localStream; // safe even if visual element won't show audio
    }

    // mark UI
    if (buttonElement) {
      buttonElement.classList.add(CLASS_SHARING);
      buttonElement.classList.remove(CLASS_MUTED);
    }

    // replace/add tracks to existing peers
    await replaceOrAddTracksToPeers(localStream);

    // inform others and renegotiate
    socket &&
      socket.send(
        JSON.stringify({ type: MESSAGE_TYPE_STREAM_UPDATE, from: clientId })
      );
    await renegotiateWithPeers();
    console.log("Microphone started/added to localStream.");
  } catch (err) {
    console.error("Failed to start microphone:", err);
    if (buttonElement) {
      buttonElement.classList.remove(CLASS_SHARING);
    }
  }
}

/**
 * Stop microphone: stop audio tracks, remove audio senders from peers,
 * keep video tracks if present (so camera/screen remains).
 */
async function stopMicrophone() {
  if (!localStream) {
    return;
  }

  // stop and remove audio tracks from localStream
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks && audioTracks.length) {
    // Stop tracks locally
    audioTracks.forEach((track) => {
      try {
        track.stop();
      } catch (_) {}
      try {
        localStream.removeTrack(track);
      } catch (_) {}
    });
  }

  // Remove audio senders from each RTCPeerConnection (keep video senders)
  for (const [peerId, pc] of Object.entries(peers)) {
    try {
      const audioSenders = pc
        .getSenders()
        .filter((s) => s.track && s.track.kind === "audio");
      for (const s of audioSenders) {
        try {
          pc.removeTrack(s);
        } catch (_) {
          // some browsers may throw; ignore
        }
      }
      // renegotiate so remote peers know audio gone
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket &&
        socket.send(
          JSON.stringify({
            type: MESSAGE_TYPE_OFFER,
            offer,
            to: peerId,
            from: clientId,
          })
        );
    } catch (e) {
      console.warn("stopMicrophone: renegotiate failed for", peerId, e);
    }
  }

  // If after removing audio there are no tracks left, set localStream to null
  if (!localStream.getTracks() || localStream.getTracks().length === 0) {
    localStream = null;
    localVideo.srcObject = null;
    setMainScreenStream(null);
  } else {
    // keep existing localStream (video-only) and update localVideo src if needed
    localVideo.srcObject = localStream;
  }

  // notify others
  socket &&
    socket.send(
      JSON.stringify({ type: MESSAGE_TYPE_STREAM_UPDATE, from: clientId })
    );
  console.log("Microphone stopped/removed from localStream.");
}

/**
 * Mute local audio (sets enabled = false) — does not remove tracks nor renegotiate.
 */
function muteLocalAudio() {
  if (!localStream) {
    return;
  }
  const audioTracks = localStream.getAudioTracks();
  audioTracks.forEach((track) => {
    track.enabled = false;
  });
  // Update UI class for mic buttons if you have them
  document
    .querySelectorAll(".btn-share-microphone")
    .forEach((btn) => btn.classList.add(CLASS_MUTED));
  console.log("Local audio muted (tracks disabled).");
}

/**
 * Unmute local audio (sets enabled = true).
 */
function unmuteLocalAudio() {
  if (!localStream) {
    return;
  }
  const audioTracks = localStream.getAudioTracks();
  audioTracks.forEach((track) => {
    track.enabled = true;
  });
  document
    .querySelectorAll(".btn-share-microphone")
    .forEach((btn) => btn.classList.remove(CLASS_MUTED));
  console.log("Local audio unmuted (tracks enabled).");
}

/**
 * Toggle mute/unmute. If no audio track exists, this will attempt to request mic.
 * If audio tracks exist, toggles enabled flag.
 *
 * @param {HTMLElement} buttonElement - button to toggle UI classes (optional)
 */
async function toggleMuteAudio(buttonElement) {
  // if no audio tracks but we have localStream -> start microphone (adds audio track)
  if (
    !localStream ||
    !localStream.getAudioTracks() ||
    localStream.getAudioTracks().length === 0
  ) {
    // start microphone (this will add tracks and also add status class)
    await startMicrophone(buttonElement);
    return;
  }

  // if audio track exists, toggle enabled
  const audioTracks = localStream.getAudioTracks();
  const anyEnabled = audioTracks.some((t) => t.enabled);
  if (anyEnabled) {
    muteLocalAudio();
    if (buttonElement) {
      buttonElement.classList.add(CLASS_MUTED);
    }
  } else {
    unmuteLocalAudio();
    if (buttonElement) {
      buttonElement.classList.remove(CLASS_MUTED);
    }
  }
}

/**
 * Utility: remove all audio senders from peers (used when fully stopping audio).
 */
async function removeAudioSendersFromPeers() {
  for (const [peerId, pc] of Object.entries(peers)) {
    try {
      const audioSenders = pc
        .getSenders()
        .filter((s) => s.track && s.track.kind === "audio");
      for (const s of audioSenders) {
        try {
          pc.removeTrack(s);
        } catch (_) {}
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket &&
        socket.send(
          JSON.stringify({
            type: MESSAGE_TYPE_OFFER,
            offer,
            to: peerId,
            from: clientId,
          })
        );
    } catch (e) {
      console.warn("removeAudioSendersFromPeers failed for", peerId, e);
    }
  }
}

function switchStreamTo(idToPromote) {
  if (idToPromote === clientId) {
    setMainScreenStream(localStream);
  } else {
    waitAndAttachToMain(idToPromote);
  }
}

function joinRoom(roomId) {
  if (!roomId) {
    return;
  }
  currentRoomId = roomId;
  connectSocket(roomId);
}

function connectSocket(roomId) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  }
  socketUrl = `${wsProtocol}://${wsHost}:${wsPort}?roomId=${encodeURIComponent(
    roomId
  )}`;

  socket = new WebSocket(socketUrl);

  socket.onopen = () => {
    setupLocalVideo();
    requestChatHistory();
  };

  socket.onmessage = async ({ data }) => {
    const msg = JSON.parse(data);
    let peerId = msg.from;

    // chat
    if (msg.type === MESSAGE_TYPE_CHAT) {
      putChat(msg);
      return;
    }

    // --- handler pesan ---
    if (msg.type === MESSAGE_TYPE_FILE_META) {
      incomingFiles[msg.fileId] = { meta: msg, from: peerId, chunks: [] };
      putFilePlaceholder(msg);
      return;
    }

    if(msg.type === MESSAGE_TYPE_FILE_UPDATE)
    {
      if(msg.complete)
      {
        let elements = document.querySelectorAll(`.url-href[data-file-id="${msg.fileId}"]`);
        if(elements)
        {
          elements.forEach(element=>{
           element.dataset.complete = 'true';
          });
        }
        requestCompletedFile();
      }
      return;
    }
    if (msg.type === MESSAGE_TYPE_FILE_CHUNK) {
      const fileData = incomingFiles[msg.fileId];
      if (fileData) {
        const byteChars = atob(msg.data);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        fileData.chunks.push(byteArray);
      }
      return;
    }
    if (msg.type === MESSAGE_TYPE_FILE_COMPLETE) {
      const fileData = incomingFiles[msg.fileId];
      if (fileData) {
        const blob = new Blob(fileData.chunks, {
          type: fileData.meta.mimeType,
        });
        const url = URL.createObjectURL(blob);

        const chatBox = document.getElementById("chat-box");
        let els1 = document.querySelectorAll(
          `.url-src[data-file-id="${msg.fileId}"]`
        );
        let els2 = document.querySelectorAll(
          `.url-href[data-file-id="${msg.fileId}"]`
        );
        if (els1) {
          els1.forEach((el) => {
            el.setAttribute("src", url);
            el.dataset.loaded = 'true';
          });
        }
        if (els2) {
          els2.forEach((el) => {
            el.setAttribute("href", url);
            el.dataset.loaded = 'true';
          });
        }

        chatBox.scrollTop = chatBox.scrollHeight;

        delete incomingFiles[msg.fileId];
      }
      return;
    }

    // chatHistory
    if (msg.type === "chatHistory") {
      putChatHistory(msg.chatHistory);
      loadMissedFiles();
      return;
    }

    if (msg.type === MESSAGE_TYPE_PROMOTE_STREAM) {
      document.querySelector("#promoteBtn").classList.remove(CLASS_SHARING);
      const selected = document.querySelector(
        `input[name="mainStreamSelector"][value="${msg.from}"]`
      );
      if (!selected) {
        console.error("Please select a stream first");
        return;
      }
      selected.checked = true;
      const idToPromote =
        selected.value === "local" ? clientId : selected.value;
      // locally attach immediately (if ready) and then broadcast to ask others to show same main
      switchStreamTo(idToPromote);
      return;
    }

    if (msg.type === MESSAGE_TYPE_DEMOTE_STREAM) {
      const selected = document.querySelector(
        `input[name="mainStreamSelector"][value="local"]`
      );
      if (!selected) {
        console.error("Please select a stream first");
        return;
      }
      selected.checked = true;
      const idToPromote =
        selected.value === "local" ? clientId : selected.value;
      // locally attach immediately (if ready) and then broadcast to ask others to show same main
      switchStreamTo(idToPromote);
      return;
    }

    // streamUpdate -> ensure placeholder and attempt to promote if requested
    if (msg.type === MESSAGE_TYPE_STREAM_UPDATE) {
      ensureRemoteVideoElement(msg.from); // create placeholder if not exists
      // If radio/selection points to this peer, try attaching after ready
      const selected = document.querySelector(
        'input[name="mainStreamSelector"]:checked'
      );
      if (selected && selected.value === msg.from) {
        waitAndAttachToMain(msg.from);
      }
      return;
    }
    // stopSharing -> update placeholder
    if (msg.type === MESSAGE_TYPE_STOP_SHARING) {
      console.log(`Received stopSharing from peer: ${msg.from}`);
      let wrapper = document.querySelector(
        `.video-wrapper[data-peer-id="${msg.from}"]`
      );
      if (wrapper) {
        let video = wrapper.querySelector("video");
        if (video) {
          // clear stream
          video.srcObject = null;
          // optional: give black background
          video.style.backgroundColor = "black";
        }
      }
      return;
    }

    // ignore messages not for us (unless broadcast)
    if (msg.to && msg.to !== clientId) return;

    if (msg.type === MESSAGE_TYPE_PEERS) {
      clientId = msg.myId;
      if (promoteBtn) promoteBtn.disabled = false;

      // create placeholder for each peer (UI ready)
      msg.peers.forEach((peerId) => ensureRemoteVideoElement(peerId));

      // create offers to peers based on glare avoidance
      msg.peers.forEach((peerId) => {
        if (clientId < peerId) createOffer(peerId);
      });
      return;
    }

    if (msg.type === MESSAGE_TYPE_NEW_PEAR) {
      ensureRemoteVideoElement(msg.peerId);
      updatePeer(msg.peerId, msg.peerDetail);
      // create offer if our ID is smaller (simple glare avoidance)
      if (clientId < msg.peerId) createOffer(msg.peerId);
      return;
    }

    if (msg.type === MESSAGE_TYPE_OFFER) {
      const pc = createPeer(msg.from);
      await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.send(
        JSON.stringify({
          type: MESSAGE_TYPE_ANSWER,
          answer,
          to: msg.from,
          from: clientId,
        })
      );
      return;
    }

    if (msg.type === MESSAGE_TYPE_ANSWER) {
      if (peers[msg.from]) {
        await peers[msg.from].setRemoteDescription(
          new RTCSessionDescription(msg.answer)
        );
      }
      return;
    }

    if (msg.type === MESSAGE_TYPE_CANDIDATE) {
      if (peers[msg.from]) {
        try {
          await peers[msg.from].addIceCandidate(
            new RTCIceCandidate(msg.candidate)
          );
        } catch (e) {
          console.warn("addIceCandidate failed", e);
        }
      }
      return;
    }

    if (msg.type === MESSAGE_TYPE_PEAR_LEAVE) {
      if (peers[msg.peerId]) {
        peers[msg.peerId].close();
        delete peers[msg.peerId];
        delete peerDetails[msg.peerId];
      }
      if (remoteVideos[msg.peerId]) {
        remoteVideos[msg.peerId].wrapper.remove();
        delete remoteVideos[msg.peerId];
      }
      // fallback mainScreen to local if the promoted one disappears
      if (
        mainScreen.srcObject &&
        isSameStream(
          mainScreen.srcObject,
          remoteVideos[msg.peerId]?.video?.srcObject
        )
      ) {
        setMainScreenStream(localStream || null);
      }
      return;
    }
  };

  socket.onclose = () => {
    // <<< added
    console.warn("Socket closed. Reconnecting...");
    setTimeout(connectSocket, reconnectInterval);
  };

  socket.onerror = (err) => {
    // <<< added
    console.error("Socket error:", err);
    socket.close(); // trigger onclose → reconnect
  };
}

function putHistoryChat(msg) {
 
  if(msg.type === MESSAGE_TYPE_CHAT)
  {
    putChat(msg);
  }
  else if(msg.type === MESSAGE_TYPE_FILE_META)
  {
   putFilePlaceholder(msg);
  }
}

function putFilePlaceholder(msg) {
  if(document.querySelector(`.url-src[data-file-id="${msg.fileId}"]`))
  {
    // No duplicated placeholder
    return;
  }

  const chatBox = document.getElementById("chat-box");
  const div = document.createElement("div");
  let realtime = msg.realtime ? 'true' : 'false';
  let complete = msg.complete ? 'true' : 'false';

  

  if (msg?.mimeType?.startsWith("image/")) {
    div.innerHTML = `<strong>${msg.from}:</strong><br>
        <div class="image-received">
        <img data-file-id="${msg.fileId}" data-realtime="${realtime}" data-complete="${complete}" data-loaded="false" data-process="false" class="url-src" src="image.svg" alt="${msg.name}">
        </div>
        <a data-file-id="${msg.fileId}" data-realtime="${realtime}" data-complete="${complete}" data-loaded="false" data-process="false" class="url-href" href="image.svg" download="${msg.name}">📎 ${msg.name}</a>`;
  } else {
    div.innerHTML = `<strong>${msg.from}:</strong> 
        <a data-file-id="${msg.fileId}" data-realtime="${realtime}" data-complete="${complete}" data-loaded="false" data-process="false" class="url-href" href="image.svg" download="${msg.name}">
            📎 ${msg.name}
        </a>`;
  }
  chatBox.appendChild(div);
  
}
let isMissedFilesLoaded = false;

function loadMissedFiles()
{
  if(isMissedFilesLoaded)
  {
    return;
  }
  requestCompletedFile();
  checkInterval = setInterval(()=>{
    requestIncompletedFile();
  }, 5000);
  isMissedFilesLoaded = true;
}

let checkInterval = setInterval('', 100000);
function requestIncompletedFile()
{
  let elements = document.querySelectorAll('.url-href[data-realtime="false"][data-complete="false"][data-loaded="false"]');
  if(elements)
  {
    elements.forEach(file=>{
      socket.send(
        JSON.stringify({ type: MESSAGE_TYPE_FILE_UPDATE, from: clientId, fileId: file.dataset.fileId})
      );
    });
  }
  else
  {
    clearTimeout(checkInterval);
    isMissedFilesLoaded = false;
  }
}
function requestCompletedFile()
{
  let elements = document.querySelectorAll('.url-href[data-realtime="false"][data-complete="true"][data-loaded="false"]');
  if(elements)
  {
    elements.forEach(element=>{
      socket.send(
        JSON.stringify({ type: MESSAGE_TYPE_FILE_REQUEST, from: clientId, fileId: element.dataset.fileId})
      );
      element.dataset.process = 'true';
    });
  }
}

function putChat(msg) {
  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML += `\r\n<div><strong>${msg.from}:</strong> ${msg.text}</div>`;
  setTimeout(function () {
    document.querySelector(".chat-box-container").scrollTop =
      document.querySelector(".chat-box-container").scrollHeight;
  }, 100);
}

function putChatHistory(data) {
  data.forEach((msg) => putHistoryChat(msg));
}

function updatePeer(peerId, peerDetail) {
  peerDetails[peerId] = peerDetail;
}

function requestChatHistory() {
  socket.send(
    JSON.stringify({ type: MESSAGE_TYPE_REQUEST_CHAT_HISTORY, from: clientId })
  );
}

// --- helpers ---

function isSameStream(a, b) {
  // Simple guard to check if two MediaStreams are the same object
  return a === b;
}

// Centralized main screen setter with autoplay friendliness (Opera/Chrome)
function setMainScreenStream(stream) {
  if (!mainScreen) return;
  if (!stream) {
    mainScreen.srcObject = null;
    return;
  }

  // assign stream and attempt autoplay (muted helps autoplay policies)
  mainScreen.srcObject = stream;
  mainScreen.muted = true; // allow autoplay in strict browsers
  mainScreen.playsInline = true; // for mobile / iOS behavior
  // try to play, ignore errors (user gesture may be required)
  mainScreen.play().catch((err) => {
    console.warn("Main screen play() blocked or failed:", err);
  });
}

function setMainScreenLocal() {
  if (localStream) {
    setMainScreenStream(localStream);
    console.log("Main screen set to local stream");
  } else {
    console.warn("No localStream available yet");
  }
}

function setupLocalVideo() {
  const videoWrapper = document.createElement("div");
  videoWrapper.className = "video-wrapper";

  const controls = document.createElement("div");
  controls.className = "video-controls";

  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "mainStreamSelector";
  radio.value = "local";
  radio.id = "radio-local";
  radio.checked = true;
  radio.addEventListener("change", () => {
    if (radio.checked) {
      setMainScreenLocal();
    }
  });

  const label = document.createElement("label");
  label.htmlFor = "radio-local";
  label.textContent = " My Stream";

  controls.appendChild(radio);
  controls.appendChild(label);

  videoWrapper.appendChild(localVideo);
  videoWrapper.appendChild(controls);

  document.getElementById("video-container").appendChild(videoWrapper);
}

// create peer if not exists (idempotent)
function createPeer(id) {
  if (peers[id]) return peers[id];

  const pc = new RTCPeerConnection();
  peers[id] = pc;

  // attach local tracks if present
  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.send(
        JSON.stringify({
          type: MESSAGE_TYPE_CANDIDATE,
          candidate: e.candidate,
          to: id,
          from: clientId,
        })
      );
    }
  };

  pc.ontrack = (e) => {
    console.log("ontrack from", id, e.streams[0]);
    // Ensure element exists
    ensureRemoteVideoElement(id);
    const vid = remoteVideos[id].video;
    // assign srcObject (replace existing)
    vid.srcObject = e.streams[0];

    // If radio for that peer is selected, attach to mainScreen when ready
    const selected = document.querySelector(
      'input[name="mainStreamSelector"]:checked'
    );
    if (selected && selected.value === id) {
      waitAndAttachToMain(id);
    }
  };

  return pc;
}

async function createOffer(id) {
  const pc = createPeer(id);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.send(
    JSON.stringify({ type: MESSAGE_TYPE_OFFER, offer, to: id, from: clientId })
  );
}

// ensure there is a placeholder wrapper+video for peerId
function ensureRemoteVideoElement(peerId) {
  if (remoteVideos[peerId]) return remoteVideos[peerId];

  const videoWrapper = document.createElement("div");
  videoWrapper.className = "video-wrapper";
  videoWrapper.dataset.peerId = peerId;
  videoWrapper.style.minWidth = "160px";

  const remoteVideo = document.createElement("video");
  remoteVideo.autoplay = true;
  remoteVideo.playsInline = true;
  remoteVideo.id = `video-${peerId}`;
  // remoteVideo.muted = false;

  // controls (radio + label)
  const controls = document.createElement("div");
  controls.className = "video-controls";

  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "mainStreamSelector";
  radio.value = peerId;
  radio.id = `radio-${peerId}`;
  radio.addEventListener("change", () => {
    if (radio.checked) {
      waitAndAttachToMain(peerId);
    }
  });

  const label = document.createElement("label");
  label.htmlFor = `radio-${peerId}`;
  label.textContent = ` Participant (${peerId?.substring(0, 4)})`;

  controls.appendChild(radio);
  controls.appendChild(label);

  videoWrapper.appendChild(remoteVideo);
  videoWrapper.appendChild(controls);

  document.getElementById("video-container").appendChild(videoWrapper);

  remoteVideos[peerId] = { wrapper: videoWrapper, video: remoteVideo };
  return remoteVideos[peerId];
}

// Wait until the remote video element has a srcObject and is playing (or loadedmetadata),
// then attach it to mainScreen. Uses events instead of blind polling.
function waitAndAttachToMain(peerId, timeout = 5000) {
  if (peerId === clientId) {
    setMainScreenStream(localStream);
    return;
  }

  const entry = remoteVideos[peerId];
  if (!entry) {
    console.log("No video element for", peerId, "— creating placeholder.");
    ensureRemoteVideoElement(peerId);
  }

  const videoEl = remoteVideos[peerId].video;

  // If already has srcObject and readyState is good, attach immediately
  if (videoEl.srcObject && videoEl.readyState >= 2) {
    setMainScreenStream(videoEl.srcObject);
    console.log("Attached immediately main screen from", peerId);
    return;
  }

  // Otherwise, listen once for events and then attach & play
  let attached = false;
  const onReady = () => {
    if (attached) return;
    attached = true;
    setMainScreenStream(videoEl.srcObject);
    cleanup();
    console.log("Attached main screen after event from", peerId);
  };

  const cleanup = () => {
    videoEl.removeEventListener("loadedmetadata", onReady);
    videoEl.removeEventListener("playing", onReady);
    clearTimeout(timer);
  };

  videoEl.addEventListener("loadedmetadata", onReady);
  videoEl.addEventListener("playing", onReady);

  const timer = setTimeout(() => {
    if (!attached) {
      cleanup();
      console.warn(`Timeout waiting for video of ${peerId} to become ready.`);
    }
  }, timeout);
}

function isAudioMuted() {
  let mic = document.querySelector(SELECTOR_SHARE_MICROPHONE);
  return mic.classList.contains(CLASS_MUTED);
}

// Start camera, attach to localVideo and replace senders; then broadcast streamUpdate and renegotiate
async function startCamera(buttonElement) {
  if (buttonElement.classList.contains(CLASS_SHARING)) {
    buttonElement.classList.remove(CLASS_SHARING);
    stopSharing();
    return;
  }
  try {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }

    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideo.srcObject = localStream;
    setMainScreenStream(localStream);
    const radioLocal = document.getElementById("radio-local");
    if (radioLocal) {
      radioLocal.checked = true;
    }
    console.log("Local camera stream started.");

    if (buttonElement) {
      buttonElement.classList.add(CLASS_SHARING);
    }

    // Default: mute langsung kalau memang diminta
    if (isAudioMuted()) {
      muteLocalAudio();
    }

    // replace/add tracks to existing peers
    await replaceOrAddTracksToPeers(localStream);

    // notify others and renegotiate
    socket.send(
      JSON.stringify({ type: MESSAGE_TYPE_STREAM_UPDATE, from: clientId })
    );
    await renegotiateWithPeers();
  } catch (e) {
    console.error("Failed to get local stream:", e);
    if (buttonElement) {
      buttonElement.classList.remove(CLASS_SHARING);
    }
  }
}

// Share screen similarly
async function shareScreen(buttonElement) {
  if (buttonElement.classList.contains(CLASS_SHARING)) {
    buttonElement.classList.remove(CLASS_SHARING);
    stopSharing();
    return;
  }
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    const screenTrack = screenStream.getVideoTracks()[0];

    if (localStream) {
      // stop previous video tracks but keep audio (if present)
      localStream.getVideoTracks().forEach((t) => t.stop());
    }

    localStream = screenStream;
    localVideo.srcObject = localStream;
    setMainScreenStream(localStream);
    const radioLocal = document.getElementById("radio-local");
    if (radioLocal) {
      radioLocal.checked = true;
    }
    console.log("Screen sharing started.");

    if (buttonElement) {
      buttonElement.classList.add(CLASS_SHARING);
    }

    await replaceOrAddTracksToPeers(localStream);

    screenTrack.onended = async () => {
      if (buttonElement) {
        buttonElement.classList.remove(CLASS_SHARING);
      }

      await startCamera(buttonElement);
    };

    socket.send(
      JSON.stringify({ type: MESSAGE_TYPE_STREAM_UPDATE, from: clientId })
    );
    await renegotiateWithPeers();
  } catch (e) {
    console.error("Failed to share screen:", e);

    // hapus kelas jika gagal
    if (buttonElement) {
      buttonElement.classList.remove(CLASS_SHARING);
    }
  }
}

async function replaceOrAddTracksToPeers(stream) {
  // For each peer, replace existing senders or add tracks if none
  await Promise.all(
    Object.entries(peers).map(async ([peerId, pc]) => {
      for (const track of stream.getTracks()) {
        // find sender with same kind
        const sender = pc
          .getSenders()
          .find((s) => s.track && s.track.kind === track.kind);
        if (sender) {
          try {
            await sender.replaceTrack(track);
          } catch (e) {
            // If replace fails, remove and add
            try {
              pc.removeTrack(sender);
            } catch (_) {}
            pc.addTrack(track, stream);
          }
        } else {
          pc.addTrack(track, stream);
        }
      }
    })
  );
}

async function renegotiateWithPeers() {
  // send fresh offers to each peer to ensure remote ontrack fires reliably
  for (const [peerId, pc] of Object.entries(peers)) {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.send(
        JSON.stringify({
          type: MESSAGE_TYPE_OFFER,
          offer,
          to: peerId,
          from: clientId,
        })
      );
    } catch (e) {
      console.warn("Renegotiate failed for", peerId, e);
    }
  }
}

function sendChat() {
  const text = document.getElementById("chatInput").value;
  if (!text.trim()) return;

  document.getElementById("chatInput").value = "";

  const msg = {
    type: MESSAGE_TYPE_CHAT,
    text: text,
    from: clientId,
    messageId: generateMessageId(),
  };

  putChat(msg);
  socket.send(JSON.stringify(msg));
}

function generateMessageId() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID(); // modern browsers
  } else {
    return "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
  }
}

function promoteMyStream(buttonElement) {
  if (buttonElement.classList.contains(CLASS_SHARING)) {
    buttonElement.classList.remove(CLASS_SHARING);
    demoteMyStream();
    return;
  }
  buttonElement.classList.add(CLASS_SHARING);
  socket.send(
    JSON.stringify({ type: MESSAGE_TYPE_PROMOTE_STREAM, from: clientId })
  );
  const selected = document.querySelector(
    `input[name="mainStreamSelector"][value="local"]`
  );
  if (!selected) {
    console.error("Please select a stream first");
    return;
  }
  selected.checked = true;
  const idToPromote = selected.value === "local" ? clientId : selected.value;
  // locally attach immediately (if ready) and then broadcast to ask others to show same main
  switchStreamTo(idToPromote);
  return;
}

function demoteMyStream() {
  socket.send(
    JSON.stringify({ type: MESSAGE_TYPE_DEMOTE_STREAM, from: clientId })
  );
}

function promoteSelected() {
  if (!clientId) {
    console.error("Client ID not ready");
    return;
  }
  const selected = document.querySelector(
    'input[name="mainStreamSelector"]:checked'
  );
  if (!selected) {
    console.error("Please select a stream first");
    return;
  }
  const idToPromote = selected.value === "local" ? clientId : selected.value;
  // locally attach immediately (if ready) and then broadcast to ask others to show same main
  switchStreamTo(idToPromote);
  // notify others so they also can try to attach when ready
  socket.send(
    JSON.stringify({ type: MESSAGE_TYPE_STREAM_UPDATE, from: clientId })
  );
}

async function replaceOrAddTracksToPeers(stream) {
  await Promise.all(
    Object.entries(peers).map(async ([peerId, pc]) => {
      for (const track of stream.getTracks()) {
        let sender = pc
          .getSenders()
          .find((s) => s.track && s.track.kind === track.kind);
        if (sender) {
          // replace track kalau sudah ada
          await sender.replaceTrack(track);
        } else {
          // kalau belum ada, tambahkan
          pc.addTrack(track, stream);
        }
      }
    })
  );
}

// Stop sharing camera or screen (stops video tracks only, keeps audio if present)
async function stopSharing() {
  try {
    if (localStream) {
      // stop only video tracks
      localStream.getVideoTracks().forEach((track) => track.stop());
      // remove video tracks from localStream object
      // keep audio tracks (if any) intact
      const audioTracks = localStream.getAudioTracks();
      localStream = audioTracks.length ? new MediaStream(audioTracks) : null;
    }

    // Remove local video display
    localVideo.srcObject = null;
    setMainScreenStream(null);

    console.log("Stopped sharing local video.");

    // Inform peers that stream is stopped
    socket.send(
      JSON.stringify({ type: MESSAGE_TYPE_STREAM_UPDATE, from: clientId })
    );
    socket.send(
      JSON.stringify({ type: MESSAGE_TYPE_DEMOTE_STREAM, from: clientId })
    );
    socket.send(
      JSON.stringify({ type: MESSAGE_TYPE_STOP_SHARING, from: clientId })
    );

    document.querySelector("#promoteBtn").classList.remove(CLASS_SHARING);

    // Remove only video senders from peers (keep audio senders)
    for (const [peerId, pc] of Object.entries(peers)) {
      const videoSenders = pc
        .getSenders()
        .filter((s) => s.track && s.track.kind === "video");
      videoSenders.forEach((sender) => {
        try {
          pc.removeTrack(sender);
        } catch (_) {
          // ignore
        }
      });

      // Renegotiate so that remote knows the track is gone
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.send(
          JSON.stringify({
            type: MESSAGE_TYPE_OFFER,
            offer,
            to: peerId,
            from: clientId,
          })
        );
      } catch (e) {
        console.warn("Renegotiate failed on stopSharing for", peerId, e);
      }
    }
  } catch (e) {
    console.error("Failed to stop sharing:", e);
  }
}


// --- helper ---
function arrayBufferToBase64(buffer) {
  let binary = "";
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function generateFileId() {
  if (window.crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return "file-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

function getFileExtension(filename) {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

// --- kirim file ---
async function sendFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (!file) {
    return;
  }

  const fileId = generateFileId();

  const meta = {
    type: MESSAGE_TYPE_FILE_META,
    fileId: fileId,
    name: file.name,
    extension: getFileExtension(file.name),
    size: file.size,
    mimeType: file.type,
    from: clientId,
    realtime: true,
    complete: false,
    chunkSize: CHUNK_SIZE
  };
  socket.send(JSON.stringify(meta));

  let offset = 0;
  while (offset < file.size) {
    const slice = file.slice(offset, offset + CHUNK_SIZE);
    const buf = await slice.arrayBuffer();
    const base64Chunk = arrayBufferToBase64(buf);

    socket.send(
      JSON.stringify({
        type: MESSAGE_TYPE_FILE_CHUNK,
        fileId: fileId,
        name: file.name,
        extension: getFileExtension(file.name),
        from: clientId,
        offset: offset,
        chunkSize: CHUNK_SIZE,
        data: base64Chunk,
      })
    );

    offset += CHUNK_SIZE;
  }

  socket.send(
    JSON.stringify({
      type: MESSAGE_TYPE_FILE_COMPLETE,
      fileId: fileId,
      from: clientId,
    })
  );

  clearFile(); // reset input dan preview

  // --- tampilkan di chat kita sendiri ---
  const chatBox = document.getElementById("chat-box");
  const div = document.createElement("div");
  const url = URL.createObjectURL(file);

  if (file.type.startsWith("image/")) {
    div.innerHTML = `<strong>You:</strong><br>
                        <div class="image-received">
                          <img src="${url}" alt="${file.name}">
                        </div>
                        <a href="${url}" download="${file.name}">📎 ${file.name}</a>`;
  } else {
    div.innerHTML = `<strong>You:</strong> 
                         <a href="${url}" download="${file.name}">📎 ${file.name}</a>`;
  }

  chatBox.appendChild(div);

  setTimeout(function () {
    document.querySelector(".chat-box-container").scrollTop =
      document.querySelector(".chat-box-container").scrollHeight;
  }, 100);
}

function selectFile() {
  document.getElementById("fileInput").click();
}

function previewFile() {
  const fileInput = document.getElementById("fileInput");
  const previewContainer = document.querySelector(".send-file-preview");
  previewContainer.innerHTML = ""; // reset dulu

  if (fileInput.files.length === 0) return;

  const file = fileInput.files[0];
  const fileName = file.name;

  const previewDiv = document.createElement("div");
  previewDiv.classList.add(
    "flex",
    "items-center",
    "gap-2",
    "bg-gray-700",
    "text-white",
    "p-2",
    "rounded",
    "flex-col"
  );

  // jika gambar, tampilkan preview <img>
  let filePreviewHTML = "";
  if (file.type.startsWith("image/")) {
    const imgURL = URL.createObjectURL(file);
    filePreviewHTML = `<img src="${imgURL}" alt="${fileName}" style="max-width:150px; max-height:150px; margin-bottom:4px; border-radius:4px;">`;
  }

  previewDiv.innerHTML = `
        ${filePreviewHTML}
        <div class="flex gap-2">
            <span>${fileName}</span>
            <button type="button" class="px-2 py-1 bg-red-600 rounded" onclick="clearFile()">❌</button>
            <button type="button" class="px-2 py-1 bg-green-600 rounded" onclick="sendFile()">✅</button>
        </div>
    `;

  previewContainer.appendChild(previewDiv);
  setTimeout(function () {
    document.querySelector(".chat-box-container").scrollTop =
      document.querySelector(".chat-box-container").scrollHeight;
  }, 100);
}

function clearFile() {
  const fileInput = document.getElementById("fileInput");
  fileInput.value = ""; // kosongkan file input
  document.querySelector(".send-file-preview").innerHTML = ""; // hapus preview
}

const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get("roomId") || "default";
connectSocket(roomId);
