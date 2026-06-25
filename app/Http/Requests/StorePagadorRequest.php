<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePagadorRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autorização de tenant feita pelo middleware EnsureEventAccess
        return true;
    }

    public function rules(): array
    {
        return [
            'nome'                        => ['required', 'string', 'max:150'],
            'email'                       => ['nullable', 'email', 'max:255'],
            'tipo'                        => ['required', 'in:interno,externo'],
            'percentual_responsabilidade' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    public function attributes(): array
    {
        return [
            'nome'                        => 'nome do pagador',
            'tipo'                        => 'tipo (interno/externo)',
            'percentual_responsabilidade' => 'percentual de responsabilidade',
        ];
    }
}
