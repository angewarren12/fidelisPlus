import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import '../core/api_service.dart';
import '../core/theme.dart';

/// Écran caisse : la caissière inscrit un client particulier au guichet, puis
/// scanne une carte vierge déjà imprimée pour la lui remettre immédiatement.
class NewClientScreen extends StatefulWidget {
  const NewClientScreen({super.key});

  @override
  State<NewClientScreen> createState() => _NewClientScreenState();
}

enum _Step { form, scan }

class _NewClientScreenState extends State<NewClientScreen> {
  final _formKey = GlobalKey<FormState>();
  final _prenomController = TextEditingController();
  final _nomController = TextEditingController();
  final _contactController = TextEditingController();
  final MobileScannerController _scannerController = MobileScannerController(formats: const [BarcodeFormat.qrCode]);

  _Step _step = _Step.form;
  bool _isSubmitting = false;
  bool _isAssigning = false;
  int? _createdMemberId;
  String? _createdMemberLabel;

  @override
  void dispose() {
    _prenomController.dispose();
    _nomController.dispose();
    _contactController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);

    try {
      final api = context.read<ApiService>();
      final res = await api.createLoyaltyMember(
        nom: _nomController.text.trim(),
        prenom: _prenomController.text.trim(),
        contact: _contactController.text.trim(),
      );

      if (!mounted) return;

      if (res['status'] == 'success') {
        final member = res['data']['member'];
        setState(() {
          _createdMemberId = member['id'];
          _createdMemberLabel = '${member['prenom']} ${member['nom']}';
          _step = _Step.scan;
          _isSubmitting = false;
        });
      } else {
        _showError(res['message'] ?? 'Erreur lors de la création du client.');
        setState(() => _isSubmitting = false);
      }
    } catch (e) {
      if (!mounted) return;
      _showError('Erreur réseau.');
      setState(() => _isSubmitting = false);
    }
  }

  Future<void> _handleCardScan(BarcodeCapture capture) async {
    if (_isAssigning || _createdMemberId == null) return;
    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    final code = barcodes.first.rawValue ?? '';
    if (code.isEmpty) return;

    setState(() => _isAssigning = true);

    try {
      final api = context.read<ApiService>();
      final res = await api.assignLoyaltyCard(_createdMemberId!, code);

      if (!mounted) return;

      if (res['status'] == 'success') {
        final account = res['data']['loyalty_account'];
        _showSuccess(account?['card_number']?.toString() ?? '');
      } else {
        _showError(res['message'] ?? 'Cette carte ne peut pas être associée.');
        setState(() => _isAssigning = false);
      }
    } catch (e) {
      if (!mounted) return;
      _showError('Erreur réseau.');
      setState(() => _isAssigning = false);
    }
  }

  void _showSuccess(String cardNumber) {
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
              const Text('Carte remise !', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Text(
                cardNumber.isNotEmpty
                    ? '${_createdMemberLabel ?? "Le client"} a maintenant la carte $cardNumber.'
                    : 'La carte a été associée au client.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _resetToForm();
                  },
                  child: const Text('NOUVEAU CLIENT'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _resetToForm() {
    _prenomController.clear();
    _nomController.clear();
    _contactController.clear();
    setState(() {
      _step = _Step.form;
      _createdMemberId = null;
      _createdMemberLabel = null;
      _isAssigning = false;
    });
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
      appBar: AppBar(
        title: const Text('NOUVEAU CLIENT', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2)),
      ),
      body: _step == _Step.form ? _buildForm() : _buildScanStep(),
    );
  }

  Widget _buildForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: FadeInUp(
        duration: const Duration(milliseconds: 300),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.person_add_alt_1_rounded, size: 48, color: AppTheme.primary),
              ),
              const SizedBox(height: 20),
              Text('Inscrire un client particulier', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 6),
              const Text(
                'Le client reçoit sa carte fidélité immédiatement après la création.',
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 28),
              TextFormField(
                controller: _prenomController,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Prénom'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Champ obligatoire' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _nomController,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Nom'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Champ obligatoire' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _contactController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Téléphone'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Champ obligatoire' : null,
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitForm,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20, height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('CRÉER LE CLIENT'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildScanStep() {
    return Stack(
      children: [
        MobileScanner(
          controller: _scannerController,
          onDetect: _handleCardScan,
        ),
        Positioned(
          top: 24,
          left: 24,
          right: 24,
          child: FadeInDown(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _createdMemberLabel ?? '',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Scannez une carte vierge à remettre au client',
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
        ),
        Positioned(
          bottom: 32,
          left: 24,
          right: 24,
          child: TextButton(
            onPressed: _isAssigning ? null : _resetToForm,
            style: TextButton.styleFrom(
              backgroundColor: Colors.black.withValues(alpha: 0.6),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: const Text('ASSOCIER PLUS TARD', style: TextStyle(color: Colors.white)),
          ),
        ),
        if (_isAssigning)
          Container(
            color: Colors.black.withValues(alpha: 0.5),
            child: const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
          ),
      ],
    );
  }
}
