import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import 'home_screen.dart';

class StationSelectScreen extends StatefulWidget {
  const StationSelectScreen({super.key});

  @override
  State<StationSelectScreen> createState() => _StationSelectScreenState();
}

class _StationSelectScreenState extends State<StationSelectScreen> {
  List<dynamic> _stations = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadStations();
  }

  Future<void> _loadStations() async {
    try {
      final api = context.read<ApiService>();
      final res = await api.getStations();
      if (res['status'] == 'success') {
        setState(() {
          _stations = res['data'] ?? [];
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Impossible de charger les stations.';
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

  void _selectStation(dynamic station) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => HomeScreen(station: station)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppTheme.background, Color(0xFF1E1B4B)],
          ),
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    FadeInLeft(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Bonjour 👋', style: Theme.of(context).textTheme.bodyLarge),
                          Text('Choisissez votre station', style: Theme.of(context).textTheme.headlineSmall),
                        ],
                      ),
                    ),
                    FadeInRight(
                      child: GestureDetector(
                        onTap: () async {
                          await context.read<ApiService>().clearAuth();
                          if (!context.mounted) return;
                          Navigator.of(context).pushReplacementNamed('/');
                        },
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.surface.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.surfaceHighlight.withValues(alpha: 0.3)),
                          ),
                          child: const Icon(Icons.logout_rounded, color: AppTheme.error, size: 20),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                    : _error != null
                        ? Center(child: Text(_error!, style: const TextStyle(color: AppTheme.error)))
                        : FadeInUp(
                            child: ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 24),
                              itemCount: _stations.length,
                              itemBuilder: (context, index) {
                                final station = _stations[index];
                                return FadeInUp(
                                  delay: Duration(milliseconds: 100 * index),
                                  child: Container(
                                    margin: const EdgeInsets.only(bottom: 16),
                                    decoration: BoxDecoration(
                                      color: AppTheme.surface.withValues(alpha: 0.6),
                                      borderRadius: BorderRadius.circular(24),
                                      border: Border.all(color: AppTheme.surfaceHighlight.withValues(alpha: 0.2)),
                                    ),
                                    child: ListTile(
                                      contentPadding: const EdgeInsets.all(20),
                                      leading: Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          gradient: const LinearGradient(
                                            colors: [AppTheme.primary, AppTheme.primaryDark],
                                          ),
                                          borderRadius: BorderRadius.circular(16),
                                          boxShadow: [
                                            BoxShadow(
                                              color: AppTheme.primary.withValues(alpha: 0.3),
                                              blurRadius: 10,
                                              offset: const Offset(0, 4),
                                            ),
                                          ],
                                        ),
                                        child: const Icon(Icons.local_gas_station_rounded, color: Colors.white),
                                      ),
                                      title: Text(
                                        station['name'],
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                                      ),
                                      subtitle: Padding(
                                        padding: const EdgeInsets.only(top: 4),
                                        child: Text(
                                          station['location'] ?? 'Station de service',
                                          style: TextStyle(color: AppTheme.textSecondary.withValues(alpha: 0.7)),
                                        ),
                                      ),
                                      trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: AppTheme.primary),
                                      onTap: () => _selectStation(station),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
