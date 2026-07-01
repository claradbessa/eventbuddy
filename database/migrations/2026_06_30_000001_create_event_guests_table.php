<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_guests', function (Blueprint $table) {
            $table->id();

            $table->foreignId('event_id')
                  ->constrained('tenants_events')
                  ->cascadeOnDelete();

            $table->string('name');
            $table->char('tier', 1)->default('B');            // A | B | C
            $table->string('status', 20)->default('pending'); // pending | confirmed | declined
            $table->string('group', 100)->nullable();
            $table->unsignedSmallInteger('accompanists_count')->default(0);

            $table->timestamps();

            $table->index(['event_id', 'tier'], 'idx_guests_event_tier');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_guests');
    }
};
