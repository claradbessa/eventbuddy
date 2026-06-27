<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fornecedores_despesas', function (Blueprint $table) {
            $table->string('pix_key')->nullable()->after('observacoes');
            $table->text('pix_copia_e_cola')->nullable()->after('pix_key');
        });
    }

    public function down(): void
    {
        Schema::table('fornecedores_despesas', function (Blueprint $table) {
            $table->dropColumn(['pix_key', 'pix_copia_e_cola']);
        });
    }
};
