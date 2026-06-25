<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fornecedores_despesas', function (Blueprint $table) {
            // Pagador único vira pivot em despesa_pagadores
            $table->dropForeign(['pagador_id']);
            $table->dropColumn('pagador_id');

            // Parcelamento vira registros em parcelas_despesas
            $table->dropColumn(['num_parcelas', 'parcela_atual', 'data_vencimento', 'data_pagamento', 'status_pagamento']);
        });
    }

    public function down(): void
    {
        Schema::table('fornecedores_despesas', function (Blueprint $table) {
            $table->foreignId('pagador_id')
                ->after('event_id')
                ->constrained('event_pagadores')
                ->restrictOnDelete();

            $table->unsignedTinyInteger('num_parcelas')->default(1)->after('valor_total');
            $table->unsignedTinyInteger('parcela_atual')->default(1)->after('num_parcelas');
            $table->date('data_vencimento')->nullable()->after('parcela_atual');
            $table->date('data_pagamento')->nullable()->after('data_vencimento');
            $table->enum('status_pagamento', ['pendente', 'pago', 'atrasado', 'cancelado'])
                ->default('pendente')
                ->after('data_pagamento');
        });
    }
};
