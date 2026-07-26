import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_exception.dart';

const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://192.168.1.165:3000/api',
);

class ApiClient {
  final http.Client _client;
  final String baseUrl;
  final String? Function()? tokenProvider;
  void Function()? onUnauthorized;

  ApiClient({
    http.Client? client,
    this.baseUrl = kApiBaseUrl,
    this.tokenProvider,
    this.onUnauthorized,
  }) : _client = client ?? http.Client();

  Map<String, String> _headers() {
    final headers = {'Content-Type': 'application/json'};
    final token = tokenProvider?.call();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<dynamic> get(String path, {Map<String, String>? query}) {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: query);
    return _send(() => _client.get(uri, headers: _headers()));
  }

  Future<dynamic> post(String path, {Object? body}) {
    final uri = Uri.parse('$baseUrl$path');
    return _send(() => _client.post(uri, headers: _headers(), body: jsonEncode(body)));
  }

  Future<dynamic> put(String path, {Object? body}) {
    final uri = Uri.parse('$baseUrl$path');
    return _send(() => _client.put(uri, headers: _headers(), body: jsonEncode(body)));
  }

  Future<dynamic> delete(String path) {
    final uri = Uri.parse('$baseUrl$path');
    return _send(() => _client.delete(uri, headers: _headers()));
  }

  Future<dynamic> _send(Future<http.Response> Function() request) async {
    late http.Response response;
    try {
      response = await request();
    } catch (e) {
      throw ApiException('Network error: $e');
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'Request failed with status ${response.statusCode}';
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map && decoded['error'] is String) {
          message = decoded['error'] as String;
        }
      } catch (_) {
        // Response body wasn't JSON — keep the default message.
      }
      if (response.statusCode == 401) {
        onUnauthorized?.call();
      }
      throw ApiException(message, statusCode: response.statusCode);
    }

    if (response.body.isEmpty) return null;
    return jsonDecode(response.body);
  }
}
