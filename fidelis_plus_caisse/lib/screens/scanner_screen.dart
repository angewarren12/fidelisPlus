import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import 'package:animate_do/animate_do.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import 'station_select_screen.dart';

class ScannerScreen extends StatefulWidget {
  final dynamic station;
  const ScannerScreen({super.key, required this.station});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final MobileScannerController _controller = MobileScannerController(formats: const [BarcodeFormat.qrCode]);
  bool _isProcessing = false;
  String? _lastScanned;
  final TextEditingController _regController = TextEditingController();
  final TextEditingController _brandController = TextEditingController();
  final TextEditingController _colorController = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    _regController.dispose();
    _brandController.dispose();
    _colorController.dispose();
    super.dispose();
  }

  Future<void> _handleScan(BarcodeCapture capture) async {
    if (_isProcessing) return;
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final String code = barcodes.first.rawValue ?? '';
    if (code.isEmpty || code == _lastScanned) return;

    setState(() {
      _isProcessing = true;
      _lastScanned = code;
    });

    try {
      final api = context.read<ApiService>();
      final res = await api.verifyLoyalty(code);

      if (!mounted) return;

      if (res['status'] == 'success') {
        _showClientDetails(res['data'], code);
      } else {
        _showError(res['message'] ?? 'QR Code invalide.');
        setState(() => _isProcessing = false);
      }
    } catch (e) {
      if (!mounted) return;
      _showError('Erreur réseau.');
      setState(() => _isProcessing = false);
    }
  }

  void _showClientDetails(dynamic client, String qrPayload) {
    _regController.clear();
    _brandController.clear();
    _colorController.clear();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => FadeInUp(
        duration: const Duration(milliseconds: 400),
        child: Container(
          decoration: BoxDecoration(
            color: AppTheme.surface.withValues(alpha: 0.9),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            border: Border.all(color: AppTheme.surfaceHighlight.withValues(alpha: 0.5)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.textSecondary.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 24),
              FadeInDown(
                delay: const Duration(milliseconds: 200),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.person, size: 48, color: AppTheme.primary),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                client['holder_name'],
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceHighlight.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  client['holder_type'].toUpperCase(),
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1),
                ),
              ),
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildStatItem('Solde actuel', '${client['points_balance']}', Icons.star_rounded),
                  _buildStatItem('Points à gagner', '+${client['points_per_scan']}', Icons.add_circle_outline),
                ],
              ),
              const SizedBox(height: 24),
              Text('VÉHICULE (VISITE TECHNIQUE)', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1, color: AppTheme.textSecondary)),
              const SizedBox(height: 12),
              TextField(
                controller: _regController,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(labelText: 'Immatriculation', isDense: true),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _brandController,
                decoration: const InputDecoration(labelText: 'Marque', isDense: true),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _colorController,
                decoration: const InputDecoration(labelText: 'Couleur', isDense: true),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => _validatePassage(qrPayload),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.success,
                    padding: const EdgeInsets.symmetric(vertical: 20),
                  ),
                  child: const Text('VALIDER LE PASSAGE'),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('ANNULER', style: TextStyle(color: AppTheme.textSecondary)),
              ),
            ],
          ),
        ),
      ),
    ).then((_) {
      setState(() {
        _isProcessing = false;
        _lastScanned = null;
      });
    });
  }

  Widget _buildStatItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: AppTheme.primary, size: 24),
        const SizedBox(height: 8),
        Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
        Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
      ],
    );
  }

  Future<void> _validatePassage(String qrPayload) async {
    final vehicleRegistration = _regController.text.trim();
    final vehicleBrand = _brandController.text.trim();
    final vehicleColor = _colorController.text.trim();
    Navigator.pop(context); // Close sheet
    setState(() => _isProcessing = true);

    try {
      final api = context.read<ApiService>();
      final idem = const Uuid().v4();
      final res = await api.scanLoyalty(
        qrPayload,
        widget.station['id'],
        idem,
        vehicleRegistration: vehicleRegistration,
        vehicleBrand: vehicleBrand,
        vehicleColor: vehicleColor,
      );

      if (!mounted) return;

      if (res['status'] == 'success') {
        _showSuccess(res['data']);
      } else {
        _showError(res['message'] ?? 'Erreur lors de la validation.');
      }
    } catch (e) {
      if (!mounted) return;
      _showError('Erreur réseau.');
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  void _showSuccess(dynamic data) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => ZoomIn(
        child: AlertDialog(
          backgroundColor: AppTheme.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(32)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle, color: AppTheme.success, size: 80),
              const SizedBox(height: 24),
              const Text('Succès !', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Text(
                '${data['points_credited']} points ont été ajoutés.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('CONTINUER'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Column(
          children: [
            const Text('VÉRIFICATION', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2)),
            Text(widget.station['name'].toUpperCase(), style: const TextStyle(fontSize: 10, color: AppTheme.primary, fontWeight: FontWeight.w900)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.swap_horiz_rounded, color: AppTheme.textSecondary),
            onPressed: () => Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (_) => const StationSelectScreen()),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _handleScan,
          ),
          // Custom Overlay
          CustomPaint(
            painter: ScannerOverlayPainter(),
            child: Container(),
          ),
          Positioned(
            top: MediaQuery.of(context).size.height * 0.2,
            left: 0,
            right: 0,
            child: Center(
              child: Column(
                children: [
                  FadeInDown(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.qr_code_scanner, color: AppTheme.primary, size: 18),
                          SizedBox(width: 10),
                          Text('SCANNEZ LA CARTE', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_isProcessing)
            Container(
              color: Colors.black.withValues(alpha: 0.4),
              child: const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
            ),
        ],
      ),
    );
  }
}

class ScannerOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withValues(alpha: 0.7)
      ..style = PaintingStyle.fill;

    final width = size.width;
    final height = size.height;
    const scanAreaSize = 260.0;
    final left = (width - scanAreaSize) / 2;
    final top = (height - scanAreaSize) / 2;

    final backgroundPath = Path()
      ..addRect(Rect.fromLTWH(0, 0, width, height))
      ..addRRect(RRect.fromRectAndRadius(
          Rect.fromLTWH(left, top, scanAreaSize, scanAreaSize),
          const Radius.circular(32)))
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(backgroundPath, paint);

    // Border
    final borderPaint = Paint()
      ..color = AppTheme.primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;

    canvas.drawRRect(
        RRect.fromRectAndRadius(
            Rect.fromLTWH(left, top, scanAreaSize, scanAreaSize),
            const Radius.circular(32)),
        borderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
