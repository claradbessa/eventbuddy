<?php

use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\EventExpensesController;
use App\Http\Controllers\EventPagadorController;
use App\Http\Controllers\ProfileController;
use App\Models\TenantEvent;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin'       => Route::has('login'),
        'canRegister'    => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion'     => PHP_VERSION,
    ]);
});

// Redireciona /dashboard para o evento do utilizador autenticado
Route::get('/dashboard', function () {
    $evento = TenantEvent::where('owner_id', auth()->id())->orderBy('id')->first();
    return $evento
        ? redirect()->route('evento.dashboard', $evento)
        : Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // ── Rotas com escopo de evento (slug) ─────────────────────────────────────
    Route::prefix('{evento:slug}')->group(function () {

        Route::get('/dashboard', function (TenantEvent $evento) {
            if ($evento->owner_id !== auth()->id()) abort(403);
            return Inertia::render('Dashboard', [
                'event' => $evento->only(['id', 'name', 'slug', 'status', 'data_inicio', 'data_fim']),
            ]);
        })->name('evento.dashboard');

        Route::get('/fornecedores',  [EventExpensesController::class, 'index'])->name('fornecedores.index');
        Route::post('/fornecedores', [EventExpensesController::class, 'store'])->name('fornecedores.store');

        Route::patch('/fornecedores/{fornecedor}',  [EventExpensesController::class, 'update'])->name('fornecedores.update');
        Route::delete('/fornecedores/{fornecedor}', [EventExpensesController::class, 'destroy'])->name('fornecedores.destroy');

        Route::post('/pagadores', [EventPagadorController::class, 'store'])->name('pagadores.store');

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

Route::get('/auth/google', [GoogleController::class, 'redirect'])->name('auth.google');
Route::get('/auth/google/callback', [GoogleController::class, 'callback'])->name('auth.google.callback');

require __DIR__.'/auth.php';
