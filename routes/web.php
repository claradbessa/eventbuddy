<?php

use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\ChecklistController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EventExpensesController;
use App\Http\Controllers\EventPagadorController;
use App\Http\Controllers\GuestController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Models\TenantEvent;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin'       => Route::has('login'),
        'canRegister'    => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion'     => PHP_VERSION,
    ]);
});

// Redireciona /dashboard → evento do utilizador (cria o evento se for o primeiro acesso)
Route::get('/dashboard', function () {
    $user   = auth()->user();
    $evento = TenantEvent::firstOrCreate(
        ['owner_id' => $user->id],
        [
            'name'   => 'Meu Evento',
            'slug'   => Str::slug($user->name . '-' . $user->id),
            'status' => 'ativo',
        ]
    );
    return redirect()->route('evento.dashboard', $evento);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/profile/event-reset', [ProfileController::class, 'resetEvent'])->name('profile.event-reset');

    // ── Notificações ──────────────────────────────────────────────────────────
    Route::get('/notifications',              [NotificationController::class, 'index'])->name('notifications.index');
    Route::patch('/notifications/read-all',   [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::patch('/notifications/{id}/read',  [NotificationController::class, 'markRead'])->name('notifications.read');

    // ── Rotas com escopo de evento (slug) ─────────────────────────────────────
    Route::prefix('{evento:slug}')->group(function () {

        Route::get('/dashboard',           DashboardController::class)->name('evento.dashboard');
        Route::post('/onboarding/skip',    [DashboardController::class, 'skipOnboarding'])->name('onboarding.skip');

        // ── Checklist ─────────────────────────────────────────────────────────
        Route::get('/checklist',                       [ChecklistController::class, 'index'])->name('checklist.index');
        Route::post('/checklist',                      [ChecklistController::class, 'store'])->name('checklist.store');
        Route::patch('/checklist/{task}/toggle',       [ChecklistController::class, 'toggle'])->name('checklist.toggle');
        Route::delete('/checklist/{task}',             [ChecklistController::class, 'destroy'])->name('checklist.destroy');

        Route::get('/fornecedores',  [EventExpensesController::class, 'index'])->name('fornecedores.index');
        Route::post('/fornecedores', [EventExpensesController::class, 'store'])->name('fornecedores.store');

        Route::patch('/fornecedores/{fornecedor}',  [EventExpensesController::class, 'update'])->name('fornecedores.update');
        Route::delete('/fornecedores/{fornecedor}', [EventExpensesController::class, 'destroy'])->name('fornecedores.destroy');

        Route::post('/pagadores', [EventPagadorController::class, 'store'])->name('pagadores.store');

        // ── Convidados ────────────────────────────────────────────────────────
        Route::get('/convidados',                          [GuestController::class, 'index'])->name('guests.index');
        Route::post('/convidados',                         [GuestController::class, 'store'])->name('guests.store');
        Route::patch('/convidados/max-guests',             [GuestController::class, 'updateMaxGuests'])->name('guests.max-guests');
        Route::delete('/convidados/bulk',                  [GuestController::class, 'bulkDestroy'])->name('guests.bulk-destroy');
        // Export routes — must stay before {guest} to avoid model-binding conflict
        Route::get('/convidados/export/csv',               [GuestController::class, 'exportCsv'])->name('guests.export.csv');
        Route::get('/convidados/export/reception-pdf',     [GuestController::class, 'exportReceptionPdf'])->name('guests.export.reception-pdf');
        Route::get('/convidados/export/seating-pdf',       [GuestController::class, 'exportSeatingPdf'])->name('guests.export.seating-pdf');
        Route::patch('/convidados/{guest}',                [GuestController::class, 'update'])->name('guests.update');
        Route::patch('/convidados/{guest}/status',         [GuestController::class, 'updateStatus'])->name('guests.status');
        Route::delete('/convidados/{guest}',               [GuestController::class, 'destroy'])->name('guests.destroy');

        Route::patch(
            '/fornecedores/{fornecedor}/parcelas/{parcela}',
            [EventExpensesController::class, 'payParcela']
        )->name('parcelas.pagar');

        Route::patch(
            '/fornecedores/{fornecedor}/parcelas/{parcela}/toggle',
            [EventExpensesController::class, 'toggleParcela']
        )->name('parcelas.toggle');
    });
});

Route::get('/auth/google',          [GoogleController::class, 'redirect'])->name('auth.google');
Route::get('/auth/google/callback', [GoogleController::class, 'callback'])->name('auth.google.callback');

// Google Calendar — conexão pós-login para utilizadores com conta e-mail
Route::middleware('auth')->group(function () {
    Route::get('/auth/google/calendar',          [GoogleController::class, 'calendarRedirect'])->name('auth.google.calendar');
    Route::get('/auth/google/calendar/callback', [GoogleController::class, 'calendarCallback'])->name('auth.google.calendar.callback');
    Route::delete('/auth/google/calendar',       [GoogleController::class, 'calendarDisconnect'])->name('auth.google.calendar.disconnect');
});

require __DIR__.'/auth.php';
