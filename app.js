/**
 * @type {Object.<string, RTCPeerConnection>}
 * Stores all RTCPeerConnection objects, keyed by peer ID.
 */
const peers = {};

/**
 * @type {Object.<string, any>}
 * Stores details about each peer, keyed by peer ID.
 */
let peerDetails = {};

const localVideo = document.createElement("video");
localVideo.autoplay = true;
localVideo.muted = true;
localVideo.playsInline = true;
localVideo.id = "video-local";

/** @type {number} Interval in milliseconds for WebSocket reconnection attempts. */
let reconnectInterval = 5000;

/** @type {boolean} Flag to ensure chat event history is requested only once. */
let eventHistoryCalled = false;

/**
 * Configuration for RTCPeerConnection, including STUN servers for ICE candidate discovery.
 */
const peerConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" }
  ]
};

/**
 * @type {MediaStream | null}
 * The local user's media stream (can contain video and/or audio).
 */
let localStream;

/** @type {string} The unique identifier for the current client, assigned by the server. */
let clientId;

/**
 * @type {Object.<string, {wrapper: HTMLElement, video: HTMLVideoElement}>}
 * Stores remote video elements, keyed by peer ID.
 */
const remoteVideos = {};

/** @type {HTMLVideoElement} The main video element for displaying the primary stream. */
const mainScreen = document.getElementById("main-screen");

/** @type {HTMLElement} The button to promote a stream to the main screen. */
const promoteBtn = document.getElementById("promoteBtn");

const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
const wsHost = window.location.hostname;
const wsPort = 3000;

let currentRoomId = "default";
const urlParams = new URLSearchParams(window.location.search);
currentRoomId = urlParams.get("roomId") || "default";


let socketUrl = `${wsProtocol}://${wsHost}:${wsPort}?roomId=${encodeURIComponent(
  currentRoomId
)}`;
let socket;


/** @type {number} The size of each file chunk in bytes for file transfers. */
const CHUNK_SIZE = 16 * 1024; // 16KB per chunk

/**
 * @type {Object.<string, {meta: any, from: string, chunks: Uint8Array[]}>}
 * A temporary store for incoming file chunks, keyed by file ID.
 */
const incomingFiles = {};

// --- Constants for CSS classes and selectors ---

const CLASS_MUTED = "muted";
const CLASS_SHARING = "status-sharing";
const SELECTOR_PROMOTE_STREAM = ".btn-promote-stream";
const SELECTOR_SHARE_CAMERA = ".btn-share-camera";
const SELECTOR_SHARE_SCREEN = ".btn-share-screen";
const SELECTOR_SHARE_MICROPHONE = ".btn-share-microphone";

// --- Constants for WebSocket message types ---

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
const MESSAGE_TYPE_CHAT_HISTORY = "chatHistory";
const MESSAGE_TYPE_REQUEST_CHAT_EVENT = "requestChatEvent";
const MESSAGE_TYPE_CHAT_EVENT = "chatEvent";



const MESSAGE_TYPE_FILE_META = "fileMeta";
const MESSAGE_TYPE_FILE_CHUNK = "fileChunk";
const MESSAGE_TYPE_FILE_COMPLETE = "fileComplete";
const MESSAGE_TYPE_FILE_REQUEST = "fileRequest";
const MESSAGE_TYPE_FILE_UPDATE = "fileUpdate";
const MESSAGE_TYPE_NEW_PEAR = "newPeer";

/**
 * @type {string[]}
 * An array of selectors for control icons that can have a 'sharing' status.
 */
let controlIcons = [
  SELECTOR_SHARE_CAMERA,
  SELECTOR_SHARE_SCREEN,
  SELECTOR_PROMOTE_STREAM,
];

/** Adds the 'sharing' class to all camera sharing buttons. */
function markShareCameraActive() {
  let btns = document.querySelectorAll(SELECTOR_SHARE_CAMERA);
  if (btns?.length) {
    btns.forEach((btn) => {
      btn.classList.add(CLASS_SHARING);
    });
  }
}

/** Removes the 'sharing' class from all camera sharing buttons. */
function markShareCameraInactive() {
  let btns = document.querySelectorAll(SELECTOR_SHARE_CAMERA);
  if (btns?.length) {
    btns.forEach((btn) => {
      btn.classList.remove(CLASS_SHARING);
    });
  }
}

/**
 * Checks if any camera sharing button is currently active.
 * @returns {boolean} True if a camera sharing button has the 'sharing' class.
 */
function isShareCameraActive() {
  let btns = document.querySelectorAll(SELECTOR_SHARE_CAMERA);
  return Array.from(btns).some((btn) => btn.classList.contains(CLASS_SHARING));
}

/** Adds the 'sharing' class to all screen sharing buttons. */
function markShareScreenActive() {
  let btns = document.querySelectorAll(SELECTOR_SHARE_SCREEN);
  if (btns?.length) {
    btns.forEach((btn) => {
      btn.classList.add(CLASS_SHARING);
    });
  }
}

/**
 * Checks if any screen sharing button is currently active.
 * @returns {boolean} True if a screen sharing button has the 'sharing' class.
 */
function markShareScreenInactive() {
  let btns = document.querySelectorAll(SELECTOR_SHARE_SCREEN);
  return Array.from(btns).some((btn) => btn.classList.contains(CLASS_SHARING));
}

/**
 * Checks if any screen sharing button is currently active.
 * @returns {boolean} True if a screen sharing button has the 'sharing' class.
 */
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

/** Adds the 'sharing' class to all stream promotion buttons. */
function markPromoteStreamActive() {
  let btns = document.querySelectorAll(SELECTOR_PROMOTE_STREAM);
  if (btns?.length) {
    btns.forEach((btn) => {
      btn.classList.add(CLASS_SHARING);
    });
  }
}

/**
 * Checks if any stream promotion button is currently active.
 * @returns {boolean} True if a stream promotion button has the 'sharing' class.
 */
function markPromoteStramInavtive() {
  let btns = document.querySelectorAll(SELECTOR_PROMOTE_STREAM);
  return Array.from(btns).some((btn) => btn.classList.contains(CLASS_SHARING));
}

/**
 * Checks if any stream promotion button is currently active.
 * @returns {boolean} True if a stream promotion button has the 'sharing' class.
 */
function isPromoteStreamActive() {
  let btns = document.querySelectorAll(SELECTOR_PROMOTE_STREAM);
  return Array.from(btns).some((btn) => btn.classList.contains(CLASS_SHARING));
}

/**
 * Checks if the microphone is currently muted by checking for the 'muted' class on buttons.
 * @returns {boolean} True if a microphone button has the 'muted' class.
 */
function isMicrophoneMuted() {
  let btns = document.querySelectorAll(SELECTOR_SHARE_MICROPHONE);
  return Array.from(btns).some((btn) => btn.classList.contains(CLASS_MUTED));
}

/**
 * Checks if the local stream has at least one enabled audio track.
 * @returns {boolean} True if an enabled audio track exists, false otherwise.
 */
function isMicrophoneActive() {
  if (!localStream) return false;
  const audioTracks = localStream.getAudioTracks();
  if (!audioTracks || audioTracks.length === 0) return false;
  return audioTracks.some((t) => t.enabled && !t.muted);
}

/**
 * Toggles the mute state of the local audio stream and updates the UI of the provided button.
 * @param {HTMLElement} buttonElement - The button element to update.
 */
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
 * Starts or stops the microphone. If the microphone is already active, it stops it.
 * Otherwise, it requests audio permissions and adds the audio track to the local stream.
 * It also updates the UI and notifies peers.
 * @param {HTMLElement} [buttonElement] - The button element that triggered this action.
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
 * Stops all local audio tracks, removes them from the local stream,
 * and notifies peers to remove the audio track from their end.
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
 * Mutes all audio tracks in the local stream by setting `enabled` to `false`.
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
 * Unmutes all audio tracks in the local stream by setting `enabled` to `true`.
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
 * Toggles the mute state of the local audio. If no audio track exists,
 * it attempts to start the microphone. Otherwise, it toggles the `enabled`
 * state of existing audio tracks.
 * @param {HTMLElement} [buttonElement] - The button element to update UI classes on.
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
 * Removes all audio senders from all peer connections and renegotiates.
 * This is used when the local user stops sharing their microphone entirely.
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

/**
 * Switches the main screen to display the stream from the specified peer ID.
 * @param {string} idToPromote - The ID of the peer whose stream should be promoted.
 */
function switchStreamTo(idToPromote) {
  if (idToPromote === clientId) {
    setMainScreenStream(localStream);
  } else {
    waitAndAttachToMain(idToPromote);
  }
}

/**
 * Joins a room by updating the current room ID and reconnecting the WebSocket.
 * @param {string} roomId - The ID of the room to join.
 */
function joinRoom(roomId) {
  if (!roomId) {
    return;
  }
  currentRoomId = roomId;
  connectSocket(roomId);
}

/**
 * Handles incoming WebSocket messages and routes them to the appropriate handler functions.
 * @param {object} msg - The parsed JSON message object from the WebSocket.
 */
async function handleOnMessage(msg)
{
  let peerId = msg.from;

    // chat
    if (msg.type === MESSAGE_TYPE_CHAT) {
      renderNewChat(msg);
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
    if (msg.type === MESSAGE_TYPE_CHAT_HISTORY) {
      putChatHistory(msg.chatHistory);
      loadMissedFiles();
      return;
    }
    
    // chatEvent
    if (msg.type === MESSAGE_TYPE_CHAT_EVENT) {
      if(msg.chatEvent)
      {
        msg.chatEvent.forEach(evt => handleOnMessage(evt));
      }
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
}

/**
 * Establishes a WebSocket connection to the signaling server.
 * @param {string} roomId - The ID of the room to connect to.
 */
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
    handleOnMessage(msg);
  };

  socket.onclose = () => {
    console.warn("Socket closed. Reconnecting...");
    setTimeout(()=>{
      connectSocket(currentRoomId);
    }, reconnectInterval);
  };

  socket.onerror = (err) => {
    console.error("Socket error:", err);
    socket.close(); // trigger onclose → reconnect
  };
}

/**
 * Renders a single message from chat history, which can be a chat message or a file placeholder.
 * @param {object} msg - The message object from history.
 */
function putHistoryChat(msg) {
 
  if(msg.type === MESSAGE_TYPE_CHAT)
  {
    renderNewChat(msg);
  }
  else if(msg.type === MESSAGE_TYPE_FILE_META)
  {
   putFilePlaceholder(msg);
  }
}

/**
 * Creates and appends a placeholder for an incoming file to the chat box.
 * @param {object} msg - The file metadata message.
 */
function putFilePlaceholder(msg) {

  let fileId = msg.fileId;
  if(document.querySelector(`.url-src[data-file-id="${fileId}"]`))
  {
    return;
  }

  const chatBox = document.getElementById("chat-box");
    // Container utama chat
  const chatContainer = document.createElement("div");
  chatContainer.classList.add("chat-container");
  
    // Header pengirim
  const header = document.createElement("div");
  header.classList.add('chat-sender');
  header.textContent = `${msg.from}`;
  chatContainer.appendChild(header);

  // Buat container untuk file
  const fileContainer = document.createElement("div");
  fileContainer.classList.add("file-container");
  fileContainer.id = `file-${msg.fileId}`; // ID berdasarkan fileId

  let realtime = msg.realtime ? 'true' : 'false';
  let complete = msg.complete ? 'true' : 'false';



  // Konten file
  if (msg?.mimeType?.startsWith("image/")) {
    const imgWrapper = document.createElement("div");
    imgWrapper.classList.add("image-received");

    const img = document.createElement("img");
    img.classList.add("url-src");
    img.src = "image.svg";
    img.alt = msg.name;
    img.dataset.fileId = msg.fileId;
    img.dataset.realtime = realtime;
    img.dataset.complete = complete;
    img.dataset.loaded = "false";
    img.dataset.process = "false";

    imgWrapper.appendChild(img);
    fileContainer.appendChild(imgWrapper);
  }

  // Link download file (untuk semua tipe)
  const link = document.createElement("a");
  link.classList.add("url-href");
  link.href = "#";
  link.download = msg.name;
  link.dataset.fileId = msg.fileId;
  link.dataset.realtime = realtime;
  link.dataset.complete = complete;
  link.dataset.loaded = "false";
  link.dataset.process = "false";
  link.textContent = `📎 ${msg.name}`;
  let fileNameContainer = document.createElement("div");
  fileNameContainer.classList.add("file-name-container");
  fileNameContainer.appendChild(link);

  fileContainer.appendChild(fileNameContainer);
  
  chatContainer.appendChild(fileContainer);

  chatBox.appendChild(chatContainer);

  // Panggil fungsi proses file
  requestCompletedFile();
  requestIncompletedFile();
}

/** @type {boolean} Flag to track if missed files are currently being loaded. */
let isMissedFilesLoaded = false;

/**
 * Initiates the process of loading files that were missed (e.g., sent before this client joined).
 * It requests completed files once and then polls for incompleted files periodically.
 * This function ensures it only runs one process at a time.
 */
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

/** @type {number} Interval ID for the incompleted file check. */
let checkInterval = setInterval('', 100000);

/**
 * Periodically requests updates for files that are marked as incomplete and not yet loaded.
 */
function requestIncompletedFile()
{
  let elements = document.querySelectorAll('.url-href[data-realtime="false"][data-complete="false"][data-loaded="false"][data-process="false"]');
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

/**
 * Requests the content of files that are marked as complete but have not been loaded yet.
 */
function requestCompletedFile()
{
  let elements = document.querySelectorAll('.url-href[data-realtime="false"][data-complete="true"][data-loaded="false"][data-process="false"]');
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

/**
 * Escapes HTML special characters in a string.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Replaces newline characters with HTML <br> tags.
 * @param {string} text - The text to process.
 * @returns {string} The text with newlines converted to <br> tags.
 */
function nl2br(text)
{
  return text.replace(/\n/g, "<br>");
}

/**
 * Renders a new chat message and appends it to the chat box.
 * @param {object} msg - The chat message object.
 */
function renderNewChat(msg) {
  const chatBox = document.getElementById("chat-box");

  // Container utama chat
  const chatContainer = document.createElement("div");
  chatContainer.classList.add("chat-container");

  // Header pengirim
  const header = document.createElement("div");
  header.classList.add("chat-sender");
  header.textContent = msg.from;
  chatContainer.appendChild(header);

  // Konten chat
  const content = document.createElement("div");
  content.classList.add("chat-content");
  content.innerHTML = nl2br(escapeHtml(msg.text));
  chatContainer.appendChild(content);

  chatBox.appendChild(chatContainer);

  // Scroll ke bawah
  setTimeout(() => {
    const chatScroll = document.querySelector(".chat-box-container");
    if (chatScroll) {
      chatScroll.scrollTop = chatScroll.scrollHeight;
    }
  }, 100);
}

/**
 * Renders a list of chat history messages.
 * @param {object[]} data - An array of message objects.
 */
function putChatHistory(data) {
  data.forEach((msg) => putHistoryChat(msg));
}

/**
 * Updates the details for a specific peer.
 * @param {string} peerId - The ID of the peer to update.
 * @param {object} peerDetail - The new details for the peer.
 */
function updatePeer(peerId, peerDetail) {
  peerDetails[peerId] = peerDetail;
}

/** Sends a request to the server for the chat history of the current room. */
function requestChatHistory() {
  socket.send(
    JSON.stringify({ type: MESSAGE_TYPE_REQUEST_CHAT_HISTORY, from: clientId })
  );
}

/** Sends a request to the server for any missed chat events. */
function requestChatEvent() {
  socket.send(
    JSON.stringify({ type: MESSAGE_TYPE_REQUEST_CHAT_EVENT, from: clientId })
  );
}

// --- helpers ---

/**
 * Checks if two MediaStream objects are the same instance.
 * @param {MediaStream} a - The first MediaStream.
 * @param {MediaStream} b - The second MediaStream.
 * @returns {boolean} True if they are the same object.
 */
function isSameStream(a, b) {
  // Simple guard to check if two MediaStreams are the same object
  return a === b;
}

/**
 * Sets the stream for the main screen video element.
 * Handles autoplay policies by muting the video.
 * @param {MediaStream | null} stream - The stream to display, or null to clear.
 */
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

/**
 * Sets the main screen to display the local user's stream.
 */
function setMainScreenLocal() {
  if (localStream) {
    setMainScreenStream(localStream);
    console.log("Main screen set to local stream");
  } else {
    console.warn("No localStream available yet");
  }
}

/**
 * Creates and appends the local video element and its controls to the video container.
 */
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

/**
 * Creates and configures an RTCPeerConnection for a given peer ID if it doesn't already exist.
 * This function is idempotent.
 * @param {string} id - The ID of the peer to create a connection for.
 * @returns {RTCPeerConnection} The RTCPeerConnection object for the peer.
 */
function createPeer(id) {
  if (peers[id]) return peers[id];

  const rtcPeerConnection = new RTCPeerConnection(peerConfiguration);
  peers[id] = rtcPeerConnection;

  // Attach local tracks
  if (localStream) {
    localStream.getTracks().forEach((track) =>
      rtcPeerConnection.addTrack(track, localStream)
    );
  }

  // 1. Candidate discovery
  rtcPeerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.send(
        JSON.stringify({
          type: MESSAGE_TYPE_CANDIDATE,
          candidate: e.candidate,
          to: id,
          from: clientId,
        })
      );
    } else {
      // ✅ semua candidate sudah dikirim
      console.log("All ICE candidates sent for peer:", id);
      if (typeof onIceReady === "function") {
        onIceReady(id, rtcPeerConnection);
      }
    }
  };

  // 2. Connection state (more reliable for "ready")
  rtcPeerConnection.oniceconnectionstatechange = () => {
    const state = rtcPeerConnection.iceConnectionState;
    console.log("ICE state:", state, "peer:", id);

    if (state === "connected" || state === "completed") {
      // ✅ ICE sudah siap digunakan (peer to peer connected)
      if (typeof onIceReady === "function") {
        onIceReady(id, rtcPeerConnection);
      }
    } else if (state === "failed") {
      console.warn("ICE failed for peer:", id);
    }
  };

  // 3. Media track handling
  rtcPeerConnection.ontrack = (e) => {
    console.log("ontrack from", id, e.streams[0]);
    ensureRemoteVideoElement(id);
    const vid = remoteVideos[id].video;
    vid.srcObject = e.streams[0];

    const selected = document.querySelector(
      'input[name="mainStreamSelector"]:checked'
    );
    if (selected && selected.value === id) {
      waitAndAttachToMain(id);
    }
  };

  return rtcPeerConnection;
}

/**
 * Callback function that is executed when the ICE connection for a peer is ready.
 * This is where you can trigger actions that depend on a fully established peer connection.
 * @param {string} peerId - The ID of the peer whose ICE connection is ready.
 * @param {RTCPeerConnection} connection - The RTCPeerConnection object.
 */
function onIceReady(peerId, connection) {
  console.log("ICE is ready for peer:", peerId);
  
  // Call it once
  if(!eventHistoryCalled)
  {
    requestChatEvent();
    eventHistoryCalled = true;
  }
}

/**
 * Creates an offer to connect to a peer and sends it via the WebSocket.
 * @param {string} id - The ID of the peer to send the offer to.
 */
async function createOffer(id) {
  const pc = createPeer(id);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.send(
    JSON.stringify({ type: MESSAGE_TYPE_OFFER, offer, to: id, from: clientId })
  );
}

/**
 * Ensures that a video element and its wrapper exist for a remote peer.
 * If they don't exist, they are created and added to the DOM.
 * @param {string} peerId - The ID of the remote peer.
 * @returns {{wrapper: HTMLElement, video: HTMLVideoElement}} The wrapper and video element for the peer.
 */
function ensureRemoteVideoElement(peerId) {
  if (remoteVideos[peerId]) return remoteVideos[peerId];

  const videoWrapper = document.createElement("div");
  videoWrapper.className = "video-wrapper";
  videoWrapper.dataset.peerId = peerId;

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

/**
 * Waits for a remote peer's video stream to become ready and then attaches it to the main screen.
 * It uses event listeners ('loadedmetadata', 'playing') to avoid polling.
 * @param {string} peerId - The ID of the peer whose stream to attach.
 * @param {number} [timeout=5000] - The timeout in milliseconds to wait for the stream.
 */
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

/**
 * Checks if the microphone is currently muted by inspecting the UI.
 * @returns {boolean} True if the microphone button has the 'muted' class.
 */
function isAudioMuted() {
  let mic = document.querySelector(SELECTOR_SHARE_MICROPHONE);
  return mic.classList.contains(CLASS_MUTED);
}

/**
 * Starts or stops the camera. If the camera is already active, it stops it.
 * Otherwise, it requests video and audio permissions and sets up the local stream.
 * @param {HTMLElement} buttonElement - The button element that triggered this action.
 */
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

/**
 * Starts or stops screen sharing. If screen sharing is active, it stops it.
 * Otherwise, it requests screen sharing permissions and sets up the local stream.
 * @param {HTMLElement} buttonElement - The button element that triggered this action.
 */
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

/**
 * Replaces or adds tracks to all existing peer connections.
 * This is used when the local stream changes (e.g., starting camera or screen share).
 * @param {MediaStream} stream - The new local stream.
 */
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

/**
 * Renegotiates the connection with all peers by creating and sending a new offer.
 */
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

/**
 * Sends a chat message to the server and renders it locally.
 */
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

  renderNewChat(msg);
  socket.send(JSON.stringify(msg));
}

/**
 * Generates a unique message ID.
 * @returns {string} A unique ID.
 */
function generateMessageId() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID(); // modern browsers
  } else {
    return "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
  }
}

/**
 * Promotes the local user's stream to be the main stream for all participants.
 * It updates the UI and sends a promotion message to the server.
 * @param {HTMLElement} buttonElement - The button element that triggered this action.
 */
function promoteMyStream(buttonElement) {
  if (buttonElement.classList.contains(CLASS_SHARING)) {
    buttonElement.classList.remove(CLASS_SHARING);
    demoteMyStream();
    return;
  }
  buttonElement.classList.add(CLASS_SHARING);
  socket.send(
    JSON.stringify({ type: MESSAGE_TYPE_PROMOTE_STREAM, from: clientId, eventId: generateNewId() })
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

/**
 * Demotes the local user's stream from being the main stream.
 */
function demoteMyStream() {
  socket.send(
    JSON.stringify({ type: MESSAGE_TYPE_DEMOTE_STREAM, from: clientId, eventId: generateNewId() })
  );
}

/**
 * Promotes the currently selected stream (via radio button) to the main screen.
 */
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

/**
 * Replaces or adds tracks to all peer connections.
 * It finds existing senders of the same kind and replaces their tracks, or adds a new track if no sender exists.
 * @param {MediaStream} stream - The new stream to use for the tracks.
 */
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

/**
 * Stops sharing the local video stream (camera or screen).
 * It stops the video tracks, updates the UI, and notifies peers to remove the video track.
 */
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
      JSON.stringify({ type: MESSAGE_TYPE_STREAM_UPDATE, from: clientId, eventId: generateNewId() })
    );
    socket.send(
      JSON.stringify({ type: MESSAGE_TYPE_DEMOTE_STREAM, from: clientId, eventId: generateNewId() })
    );
    socket.send(
      JSON.stringify({ type: MESSAGE_TYPE_STOP_SHARING, from: clientId, eventId: generateNewId() })
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


/**
 * Converts an ArrayBuffer to a Base64 encoded string.
 * @param {ArrayBuffer} buffer - The buffer to convert.
 * @returns {string} The Base64 encoded string.
 */
function arrayBufferToBase64(buffer) {
  let binary = "";
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Generates a unique ID for a file.
 * @returns {string} A unique file ID.
 */
function generateFileId() {
  if (window.crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return "file-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

/**
 * Gets the extension from a filename.
 * @param {string} filename - The name of the file.
 * @returns {string} The file extension in lowercase.
 */
function getFileExtension(filename) {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

/**
 * Sends a selected file to the server in chunks and displays it in the local chat.
 */
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

/**
 * Triggers the file input dialog.
 */
function selectFile() {
  document.getElementById("fileInput").click();
}

/**
 * Displays a preview of the selected file and provides options to send or cancel.
 */
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

/**
 * Clears the file input and removes the file preview.
 */
function clearFile() {
  const fileInput = document.getElementById("fileInput");
  fileInput.value = ""; // kosongkan file input
  document.querySelector(".send-file-preview").innerHTML = ""; // hapus preview
}

/**
 * Generates a new unique ID based on the current timestamp and a random number.
 * @returns {string} A unique ID string.
 */
function generateNewId() {
    // mirip uniqid() di PHP → pakai timestamp dalam milidetik (hex string)
    let uuid = Date.now().toString(16);

    // kalau panjang hex ganjil → tambahkan '0' di depan
    if (uuid.length % 2 === 1) {
        uuid = '0' + uuid;
    }

    // random hex 6 digit (0 sampai FFFFFF)
    const random = Math.floor(Math.random() * 0xFFFFFF)
        .toString(16)
        .padStart(6, '0');

    // gabungkan
    return uuid + random;
}

/**
 * DOMContentLoaded event listener to initialize the WebSocket connection.
 */
document.addEventListener('DOMContentLoaded', ()=>{
  connectSocket(currentRoomId);
});
