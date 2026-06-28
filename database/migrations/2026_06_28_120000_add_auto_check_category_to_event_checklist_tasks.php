<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_checklist_tasks', function (Blueprint $table) {
            $table->string('auto_check_category', 50)->nullable()->after('order');
            $table->index(['event_id', 'auto_check_category'], 'idx_checklist_auto_check');
        });
    }

    public function down(): void
    {
        Schema::table('event_checklist_tasks', function (Blueprint $table) {
            $table->dropIndex('idx_checklist_auto_check');
            $table->dropColumn('auto_check_category');
        });
    }
};
