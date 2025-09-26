<?php

namespace Conference\Entity\Data;

use MagicObject\MagicObject;

/**
 * The Participant class represents an entity in the "participant" table.
 *
 * This entity maps to the "participant" table in the database and supports ORM (Object-Relational Mapping) operations. 
 * You can establish relationships with other entities using the JoinColumn annotation. 
 * Ensure to include the appropriate "use" statement if related entities are defined in a different namespace.
 * 
 * For detailed guidance on using the MagicObject ORM, refer to the official tutorial:
 * @link https://github.com/Planetbiru/MagicObject/blob/main/tutorial.md#orm
 * 
 * @package Conference\Entity\Data
 * @Entity
 * @JSON(propertyNamingStrategy=SNAKE_CASE, prettify=false)
 * @Table(name="participant")
 */
class Participant extends MagicObject
{
	/**
	 * Participant ID
	 * 
	 * @Id
	 * @GeneratedValue(strategy=GenerationType.UUID)
	 * @NotNull
	 * @Column(name="participant_id", type="varchar(40)", length=40, nullable=false)
	 * @Label(content="Participant ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $participantId;

	/**
	 * Name
	 * 
	 * @NotNull
	 * @Column(name="name", type="varchar(100)", length=100, nullable=false)
	 * @Label(content="Name")
	 * @MaxLength(value=100)
	 * @var string
	 */
	protected $name;

	/**
	 * Username
	 * 
	 * @NotNull
	 * @Column(name="username", type="varchar(100)", length=100, nullable=false)
	 * @Label(content="Username")
	 * @MaxLength(value=100)
	 * @var string
	 */
	protected $username;

	/**
	 * Display Name
	 * 
	 * @Column(name="display_name", type="varchar(100)", length=100, nullable=true)
	 * @Label(content="Display Name")
	 * @MaxLength(value=100)
	 * @var string
	 */
	protected $displayName;

	/**
	 * Session ID
	 * 
	 * @Column(name="session_id", type="varchar(128)", length=128, nullable=true)
	 * @Label(content="Session ID")
	 * @MaxLength(value=128)
	 * @var string
	 */
	protected $sessionId;

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