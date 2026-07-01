<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_guests', function (Blueprint $table): void {
            $table->string('special_role', 50)->nullable()->after('group');
        });
    }

    public function down(): void
    {
        Schema::table('event_guests', function (Blueprint $table): void {
            $table->dropColumn('special_role');
        });
    }
};
