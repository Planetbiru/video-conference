<?php

namespace Conference\Entity\Data;

use MagicObject\MagicObject;

/**
 * The ChatRoom class represents an entity in the "chat_room" table.
 *
 * This entity maps to the "chat_room" table in the database and supports ORM (Object-Relational Mapping) operations. 
 * You can establish relationships with other entities using the JoinColumn annotation. 
 * Ensure to include the appropriate "use" statement if related entities are defined in a different namespace.
 * 
 * For detailed guidance on using the MagicObject ORM, refer to the official tutorial:
 * @link https://github.com/Planetbiru/MagicObject/blob/main/tutorial.md#orm
 * 
 * @package Conference\Entity\Data
 * @Entity
 * @JSON(propertyNamingStrategy=SNAKE_CASE, prettify=false)
 * @Table(name="chat_room")
 */
class ChatRoom extends MagicObject
{
	/**
	 * Chat Room ID
	 * 
	 * @Id
	 * @GeneratedValue(strategy=GenerationType.UUID)
	 * @NotNull
	 * @Column(name="chat_room_id", type="varchar(40)", length=40, nullable=false)
	 * @Label(content="Chat Room ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $chatRoomId;

	/**
	 * Name
	 * 
	 * @NotNull
	 * @Column(name="name", type="varchar(255)", length=255, nullable=false)
	 * @Label(content="Name")
	 * @MaxLength(value=255)
	 * @var string
	 */
	protected $name;

	/**
	 * Room Type
	 * 
	 * @NotNull
	 * @Column(name="room_type", type="tinyint(4)", length=4, defaultValue="1", nullable=false)
	 * @DefaultColumn(value="1")
	 * @Label(content="Room Type")
	 * @var int
	 */
	protected $roomType;

	/**
	 * Share History
	 * 
	 * @Column(name="share_history", type="tinyint(1)", length=1, defaultValue="0", nullable=true)
	 * @Label(content="Share History")
	 * @var bool
	 */
	protected $shareHistory;

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