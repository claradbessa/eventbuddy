<?php

use App\Console\Commands\SendInstallmentReminders;
use App\Console\Commands\SendTaskReminders;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule): void {
        // Lembretes de parcelas de fornecedores (1 e 3 dias antes) — 08:00
        $schedule->command(SendInstallmentReminders::class)->dailyAt('08:00');
        // Lembretes de tarefas de checklist (3 e 5 dias antes) — 08:30
        $schedule->command(SendTaskReminders::class)->dailyAt('08:30');
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'event.access' => \App\Http\Middleware\EnsureEventAccess::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
