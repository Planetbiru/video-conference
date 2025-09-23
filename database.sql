-- 1. Tabel chat_room
CREATE TABLE chat_room (
    chat_room_id VARCHAR(40) PRIMARY KEY,       -- UUID
    name VARCHAR(255) NOT NULL,
    room_type TINYINT NOT NULL DEFAULT 1, -- 1 = private, 2 = group.
    share_history TINYINT(1) DEFAULT 0, -- new joiner can see old chat or not
    time_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_edit TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Tabel participant
CREATE TABLE participant (
    participant_id VARCHAR(40) PRIMARY KEY,       -- UUID
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    session_id VARCHAR(128),
    time_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_edit TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE chat_room_participant (
    chat_room_participant_id VARCHAR(40) PRIMARY KEY,
    chat_room_id VARCHAR(40) NOT NULL,
    participant_id VARCHAR(40) NOT NULL,
    role INT DEFAULT 1, -- 1 = member, 2 = admin, 3 = owner
    time_join TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 3. Tabel chat_message
CREATE TABLE chat_message (
    chat_message_id VARCHAR(40) PRIMARY KEY,       -- UUID
    chat_message_parent_id VARCHAR(40) NULL,
    chat_room_id VARCHAR(40) NULL,
    participant_id VARCHAR(40) NULL,
    message_type VARCHAR(100) NULL,
    message TEXT NULL,
    delete_for_sender TINYINT(1) DEFAULT 0,
    delete_for_all TINYINT(1) DEFAULT 0, -- if 1, message will not show to new joiner even chat_room.share_history = 1
    time_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_edit TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE chat_event (
    chat_event_id VARCHAR(40) PRIMARY KEY,       -- UUID
    chat_room_id VARCHAR(40) NULL,
    participant_id VARCHAR(40) NULL,
    message_type VARCHAR(100) NULL,
    time_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_edit TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Tabel chat_message which is deleted by participants. Message will be hidden on their screen
CREATE TABLE chat_message_deleted (
    chat_message_deleted_id VARCHAR(40) PRIMARY KEY,       -- UUID
    chat_message_id VARCHAR(40),
    chat_room_id VARCHAR(40) NULL,
    participant_id VARCHAR(40) NULL,
    time_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel chat_attachment
CREATE TABLE chat_attachment (
    chat_attachment_id VARCHAR(40) PRIMARY KEY,       -- UUID
    chat_room_id VARCHAR(40) NULL,
    chat_message_id VARCHAR(40) NULL,
    participant_id VARCHAR(40) NULL,
    file_meta_id VARCHAR(40) NULL,       -- UUID
    time_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_edit TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Tabel file_meta
CREATE TABLE file_meta (
    file_meta_id VARCHAR(40) PRIMARY KEY,       -- UUID
    chat_room_id VARCHAR(40) NOT NULL,
    participant_id VARCHAR(40) NOT NULL,
    name VARCHAR(255) NOT NULL,
    file_extension VARCHAR(20),
    mime_type VARCHAR(200) NULL,
    real_path VARCHAR(2000) NULL,
    total_size BIGINT,
    checksum_sha256 CHAR(64),
    chunk_size BIGINT DEFAULT 1,
    complete TINYINT(1) DEFAULT 0,      -- 0 = false, 1 = complete
    realtime TINYINT(1) DEFAULT 0,      -- 0 = false, 1 = realtime
    time_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_edit TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
