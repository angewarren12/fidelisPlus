import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'http://127.0.0.1:8000/api/v1';

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('station_id');
  }

  Future<Map<String, String>> _headers() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>> login(String login, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: await _headers(),
      body: jsonEncode({'login': login, 'password': password}),
    );
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> getMe() async {
    final res = await http.get(
      Uri.parse('$baseUrl/auth/me'),
      headers: await _headers(),
    );
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> getStations() async {
    final res = await http.get(
      Uri.parse('$baseUrl/stations'),
      headers: await _headers(),
    );
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> verifyLoyalty(String qrPayload) async {
    final res = await http.post(
      Uri.parse('$baseUrl/loyalty/pos/verify'),
      headers: await _headers(),
      body: jsonEncode({
        'qr_payload': qrPayload,
      }),
    );
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> getHistory() async {
    final res = await http.get(
      Uri.parse('$baseUrl/loyalty/pos'),
      headers: await _headers(),
    );
    return jsonDecode(res.body);
  }

  /// Inscrit un nouveau client particulier au guichet (sans carte pour l'instant —
  /// la carte physique est associée juste après via [assignLoyaltyCard]).
  Future<Map<String, dynamic>> createLoyaltyMember({
    required String nom,
    required String prenom,
    required String contact,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/loyalty/members'),
      headers: await _headers(),
      body: jsonEncode({
        'type': 'particulier',
        'nom': nom,
        'prenom': prenom,
        'contact': contact,
      }),
    );
    return jsonDecode(res.body);
  }

  /// Associe une carte physique vierge (scannée) au client [memberId] qui vient
  /// d'être créé.
  Future<Map<String, dynamic>> assignLoyaltyCard(int memberId, String qrPayload) async {
    final res = await http.post(
      Uri.parse('$baseUrl/loyalty/members/$memberId/assign-card'),
      headers: await _headers(),
      body: jsonEncode({'qr_payload': qrPayload}),
    );
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> scanLoyalty(
    String qrPayload,
    int stationId,
    String idempotencyKey, {
    String? vehicleRegistration,
    String? vehicleBrand,
    String? vehicleColor,
  }) async {
    final headers = await _headers();
    headers['Idempotency-Key'] = idempotencyKey;

    final res = await http.post(
      Uri.parse('$baseUrl/loyalty/pos/scan'),
      headers: headers,
      body: jsonEncode({
        'qr_payload': qrPayload,
        'station_id': stationId,
        'device_id': 'caisse-mobile-v1',
        'occurred_at': DateTime.now().toUtc().toIso8601String(),
        'visit_type': 'visite_technique',
        if (vehicleRegistration != null && vehicleRegistration.isNotEmpty) 'vehicle_registration': vehicleRegistration,
        if (vehicleBrand != null && vehicleBrand.isNotEmpty) 'vehicle_brand': vehicleBrand,
        if (vehicleColor != null && vehicleColor.isNotEmpty) 'vehicle_color': vehicleColor,
      }),
    );
    return jsonDecode(res.body);
  }
}
