import 'package:socket_io_client/socket_io_client.dart' as io;
import '../network/api_client.dart';

/// Thin wrapper around a single socket.io connection, authenticated with the
/// current Firebase ID token. One connection per signed-in session — see
/// [RealtimeNotificationsCoordinator] for connect/disconnect lifecycle.
class SocketService {
  io.Socket? _socket;

  void connect(String token) {
    disconnect();
    final origin = kApiBaseUrl.replaceFirst(RegExp(r'/api/?$'), '');
    _socket = io.io(
      origin,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableForceNew()
          .build(),
    );
  }

  void on(String event, void Function(dynamic data) callback) {
    _socket?.on(event, callback);
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }
}
