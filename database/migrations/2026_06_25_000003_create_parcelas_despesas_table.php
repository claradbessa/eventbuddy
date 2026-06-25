<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parcelas_despesas', function (Blueprint $table) {
            $table->id();

            // Isolamento por tenant
            $table->foreignId('event_id')
                ->constrained('tenants_events')
                ->cascadeOnDelete();

            $table->foreignId('despesa_id')
                ->constrained('fornecedores_despesas')
                ->cascadeOnDelete();

            $table->unsignedTinyInteger('numero_parcela');
            $table->decimal('valor_parcela', 12, 2);
            $table->date('data_vencimento');
            $table->date('data_pagamento')->nullable();

            $table->enum('status', ['pendente', 'pago', 'atrasado', 'cancelado'])
                ->default('pendente');

            // Comprovante por parcela (ex: recibo de cada boleto pago)
            $table->string('comprovante_url')->nullable();
            $table->text('observacoes')->nullable();

            $table->timestamps();

            // Número de parcela único por despesa
            $table->unique(['despesa_id', 'numero_parcela']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parcelas_despesas');
    }
};
