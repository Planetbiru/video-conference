-- 1. Tabel chat_room
CREATE TABLE chat_room (
    chat_room_id CHAR(40) PRIMARY KEY,       -- UUID
    name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Tabel participant
CREATE TABLE participant (
    participant_id CHAR(40) PRIMARY KEY,       -- UUID
    username VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    session_id VARCHAR(128),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Tabel chat_message
CREATE TABLE chat_message (
    chat_message_id CHAR(40) PRIMARY KEY,       -- UUID
    chat_message_parent_id CHAR(40) NULL,
    chat_room_id CHAR(40) NULL,
    participant_id CHAR(40) NULL,
    message_type VARCHAR(100) NULL,
    message TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Tabel chat_attachment
CREATE TABLE chat_attachment (
    chat_attachment_message_id CHAR(40) PRIMARY KEY,       -- UUID
    chat_room_id CHAR(40) NULL,
    chat_message_id CHAR(40) NULL,
    participant_id CHAR(40) NULL,
    file_meta_id CHAR(40) NULL,       -- UUID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. Tabel file_meta
CREATE TABLE file_meta (
    file_meta_id CHAR(40) PRIMARY KEY,       -- UUID
    chat_room_id CHAR(40) NOT NULL,
    participant_id CHAR(40) NOT NULL,
    name VARCHAR(255) NOT NULL,
    file_extension VARCHAR(20),
    mime_type VARCHAR(200) NULL,
    real_path VARCHAR(2000) NULL,
    total_size BIGINT,
    chunk_size BIGINT DEFAULT 1,
    complete TINYINT(1) DEFAULT 0,      -- 0 = false, 1 = complete
    realtime TINYINT(1) DEFAULT 0,      -- 0 = false, 1 = realtime
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
