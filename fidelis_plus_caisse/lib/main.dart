import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/api_service.dart';
import 'core/theme.dart';
import 'screens/login_screen.dart';
import 'screens/station_select_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final hasToken = prefs.getString('auth_token') != null;

  runApp(
    MultiProvider(
      providers: [
        Provider<ApiService>(create: (_) => ApiService()),
      ],
      child: FidelisCaisseApp(hasToken: hasToken),
    ),
  );
}

class FidelisCaisseApp extends StatelessWidget {
  final bool hasToken;
  const FidelisCaisseApp({super.key, required this.hasToken});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Fidelis POS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: hasToken ? const StationSelectScreen() : const LoginScreen(),
    );
  }
}
