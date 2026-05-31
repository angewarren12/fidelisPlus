import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import 'package:intl/intl.dart';
import '../core/api_service.dart';
import '../core/theme.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<dynamic> _history = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final api = context.read<ApiService>();
      final res = await api.getHistory();
      if (res['status'] == 'success') {
        setState(() {
          _history = res['data'] ?? [];
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Erreur lors du chargement de l\'historique.';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Erreur réseau.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('HISTORIQUE DES SCANS', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: AppTheme.error)))
              : _history.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.history_rounded, size: 64, color: AppTheme.textSecondary.withValues(alpha: 0.3)),
                          const SizedBox(height: 16),
                          const Text('Aucun scan effectué aujourd\'hui', style: TextStyle(color: AppTheme.textSecondary)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadHistory,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(24),
                        itemCount: _history.length,
                        itemBuilder: (context, index) {
                          final event = _history[index];
                          final account = event['loyalty_account'] ?? {};
                          final holderName = account['holder_type'] == 'company' 
                              ? (account['company']?['name'] ?? 'Société')
                              : (account['user'] != null 
                                  ? '${account['user']['first_name']} ${account['user']['last_name']}'
                                  : 'Client');
                          
                          final date = DateTime.parse(event['created_at']).toLocal();
                          final timeStr = DateFormat('HH:mm').format(date);
                          final dateStr = DateFormat('dd/MM/yyyy').format(date);

                          return FadeInLeft(
                            delay: Duration(milliseconds: 50 * index),
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 16),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppTheme.surface.withValues(alpha: 0.6),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: AppTheme.surfaceHighlight.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: AppTheme.success.withValues(alpha: 0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.qr_code_2_rounded, color: AppTheme.success, size: 24),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(holderName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                        Text('$dateStr à $timeStr', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        '+${event['points_credited']}',
                                        style: const TextStyle(color: AppTheme.success, fontWeight: FontWeight.bold, fontSize: 18),
                                      ),
                                      const Text('PTS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
