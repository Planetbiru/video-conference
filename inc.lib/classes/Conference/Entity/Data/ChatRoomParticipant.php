<?php

namespace Conference\Entity\Data;

use MagicObject\MagicObject;

/**
 * The ChatRoomParticipant class represents an entity in the "chat_room_participant" table.
 *
 * This entity maps to the "chat_room_participant" table in the database and supports ORM (Object-Relational Mapping) operations. 
 * You can establish relationships with other entities using the JoinColumn annotation. 
 * Ensure to include the appropriate "use" statement if related entities are defined in a different namespace.
 * 
 * For detailed guidance on using the MagicObject ORM, refer to the official tutorial:
 * @link https://github.com/Planetbiru/MagicObject/blob/main/tutorial.md#orm
 * 
 * @package Conference\Entity\Data
 * @Entity
 * @JSON(propertyNamingStrategy=SNAKE_CASE, prettify=false)
 * @Table(name="chat_room_participant")
 */
class ChatRoomParticipant extends MagicObject
{
	/**
	 * Chat Room Participant ID
	 * 
	 * @Id
	 * @GeneratedValue(strategy=GenerationType.UUID)
	 * @NotNull
	 * @Column(name="chat_room_participant_id", type="varchar(40)", length=40, nullable=false)
	 * @Label(content="Chat Room Participant ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $chatRoomParticipantId;

	/**
	 * Chat Room ID
	 * 
	 * @NotNull
	 * @Column(name="chat_room_id", type="varchar(40)", length=40, nullable=false)
	 * @Label(content="Chat Room ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $chatRoomId;

	/**
	 * Participant ID
	 * 
	 * @NotNull
	 * @Column(name="participant_id", type="varchar(40)", length=40, nullable=false)
	 * @Label(content="Participant ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $participantId;

	/**
	 * Role
	 * 
	 * @Column(name="role", type="int(11)", length=11, defaultValue="1", nullable=true)
	 * @DefaultColumn(value="1")
	 * @Label(content="Role")
	 * @var int
	 */
	protected $role;

	/**
	 * Time Join
	 * 
	 * @Column(name="time_join", type="timestamp", length=26, nullable=true)
	 * @Label(content="Time Join")
	 * @var string
	 */
	protected $timeJoin;

}