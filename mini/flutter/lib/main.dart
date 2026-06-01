import 'package:flutter/material.dart';

void main() {
  runApp(const MiniApp());
}

class MiniApp extends StatelessWidget {
  const MiniApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: MiniHomePage(),
    );
  }
}

class MiniHomePage extends StatelessWidget {
  const MiniHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Image.asset(
          'assets/images/mini.png',
          width: 460,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}
