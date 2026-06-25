<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('despesa_pagadores', function (Blueprint $table) {
            $table->id();

            // Isolamento por tenant
            $table->foreignId('event_id')
                ->constrained('tenants_events')
                ->cascadeOnDelete();

            $table->foreignId('despesa_id')
                ->constrained('fornecedores_despesas')
                ->cascadeOnDelete();

            $table->foreignId('pagador_id')
                ->constrained('event_pagadores')
                ->restrictOnDelete();

            // Divisão: preencher percentual OU valor; a validação fica na camada de negócio
            $table->decimal('percentual', 5, 2)->nullable()->comment('0.00–100.00');
            $table->decimal('valor', 12, 2)->nullable()->comment('Valor absoluto se preferir split por valor');

            $table->timestamps();

            // Um pagador aparece apenas uma vez por despesa
            $table->unique(['despesa_id', 'pagador_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('despesa_pagadores');
    }
};
