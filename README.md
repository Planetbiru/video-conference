# Video Conference

A **web-based video conferencing application** featuring real-time, room-based communication. It includes video/audio streaming, screen sharing, persistent chat with history, and file sharing. Built with **WebRTC** and **WebSockets** for peer-to-peer communication, and **TailwindCSS** for a responsive UI.

---

## Features

- **Room-Based Video & Audio Conferencing**
  - Connect with multiple peers in isolated rooms using WebRTC.
  - Display local and remote video streams with a main screen view.

- **Main Screen Promotion**  
  - Promote your stream or a selected participant's stream to the main screen.  
  - Demote streams when needed.  

- **Screen Sharing**  
  - Share your screen with all participants.  
  - Automatically revert to the camera when screen sharing ends.

- **Persistent Chat System**
  - Real-time text chat confined to participants within the same room.
  - **Chat History**: New participants can view the entire chat history upon joining.

- **Persistent File Sharing**
  - Send files to all participants in chunks, supporting large file transfers.
  - Image files are previewed directly in the chat.
  - **Saved Files**: Files are stored on the server, allowing new participants or users who reload the page to access previously shared files.

- **Event History & State Synchronization**
  - New participants automatically see the current state of shared screens, cameras, and audio streams.
  - Ensures a consistent view for everyone in the room, regardless of when they join.

- **Responsive UI**  
  - Left panel for video, right panel for chat.  
  - **Resizable Panels**: Users can resize the video and chat panels to optimize their viewing area.
  - Floating chat panel similar to modern conferencing apps.  

---

## Demo

This project requires running a WebSocket signaling server on port `3000`. To test, open multiple browser tabs and join the same room by adding `?roomId=your-room-name` to the URL.

---

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/video-conference.git
   cd video-conference
   ```

2. **Run signaling server**

   * The signaling server can be implemented in **PHP** or **Node.js**.
   * Start the server using one of the following commands:

   **PHP (requires Ratchet):**

   ```bash
   php server.php
   ```

   **Node.js (requires `ws` package):**

```bash
node server.js
```

* The server should handle messages like `peers`, `offer`, `answer`, `candidate`, `chat`, and `file-*`.

3. **Open the app**

   * Open `index.html` in a modern browser (Chrome, Firefox, or Edge).
   * Join a room by passing `?roomId=your-room-name` in the URL.

---

## Usage

* **Start Camera**: Click the camera button to start your webcam.
* **Share Screen**: Click the desktop button to share your screen.
* **Promote Stream**: Click the star button to make your stream the main screen.
* **Chat**: Type messages in the chat input and press send.
* **File Sharing**: Click the 📎 button to select a file, preview, and send.
* **Resize Panels**: Drag the divider between the video and chat panels to adjust their widths.

---

## Project Structure


```
├── index.html            # Main HTML file
├── app.js                # Main JavaScript logic (WebRTC, chat, file sharing)
├── style.css             # Custom styles
├── resizable-panel.js    # Resizable panel helper
├── server.php            # PHP signaling server (optional)
├── server.js             # Node.js signaling server (optional)
└── README.md             # Project documentation
```

---

## Dependencies

* [TailwindCSS](https://tailwindcss.com/) – For responsive styling
* [FontAwesome](https://fontawesome.com/) – For icons
* Modern browsers supporting **WebRTC** and **WebSockets**

---

## Notes

* The signaling server can be implemented in **PHP** or **Node.js**.
* Tested on **Chrome** and **Firefox**. Mobile support requires `playsinline` for autoplay.

## Using PHP (Apache Proxy)

If you are using PHP and want to deploy the application online with Apache, you need to set up a proxy for the WebSocket server.

* Make sure these Apache modules are enabled:
* LoadModule proxy_module modules/mod_proxy.so
* LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so

## Add Apache Configuration

Add the following configuration to your Apache virtual host file (e.g., `httpd.conf` or a site-specific config) so that clients can access the WebSocket with the same base URL (same domain and port number). This is necessary for modern browsers to avoid violating CORS.

```
<VirtualHost *:80>
    ServerName domain.tld
    DocumentRoot "/var/www/html"

    <Directory "/var/www/html">
        AllowOverride All
        Require all granted
    </Directory>
    
    ProxyPass "/ws/"  "ws://localhost:3000/ws/"
    ProxyPassReverse "/ws/"  "ws://localhost:3000/ws/"
</VirtualHost>
```


From the example above, every request to `http://domain.tld/ws/` will be redirected to `ws://localhost:3000/ws/` by the Apache server. This is the easiest way when you don’t have an SSL/TLS certificate. You can use services like Cloudflare and similar ones. Use a proxy so that clients can access both your website and your WebSocket using the SSL/TLS certificate.

If you are using your own SSL/TLS, you can configure it on port 443.

```
# Make sure these Apache modules are enabled:
# LoadModule proxy_module modules/mod_proxy.so
# LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so
# LoadModule ssl_module modules/mod_ssl.so

<VirtualHost *:443>
    ServerName domain.com
    DocumentRoot "/var/www/html"

    # ====== SSL/TLS Config ======
    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/domain.crt
    SSLCertificateKeyFile /etc/ssl/private/domain.key
    # Jika ada intermediate certificate:
    # SSLCertificateChainFile /etc/ssl/certs/domain-chain.crt

    # ====== HTTP normal lewat HTTPS ======
    <Directory "/var/www/html">
        AllowOverride All
        Require all granted
    </Directory>

    # ====== Proxy khusus untuk WebSocket ======
    ProxyPass "/ws/"  "ws://localhost:8080/ws/"
    ProxyPassReverse "/ws/"  "ws://localhost:8080/ws/"
</VirtualHost>
```

Please note that even though you are using your own SSL/TLS certificate, you still point it to `ws://localhost:3000/ws/` instead of `wss://localhost:3000/ws/`. The reason is that your WebSocket server itself is not using SSL/TLS.

---

## License

MIT License © Kamshory, MT

---

## Acknowledgements

* Inspired by modern video conferencing applications and WebRTC tutorials.
* Uses open-source libraries for UI and icons.
