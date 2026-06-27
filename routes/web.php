<?php

use App\Http\Controllers\EventExpensesController;
use App\Http\Controllers\EventPagadorController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/events/{event}/expenses', [EventExpensesController::class, 'index'])
        ->name('expenses.index');
    Route::post('/events/{event}/expenses', [EventExpensesController::class, 'store'])
        ->name('expenses.store');
    Route::patch('/events/{event}/expenses/{expense}', [EventExpensesController::class, 'update'])
        ->name('expenses.update');
    Route::delete('/events/{event}/expenses/{expense}', [EventExpensesController::class, 'destroy'])
        ->name('expenses.destroy');

    Route::post('/events/{event}/payers', [EventPagadorController::class, 'store'])
        ->middleware('event.access')
        ->name('payers.store');

    Route::patch('/events/{event}/expenses/{expense}/parcelas/{parcela}', [EventExpensesController::class, 'payParcela'])
        ->name('parcelas.pay');
});

require __DIR__.'/auth.php';
