<?php

use Conference\AppInstaller;
use MagicObject\Database\PicoDatabase;
use MagicObject\Util\Database\PicoDatabaseUtil;

require __DIR__ . '/inc.lib/vendor/autoload.php';

$database = PicoDatabase::fromPdo(new PDO("sqlite:".dirname(__DIR__)."/database.db"));


$installer = new AppInstaller();
$sql = $installer->generateInstallerQuery($database, true, false);
$queries = PicoDatabaseUtil::splitSql($sql);
try
{
    foreach($queries as $query)
    {
        $query = $query['query'];
        $database->execute($query);
    }
}
catch(Exception $e)
{
    error_log($e->getMessage());
}
