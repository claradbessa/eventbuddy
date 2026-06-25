<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fornecedores_despesas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('tenants_events')->cascadeOnDelete();
            $table->foreignId('pagador_id')->constrained('event_pagadores')->restrictOnDelete();
            $table->string('fornecedor_nome');
            $table->string('categoria');
            $table->text('descricao')->nullable();
            $table->decimal('valor_total', 12, 2);
            $table->unsignedTinyInteger('num_parcelas')->default(1);
            $table->unsignedTinyInteger('parcela_atual')->default(1);
            $table->date('data_vencimento')->nullable();
            $table->date('data_pagamento')->nullable();
            $table->enum('status_pagamento', ['pendente', 'pago', 'atrasado', 'cancelado'])->default('pendente');
            $table->string('comprovante_url')->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fornecedores_despesas');
    }
};
