<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_guests', function (Blueprint $table): void {
            $table->json('companion_names')->nullable()->after('invited_by');
        });
    }

    public function down(): void
    {
        Schema::table('event_guests', function (Blueprint $table): void {
            $table->dropColumn('companion_names');
        });
    }
};
