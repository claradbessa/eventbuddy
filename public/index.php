<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

// Capture any stray output produced before Laravel boots (e.g. PHP 8.4 deprecated notices
// from google/apiclient aliases.php which is loaded on every request via autoload_files).
// ob_end_clean() below discards the buffer before handing control to Laravel, preventing
// "headers already sent" errors that would corrupt Inertia JSON responses.
ob_start();

define('LARAVEL_START', microtime(true));

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
ini_set('display_errors', '0');

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Discard any stray vendor output captured since ob_start() above.
ob_end_clean();

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
