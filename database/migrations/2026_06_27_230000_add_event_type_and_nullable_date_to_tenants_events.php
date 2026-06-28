<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants_events', function (Blueprint $table) {
            $table->string('event_type')->nullable()->after('name');
            // data_inicio já existe mas era obrigatório — tornar opcional
            $table->date('data_inicio')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('tenants_events', function (Blueprint $table) {
            $table->dropColumn('event_type');
            $table->date('data_inicio')->nullable(false)->change();
        });
    }
};
