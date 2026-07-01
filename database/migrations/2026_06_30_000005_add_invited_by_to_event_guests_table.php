<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_guests', function (Blueprint $table): void {
            $table->string('invited_by', 100)->nullable()->after('table_number');
        });
    }

    public function down(): void
    {
        Schema::table('event_guests', function (Blueprint $table): void {
            $table->dropColumn('invited_by');
        });
    }
};
