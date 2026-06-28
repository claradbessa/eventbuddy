<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('google_token_expires_at')->nullable()->after('google_refresh_token');
        });

        // Limpa tokens existentes sem criptografia para evitar falhas de decrypt
        DB::table('users')->whereNotNull('google_token')->update([
            'google_token'         => null,
            'google_refresh_token' => null,
        ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('google_token_expires_at');
        });
    }
};
