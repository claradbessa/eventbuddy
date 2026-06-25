<?php

use App\Http\Controllers\EventPagadorController;
use App\Http\Controllers\FornecedorDespesaController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — EventBuddy
|--------------------------------------------------------------------------
| Todas as rotas de negócio são aninhadas sob /events/{event} para garantir
| o isolamento por tenant em nível de roteamento.
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    Route::prefix('events/{event}')->middleware('event.access')->group(function () {

        Route::apiResource('payers', EventPagadorController::class)
            ->only(['index', 'store', 'destroy']);

        Route::apiResource('expenses', FornecedorDespesaController::class)
            ->only(['index', 'store', 'destroy']);
    });
});
