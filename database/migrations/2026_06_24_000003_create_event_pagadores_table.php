<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_pagadores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('tenants_events')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('nome');
            $table->string('email')->nullable();
            $table->enum('tipo', ['interno', 'externo'])->default('interno');
            $table->decimal('percentual_responsabilidade', 5, 2)->nullable();
            $table->enum('status', ['ativo', 'inativo'])->default('ativo');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_pagadores');
    }
};
