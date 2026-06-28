<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_checklist_tasks', function (Blueprint $table) {
            $table->id();

            $table->foreignId('event_id')
                  ->constrained('tenants_events')
                  ->cascadeOnDelete();

            $table->string('title');
            $table->string('status', 20)->default('pendente');   // pendente | em_andamento | concluido
            $table->string('priority', 20)->nullable();           // alta | media | baixa
            $table->date('due_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->smallInteger('order')->default(0);

            $table->timestamps();

            $table->index(['event_id', 'status'], 'idx_checklist_event_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_checklist_tasks');
    }
};
