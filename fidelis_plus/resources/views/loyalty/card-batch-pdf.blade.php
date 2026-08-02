<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 0; }
    body { margin: 0; padding: 0; }
    .card {
        position: relative;
        width: 242.65pt;
        height: 153.07pt;
        overflow: hidden;
        page-break-after: always;
    }
    .card:last-child { page-break-after: auto; }
    .card img.bg {
        position: absolute;
        top: 0; left: 0;
        width: 100%;
        height: 100%;
    }
    .card img.qr {
        position: absolute;
        background: #fff;
        padding: 2pt;
    }
    .card .card-number {
        position: absolute;
        font-family: 'Courier New', monospace;
        font-weight: bold;
    }
</style>
</head>
<body>
@foreach ($items as $item)
    <div class="card">
        @if ($backgroundDataUri)
            <img class="bg" src="{{ $backgroundDataUri }}">
        @endif
        <img class="qr"
             src="{{ $item['qr_data_uri'] }}"
             style="left: {{ $layout['qr_x'] }}%; top: {{ $layout['qr_y'] }}%; width: {{ $layout['qr_size'] }}%;">
        <div class="card-number"
             style="left: {{ $layout['card_number_x'] }}%; top: {{ $layout['card_number_y'] }}%; color: {{ $layout['card_number_color'] }}; font-size: {{ $layout['card_number_size'] }}px;">
            N° {{ $item['card_number'] }}
        </div>
    </div>
@endforeach
</body>
</html>
