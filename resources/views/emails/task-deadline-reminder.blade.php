<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lembrete de Tarefa — EventBuddy</title>
</head>
<body style="margin:0;padding:0;background:#f8f7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8f7f4;padding:48px 20px;">
<tr><td align="center">

  <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">

    {{-- Faixa superior --}}
    <tr>
      <td style="height:4px;background:#0f172a;font-size:0;line-height:0;">&nbsp;</td>
    </tr>

    {{-- Logo --}}
    <tr>
      <td style="padding:32px 40px 0;">
        <table cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="background:#0f172a;border-radius:10px;padding:7px 16px;">
              <span style="color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.06em;">EventBuddy</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    {{-- Corpo --}}
    <tr>
      <td style="padding:28px 40px 36px;">

        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
          Prazo se aproximando ⏰
        </h1>
        <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.65;">
          Olá, <strong style="color:#0f172a;">{{ $userName }}</strong>! Uma tarefa do
          <strong style="color:#0f172a;">{{ $eventName }}</strong> precisa da sua atenção.
        </p>

        {{-- Card da tarefa --}}
        @php
          [$borderColor, $badgeBg, $badgeColor, $priorityLabel] = match ($task->priority) {
            'alta'  => ['#f43f5e', '#fff1f2', '#e11d48', 'Alta'],
            'media' => ['#f59e0b', '#fffbeb', '#d97706', 'Média'],
            default => ['#94a3b8', '#f8fafc', '#94a3b8', 'Baixa'],
          };
          $urgencyColor = $daysUntil <= 3 ? '#e11d48' : '#d97706';
        @endphp

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="border:1px solid #e2e8f0;border-left:4px solid {{ $borderColor }};border-radius:12px;margin-bottom:32px;">
          <tr>
            <td style="padding:20px 24px;">

              {{-- Badge de prioridade --}}
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:12px;">
                <tr>
                  <td style="background:{{ $badgeBg }};color:{{ $badgeColor }};font-size:10px;font-weight:700;
                              letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:20px;">
                    {{ $priorityLabel }}
                  </td>
                </tr>
              </table>

              {{-- Título --}}
              <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:#0f172a;line-height:1.4;">
                {{ $task->title }}
              </p>

              {{-- Vencimento --}}
              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
                📅 Vence em <strong style="color:#475569;">{{ $due }}</strong>
                &nbsp;&middot;&nbsp;
                <strong style="color:{{ $urgencyColor }};">
                  {{ $daysUntil }} {{ $daysUntil === 1 ? 'dia restante' : 'dias restantes' }}
                </strong>
              </p>

            </td>
          </tr>
        </table>

        {{-- Botão CTA --}}
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
          <tr>
            <td style="background:#0f172a;border-radius:12px;">
              <a href="{{ $url }}"
                 style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;
                        font-weight:600;text-decoration:none;letter-spacing:0.01em;">
                Ver Checklist &rarr;
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.65;">
          Mantenha seu planejamento em dia e garanta um evento inesquecível.
        </p>

      </td>
    </tr>

    {{-- Separador --}}
    <tr>
      <td style="height:1px;background:#f1f5f9;font-size:0;line-height:0;">&nbsp;</td>
    </tr>

    {{-- Footer --}}
    <tr>
      <td style="padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#cbd5e1;line-height:1.6;">
          Você recebeu este e-mail porque possui tarefas cadastradas no EventBuddy.<br>
          <a href="{{ config('app.url') }}" style="color:#94a3b8;text-decoration:none;">
            {{ config('app.url') }}
          </a>
        </p>
      </td>
    </tr>

  </table>

</td></tr>
</table>

</body>
</html>
