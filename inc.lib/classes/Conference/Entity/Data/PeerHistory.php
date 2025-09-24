<?php

namespace Conference\Entity\Data;

use MagicObject\MagicObject;

/**
 * The PeerHistory class represents an entity in the "peer_history" table.
 *
 * This entity maps to the "peer_history" table in the database and supports ORM (Object-Relational Mapping) operations. 
 * You can establish relationships with other entities using the JoinColumn annotation. 
 * Ensure to include the appropriate "use" statement if related entities are defined in a different namespace.
 * 
 * For detailed guidance on using the MagicObject ORM, refer to the official tutorial:
 * @link https://github.com/Planetbiru/MagicObject/blob/main/tutorial.md#orm
 * 
 * @package Conference\Entity\Data
 * @Entity
 * @JSON(propertyNamingStrategy=SNAKE_CASE, prettify=false)
 * @Table(name="peer_history")
 */
class PeerHistory extends MagicObject
{
	/**
	 * Peer History ID
	 * 
	 * @Id
	 * @GeneratedValue(strategy=GenerationType.UUID)
	 * @NotNull
	 * @Column(name="peer_history_id", type="varchar(40)", length=40, nullable=false)
	 * @Label(content="Peer History ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $peerHistoryId;

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
	 * Peer Action
	 * 
	 * @Column(name="peer_action", type="varchar(50)", length=50, nullable=true)
	 * @Label(content="Peer Action")
	 * @MaxLength(value=50)
	 * @var string
	 */
	protected $peerAction;

	/**
	 * Time Create
	 * 
	 * @Column(name="time_create", type="timestamp", length=26, nullable=true, updatable=false)
	 * @Label(content="Time Create")
	 * @var string
	 */
	protected $timeCreate;

    /**
	 * IP Create
	 * 
	 * @Column(name="ip_create", type="varchar(50)", length=50, nullable=true)
	 * @Label(content="IP Create")
	 * @MaxLength(value=50)
	 * @var string
	 */
	protected $ipCreate;
}