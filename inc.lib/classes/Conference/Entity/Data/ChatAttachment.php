<?php

namespace Conference\Entity\Data;

use MagicObject\MagicObject;

/**
 * The ChatAttachment class represents an entity in the "chat_attachment" table.
 *
 * This entity maps to the "chat_attachment" table in the database and supports ORM (Object-Relational Mapping) operations. 
 * You can establish relationships with other entities using the JoinColumn annotation. 
 * Ensure to include the appropriate "use" statement if related entities are defined in a different namespace.
 * 
 * For detailed guidance on using the MagicObject ORM, refer to the official tutorial:
 * @link https://github.com/Planetbiru/MagicObject/blob/main/tutorial.md#orm
 * 
 * @package Conference\Entity\Data
 * @Entity
 * @JSON(propertyNamingStrategy=SNAKE_CASE, prettify=false)
 * @Table(name="chat_attachment")
 */
class ChatAttachment extends MagicObject
{
	/**
	 * Chat Attachment ID
	 * 
	 * @Id
	 * @GeneratedValue(strategy=GenerationType.UUID)
	 * @NotNull
	 * @Column(name="chat_attachment_id", type="varchar(40)", length=40, nullable=false)
	 * @Label(content="Chat Attachment ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $chatAttachmentId;

	/**
	 * Chat Room ID
	 * 
	 * @Column(name="chat_room_id", type="varchar(40)", length=40, nullable=true)
	 * @Label(content="Chat Room ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $chatRoomId;

	/**
	 * Chat Message ID
	 * 
	 * @Column(name="chat_message_id", type="varchar(40)", length=40, nullable=true)
	 * @Label(content="Chat Message ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $chatMessageId;

	/**
	 * Participant ID
	 * 
	 * @Column(name="participant_id", type="varchar(40)", length=40, nullable=true)
	 * @Label(content="Participant ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $participantId;

	/**
	 * File Meta ID
	 * 
	 * @Column(name="file_meta_id", type="varchar(40)", length=40, nullable=true)
	 * @Label(content="File Meta ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $fileMetaId;

	/**
	 * Time Create
	 * 
	 * @Column(name="time_create", type="timestamp", length=26, nullable=true, updatable=false)
	 * @Label(content="Time Create")
	 * @var string
	 */
	protected $timeCreate;

	/**
	 * Time Edit
	 * 
	 * @Column(name="time_edit", type="timestamp", length=26, nullable=true)
	 * @Label(content="Time Edit")
	 * @var string
	 */
	protected $timeEdit;

}