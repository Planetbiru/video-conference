let verticalResizablePanels;
let horizontalResizablePanels;

document.addEventListener('DOMContentLoaded', function () {

    // --- Initialize resizable panels ---
    verticalResizablePanels = new ResizableThreePanels(
        '.root-container',       // Parent container
        '.left-panel',           // Left panel (user list)
        '.main-panel',           // Main panel (video)
        '.right-panel',          // Right panel (chat)
        '.resize-bar-left',      // Resize bar between left and main
        '.resize-bar-right',     // Resize bar between main and right
        80                      // Minimum width for panels (px)
    );

    horizontalResizablePanels = new ResizableVertical(
        '.main-content',         // Parent container
        '#top-panel',            // Top panel
        '#bottom-panel',         // Bottom panel
        '.resize-bar-horizontal',// Horizontal resize bar
        140                      // Minimum height for panels (px)
    );

    // When vertical panels are resized, adjust the main screen max-width
    verticalResizablePanels.onResize = function (leftPanelWidth, mainPanelWidth, rightPanelWidth) {
        document.querySelector('#main-screen').style.maxWidth = mainPanelWidth + 'px';
    };

    // When horizontal panels are resized, adjust the main screen max-height
    horizontalResizablePanels.onResize = function (topPanelHeight, bottomPanelHeight) {
        document.querySelector('#main-screen').style.maxHeight = topPanelHeight + 'px';
    };

    // --- Restore ERD panel width or set default ---
    let updatedWidth = document.querySelector('.root-container .left-panel').offsetWidth;
    if (isNaN(updatedWidth) || updatedWidth == 0) {
        updatedWidth = parseInt(verticalResizablePanels.getLeftPanelWidth());
    }
    if (isNaN(updatedWidth) || updatedWidth == 0) {
        updatedWidth = 240; // fallback default
    }
    updatedWidth = updatedWidth - 240;
    verticalResizablePanels.init();

    // --- File input change handler ---
    document.getElementById('fileInput').addEventListener('change', function (event) {
        let file = event.target.files[0];
        previewFile(); // custom function to preview uploaded file
    });

    // --- Fullscreen toggle for main screen ---
    const mainScreen = document.getElementById('main-screen');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            mainScreen.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            // Exit fullscreen
            document.exitFullscreen();
        }
    });

    // --- Horizontal scrolling with mouse wheel in video container ---
    const videoContainer = document.getElementById('video-container');
    videoContainer.addEventListener('wheel', function (event) {
        event.preventDefault(); // prevent default vertical scrolling
        videoContainer.scrollLeft += event.deltaY; // scroll horizontally instead
    }, { passive: false });

    // --- Auto-resize chat input textarea ---
    const chatInput = document.getElementById("chatInput");
    autoResizeTextarea(chatInput, 200, function (newHeight) {
        let trim = newHeight + 58;
        let elem = document.querySelector('.chat-panel .chat-box-container');
        elem.style.height = `calc(100vh - ${trim}px)`;
    });

    // --- Handle chat input Enter key behavior ---
    chatInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            if (e.ctrlKey || e.shiftKey || e.altKey) {
                // Insert new line if modifier key is pressed
                const start = chatInput.selectionStart;
                const end = chatInput.selectionEnd;
                chatInput.value =
                    chatInput.value.substring(0, start) +
                    "\n" +
                    chatInput.value.substring(end);
                chatInput.selectionStart = chatInput.selectionEnd = start + 1;
                e.preventDefault();
            } else {
                // Send chat message on Enter without modifiers
                e.preventDefault();
                sendChat(); // custom function to send chat message
                e.target.style.height = ""; 
                let newHeight = e.target.scrollHeight;

                let trim = newHeight + 58;
                let elem = document.querySelector('.chat-panel .chat-box-container');
                elem.style.height = `calc(100vh - ${trim}px)`;

            }
        }
    });

});


/**
 * Automatically resize a textarea based on its content,
 * up to a maximum height.
 * 
 * @param {HTMLTextAreaElement} textarea - The textarea element to resize.
 * @param {number} [maxHeight=200] - Maximum height in px.
 * @param {function} [callback=null] - Optional callback executed when height changes.
 */
function autoResizeTextarea(textarea, maxHeight = 200, callback = null) {
    
    textarea.addEventListener("input", ()=>{
        resizeTextarea(textarea, maxHeight, callback)
    });
    resizeTextarea(textarea, maxHeight, callback); // initial adjustment
}

function resizeTextarea(textarea, maxHeight, callback) {
    textarea.style.height = "auto"; 
    let newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = newHeight + "px";

    if (typeof callback === "function") {
        callback(newHeight);
    }
}