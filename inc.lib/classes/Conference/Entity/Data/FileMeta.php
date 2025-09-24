<?php

namespace Conference\Entity\Data;

use MagicObject\MagicObject;

/**
 * The FileMeta class represents an entity in the "file_meta" table.
 *
 * This entity maps to the "file_meta" table in the database and supports ORM (Object-Relational Mapping) operations. 
 * You can establish relationships with other entities using the JoinColumn annotation. 
 * Ensure to include the appropriate "use" statement if related entities are defined in a different namespace.
 * 
 * For detailed guidance on using the MagicObject ORM, refer to the official tutorial:
 * @link https://github.com/Planetbiru/MagicObject/blob/main/tutorial.md#orm
 * 
 * @package Conference\Entity\Data
 * @Entity
 * @JSON(propertyNamingStrategy=SNAKE_CASE, prettify=false)
 * @Table(name="file_meta")
 */
class FileMeta extends MagicObject
{
	/**
	 * File Meta ID
	 * 
	 * @Id
	 * @GeneratedValue(strategy=GenerationType.UUID)
	 * @NotNull
	 * @Column(name="file_meta_id", type="varchar(40)", length=40, nullable=false)
	 * @Label(content="File Meta ID")
	 * @MaxLength(value=40)
	 * @var string
	 */
	protected $fileMetaId;

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
	 * File Extension
	 * 
	 * @Column(name="file_extension", type="varchar(20)", length=20, nullable=true)
	 * @Label(content="File Extension")
	 * @MaxLength(value=20)
	 * @var string
	 */
	protected $fileExtension;

	/**
	 * Mime Type
	 * 
	 * @Column(name="mime_type", type="varchar(200)", length=200, nullable=true)
	 * @Label(content="Mime Type")
	 * @MaxLength(value=200)
	 * @var string
	 */
	protected $mimeType;

	/**
	 * Real Path
	 * 
	 * @Column(name="real_path", type="varchar(2000)", length=2000, nullable=true)
	 * @Label(content="Real Path")
	 * @MaxLength(value=2000)
	 * @var string
	 */
	protected $realPath;

	/**
	 * Total Size
	 * 
	 * @Column(name="total_size", type="bigint(20)", length=20, nullable=true)
	 * @Label(content="Total Size")
	 * @var int
	 */
	protected $totalSize;

	/**
	 * Checksum Sha256
	 * 
	 * @Column(name="checksum_sha256", type="char(64)", length=64, nullable=true)
	 * @Label(content="Checksum Sha256")
	 * @MaxLength(value=64)
	 * @var string
	 */
	protected $checksumSha256;

	/**
	 * Chunk Size
	 * 
	 * @Column(name="chunk_size", type="bigint(20)", length=20, defaultValue="1", nullable=true)
	 * @DefaultColumn(value="1")
	 * @Label(content="Chunk Size")
	 * @var int
	 */
	protected $chunkSize;

	/**
	 * Complete
	 * 
	 * @Column(name="complete", type="tinyint(1)", length=1, defaultValue="0", nullable=true)
	 * @Label(content="Complete")
	 * @var bool
	 */
	protected $complete;

	/**
	 * Realtime
	 * 
	 * @Column(name="realtime", type="tinyint(1)", length=1, defaultValue="0", nullable=true)
	 * @Label(content="Realtime")
	 * @var bool
	 */
	protected $realtime;

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