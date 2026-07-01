<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lista de Recepção — {{ $evento->name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1e293b; }

        .header { padding: 20px 24px 16px; border-bottom: 2px solid #0d9488; margin-bottom: 16px; }
        .header h1 { font-size: 18px; font-weight: 700; color: #0f172a; }
        .header .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; }
        .header .meta { font-size: 10px; color: #94a3b8; margin-top: 2px; }

        .content { padding: 0 24px; }

        table { width: 100%; border-collapse: collapse; }
        thead tr { background-color: #f0fdfa; }
        thead th {
            padding: 7px 10px;
            text-align: left;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #0d9488;
            border-bottom: 2px solid #ccfbf1;
        }

        tbody tr { border-bottom: 1px solid #f1f5f9; }
        tbody tr:nth-child(even) { background-color: #fafafa; }
        tbody td { padding: 7px 10px; vertical-align: middle; }

        .col-check { width: 28px; }
        .col-check .box {
            display: inline-block;
            width: 14px; height: 14px;
            border: 1.5px solid #94a3b8;
            border-radius: 3px;
        }

        .col-name { font-weight: 600; color: #0f172a; }
        .col-meta { font-size: 10px; color: #64748b; margin-top: 1px; }
        .col-companions { color: #475569; font-size: 10px; }

        .badge { display: inline-block; padding: 2px 7px; border-radius: 20px; font-size: 9px; font-weight: 600; }
        .badge-confirmed { background: #dcfce7; color: #15803d; }
        .badge-declined  { background: #fee2e2; color: #b91c1c; }
        .badge-pending   { background: #fef9c3; color: #854d0e; }

        .footer { margin-top: 16px; padding: 10px 24px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Lista de Recepção</h1>
        <div class="subtitle">{{ $evento->name }}</div>
        @php $totalPessoas = $guests->sum(fn ($g) => 1 + $g->accompanists_count); @endphp
        <div class="meta">
            Gerado em {{ now()->format('d/m/Y \à\s H:i') }}
            &bull; {{ $totalPessoas }} pessoas em ordem alfabética
        </div>
    </div>

    <div class="content">
        <table>
            <thead>
                <tr>
                    <th class="col-check"></th>
                    <th>Nome</th>
                    <th>Acompanhantes</th>
                    <th>Convidado de</th>
                    <th>Mesa</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($guests as $guest)
                    <tr>
                        <td class="col-check"><span class="box"></span></td>
                        <td>
                            <div class="col-name">{{ $guest->name }}</div>
                            @if ($guest->group)
                                <div class="col-meta">{{ $guest->group }}</div>
                            @endif
                        </td>
                        <td class="col-companions">
                            @if ($guest->companion_names)
                                @php
                                    $names = collect($guest->companion_names)
                                        ->map(fn ($c) => is_array($c) ? ($c['name'] ?? '') : (string) $c)
                                        ->filter()
                                        ->join(', ');
                                @endphp
                                {{ $names ?: ($guest->accompanists_count > 0 ? '+' . $guest->accompanists_count : '—') }}
                            @elseif ($guest->accompanists_count > 0)
                                +{{ $guest->accompanists_count }}
                            @else
                                —
                            @endif
                        </td>
                        <td>{{ $guest->invited_by ?? '—' }}</td>
                        <td>{{ $guest->table_number ? 'Mesa ' . $guest->table_number : '—' }}</td>
                        <td>
                            @php
                                $status = match ($guest->status) {
                                    'confirmed' => ['label' => 'Confirmado', 'class' => 'badge-confirmed'],
                                    'declined'  => ['label' => 'Recusou',    'class' => 'badge-declined'],
                                    default     => ['label' => 'Pendente',   'class' => 'badge-pending'],
                                };
                            @endphp
                            <span class="badge {{ $status['class'] }}">{{ $status['label'] }}</span>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="footer">
        <span>EventBuddy — Lista de Recepção</span>
        <span>{{ $evento->name }}</span>
    </div>
</body>
</html>
