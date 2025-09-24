<?php

namespace Conference\Entity\Data;

use MagicObject\MagicObject;

/**
 * The ChatMessageDeleted class represents an entity in the "chat_message_deleted" table.
 *
 * This entity maps to the "chat_message_deleted" table in the database and supports ORM (Object-Relational Mapping) operations. 
 * You can establish relationships with other entities using the JoinColumn annotation. 
 * Ensure to include the appropriate "use" statement if related entities are defined in a different namespace.
 * 
 * For detailed guidance on using the MagicObject ORM, refer to the official tutorial:
 * @link https://github.com/Planetbiru/MagicObject/blob/main/tutorial.md#orm
 * 
 * @package Conference\Entity\Data
 * @Entity
 * @JSON(propertyNamingStrategy=SNAKE_CASE, prettify=false)
 * @Table(name="chat_message_deleted")
 */
class ChatMessageDeleted extends MagicObject
{
	/**
	 * Chat Message Deleted ID
	 * 
	 * @Id
	 * @GeneratedValue(strategy=GenerationType.UUID)
	 * @NotNull
	 * @Column(name="chat_message_deleted_id", type="varchar(40)", length=40, nullable=false)
	 * @Label(content="Chat Message Deleted ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $chatMessageDeletedId;

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
	 * Chat Room ID
	 * 
	 * @Column(name="chat_room_id", type="varchar(40)", length=40, nullable=true)
	 * @Label(content="Chat Room ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $chatRoomId;

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
	 * Time Create
	 * 
	 * @Column(name="time_create", type="timestamp", length=26, nullable=true, updatable=false)
	 * @Label(content="Time Create")
	 * @var string
	 */
	protected $timeCreate;

}